import { api } from '@/lib/api';
import type { CityScore } from '@/types';

/** Public: one entry per city with its agencies and scoreboard. */
export const fetchCityScores = async (): Promise<CityScore[]> => api<CityScore[]>('/api/agencies');
