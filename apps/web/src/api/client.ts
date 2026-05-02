// Barrel re-export — all API clients split into modular files
// Existing imports from '../api/client' continue to work unchanged

export { api, getTokenPayload, isTokenValid } from './base';
export { authApi } from './auth';
export { productsApi, uzumApi, achievementsApi, predictionsApi } from './products';
export { discoveryApi, seasonalApi, nicheApi, categoryIntelligenceApi } from './discovery';
export { toolsApi, leaderboardApi, shopsApi, referralApi, apiKeysApi, exportApi } from './tools';
export { consultationApi, signalsApi, adsApi, teamApi, reportsApi, watchlistApi, communityApi } from './enterprise';
export { adminApi, feedbackApi, notificationApi } from './admin';
export { competitorApi } from './competitor';
