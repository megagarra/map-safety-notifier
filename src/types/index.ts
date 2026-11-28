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
  crimeTypeId?: string | null;
  crimeTypeLabel?: string | null;
  stillThereCount?: number;
  resolvedReports?: number;
  userFeedback?: 'still' | 'resolved' | null;
  reporterKey?: string | null;
  archived?: boolean;
  possibleDuplicates?: { id: string; distanceM: number; approvalStatus: string; reportedAt: string }[] | null;
  status: PinStatus;
  persistenceDays?: number;
  votes?: number;
  userVoted?: boolean;
  entryCount?: number;
  neighborhood?: string;
  periodLabel?: string;
  asOfDate?: string;
  rejectionReason?: string;
  /** Moderation only: public reports by reason */
  flags?: Partial<Record<FlagReason, number>> | null;
  /** Moderation only: same sender's reports by status (+ blocked=1) */
  reporterStats?: { pending?: number; approved?: number; rejected?: number; blocked?: number } | null;
  /** Moderation only: automatic notes */
  moderationHints?: string[] | null;
  /** Public answer from a city hall / guard / police account */
  officialResponse?: OfficialResponse | null;
  /** Partner who sent it (shown publicly with name and photo) */
  author?: { name: string; avatarUrl?: string | null; partner: boolean } | null;
}

export interface CrimeType {
  id: string;
  label: string;
  sortOrder: number;
}

export interface DefaultLocationEntry {
  id?: string;
  type?: PinType;
  description?: string;
  quantity: number;
  crimeTypeId?: string;
  crimeTypeLabel?: string;
  comment?: string;
  images?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DefaultLocationEntriesResponse {
  items: DefaultLocationEntry[];
  total?: number;
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
  crimeTypeId?: string;
  /** Honeypot (must stay empty) */
  website?: string;
}

export interface CreateDefaultLocationInput {
  neighborhood: string;
  type: PinType;
  location: { lat: number; lng: number };
  description: string;
  address?: string;
  periodLabel?: string;
  asOfDate?: string;
}

export interface UpdateDefaultLocationInput {
  neighborhood?: string;
  type?: PinType;
  location?: { lat: number; lng: number };
  description?: string;
  address?: string | null;
  periodLabel?: string | null;
  asOfDate?: string | null;
}

export interface DefaultLocationEntryInput {
  type: PinType;
  description?: string;
  crimeTypeId?: string;
  quantity?: number;
  images?: string[];
  comment?: string;
}

export interface BulkDefaultLocationEntryItem {
  type: PinType;
  quantity: number;
  description?: string;
  crimeTypeId?: string;
  comment?: string;
}

export interface BulkDefaultLocationEntriesInput {
  entries: BulkDefaultLocationEntryItem[];
}

export interface UpdateDefaultLocationEntryInput {
  type?: PinType;
  description?: string;
  crimeTypeId?: string;
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
  /** Block the sender from new reports for blockDays days */
  blockReporter?: boolean;
  blockDays?: number;
  /** Also reject the sender's other pending reports */
  rejectOthers?: boolean;
}

export type FlagReason = 'falso' | 'ofensivo' | 'propaganda' | 'duplicado' | 'outro';

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

export type UserRole = 'admin' | 'moderator' | 'user' | 'agency' | 'partner';

export type AgencyKind = 'prefeitura' | 'guarda' | 'policia' | 'outro';

export interface OfficialResponse {
  org: string;
  kind?: AgencyKind | 'admin' | null;
  status: PinStatus;
  comment?: string | null;
  at?: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  isActive: boolean;
  /** Agency accounts only */
  organization?: string | null;
  agencyKind?: AgencyKind | null;
  answerTypes?: PinType[] | null;
  hqLat?: number | null;
  hqLng?: number | null;
  hqAddress?: string | null;
  serviceRadiusKm?: number | null;
  city?: string | null;
  avatarUrl?: string | null;
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

export interface AnalyticsOverview {
  totalPins?: number;
  pendingCount?: number;
  approvedCount?: number;
  rejectedCount?: number;
  pinsByType?: { type: string; label?: string; count: number }[];
  neighborhoodStats?: {
    neighborhood: string;
    entryCount: number;
    markerId?: string;
    periodLabel?: string;
  }[];
  weeklyTrend?: { week: string; label?: string; count: number }[];
  averageApprovalHours?: number;
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
  password?: string;
  organization?: string;
  agencyKind?: AgencyKind;
  answerTypes?: PinType[];
  hqLat?: number | null;
  hqLng?: number | null;
  hqAddress?: string | null;
  serviceRadiusKm?: number | null;
  city?: string | null;
  avatarUrl?: string | null;
}

export interface RegisterInput {
  email: string;
  password: string;
  role: UserRole;
  name?: string;
  organization?: string;
  agencyKind?: AgencyKind;
  answerTypes?: PinType[];
  hqLat?: number | null;
  hqLng?: number | null;
  hqAddress?: string | null;
  serviceRadiusKm?: number | null;
  city?: string | null;
  avatarUrl?: string | null;
}

export interface ReportCounts {
  total: number;
  resolved: number;
  inProgress: number;
  unanswered: number;
}

/** A public agency inside a city's building, with what it answered itself. */
export interface Agency {
  id: string;
  organization: string;
  kind: AgencyKind;
  answerTypes: PinType[];
  address?: string | null;
  radiusKm: number;
  stats: { answered: number; resolved: number; medianResponseHours?: number | null; lastAnswerAt?: string | null };
}

/** One building per city: published reports in the area of its agencies (computed by the server). */
export interface CityScore {
  city: string;
  lat: number;
  lng: number;
  radiusKm: number;
  stats: ReportCounts;
  resolvedRate: number;
  last30: ReportCounts;
  byType: Partial<Record<PinType, ReportCounts>>;
  agencies: Agency[];
}
