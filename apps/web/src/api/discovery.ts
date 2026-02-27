import { api } from './base';

export const discoveryApi = {
  startRun: (input: string | number) =>
    api.post('/discovery/run', { input: String(input) }),
  listRuns: () => api.get('/discovery/runs'),
  getRun: (id: string) => api.get(`/discovery/runs/${id}`),
  getLeaderboard: (categoryId?: number) =>
    api.get('/discovery/leaderboard', { params: categoryId ? { category_id: categoryId } : {} }),
};

export const seasonalApi = {
  getCalendar: () => api.get('/discovery/seasonal-calendar'),
  getUpcoming: () => api.get('/discovery/seasonal-calendar/upcoming'),
};

export const nicheApi = {
  findNiches: (categoryId?: number) =>
    api.get('/discovery/niches', { params: categoryId ? { category_id: categoryId } : {} }),
  findGaps: (categoryId?: number) =>
    api.get('/discovery/niches/gaps', { params: categoryId ? { category_id: categoryId } : {} }),
};
