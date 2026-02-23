/** Feature 14 — White-label branding configuration.
 *  Override via environment variables for custom deployments.
 */
export const branding = {
  appName: import.meta.env.VITE_APP_NAME || 'Uzum Trend',
  appFullName: import.meta.env.VITE_APP_FULL_NAME || 'Uzum Trend Finder',
  appDescription: import.meta.env.VITE_APP_DESCRIPTION || 'Uzum.uz marketplace analytics SaaS platform',
  logoText: import.meta.env.VITE_LOGO_TEXT || 'U',
  logoSubtitle: import.meta.env.VITE_LOGO_SUBTITLE || 'Analytics SaaS',
  primaryColor: import.meta.env.VITE_PRIMARY_COLOR || '#6419e6',
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'support@uzum-trend.uz',
  marketplaceName: import.meta.env.VITE_MARKETPLACE_NAME || 'Uzum',
  marketplaceUrl: import.meta.env.VITE_MARKETPLACE_URL || 'https://uzum.uz',
};
