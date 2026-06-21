export type PinType = 'infraestrutura' | 'crime';

export type PinStatus = 'reported' | 'acknowledged' | 'in_progress' | 'resolved';

export interface PinHistoryEntry {
  status: PinStatus;
  timestamp: string;
  date?: string;
  description?: string;
  comment?: string;
}

export interface Pin {
  id: string;
  type: PinType;
  location: {
    lat: number;
    lng: number;
  };
  description: string;
  images: string[];
  reportedAt: string;
  address?: string;
  history: PinHistoryEntry[];
  status: PinStatus;
  persistenceDays?: number;
  votes?: number;
  userVoted?: boolean;
}

export interface CreatePinInput {
  type: PinType;
  location: {
    lat: number;
    lng: number;
  };
  description: string;
  images: string[];
  address?: string;
}

export interface UpdatePinInput {
  status?: PinStatus;
  description?: string;
  address?: string | null;
  comment?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface MapBounds {
  lat_min: number;
  lat_max: number;
  lng_min: number;
  lng_max: number;
}

export type UserRole = 'admin' | 'moderator';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface PinStats {
  total: number;
  unresolved: number;
  averagePersistenceDays: number;
  byStatus: Record<PinStatus, number>;
  dayRanges: { label: string; count: number }[];
}
