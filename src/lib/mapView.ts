export type MapViewState = { center: [number, number]; zoom: number };

const KEY = 'map-safety:last-view';

function valid(lat: number, lng: number, z: number) {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(z) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && z >= 2 && z <= 20
  );
}

/** View from ?lat&lng&z (shared links, push notifications). */
export function readUrlView(search: string): MapViewState | null {
  const p = new URLSearchParams(search);
  if (!p.has('lat') || !p.has('lng')) return null;
  const lat = Number(p.get('lat'));
  const lng = Number(p.get('lng'));
  const z = Number(p.get('z') ?? 15);
  return valid(lat, lng, z) ? { center: [lat, lng], zoom: z } : null;
}

export function readSavedView(): MapViewState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { lat, lng, z } = JSON.parse(raw);
    return valid(lat, lng, z) ? { center: [lat, lng], zoom: z } : null;
  } catch {
    return null;
  }
}

export function saveView(center: [number, number], zoom: number) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ lat: center[0], lng: center[1], z: zoom }));
  } catch {
    /* storage full / private mode */
  }
}
