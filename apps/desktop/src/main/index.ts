import { app } from 'electron';
import { createMainWindow, getMainWindow } from './window';
import { createTray } from './tray';
import { registerIpcHandlers } from './ipc';
import { initUpdater } from './updater';

// Extend app with isQuitting flag for tray behavior
declare module 'electron' {
  interface App {
    isQuitting?: boolean;
  }
}

// Single instance lock — prevent multiple app windows
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

app.on('second-instance', () => {
  const win = getMainWindow();
  if (win) {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }
});

app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();
  createTray();
  initUpdater();
});

// Keep app running in tray when all windows closed
app.on('window-all-closed', () => {
  // Don't quit — tray keeps app alive
});

app.on('activate', () => {
  // macOS: re-create window when dock icon clicked
  const win = getMainWindow();
  if (!win) {
    createMainWindow();
  } else {
    win.show();
  }
});
