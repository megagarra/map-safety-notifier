const KEY = 'map-safety:my-reports';

export type Stored = { id: string; key: string };
export type MyReport = {
  id: string;
  type: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  status: string;
  rejectionReason?: string | null;
  reportedAt: string;
  address?: string | null;
  lat: number;
  lng: number;
  votes: number;
};

export function loadMyReports(): Stored[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return Array.isArray(v) ? v.filter((x) => x && uuid.test(String(x.id)) && /^[0-9a-f]{32}$/.test(String(x.key))) : [];
  } catch {
    return [];
  }
}

/** Remember a report this device created (the key proves it, no account needed). */
export function rememberMyReport(id: string, key: string | null | undefined) {
  if (!key) return;
  try {
    const list = [{ id, key }, ...loadMyReports().filter((r) => r.id !== id)].slice(0, 50);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

