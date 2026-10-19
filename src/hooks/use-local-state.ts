"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

const STORE_EVENT = "nbi:local-state";

/**
 * localStorage-backed state via useSyncExternalStore — SSR-safe (returns
 * `initial` on the server, real value after hydration, no hydration mismatch
 * and no setState-in-effect). Writes broadcast a custom event so widgets on the
 * same page stay in sync; the native `storage` event syncs across tabs.
 *
 * Used by the gamification toolkit with keys namespaced by `slug + widgetId`.
 */
export function useLocalState<T>(
  key: string,
  initial: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const cache = useRef<{ raw: string | null; value: T } | null>(null);

  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener(STORE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(STORE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const getSnapshot = (): T => {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      // storage unavailable
    }
    // Cache by raw string so the snapshot reference stays stable between reads.
    if (!cache.current || cache.current.raw !== raw) {
      let value = initial;
      try {
        if (raw != null) value = JSON.parse(raw) as T;
      } catch {
        // malformed — fall back to initial
      }
      cache.current = { raw, value };
    }
    return cache.current.value;
  };

  const value = useSyncExternalStore(subscribe, getSnapshot, () => initial);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      let current = initial;
      try {
        const raw = window.localStorage.getItem(key);
        if (raw != null) current = JSON.parse(raw) as T;
      } catch {
        // ignore
      }
      const resolved =
        typeof next === "function" ? (next as (prev: T) => T)(current) : next;
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        // ignore quota / unavailable
      }
      window.dispatchEvent(new Event(STORE_EVENT));
    },
    [key, initial],
  );

  return [value, set];
}
