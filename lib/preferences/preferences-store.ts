// Notification preferences. DEFERRED: the API has no preferences endpoint, so
// these live in localStorage on the device. When the backend adds them, swap the
// read/write below for API calls — `usePreferences` keeps its shape.
//
// localStorage is external mutable state, so it's exposed through the same
// subscribe/notify pattern as the token cookie (lib/auth/token.ts): components
// read it via useSyncExternalStore, and writes here re-render every subscriber.

import type { NotificationPrefs } from "@/lib/types";

const STORAGE_KEY = "klearnote:prefs";

export const DEFAULT_PREFS: NotificationPrefs = {
  processingComplete: true,
  processingFailed: true,
  productUpdates: false,
};

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribePreferences(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(): void {
  for (const listener of listeners) listener();
}

// useSyncExternalStore compares snapshots by identity, so re-parsing the JSON on
// every read would loop forever. Cache the parsed value and only replace it when
// we write.
let cache: NotificationPrefs | null = null;

export function getPreferences(): NotificationPrefs {
  if (cache) return cache;
  cache = readFromStorage();
  return cache;
}

function readFromStorage(): NotificationPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    // Merge over the defaults so a preference added later still has a value.
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<NotificationPrefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Server snapshot: no localStorage on the server, so render the defaults. */
export function getServerPreferences(): NotificationPrefs {
  return DEFAULT_PREFS;
}

export function setPreference<K extends keyof NotificationPrefs>(
  key: K,
  value: NotificationPrefs[K],
): void {
  cache = { ...getPreferences(), [key]: value };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // storage disabled — the change still applies for this session
  }
  notify();
}
