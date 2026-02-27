import { ipcMain, Notification, app } from 'electron';

export function registerIpcHandlers(): void {
  // Show native OS notification
  ipcMain.handle('ventra:notify', (_event, title: string, body: string) => {
    if (Notification.isSupported()) {
      const notification = new Notification({ title, body });
      notification.show();
    }
  });

  // Return platform info
  ipcMain.handle('ventra:platform', () => {
    return {
      platform: process.platform,
      version: app.getVersion(),
      name: app.getName(),
    };
  });

  // Toggle auto-launch on system boot
  ipcMain.handle('ventra:auto-launch', (_event, enabled: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      name: 'VENTRA',
    });
    return { success: true, enabled };
  });

  // Set badge count (macOS dock badge)
  ipcMain.handle('ventra:badge', (_event, count: number) => {
    if (process.platform === 'darwin') {
      app.setBadgeCount(count);
    }
    return { success: true };
  });
}
