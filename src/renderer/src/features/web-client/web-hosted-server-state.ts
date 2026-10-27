import { createEffect, createSignal } from "solid-js";
import { createWebHostedServerCalls } from "./web-hosted-servers";

export interface WebHostedServersOptions {
  accountFetch: typeof fetch;
  /** The hosts of the account. An owned host that comes in starts a read of the hosted servers. */
  hosts: () => readonly { hostId: string; role: string }[];
}

/** Metadata and management calls for existing hosted servers of a browser account. */
export function createWebHostedServers(options: WebHostedServersOptions) {
  const calls = createWebHostedServerCalls(options.accountFetch);
  /** The hosted servers of this account. The server menu can delete these. */
  const [loaded, setLoaded] = createSignal(false);
  const [hostedIds, setHostedIds] = createSignal<ReadonlySet<string>>(new Set());
  async function refresh(): Promise<void> {
    const list = await calls.list().catch(() => null);
    if (!list) return;
    setLoaded(true);
    setHostedIds(new Set(list.servers.map((server) => server.serverId)));
  }
  void refresh();
  // Existing owned hosts can appear after a refresh. Read each owned host once
  // so its Delete server item shows without a reload.
  const readOwnedHostIds = new Set<string>();
  createEffect(
    () =>
      options
        .hosts()
        .filter((host) => host.role === "owner" && !readOwnedHostIds.has(host.hostId))
        .map((host) => host.hostId),
    (hostIds) => {
      if (hostIds.length === 0) return;
      for (const hostId of hostIds) readOwnedHostIds.add(hostId);
      void refresh();
    },
  );
  return {
    calls,
    loaded,
    isHosted: (serverId: string) => hostedIds().has(serverId),
  };
}
