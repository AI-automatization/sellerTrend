import { autoUpdater } from 'electron-updater';
import { BrowserWindow } from 'electron';

const UPDATE_CHECK_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours

export function initUpdater(): void {
  // Disable auto-download — let user decide
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    if (win) {
      win.webContents.send('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    if (win) {
      win.webContents.send('update-downloaded', {
        version: info.version,
      });
    }
  });

  autoUpdater.on('error', (err) => {
    // Silently log update errors — don't crash the app
    console.error('Auto-updater error:', err.message);
  });

  // Check on launch
  autoUpdater.checkForUpdates().catch(() => {});

  // Check periodically
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, UPDATE_CHECK_INTERVAL);
}
