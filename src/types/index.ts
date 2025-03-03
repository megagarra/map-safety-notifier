
export type PinType = 'flood' | 'pothole' | 'passable' | 'robbery';

export interface Pin {
  id: string;
  type: PinType;
  location: {
    lat: number;
    lng: number;
  };
  description: string;
  images: string[];
  reportedAt: Date;
  address?: string;
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
