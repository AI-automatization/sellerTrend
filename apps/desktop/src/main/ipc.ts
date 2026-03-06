import { ipcMain, Notification, app } from 'electron';

export function registerIpcHandlers(): void {
  // Show native OS notification
  // T-325: Validate title and body before passing to OS
  ipcMain.handle('ventra:notify', (_event, title: unknown, body: unknown) => {
    if (typeof title !== 'string' || typeof body !== 'string') return;
    const safeTitle = title.slice(0, 100).trim();
    const safeBody = body.slice(0, 300).trim();
    if (!safeTitle) return;
    if (Notification.isSupported()) {
      const notification = new Notification({ title: safeTitle, body: safeBody });
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
  // T-326: Validate count — must be a non-negative integer
  ipcMain.handle('ventra:badge', (_event, count: unknown) => {
    if (typeof count !== 'number' || !Number.isFinite(count)) return { success: false };
    const safeCount = Math.max(0, Math.floor(count));
    if (process.platform === 'darwin') {
      app.setBadgeCount(safeCount);
    }
    return { success: true };
  });
}
