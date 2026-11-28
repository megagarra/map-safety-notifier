export function resolveImageUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}

/** Small preview saved by the API next to each photo (photo.jpg -> photo_t.jpg). */
export function thumbUrl(path: string): string {
  return resolveImageUrl(path.endsWith('.jpg') ? `${path.slice(0, -4)}_t.jpg` : path);
}

/** <img onError> handler: older uploads have no thumbnail, fall back to the full photo once. */
export function fallbackToFull(path: string) {
  return (e: { currentTarget: HTMLImageElement }) => {
    const img = e.currentTarget;
    if (img.dataset.fallback) return;
    img.dataset.fallback = '1';
    img.src = resolveImageUrl(path);
  };
}
