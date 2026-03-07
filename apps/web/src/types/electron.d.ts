interface VentraDesktop {
  isDesktop: boolean;
  notify(title: string, body: string): Promise<void>;
  getPlatform(): Promise<{ platform: string; version: string; name: string }>;
  setAutoLaunch(enabled: boolean): Promise<{ success: boolean; enabled: boolean }>;
  setBadge(count: number): Promise<{ success: boolean }>;
  onUpdateAvailable(cb: (info: { version: string; releaseDate?: string }) => void): void;
  onUpdateDownloaded(cb: (info: { version: string }) => void): void;
}

/** Telegram WebApp SDK — injected by Telegram Mini App container */
interface TelegramWebApp {
  ready(): void;
  expand(): void;
  close(): void;
  initData: string;
  initDataUnsafe: Record<string, unknown>;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  MainButton: {
    text: string;
    show(): void;
    hide(): void;
    onClick(cb: () => void): void;
  };
}

declare global {
  interface Window {
    ventraDesktop?: VentraDesktop;
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export {};
