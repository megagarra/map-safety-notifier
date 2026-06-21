import { DefaultLocationEntry } from '@/types';

export function getEntryLabel(entry: DefaultLocationEntry): string {
  return entry.crimeTypeLabel ?? entry.description ?? 'Sem descrição';
}
