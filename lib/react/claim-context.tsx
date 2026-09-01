"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { COPY } from "../claim/copy";
import { CLAIM_SCHEMA } from "../claim/schema";
import { createClaimStore, type ClaimStore } from "../claim/store";
import type { ClaimState } from "../claim/types";
import {
  createRegistrationManager,
  type RegistrationManager,
  type RegistrationStatus,
} from "../webmcp/registration-manager";
import { createClaimTools } from "../webmcp/tools";

interface ClaimContextValue {
  store: ClaimStore;
  manager: RegistrationManager;
  /** Latest polite announcement for the live region. */
  announcement: string;
  announce: (text: string) => void;
}

const ClaimContext = createContext<ClaimContextValue | null>(null);

const STORAGE_KEY = "holdthepen.draft.v1";
const ANNOUNCE_DEBOUNCE_MS = 700;

/**
 * Creates the store, registers the seven tools exactly once, and turns agent
 * writes into one debounced announcement that names fields, never values.
 *
 * The store and manager are created in a ref so React StrictMode's double
 * mount cannot create a second store or a second registration.
 */
export function ClaimProvider({ children }: { children: ReactNode }) {
  const ref = useRef<{
    store: ClaimStore;
    manager: RegistrationManager;
  } | null>(null);
  if (!ref.current) {
    ref.current = {
      store: createClaimStore(CLAIM_SCHEMA),
      manager: createRegistrationManager(),
    };
  }
  const { store, manager } = ref.current;
  const [announcement, setAnnouncement] = useState("");

  // Register once. The manager itself ignores a second call.
  useEffect(() => {
    void manager.registerAll(createClaimTools(store));
  }, [manager, store]);

  // Announce agent writes, debounced, without values.
  useEffect(() => {
    let last = store.getSnapshot();
    let pending = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      timer = null;
      if (pending.size === 0) return;
      const labels = [...pending].map((id) => store.fieldDef(id)?.label ?? id);
      pending = new Set();
      setAnnouncement(COPY.announce.agentFilled(labels));
    };

    return store.subscribe(() => {
      const next = store.getSnapshot();
      for (const f of CLAIM_SCHEMA.fields) {
        const a = last.fields[f.id];
        const b = next.fields[f.id];
        if (
          b.revision !== a.revision &&
          b.provenance === "agent" &&
          !b.reviewed
        ) {
          pending.add(f.id);
        }
      }
      if (next.review.status !== last.review.status) {
        if (next.review.status === "staged")
          setAnnouncement(COPY.announce.staged);
        else if (next.review.status === "invalidated")
          setAnnouncement(COPY.announce.invalidated);
        else if (next.review.status === "approved")
          setAnnouncement(COPY.announce.approved(next.review.reference));
      }
      last = next;
      if (pending.size > 0 && !timer)
        timer = setTimeout(flush, ANNOUNCE_DEBOUNCE_MS);
    });
  }, [store]);

  const value = useMemo<ClaimContextValue>(
    () => ({ store, manager, announcement, announce: setAnnouncement }),
    [store, manager, announcement]
  );

  return (
    <ClaimContext.Provider value={value}>{children}</ClaimContext.Provider>
  );
}

export function useClaimContext(): ClaimContextValue {
  const ctx = useContext(ClaimContext);
  if (!ctx)
    throw new Error("useClaimContext must be used inside ClaimProvider");
  return ctx;
}

export function useClaimState(): ClaimState {
  const { store } = useClaimContext();
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
}

const IDLE: RegistrationStatus = { state: "idle" };
export function useRegistrationStatus(): RegistrationStatus {
  const { manager } = useClaimContext();
  return useSyncExternalStore(manager.subscribe, manager.status, () => IDLE);
}

/** Opt-in session persistence. Never automatic. */
export function saveDraft(store: ClaimStore): boolean {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store.getSnapshot()));
    return true;
  } catch {
    return false;
  }
}

export function loadDraft(store: ClaimStore): boolean {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    store.hydrate(JSON.parse(raw) as ClaimState);
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(store: ClaimStore): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable; the in-memory reset below still applies
  }
  store.reset();
}
