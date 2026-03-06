import { autoUpdater } from 'electron-updater';
import { BrowserWindow } from 'electron';
import log from 'electron-log';

const UPDATE_CHECK_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours

// T-323: Track interval so it can be cleared on app quit
let updateIntervalId: ReturnType<typeof setInterval> | null = null;

export function stopUpdater(): void {
  if (updateIntervalId) {
    clearInterval(updateIntervalId);
    updateIntervalId = null;
  }
}

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
    // T-322: Use electron-log instead of console.error
    log.error('Auto-updater error:', err.message);
  });

  // Check on launch
  autoUpdater.checkForUpdates().catch(() => {});

  // T-323: Store interval ref for cleanup
  updateIntervalId = setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, UPDATE_CHECK_INTERVAL);
}
