export function resolveImageUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}
