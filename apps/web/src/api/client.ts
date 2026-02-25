// Barrel re-export — all API clients split into modular files
// Existing imports from '../api/client' continue to work unchanged

export { api, getTokenPayload } from './base';
export { authApi } from './auth';
export { productsApi, uzumApi, billingApi } from './products';
export { discoveryApi, seasonalApi, nicheApi } from './discovery';
export { sourcingApi } from './sourcing';
export { toolsApi, leaderboardApi, shopsApi, referralApi, apiKeysApi, exportApi } from './tools';
export { consultationApi, signalsApi, adsApi, teamApi, reportsApi, watchlistApi, communityApi } from './enterprise';
export { adminApi, feedbackApi, notificationApi } from './admin';
