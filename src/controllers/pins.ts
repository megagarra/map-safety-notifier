import {
  Pin,
  PinType,
  PinStatus,
  CreatePinInput,
  UpdatePinInput,
  PaginatedResponse,
  MapBounds,
  PinStats,
  CreateDefaultLocationInput,
  UpdateDefaultLocationInput,
  DefaultLocationEntryInput,
  BulkDefaultLocationEntriesInput,
  DefaultLocationEntry,
  DefaultLocationEntriesResponse,
  UpdateDefaultLocationEntryInput,
  AdminPinLocationInput,
  RejectPinInput,
} from '@/types';
import { api, apiFormData, buildQuery } from '@/lib/api';
import { unwrapApiList } from '@/lib/apiList';

export interface FetchPinsParams extends Partial<MapBounds> {
  limit?: number;
  offset?: number;
  auth?: boolean;
  reported_after?: string;
  reported_before?: string;
}

export interface FetchNearbyParams {
  lat: number;
  lng: number;
  radius_km?: number;
  limit?: number;
  offset?: number;
  auth?: boolean;
  reported_after?: string;
  reported_before?: string;
}

export const fetchPins = async (params: FetchPinsParams = {}): Promise<PaginatedResponse<Pin>> => {
  const { limit = 200, offset = 0, auth = false, reported_after, reported_before, ...bounds } = params;
  return api<PaginatedResponse<Pin>>(
    buildQuery('/api/pins', { limit, offset, reported_after, reported_before, ...bounds }),
    { auth },
  );
};

export const fetchNearbyPins = async (params: FetchNearbyParams): Promise<PaginatedResponse<Pin>> => {
  const { lat, lng, radius_km = 5, limit = 200, offset = 0, auth = false, reported_after, reported_before } = params;
  return api<PaginatedResponse<Pin>>(
    buildQuery('/api/pins/nearby', { lat, lng, radius_km, limit, offset, reported_after, reported_before }),
    { auth },
  );
};

export const fetchPendingModeration = async (): Promise<Pin[]> => {
  const data = await api<Pin[] | PaginatedResponse<Pin>>('/api/pins/moderation/pending', { auth: true });
  return unwrapApiList<Pin>(data);
};

export const fetchRejectedModeration = async (): Promise<Pin[]> => {
  const data = await api<Pin[] | PaginatedResponse<Pin>>('/api/pins/moderation/rejected', { auth: true });
  return unwrapApiList<Pin>(data);
};

export const approvePin = async (id: string): Promise<Pin> => {
  return api<Pin>(`/api/pins/${id}/approve`, { method: 'POST', auth: true });
};

export const rejectPin = async (id: string, input: RejectPinInput): Promise<Pin> => {
  return api<Pin>(`/api/pins/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify(input),
    auth: true,
  });
};

export const fetchPinStats = async (): Promise<PinStats> => {
  return api<PinStats>('/api/pins/stats');
};

export const fetchPinById = async (id: string, auth = false): Promise<Pin | null> => {
  try {
    return await api<Pin>(`/api/pins/${id}`, { auth });
  } catch {
    return null;
  }
};

export const createPin = async (pin: CreatePinInput, auth = false): Promise<Pin> => {
  return api<Pin>('/api/pins', {
    method: 'POST',
    body: JSON.stringify(pin),
    auth,
  });
};

export const updatePin = async (id: string, updates: UpdatePinInput): Promise<Pin> => {
  return api<Pin>(`/api/pins/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
    auth: true,
  });
};

export const adminMovePin = async (id: string, input: AdminPinLocationInput): Promise<Pin> => {
  return api<Pin>(`/api/pins/${id}/admin`, {
    method: 'PATCH',
    body: JSON.stringify(input),
    auth: true,
  });
};

export const deletePin = async (id: string): Promise<void> => {
  await api<void>(`/api/pins/${id}`, {
    method: 'DELETE',
    auth: true,
  });
};

export const voteOnPin = async (pinId: string): Promise<Pin> => {
  return api<Pin>(`/api/pins/${pinId}/vote`, { method: 'POST' });
};

export const fetchDefaultLocations = async (): Promise<Pin[]> => {
  const data = await api<Pin[] | PaginatedResponse<Pin>>('/api/pins/default-locations');
  return unwrapApiList<Pin>(data);
};

export const fetchDefaultLocationById = async (id: string): Promise<Pin> => {
  return api<Pin>(`/api/pins/default-locations/${id}`);
};

export const createDefaultLocation = async (data: CreateDefaultLocationInput): Promise<Pin> => {
  return api<Pin>('/api/pins/default-locations', {
    method: 'POST',
    body: JSON.stringify(data),
    auth: true,
  });
};

export const updateDefaultLocation = async (id: string, data: UpdateDefaultLocationInput): Promise<Pin> => {
  return api<Pin>(`/api/pins/default-locations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    auth: true,
  });
};

export const deleteDefaultLocation = async (id: string): Promise<void> => {
  await api<void>(`/api/pins/default-locations/${id}`, {
    method: 'DELETE',
    auth: true,
  });
};

export const fetchDefaultLocationEntries = async (markerId: string): Promise<DefaultLocationEntriesResponse> => {
  const data = await api<unknown>(`/api/pins/default-locations/${markerId}/entries`);
  const items = unwrapApiList<DefaultLocationEntry>(data);

  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    const totalQuantity = typeof obj.totalQuantity === 'number'
      ? obj.totalQuantity
      : items.reduce((sum, entry) => sum + (entry.quantity ?? 1), 0);
    return {
      items,
      totalQuantity,
      ...(typeof obj.total === 'number' && { total: obj.total }),
    };
  }

  return {
    items,
    totalQuantity: items.reduce((sum, entry) => sum + (entry.quantity ?? 1), 0),
  };
};

export const addDefaultLocationEntry = async (
  markerId: string,
  data: DefaultLocationEntryInput,
): Promise<Pin> => {
  return api<Pin>(`/api/pins/default-locations/${markerId}/entries`, {
    method: 'POST',
    body: JSON.stringify({ ...data, quantity: data.quantity ?? 1 }),
    auth: true,
  });
};

export const replaceDefaultLocationEntriesBulk = async (
  markerId: string,
  data: BulkDefaultLocationEntriesInput,
): Promise<Pin> => {
  return api<Pin>(`/api/pins/default-locations/${markerId}/entries/bulk`, {
    method: 'PUT',
    body: JSON.stringify(data),
    auth: true,
  });
};

export const addDefaultLocationEntriesBulk = async (
  markerId: string,
  data: BulkDefaultLocationEntriesInput,
): Promise<Pin> => {
  return api<Pin>(`/api/pins/default-locations/${markerId}/entries/bulk`, {
    method: 'POST',
    body: JSON.stringify(data),
    auth: true,
  });
};

export const updateDefaultLocationEntry = async (
  markerId: string,
  entryId: string,
  data: UpdateDefaultLocationEntryInput,
): Promise<DefaultLocationEntry> => {
  return api<DefaultLocationEntry>(`/api/pins/default-locations/${markerId}/entries/${entryId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    auth: true,
  });
};

export const deleteDefaultLocationEntry = async (markerId: string, entryId: string): Promise<void> => {
  await api<void>(`/api/pins/default-locations/${markerId}/entries/${entryId}`, {
    method: 'DELETE',
    auth: true,
  });
};

export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  const data = await apiFormData<{ url: string }>('/api/images/upload', formData, {
    errorContext: 'upload',
  });
  const url = data.url as string;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return url.startsWith('/') ? url : `/${url}`;
};

export const filterPinsByType = (pins: Pin[], types: PinType[] | null): Pin[] => {
  if (!types || types.length === 0) return pins;
  return pins.filter(pin => types.includes(pin.type as PinType));
};

export const groupPinsByType = (pins: Pin[]): Record<PinType, Pin[]> => {
  const result = {} as Record<PinType, Pin[]>;
  pins.forEach(pin => {
    const pinType = pin.type as PinType;
    if (!result[pinType]) result[pinType] = [];
    result[pinType].push(pin);
  });
  return result;
};

export const groupPinsByStatus = (pins: Pin[]): Record<PinStatus, Pin[]> => {
  const result = {} as Record<PinStatus, Pin[]>;
  const allStatuses: PinStatus[] = ['reported', 'acknowledged', 'in_progress', 'resolved'];
  allStatuses.forEach(status => { result[status] = []; });

  pins.forEach(pin => {
    const pinStatus = pin.status as PinStatus;
    if (pinStatus && result[pinStatus]) result[pinStatus].push(pin);
  });
  return result;
};

export const calculatePersistenceStats = (pins: Pin[]) => {
  const unresolvedPins = pins.filter(pin => pin.status !== 'resolved');

  const totalDays = unresolvedPins.reduce((sum, pin) => sum + (pin.persistenceDays || 0), 0);
  const averageDays = unresolvedPins.length > 0 ? Math.round(totalDays / unresolvedPins.length) : 0;

  const maxPersistencePin = unresolvedPins.reduce(
    (max, pin) => (pin.persistenceDays || 0) > (max?.persistenceDays || 0) ? pin : max,
    null as Pin | null,
  );

  const dayRanges = [
    { label: '0-7 dias', count: 0 },
    { label: '8-14 dias', count: 0 },
    { label: '15-30 dias', count: 0 },
    { label: '30+ dias', count: 0 },
  ];

  unresolvedPins.forEach(pin => {
    const days = pin.persistenceDays || 0;
    if (days <= 7) dayRanges[0].count++;
    else if (days <= 14) dayRanges[1].count++;
    else if (days <= 30) dayRanges[2].count++;
    else dayRanges[3].count++;
  });

  return { averageDays, maxPersistencePin, totalUnresolved: unresolvedPins.length, dayRanges };
};

export const filterPinsByPersistence = (pins: Pin[], minDays: number, maxDays: number): Pin[] => {
  return pins.filter(pin => {
    const days = pin.persistenceDays || 0;
    return days >= minDays && (maxDays === 0 || days <= maxDays);
  });
};
