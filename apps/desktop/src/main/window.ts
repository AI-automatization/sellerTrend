import { BrowserWindow, protocol, net, app } from 'electron';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { existsSync } from 'fs';

let mainWindow: BrowserWindow | null = null;
let protocolRegistered = false;

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

function registerAppProtocol(): void {
  if (protocolRegistered) return;
  protocolRegistered = true;

  protocol.handle('app', (req) => {
    const url = new URL(req.url);
    let pathname = decodeURIComponent(url.pathname);

    // Bypass: proxy API requests to the real backend server
    if (pathname.startsWith('/api/')) {
      const apiBase = process.env.VITE_API_URL || 'http://localhost:3000';
      return net.fetch(`${apiBase}${pathname}${url.search || ''}`, {
        method: req.method,
        headers: req.headers,
        body: req.body,
      });
    }

    // Normalize: remove leading slash, handle empty/root path
    if (pathname.startsWith('/')) pathname = pathname.slice(1);
    if (!pathname || pathname === '.') pathname = 'index.html';

    const rendererDir = join(__dirname, '../renderer');
    let filePath = join(rendererDir, pathname);

    // SPA fallback: serve index.html for routes that don't map to files
    if (!existsSync(filePath)) {
      filePath = join(rendererDir, 'index.html');
    }

    return net.fetch(pathToFileURL(filePath).href);
  });
}

export function createMainWindow(): BrowserWindow {
  registerAppProtocol();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'VENTRA',
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  });

  // Show when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Hide instead of close (minimize to tray)
  mainWindow.on('close', (e) => {
    if (!(app as any).isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Dev: load from Vite dev server; Prod: load from custom protocol
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadURL('app://./index.html');
  }

  return mainWindow;
}
