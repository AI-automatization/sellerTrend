import { api } from './base';

export const discoveryApi = {
  startRun: (input: string | number, categoryName?: string, fromSearch?: boolean) =>
    api.post('/discovery/run', {
      input: String(input),
      ...(categoryName ? { categoryName } : {}),
      ...(fromSearch !== undefined ? { fromSearch } : {}),
    }, { timeout: 60_000 }),
  listRuns: () => api.get('/discovery/runs'),
  getRun: (id: string) => api.get(`/discovery/runs/${id}`),
  deleteRun: (id: string) => api.delete(`/discovery/runs/${id}`),
  getLeaderboard: (categoryId?: number) =>
    api.get('/discovery/leaderboard', { params: categoryId ? { category_id: categoryId } : {} }),
  searchCategories: (q: string) =>
    api.get<Array<{ id: number; title: string }>>('/discovery/categories/search', { params: { q } }),
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
