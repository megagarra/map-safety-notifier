
export type PinType = 'flood' | 'pothole' | 'passable' | 'robbery' | 'infraestrutura' | 'crime' | 'security' | 'client';

export type PinStatus = 'reported' | 'acknowledged' | 'in_progress' | 'resolved';

export type SecurityServiceStatus = 'requested' | 'accepted' | 'in_progress' | 'completed';

export interface PinHistoryEntry {
  status: PinStatus;
  timestamp: string;
  date?: string; // Keeping for backward compatibility
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
  reportedAt: string | Date;
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
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'client' | 'security';
  rating?: number;
  image?: string;
}

export interface ServiceRequest {
  id: string;
  clientId: string;
  clientName: string;
  securityId?: string;
  securityName?: string;
  location: {
    lat: number;
    lng: number;
  };
  destinationLocation?: {
    lat: number;
    lng: number;
  };
  status: SecurityServiceStatus;
  requestedAt: string;
  scheduledFor?: string;
  completedAt?: string;
  description: string;
  price?: number;
  rating?: number;
  feedback?: string;
}
