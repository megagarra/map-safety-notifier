import { Pin, PinHistoryEntry } from '@/types';

const SYSTEM_HISTORY_PHRASES = [
  'marcador de local padrão configurado',
  'local padrão atualizado',
];

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
