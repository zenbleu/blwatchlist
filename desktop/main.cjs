const path = require('node:path');
const { app, BrowserWindow } = require('electron');

const REMOTE_APP_URL = 'https://howyoulikethatbitch.github.io/blwatchlist/';

function getBundledDistPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'app-dist')
    : path.join(__dirname, '..', 'app', 'dist');
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: '#0a0a0a',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  let usingLocalFallback = false;
  const loadLocalFallback = () => {
    if (usingLocalFallback || window.isDestroyed()) return;
    usingLocalFallback = true;
    window.loadFile(path.join(getBundledDistPath(), 'index.html'));
  };

  // Online launches use the canonical PWA origin. This preserves the
  // service-worker cache and the app's existing in-app update prompt.
  window.webContents.on(
    'did-fail-load',
    (_event, _errorCode, _errorDescription, validatedURL, isMainFrame) => {
      if (isMainFrame && validatedURL.startsWith(REMOTE_APP_URL)) {
        loadLocalFallback();
      }
    },
  );

  window.loadURL(REMOTE_APP_URL).catch(loadLocalFallback);
  return window;
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});