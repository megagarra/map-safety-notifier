import { useSyncExternalStore } from 'react';

export type GeoState = {
  pos: [number, number] | null;
  accuracy: number | null;
  error: 'denied' | 'unavailable' | 'unsupported' | null;
  updatedAt: number | null;
};

let state: GeoState = { pos: null, accuracy: null, error: null, updatedAt: null };
const listeners = new Set<() => void>();
let watchId: number | null = null;

function emit(next: Partial<GeoState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function start() {
  if (watchId !== null) return;
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    emit({ error: 'unsupported' });
    return;
  }
  watchId = navigator.geolocation.watchPosition(
    ({ coords }) =>
      emit({
        pos: [coords.latitude, coords.longitude],
        accuracy: coords.accuracy,
        error: null,
        updatedAt: Date.now(),
      }),
    (err) => {
      if (err.code === err.PERMISSION_DENIED) {
        emit({ error: 'denied' });
        stop();
      } else if (!state.pos) {
        emit({ error: 'unavailable' });
      }
    },
    { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
  );
}

function stop() {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
}

if (typeof document !== 'undefined') {
  // Save battery: pause tracking while the tab is hidden.
  document.addEventListener('visibilitychange', () => {
    if (listeners.size === 0) return;
    if (document.hidden) stop();
    else if (state.error !== 'denied') start();
  });
}

function subscribe(l: () => void) {
  listeners.add(l);
  if (state.error !== 'denied') start();
  return () => {
    listeners.delete(l);
    if (listeners.size === 0) stop();
  };
}

/** Shared, single watchPosition for the whole app. */
export function useGeolocation(): GeoState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** Retry after a failure (e.g. user re-enabled permission). */
export function retryGeolocation() {
  stop();
  emit({ error: null });
  start();
}

export function getGeoState() {
  return state;
}
