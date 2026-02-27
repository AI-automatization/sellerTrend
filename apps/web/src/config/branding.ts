/** Feature 14 — White-label branding configuration.
 *  Override via environment variables for custom deployments.
 */
export const branding = {
  appName: import.meta.env.VITE_APP_NAME || 'VENTRA',
  appFullName: import.meta.env.VITE_APP_FULL_NAME || 'VENTRA Analytics',
  appDescription: import.meta.env.VITE_APP_DESCRIPTION || 'Premium marketplace analytics platform',
  logoText: import.meta.env.VITE_LOGO_TEXT || 'V',
  logoSubtitle: import.meta.env.VITE_LOGO_SUBTITLE || 'Analytics Platform',
  primaryColor: import.meta.env.VITE_PRIMARY_COLOR || '#4C7DFF',
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'support@ventra.uz',
  marketplaceName: import.meta.env.VITE_MARKETPLACE_NAME || 'Uzum',
  marketplaceUrl: import.meta.env.VITE_MARKETPLACE_URL || 'https://uzum.uz',
};
