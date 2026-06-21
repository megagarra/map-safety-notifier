export function unwrapApiList<T>(data: unknown): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.entries)) return obj.entries as T[];
  }
  return [];
}
