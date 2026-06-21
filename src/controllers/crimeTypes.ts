import { CrimeType } from '@/types';
import { api } from '@/lib/api';
import { unwrapApiList } from '@/lib/apiList';

export const fetchCrimeTypes = async (): Promise<CrimeType[]> => {
  const data = await api<CrimeType[] | { items: CrimeType[] }>('/api/crime-types');
  const items = unwrapApiList<CrimeType>(data);
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
};
