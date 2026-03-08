/**
 * Platform configuration for Bright Data Web Scraper API.
 * Dataset IDs can be overridden via env: BRIGHT_DATA_DATASET_{PLATFORM}.
 */
export const PLATFORMS_CONFIG = {
  aliexpress: {
    name: 'AliExpress',
    color: '#E62E04',
    datasetId: 'gd_lbfx0t0jocdwx1ops5',
  },
  '1688': {
    name: '1688.com',
    color: '#FF6A00',
    datasetId: 'gd_l1688products',
  },
  taobao: {
    name: 'Taobao',
    color: '#FF5000',
    datasetId: 'gd_ltaobao',
  },
} as const;

export type PlatformKey = keyof typeof PLATFORMS_CONFIG;

/** All supported platform keys */
export const PLATFORM_KEYS: PlatformKey[] = ['aliexpress', '1688', 'taobao'];
