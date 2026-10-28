// The Vault items of this computer, encrypted at rest by the operating system. The file holds one
// envelope. API keys have a separate encrypted file that released writers do not change.

import { readFile, rm } from "node:fs/promises";
import { sourceText } from "@openbot/i18n/source";
import { Effect, Result, Schema, Semaphore } from "effect";
import { writeJsonFileAtomically } from "../backend/atomic-json-file";
import { causeHelpers } from "../backend/effect-boundary";
import { PasswordVaultError } from "../backend/password-vault";
import type { SecretCipher } from "./provider-credential-store";

const { io: vaultCall, sync: vaultDecode } = causeHelpers(PasswordVaultError);

/** The name of the agent that added an item. Absent when the user added it. */
const addedBy = Schema.optionalKey(Schema.String);

const loginSchema = Schema.Struct({
  id: Schema.String,
  /** An `https:` address or a host name, as the user typed it. */
  website: Schema.String,
  username: Schema.String,
  password: Schema.String,
  notes: Schema.String,
  addedBy,
});

const cardSchema = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  nameOnCard: Schema.String,
  /** Digits only. */
  number: Schema.String,
  expMonth: Schema.Number,
  expYear: Schema.Number,
  /** Digits only, or "" when the user did not save one. */
  securityCode: Schema.String,
  billingContactId: Schema.NullOr(Schema.String),
  /**
   * The HTTPS pages where the owner let agents fill this card, each with the origins of the frames that
   * got its fields. A fill anywhere else waits for the owner's approval. Absent when there is none.
   */
  fillSites: Schema.optionalKey(
    Schema.Array(Schema.Struct({ page: Schema.String, frames: Schema.Array(Schema.String) })),
  ),
  addedBy,
});

const contactSchema = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  fullName: Schema.String,
  address: Schema.String,
  address2: Schema.String,
  city: Schema.String,
  region: Schema.String,
  postalCode: Schema.String,
  country: Schema.String,
  phone: Schema.String,
  email: Schema.String,
  addedBy,
});

const apiKeySchema = Schema.Struct({
  id: Schema.String,
  /** An environment variable name, unique in the Vault. */
  name: Schema.String,
  key: Schema.String,
  notes: Schema.String,
  addedBy,
});

const recordSchema = Schema.Struct({
  logins: Schema.Array(loginSchema),
  cards: Schema.Array(cardSchema),
  contacts: Schema.Array(contactSchema),
  // Read the first API-key format too. New writes keep these keys in a separate file.
  apiKeys: Schema.Array(apiKeySchema).pipe(Schema.withDecodingDefaultKey(Effect.succeed([]))),
});

export type StoredLogin = typeof loginSchema.Type;
export type StoredCard = typeof cardSchema.Type;
export type StoredContact = typeof contactSchema.Type;
export type StoredApiKey = typeof apiKeySchema.Type;
export type VaultRecord = typeof recordSchema.Type;

const EMPTY_VAULT_RECORD: VaultRecord = { logins: [], cards: [], contacts: [], apiKeys: [] };

/** `version` is checked: an envelope that this build cannot read is reported as unreadable. */
const envelopeSchema = Schema.Struct({ version: Schema.Literal(1), record: Schema.String });
const apiKeysSchema = Schema.Struct({ apiKeys: Schema.Array(apiKeySchema) });

/** Thousands of items fit; a larger file is not one that this app wrote. */
const MAX_VAULT_ENVELOPE_BYTES = 4 * 1024 * 1024;

function unreadable() {
  return new PasswordVaultError({ cause: new Error(sourceText("error.vault.unreadable")) });
}

/**
 * Reads and writes the Vault file. The decrypted record is kept in memory only. Writes run one at a
 * time, because the settings page and an import can change the Vault together.
 */
export class VaultStore {
  readonly #path: string;
  readonly #apiKeysPath: string;
  readonly #cipher: SecretCipher;
  #record: VaultRecord = EMPTY_VAULT_RECORD;
  readonly #queue = Semaphore.makeUnsafe(1);

  constructor(path: string, cipher: SecretCipher) {
    this.#path = path;
    this.#apiKeysPath = `${path}.api-keys-v1.json`;
    this.#cipher = cipher;
  }

  /** Reads the file. False when the file is there but cannot be read; the file is then kept as it is. */
  load(): Effect.Effect<boolean> {
    return Effect.gen({ self: this }, function* () {
      this.#record = EMPTY_VAULT_RECORD;
      const result = yield* Effect.result(
        Effect.gen({ self: this }, function* () {
          const legacy = yield* this.#read(this.#path);
          const keys = yield* this.#readApiKeys();
          // Copy the first format before a released writer can replace the legacy record. Keep the
          // source file in place. An existing separate file, including an empty one, takes priority.
          if (keys === null && legacy?.apiKeys.length)
            yield* this.#write(this.#apiKeysPath, { apiKeys: legacy.apiKeys });
          return { ...(legacy ?? EMPTY_VAULT_RECORD), apiKeys: keys?.apiKeys ?? legacy?.apiKeys ?? [] };
        }),
      );
      if (Result.isFailure(result)) return false;
      this.#record = result.success ?? EMPTY_VAULT_RECORD;
      return true;
    });
  }

  read(): VaultRecord {
    return this.#record;
  }

  /**
   * Makes the next record from the current one and stores it. The record changes only after the
   * write. An error that `change` throws fails the update; the same record back writes nothing.
   */
  update(change: (current: VaultRecord) => VaultRecord): Effect.Effect<VaultRecord, PasswordVaultError> {
    return this.#serialize(
      Effect.gen({ self: this }, function* () {
        const next = yield* vaultDecode(() => change(this.#record));
        if (next === this.#record) return next;
        const { apiKeys, ...legacy } = next;
        const { apiKeys: previousKeys, ...previousLegacy } = this.#record;
        // Each service change affects one store. Do not rewrite the legacy file for an API-key edit.
        if (JSON.stringify(apiKeys) !== JSON.stringify(previousKeys))
          yield* this.#write(this.#apiKeysPath, { apiKeys });
        if (JSON.stringify(legacy) !== JSON.stringify(previousLegacy)) yield* this.#write(this.#path, legacy);
        this.#record = next;
        return next;
      }),
    );
  }

  /** Clears both stores and forgets every item. Only an explicit reset calls this operation. */
  clear(): Effect.Effect<void, PasswordVaultError> {
    return this.#serialize(
      Effect.gen({ self: this }, function* () {
        // An empty key record also prevents keys in the first format from returning after reset.
        yield* this.#write(this.#apiKeysPath, { apiKeys: [] });
        yield* vaultCall(() => rm(this.#path, { force: true }));
        this.#record = EMPTY_VAULT_RECORD;
      }),
    );
  }

  #serialize<A>(change: Effect.Effect<A, PasswordVaultError>): Effect.Effect<A, PasswordVaultError> {
    return this.#queue.withPermit(change).pipe(Effect.uninterruptible);
  }

  readonly #write = Effect.fn("VaultStore.write")(function* (this: VaultStore, path: string, record: object) {
    const encrypted = yield* vaultDecode(() => this.#cipher.encrypt(JSON.stringify(record)).toString("base64"));
    if (encrypted.length + 32 > MAX_VAULT_ENVELOPE_BYTES)
      return yield* new PasswordVaultError({ cause: new Error(sourceText("error.vault.tooLarge")) });
    yield* writeJsonFileAtomically(path, { version: 1, record: encrypted }, { createDirectory: true }).pipe(
      Effect.mapError(({ cause }) => new PasswordVaultError({ cause })),
    );
  });

  readonly #readApiKeys = Effect.fn("VaultStore.readApiKeys")(function* (this: VaultStore) {
    const record = yield* this.#readEnvelope(this.#apiKeysPath);
    if (record === undefined) return null;
    return yield* vaultDecode(() => Schema.decodeUnknownSync(apiKeysSchema)(record)).pipe(Effect.mapError(unreadable));
  });

  readonly #read = Effect.fn("VaultStore.read")(function* (this: VaultStore, path: string) {
    const record = yield* this.#readEnvelope(path);
    if (record === undefined) return null;
    return yield* vaultDecode(() => Schema.decodeUnknownSync(recordSchema)(record)).pipe(Effect.mapError(unreadable));
  });

  readonly #readEnvelope = Effect.fn("VaultStore.readEnvelope")(function* (
    this: VaultStore,
    path: string,
  ): Effect.fn.Return<unknown, PasswordVaultError> {
    const source = yield* vaultCall(() => readFile(path, "utf8")).pipe(
      Effect.catch(({ cause }) =>
        cause instanceof Error && "code" in cause && cause.code === "ENOENT"
          ? Effect.succeed(null)
          : Effect.fail(new PasswordVaultError({ cause })),
      ),
    );
    if (source === null) return undefined;
    if (source.length > MAX_VAULT_ENVELOPE_BYTES) return yield* unreadable();
    return yield* vaultDecode(() => {
      const envelope = Schema.decodeUnknownSync(envelopeSchema)(JSON.parse(source));
      return JSON.parse(this.#cipher.decrypt(Buffer.from(envelope.record, "base64")));
    }).pipe(Effect.mapError(unreadable));
  });
}
