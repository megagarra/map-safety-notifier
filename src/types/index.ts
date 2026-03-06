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
