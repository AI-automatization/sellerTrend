interface VentraDesktop {
  isDesktop: boolean;
  notify(title: string, body: string): Promise<void>;
  getPlatform(): Promise<{ platform: string; version: string; name: string }>;
  setAutoLaunch(enabled: boolean): Promise<{ success: boolean; enabled: boolean }>;
  setBadge(count: number): Promise<{ success: boolean }>;
  onUpdateAvailable(cb: (info: { version: string; releaseDate?: string }) => void): void;
  onUpdateDownloaded(cb: (info: { version: string }) => void): void;
}

declare global {
  interface Window {
    ventraDesktop?: VentraDesktop;
  }
}

export {};
