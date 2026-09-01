/**
 * Registers the app's WebMCP tools exactly once and reports what happened.
 *
 * Why a manager instead of per-component hooks:
 *  - Tools are registered once for the life of the page and NEVER
 *    unregistered in React cleanup. StrictMode double-mounts, Fast Refresh,
 *    and route changes would otherwise churn registrations, and an
 *    unregister/re-register with a changed schema is an unprotected race in
 *    the spec (old arguments can hit the new schema).
 *  - `registerTool()` returns a promise that REJECTS on bad input. Every
 *    registration is awaited via allSettled; a rejection becomes a visible
 *    "degraded" status with the reason, never a silently missing tool.
 *  - A tool that cannot act right now stays registered and returns a
 *    descriptive error from execute(); we never unregister to signal
 *    unavailability, because the agent would only see the tool vanish.
 */
import { getModelContext } from "./get-model-context";

export type RegistrationStatus =
  | { state: "idle" }
  | { state: "unsupported"; reason: string }
  | { state: "registering"; attempted: string[] }
  | { state: "ready"; registered: string[] }
  | {
      state: "degraded";
      registered: string[];
      failed: { name: string; reason: string }[];
    };

export interface RegistrationManager {
  status(): RegistrationStatus;
  subscribe(listener: () => void): () => void;
  /**
   * Register all tools once. Subsequent calls return the existing status
   * without touching the browser API.
   */
  registerAll(tools: WebMcpToolDefinition[]): Promise<RegistrationStatus>;
  /** Re-read getTools() and reconcile the registered list. */
  reconcile(): Promise<RegistrationStatus>;
}

export function createRegistrationManager(
  resolveContext: () => WebMcpModelContext | undefined = getModelContext
): RegistrationManager {
  let status: RegistrationStatus = { state: "idle" };
  let inFlight: Promise<RegistrationStatus> | null = null;
  const listeners = new Set<() => void>();

  function set(next: RegistrationStatus) {
    status = next;
    for (const l of listeners) l();
  }

  async function reconcile(): Promise<RegistrationStatus> {
    const mc = resolveContext();
    if (!mc) return status;
    if (status.state !== "ready" && status.state !== "degraded") return status;
    try {
      const live = (await mc.getTools()).map((t) => t.name).sort();
      const expected = [...status.registered].sort();
      const missing = expected.filter((n) => !live.includes(n));
      if (missing.length > 0) {
        set({
          state: "degraded",
          registered: live,
          failed: [
            ...(status.state === "degraded" ? status.failed : []),
            ...missing.map((name) => ({
              name,
              reason:
                "Registered but absent from getTools(); the browser dropped it.",
            })),
          ],
        });
      }
    } catch {
      // getTools failing is not fatal; keep the last known status.
    }
    return status;
  }

  return {
    status: () => status,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    registerAll(tools) {
      if (inFlight) return inFlight;
      if (status.state !== "idle") return Promise.resolve(status);

      const mc = resolveContext();
      if (!mc) {
        set({
          state: "unsupported",
          reason:
            "document.modelContext is absent. Enable chrome://flags/#enable-webmcp-testing in Chrome 149+, or open this page in the ChatGPT desktop browser.",
        });
        return Promise.resolve(status);
      }

      set({ state: "registering", attempted: tools.map((t) => t.name) });

      inFlight = (async () => {
        const results = await Promise.allSettled(
          tools.map((t) => mc.registerTool(t))
        );
        const registered: string[] = [];
        const failed: { name: string; reason: string }[] = [];
        results.forEach((r, i) => {
          const name = tools[i].name;
          if (r.status === "fulfilled") registered.push(name);
          else
            failed.push({
              name,
              reason:
                r.reason instanceof Error ? r.reason.message : String(r.reason),
            });
        });
        for (const f of failed) {
          console.warn(
            `[registration-manager] Failed to register "${f.name}": ${f.reason}`
          );
        }
        set(
          failed.length === 0
            ? { state: "ready", registered }
            : { state: "degraded", registered, failed }
        );
        inFlight = null;
        return reconcile();
      })();
      return inFlight;
    },

    reconcile,
  };
}
