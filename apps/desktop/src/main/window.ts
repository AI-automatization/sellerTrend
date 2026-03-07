import { BrowserWindow, protocol, net, app, session, shell } from 'electron';
import { join, resolve, relative, isAbsolute } from 'path';
import { pathToFileURL } from 'url';
import { existsSync } from 'fs';
import log from 'electron-log';

// T-320: Typed app state — avoid (app as any)
declare module 'electron' {
  interface App {
    isQuitting?: boolean;
  }
}

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

    // Proxy API requests to backend — T-318: validate origin before proxying
    if (pathname.startsWith('/api/')) {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const safeUrl = new URL(pathname + (url.search || ''), apiBase);
      if (safeUrl.origin !== new URL(apiBase).origin) {
        return new Response('Forbidden', { status: 403 });
      }
      return net.fetch(safeUrl.href, {
        method: req.method,
        headers: req.headers,
        body: req.body,
      });
    }

    // Normalize: remove leading slash, handle empty/root path
    if (pathname.startsWith('/')) pathname = pathname.slice(1);
    if (!pathname || pathname === '.') pathname = 'index.html';

    const rendererDir = resolve(join(__dirname, '../renderer'));
    const filePath = resolve(join(rendererDir, pathname));

    // T-317: Path traversal — ensure resolved path stays within rendererDir
    const rel = relative(rendererDir, filePath);
    if (rel.startsWith('..') || isAbsolute(rel)) {
      return new Response('Forbidden', { status: 403 });
    }

    // SPA fallback: serve index.html for routes that don't map to files
    const finalPath = existsSync(filePath) ? filePath : join(rendererDir, 'index.html');
    return net.fetch(pathToFileURL(finalPath).href);
  });
}

// T-316: Content Security Policy — prevent arbitrary script/resource loading
function setupCSP(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' app:; " +
          "script-src 'self' 'unsafe-inline'; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "img-src 'self' app: data: https:; " +
          "connect-src 'self' app: http://localhost:* ws://localhost:* wss://localhost:* https://app.ventra.uz https://*.ventra.uz; " +
          "font-src 'self' app: data: https://fonts.gstatic.com;",
        ],
      },
    });
  });
}

// T-327: Block dangerous permission requests — analytics app needs none of these
const DENIED_PERMISSIONS = new Set([
  'media',
  'geolocation',
  'notifications',
  'midiSysex',
  'pointerLock',
  'fullscreen',
  'openExternal',
  'clipboard-sanitized-write',
]);

function setupPermissionHandler(): void {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(!DENIED_PERMISSIONS.has(permission));
  });
}

export function createMainWindow(): BrowserWindow {
  registerAppProtocol();
  setupCSP();
  setupPermissionHandler();

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
      sandbox: true, // T-315: Enable Chromium sandbox
    },
    show: false,
  });

  // Show when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Hide instead of close (minimize to tray)
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // T-319: Block unwanted navigation — only allow app:// and localhost
  mainWindow.webContents.on('will-navigate', (e, navUrl) => {
    const isAllowed =
      navUrl.startsWith('app://') ||
      navUrl.startsWith('http://localhost') ||
      navUrl.startsWith('https://localhost');
    if (!isAllowed) e.preventDefault();
  });

  // T-319: Block new windows — open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const isExternal = !url.startsWith('app://') && !url.startsWith('http://localhost');
    if (isExternal) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Block DevTools in production
  if (!process.env.ELECTRON_RENDERER_URL) {
    mainWindow.webContents.on('before-input-event', (e, input) => {
      const isDevTools =
        (input.key === 'F12') ||
        (input.control && input.shift && input.key === 'I') ||
        (input.meta && input.alt && input.key === 'I');
      if (isDevTools) e.preventDefault();
    });
  }

  // Dev: load from Vite dev server; Prod: load from custom protocol
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL).catch((err) => {
      log.error('Failed to load dev URL:', err);
    });
  } else {
    mainWindow.loadURL('app://./' ).catch((err) => {
      log.error('Failed to load app URL:', err);
    });
  }

  return mainWindow;
}
