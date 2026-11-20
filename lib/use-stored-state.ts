"use client";

import { useCallback, useSyncExternalStore } from "react";

// State mirrored to localStorage through useSyncExternalStore: the server render and the first client
// render use `initial` (so markup matches), then the stored value is read and cached by its raw text.
// Every read compares the raw text with what was cached, so a save from another tab is seen on the next
// read, and the `storage` event re-renders this tab when another tab saves.
// `parse` must return null for missing or invalid data; the initial value is used then.

type Listener = () => void;
type Entry = { raw: string | null; value: unknown };
const listeners = new Map<string, Set<Listener>>();
const cache = new Map<string, Entry>();

function storage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined; // blocked storage (privacy mode) throws on access
  }
}

function readRaw(key: string): { ok: true; raw: string | null } | { ok: false } {
  try {
    const store = storage();
    return store ? { ok: true, raw: store.getItem(key) } : { ok: false };
  } catch {
    return { ok: false };
  }
}

export function readStored<T>(key: string, initial: T, parse: (raw: string | null) => T | null): T {
  const hit = cache.get(key);
  const read = readRaw(key);
  if (!read.ok) return hit ? (hit.value as T) : initial; // no storage: the in-memory value is all there is
  if (hit && hit.raw === read.raw) return hit.value as T;
  let value: T | null = null;
  try {
    value = parse(read.raw);
  } catch {
    value = null;
  }
  const result = value ?? initial;
  cache.set(key, { raw: read.raw, value: result });
  return result;
}

export function writeStored<T>(key: string, value: T) {
  let raw: string | null = JSON.stringify(value);
  try {
    storage()?.setItem(key, raw);
  } catch {
    // Storage can be full or blocked; the in-memory value still works for this visit. Cache it against the
    // text still in storage, so it is kept until another tab saves something new.
    const read = readRaw(key);
    raw = read.ok ? read.raw : null;
  }
  cache.set(key, { raw, value });
  listeners.get(key)?.forEach((listener) => listener());
}

export function subscribeStored(key: string, listener: Listener) {
  const set = listeners.get(key) ?? new Set<Listener>();
  set.add(listener);
  listeners.set(key, set);
  // Another tab saved (or cleared storage): re-render; the next read sees the new raw text.
  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) listener();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    set.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

/** Test helper: forget cached values so the next read goes back to storage. */
export function resetStoredCache() {
  cache.clear();
}

export function useStoredState<T>(key: string, initial: T, parse: (raw: string | null) => T | null) {
  const subscribe = useCallback((listener: Listener) => subscribeStored(key, listener), [key]);
  const value = useSyncExternalStore(subscribe, () => readStored(key, initial, parse), () => initial);
  // The change is applied to the latest saved value (read from storage now, not the value this tab rendered),
  // and a change that returns the value it was given writes nothing, so a stale tab never saves over another
  // tab's newer list. Returns the value now in effect.
  const setValue = useCallback(
    (next: T | ((previous: T) => T)): T => {
      const previous = readStored(key, initial, parse);
      const value = typeof next === "function" ? (next as (previous: T) => T)(previous) : next;
      if (Object.is(value, previous)) return previous;
      writeStored(key, value);
      return value;
    },
    [key, initial, parse],
  );
  return [value, setValue] as const;
}
