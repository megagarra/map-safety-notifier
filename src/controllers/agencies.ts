import { api } from '@/lib/api';
import type { Agency } from '@/types';

/** Public: agencies with a headquarters on the map and their scoreboard. */
export const fetchAgencies = async (): Promise<Agency[]> => api<Agency[]>('/api/agencies');
