import {
  Pin,
  PinType,
  PinStatus,
  CreatePinInput,
  UpdatePinInput,
  PaginatedResponse,
  MapBounds,
  PinStats,
  DefaultLocationInput,
  DefaultLocationEntryInput,
  DefaultLocationEntry,
  UpdateDefaultLocationEntryInput,
  AdminPinLocationInput,
  RejectPinInput,
} from '@/types';
import { api, apiFormData, buildQuery } from '@/lib/api';
import { ApiError } from '@/lib/errors';

export interface FetchPinsParams extends Partial<MapBounds> {
  limit?: number;
  offset?: number;
  auth?: boolean;
}

export const fetchPins = async (params: FetchPinsParams = {}): Promise<PaginatedResponse<Pin>> => {
  const { limit = 200, offset = 0, auth = false, ...bounds } = params;
  return api<PaginatedResponse<Pin>>(
    buildQuery('/api/pins', { limit, offset, ...bounds }),
    { auth },
  );
};

export const fetchPendingModeration = async (): Promise<Pin[]> => {
  return api<Pin[]>('/api/pins/moderation/pending', { auth: true });
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

export const createPin = async (pin: CreatePinInput): Promise<Pin> => {
  return api<Pin>('/api/pins', {
    method: 'POST',
    body: JSON.stringify(pin),
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

export const fetchDefaultLocation = async (): Promise<Pin | null> => {
  try {
    return await api<Pin>('/api/pins/default-location');
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
};

export const upsertDefaultLocation = async (data: DefaultLocationInput): Promise<Pin> => {
  return api<Pin>('/api/pins/default-location', {
    method: 'PUT',
    body: JSON.stringify(data),
    auth: true,
  });
};

export const deleteDefaultLocation = async (): Promise<void> => {
  await api<void>('/api/pins/default-location', {
    method: 'DELETE',
    auth: true,
  });
};

export const fetchDefaultLocationEntries = async (): Promise<DefaultLocationEntry[]> => {
  return api<DefaultLocationEntry[]>('/api/pins/default-location/entries');
};

export const addDefaultLocationEntry = async (data: DefaultLocationEntryInput): Promise<Pin> => {
  return api<Pin>('/api/pins/default-location/entries', {
    method: 'POST',
    body: JSON.stringify(data),
    auth: true,
  });
};

export const updateDefaultLocationEntry = async (
  entryId: string,
  data: UpdateDefaultLocationEntryInput,
): Promise<DefaultLocationEntry> => {
  return api<DefaultLocationEntry>(`/api/pins/default-location/entries/${entryId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    auth: true,
  });
};

export const deleteDefaultLocationEntry = async (entryId: string): Promise<void> => {
  await api<void>(`/api/pins/default-location/entries/${entryId}`, {
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
