import { useText } from "@openbot/ui/text";
import { createEffect, createSignal, Loading, Show } from "solid-js";
import { useAuth } from "./features/account/account-context";
import { useProviderDetection } from "./features/custom-providers/provider-detection-context";
import { useSetup } from "./features/onboarding/onboarding-context";
import { SetupReadError } from "./features/onboarding/SetupReadError";
import { useSetupProviderProps } from "./features/onboarding/setup-provider-props";
import { useServerScope } from "./features/servers/server-scope";
import { useServerSelection } from "./features/servers/server-selection";
import { StartupSplash } from "./features/startup/StartupSplash";
import { WhatsNewOverlay } from "./features/updates/WhatsNewOverlay";
import { FirstRunFlow, InitialSetup } from "./lazy-views";
import { usePlatform } from "./platform";
import { WorkspaceShell } from "./WorkspaceShell";

/** The placeholder every lazy view below falls back to while its code loads. */
function LoadingScreen() {
  const { t } = useText();
  return <div class="initial-setup-screen" role="status" aria-label={t("app.loading")} />;
}

/**
 * The startup splash stays until the build and saved setup are known. The app
 * then shows local setup, remote invite setup, or the workspace.
 *
 * The ladder is written as nested `<Show>` rather than pushed into the providers
 * as readiness gates. A gated provider withholds its subtree, and the only
 * subtree here is the whole application, so a gate would replace these
 * placeholders with a blank window and serialize the bootstrap loads that
 * currently run in parallel. See `app-providers.tsx`.
 *
 * The account accessor can be null. Local work does not require sign-in.
 */
export function AppAccessGate() {
  const platform = usePlatform();
  const auth = useAuth();
  const setup = useSetup();
  const scope = useServerScope();
  // Setup actions run against this computer. The view waits for its first status before offering them.
  const setupProviders = useSetupProviderProps();
  const detection = useProviderDetection();
  const { joinRemoteDuringSetup } = useServerSelection();
  const started = () => setup.setupLoaded() && platform.appInfo() !== null;
  const [splashShown, setSplashShown] = createSignal(true);
  // A startup mark for `dev:bench`: the first moment the app can leave the splash.
  createEffect(started, (ready) => {
    if (ready) performance.mark("openbot:app-started");
  });

  return (
    <>
      <Show when={started()}>
        <Show when={!setup.setupReadFailed()} fallback={<SetupReadError />}>
          <Show
            when={setup.setupState()?.completed}
            fallback={
              <Show when={scope.connection.hasContent} fallback={<WorkspaceShell account={auth.signedInAccount} />}>
                <Show
                  when={setup.pendingInviteUrl().trim()}
                  fallback={
                    <Loading fallback={<LoadingScreen />}>
                      <FirstRunFlow
                        {...setupProviders}
                        state={
                          setup.setupState() ?? { completed: false, preferredProvider: null, preferredModel: null }
                        }
                        platform={platform.appInfo()?.platform ?? "darwin"}
                        onSave={setup.saveSetup}
                        onProviderStepShown={detection.scanOnce}
                        logoVariant={platform.appInfo()?.variant ?? "production"}
                      />
                    </Loading>
                  }
                >
                  <Loading fallback={<LoadingScreen />}>
                    <InitialSetup
                      {...setupProviders}
                      state={setup.setupState() ?? { completed: false, preferredProvider: null, preferredModel: null }}
                      platform={platform.appInfo()?.platform ?? "darwin"}
                      accountEmail={auth.signedInAccount()?.email ?? ""}
                      inviteUrl={setup.pendingInviteUrl()}
                      onSave={setup.saveSetup}
                      onPreviewInvite={setup.previewInvite}
                      onJoinRemote={joinRemoteDuringSetup}
                      onLogout={auth.signedInAccount() ? auth.logoutCentralAccount : undefined}
                    />
                  </Loading>
                </Show>
              </Show>
            }
          >
            <WorkspaceShell account={auth.signedInAccount} />
          </Show>
        </Show>
      </Show>
      <WhatsNewOverlay
        ready={
          !platform.chatWindow &&
          !splashShown() &&
          (setup.setupState()?.completed === true || !scope.connection.hasContent)
        }
      />
      <Show when={splashShown()}>
        {/* Before `appInfo` loads, the build's own mode picks the logo colour. */}
        <StartupSplash
          variant={platform.appInfo()?.variant ?? (import.meta.env.DEV ? "dev" : "production")}
          ready={started()}
          onExited={() => setSplashShown(false)}
        />
      </Show>
    </>
  );
}
