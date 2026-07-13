"use client";

import * as React from "react";

const subscribe = () => () => {};

/**
 * False during SSR and the first client render, true afterwards. For UI whose
 * value only exists in the browser (localStorage, `next-themes`), so it can
 * render a placeholder until hydration instead of mismatching the server HTML.
 *
 * useSyncExternalStore rather than the usual `useState` + `useEffect` mount
 * flag: it gets the two snapshots directly, with no cascading re-render.
 */
export function useHydrated(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
