import { useSyncExternalStore } from 'react';

/** Map background: OpenStreetMap light/dark (most complete streets in the region), satellite photo, or Esri streets (other data source). */
export type MapTheme = 'light' | 'dark' | 'satellite' | 'esri';
export const MAP_THEMES: MapTheme[] = ['light', 'dark', 'satellite', 'esri'];
const KEY = 'map-safety-theme';
const listeners = new Set<() => void>();

function read(): MapTheme {
  try {
    const saved = localStorage.getItem(KEY) as MapTheme | null;
    return saved && MAP_THEMES.includes(saved) ? saved : 'dark';
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

/** Next type in the list (desktop button). */
export function toggleMapTheme() {
  setMapTheme(MAP_THEMES[(MAP_THEMES.indexOf(current) + 1) % MAP_THEMES.length]);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function useMapTheme(): MapTheme {
  return useSyncExternalStore(subscribe, () => current, () => 'dark' as MapTheme);
}

/** OpenStreetMap note at this spot: anyone can report a wrong/missing street, no account needed. */
export function osmNoteUrl(lat: number, lng: number) {
  return `https://www.openstreetmap.org/note/new#map=18/${lat.toFixed(5)}/${lng.toFixed(5)}`;
}
