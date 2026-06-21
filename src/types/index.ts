export type PinType = 'infraestrutura' | 'crime';

export type PinKind = 'normal' | 'default_location';

export type PinStatus = 'reported' | 'acknowledged' | 'in_progress' | 'resolved';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

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
  kind?: PinKind;
  approvalStatus?: ApprovalStatus;
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
  entryCount?: number;
  neighborhood?: string;
  rejectionReason?: string;
}

export interface DefaultLocationEntry {
  id: string;
  type: PinType;
  description: string;
  quantity: number;
  comment?: string;
  images: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface DefaultLocationEntriesResponse {
  items: DefaultLocationEntry[];
  totalQuantity: number;
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

export interface CreateDefaultLocationInput {
  neighborhood: string;
  type: PinType;
  location: { lat: number; lng: number };
  description: string;
  address?: string;
}

export interface UpdateDefaultLocationInput {
  neighborhood?: string;
  type?: PinType;
  location?: { lat: number; lng: number };
  description?: string;
  address?: string | null;
}

export interface DefaultLocationEntryInput {
  type: PinType;
  description: string;
  quantity?: number;
  images?: string[];
  comment?: string;
}

export interface BulkDefaultLocationEntryItem {
  type: PinType;
  description: string;
  quantity: number;
  comment?: string;
}

export interface BulkDefaultLocationEntriesInput {
  entries: BulkDefaultLocationEntryItem[];
}

export interface UpdateDefaultLocationEntryInput {
  type?: PinType;
  description?: string;
  quantity?: number;
  comment?: string;
  images?: string[];
}

export interface UpdatePinInput {
  status?: PinStatus;
  description?: string;
  address?: string | null;
  comment?: string;
}

export interface AdminPinLocationInput {
  location: { lat: number; lng: number };
}

export interface RejectPinInput {
  reason: string;
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

export type UserRole = 'admin' | 'moderator' | 'user';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  isActive: boolean;
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
  pendingCount: number;
  byStatus: Record<PinStatus, number>;
  dayRanges: { label: string; count: number }[];
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
  password?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  role: UserRole;
  name?: string;
}
