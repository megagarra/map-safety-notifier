import { useSyncExternalStore } from 'react';

export type MapTheme = 'light' | 'dark';
const KEY = 'map-safety-theme';
const listeners = new Set<() => void>();

function read(): MapTheme {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  } catch {
    return 'dark';
  }
}

let current: MapTheme = read();

export function setMapTheme(next: MapTheme) {
  current = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function toggleMapTheme() {
  setMapTheme(current === 'dark' ? 'light' : 'dark');
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function useMapTheme(): MapTheme {
  return useSyncExternalStore(subscribe, () => current, () => 'dark' as MapTheme);
}
