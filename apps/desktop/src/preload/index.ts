import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('ventraDesktop', {
  isDesktop: true,

  /** Show a native OS notification */
  notify: (title: string, body: string) =>
    ipcRenderer.invoke('ventra:notify', title, body),

  /** Get platform info (platform, version, name) */
  getPlatform: () => ipcRenderer.invoke('ventra:platform'),

  /** Toggle auto-launch on system boot */
  setAutoLaunch: (enabled: boolean) =>
    ipcRenderer.invoke('ventra:auto-launch', enabled),

  /** Set dock badge count (macOS) */
  setBadge: (count: number) => ipcRenderer.invoke('ventra:badge', count),

  /** Listen for update-available events from main process */
  onUpdateAvailable: (cb: (info: { version: string; releaseDate?: string }) => void) => {
    ipcRenderer.on('update-available', (_event, info) => cb(info));
  },

  /** Listen for update-downloaded events from main process */
  onUpdateDownloaded: (cb: (info: { version: string }) => void) => {
    ipcRenderer.on('update-downloaded', (_event, info) => cb(info));
  },
});
