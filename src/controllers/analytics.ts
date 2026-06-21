import { AnalyticsOverview } from '@/types';
import { api } from '@/lib/api';

export const fetchAnalyticsOverview = async (): Promise<AnalyticsOverview> => {
  return api<AnalyticsOverview>('/api/analytics/overview', { auth: true });
};
