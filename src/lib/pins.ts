import { Pin, PinHistoryEntry } from '@/types';

const SYSTEM_HISTORY_PHRASES = [
  'marcador de local padrão configurado',
  'local padrão atualizado',
];

export function hasValidPinLocation(
  pin: Pin | null | undefined,
): pin is Pin & { location: { lat: number; lng: number } } {
  const lat = pin?.location?.lat;
  const lng = pin?.location?.lng;
  return typeof lat === 'number' && typeof lng === 'number' && !Number.isNaN(lat) && !Number.isNaN(lng);
}

/** Preserva location e campos ausentes quando a API retorna pin parcial (ex.: após bulk). */
export function mergePinUpdate(existing: Pin | undefined, incoming: Pin): Pin {
  if (!existing || existing.id !== incoming.id) return incoming;
  return {
    ...existing,
    ...incoming,
    location: hasValidPinLocation(incoming) ? incoming.location : existing.location,
    images: incoming.images ?? existing.images ?? [],
    history: incoming.history ?? existing.history ?? [],
  };
}

export function isDefaultLocationPin(pin: Pin): boolean {
  return pin.kind === 'default_location';
}

export function isPendingPin(pin: Pin): boolean {
  return pin.approvalStatus === 'pending';
}

export function isRejectedPin(pin: Pin): boolean {
  return pin.approvalStatus === 'rejected';
}

export function isApprovedPin(pin: Pin): boolean {
  return !pin.approvalStatus || pin.approvalStatus === 'approved' || isDefaultLocationPin(pin);
}

export function isSystemHistoryEntry(entry: PinHistoryEntry): boolean {
  const text = `${entry.description ?? ''} ${entry.comment ?? ''}`.toLowerCase();
  return SYSTEM_HISTORY_PHRASES.some((phrase) => text.includes(phrase));
}

export function getOccurrenceHistory(history: PinHistoryEntry[]): PinHistoryEntry[] {
  return history.filter((entry) => !isSystemHistoryEntry(entry));
}

export function getApprovalLabel(status?: string): string {
  switch (status) {
    case 'pending': return 'Pendente';
    case 'approved': return 'Aprovado';
    case 'rejected': return 'Rejeitado';
    default: return 'Aprovado';
  }
}

export function getApprovalClass(status?: string): string {
  switch (status) {
    case 'pending': return 'bg-yellow-500/20 text-yellow-400';
    case 'rejected': return 'bg-red-500/20 text-red-400';
    default: return 'bg-green-500/20 text-green-400';
  }
}
