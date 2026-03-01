// L-020: Lightweight analytics — works with Plausible (index.html script)
// or any window.plausible-compatible analytics

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, string> }) => void;
  }
}

export function useAnalytics() {
  function track(event: string, props?: Record<string, string>) {
    if (typeof window.plausible === 'function') {
      window.plausible(event, { props });
    }
    // Fallback: log in development only
    if (import.meta.env.DEV) {
      console.info('[analytics]', event, props);
    }
  }

  return { track };
}
