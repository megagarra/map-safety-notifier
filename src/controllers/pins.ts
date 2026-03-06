import { Pin, PinType, PinStatus, CreatePinInput } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'map-safety-pins';

const defaultPins: Pin[] = [
  {
    id: uuidv4(),
    type: 'flood',
    location: { lat: -23.5505, lng: -46.6333 },
    description: 'Alagamento na Avenida Paulista após forte chuva',
    images: [],
    reportedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    address: 'Av. Paulista, São Paulo',
    history: [{ status: 'reported', timestamp: new Date(Date.now() - 2 * 86400000).toISOString(), description: 'Problema reportado por usuário' }],
    status: 'reported',
    persistenceDays: 2,
    votes: 5,
    userVoted: false,
  },
  {
    id: uuidv4(),
    type: 'pothole',
    location: { lat: -23.5600, lng: -46.6500 },
    description: 'Buraco grande na pista, risco de acidente',
    images: [],
    reportedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    address: 'Rua Augusta, São Paulo',
    history: [{ status: 'reported', timestamp: new Date(Date.now() - 7 * 86400000).toISOString(), description: 'Problema reportado por usuário' }],
    status: 'acknowledged',
    persistenceDays: 7,
    votes: 12,
    userVoted: false,
  },
  {
    id: uuidv4(),
    type: 'robbery',
    location: { lat: -23.5450, lng: -46.6400 },
    description: 'Assalto a pedestres frequente nesta área à noite',
    images: [],
    reportedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    address: 'Praça da Sé, São Paulo',
    history: [{ status: 'reported', timestamp: new Date(Date.now() - 1 * 86400000).toISOString(), description: 'Problema reportado por usuário' }],
    status: 'reported',
    persistenceDays: 1,
    votes: 8,
    userVoted: false,
  },
  {
    id: uuidv4(),
    type: 'passable',
    location: { lat: -23.5550, lng: -46.6250 },
    description: 'Via com obras, transitável com cautela',
    images: [],
    reportedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    address: 'Rua da Consolação, São Paulo',
    history: [{ status: 'reported', timestamp: new Date(Date.now() - 14 * 86400000).toISOString(), description: 'Problema reportado por usuário' }],
    status: 'in_progress',
    persistenceDays: 14,
    votes: 3,
    userVoted: false,
  },
];

function loadPinsFromStorage(): Pin[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore parse errors
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPins));
  return [...defaultPins];
}

function savePinsToStorage(pins: Pin[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
}

export const fetchPins = async (_limit: number = 50): Promise<Pin[]> => {
  await new Promise(r => setTimeout(r, 300));
  return loadPinsFromStorage();
};

export const fetchPinById = async (id: string): Promise<Pin | null> => {
  const pins = loadPinsFromStorage();
  return pins.find(p => p.id === id) ?? null;
};

export const createPin = async (pin: CreatePinInput): Promise<Pin | null> => {
  const pins = loadPinsFromStorage();

  const newPin: Pin = {
    id: uuidv4(),
    ...pin,
    reportedAt: new Date().toISOString(),
    status: 'reported',
    votes: 0,
    userVoted: false,
    history: [
      {
        status: 'reported',
        timestamp: new Date().toISOString(),
        description: 'Problema reportado por usuário',
      },
    ],
    persistenceDays: 0,
  };

  pins.unshift(newPin);
  savePinsToStorage(pins);
  return newPin;
};

export const updatePin = async (id: string, updates: Partial<Pin>): Promise<Pin | null> => {
  const pins = loadPinsFromStorage();
  const index = pins.findIndex(p => p.id === id);
  if (index === -1) return null;

  pins[index] = { ...pins[index], ...updates };
  savePinsToStorage(pins);
  return pins[index];
};

export const voteOnPin = async (pinId: string): Promise<Pin | null> => {
  const pins = loadPinsFromStorage();
  const index = pins.findIndex(p => p.id === pinId);
  if (index === -1) return null;

  pins[index] = {
    ...pins[index],
    votes: (pins[index].votes || 0) + 1,
    userVoted: true,
  };

  savePinsToStorage(pins);
  return pins[index];
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
