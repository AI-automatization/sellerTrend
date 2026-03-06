import { Tray, Menu, nativeImage, app } from 'electron';
import { join } from 'path';
import { getMainWindow } from './window';

// T-320: Typed app state — avoid (app as any)
declare module 'electron' {
  interface App {
    isQuitting?: boolean;
  }
}

let tray: Tray | null = null;

export function createTray(): void {
  const iconPath = join(__dirname, '../../resources/icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });

  tray = new Tray(icon);
  tray.setToolTip('VENTRA Analytics');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'VENTRA Analytics',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Show Window',
      click: () => {
        const win = getMainWindow();
        if (win) {
          win.show();
          win.focus();
        }
      },
    },
    {
      label: 'Hide Window',
      click: () => {
        const win = getMainWindow();
        if (win) win.hide();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit VENTRA',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Click tray icon → toggle window visibility
  tray.on('click', () => {
    const win = getMainWindow();
    if (!win) return;
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
      win.focus();
    }
  });
}
