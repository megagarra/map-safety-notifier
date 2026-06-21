import {
  Pin,
  PinType,
  PinStatus,
  CreatePinInput,
  UpdatePinInput,
  PaginatedResponse,
  MapBounds,
  PinStats,
} from '@/types';
import { api, apiFormData, buildQuery } from '@/lib/api';

export interface FetchPinsParams extends Partial<MapBounds> {
  limit?: number;
  offset?: number;
}

export const fetchPins = async (params: FetchPinsParams = {}): Promise<PaginatedResponse<Pin>> => {
  const { limit = 200, offset = 0, ...bounds } = params;
  return api<PaginatedResponse<Pin>>(
    buildQuery('/api/pins', { limit, offset, ...bounds }),
  );
};

export const fetchPinStats = async (): Promise<PinStats> => {
  return api<PinStats>('/api/pins/stats');
};

export const fetchPinById = async (id: string): Promise<Pin | null> => {
  try {
    return await api<Pin>(`/api/pins/${id}`);
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

export const deletePin = async (id: string): Promise<void> => {
  await api<void>(`/api/pins/${id}`, {
    method: 'DELETE',
    auth: true,
  });
};

export const voteOnPin = async (pinId: string): Promise<Pin> => {
  return api<Pin>(`/api/pins/${pinId}/vote`, { method: 'POST' });
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
