const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { app, BrowserWindow, ipcMain } = require('electron');

const REMOTE_APP_URL = 'https://zenbleu.github.io/blwatchlist/';
const UPDATE_MANIFEST_URL = `${REMOTE_APP_URL}update-manifest.json`;
const GITHUB_RELEASE_URL = 'https://api.github.com/repos/zenbleu/blwatchlist/releases/latest';

function getBundledDistPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'app-dist')
    : path.join(__dirname, '..', 'app', 'dist');
}

let mainWindow = null;
let availableUpdate = null;
let downloadAbortController = null;
let downloadedInstallerPath = null;

function compareVersions(left, right) {
  const normalize = (value) => value.replace(/^v/i, '').split('.').map((part) => Number.parseInt(part, 10) || 0);
  const a = normalize(left);
  const b = normalize(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if ((a[index] || 0) !== (b[index] || 0)) return (a[index] || 0) - (b[index] || 0);
  }
  return 0;
}

function sendUpdateProgress(progress) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('updater:progress', progress);
}

async function checkForUpdate() {
  if (process.platform !== 'win32') return null;

  const response = await fetch(`${UPDATE_MANIFEST_URL}?t=${Date.now()}`, {
    headers: { 'cache-control': 'no-cache' },
  });
  let manifest;
  if (response.ok) {
    manifest = await response.json();
  } else {
    const releaseResponse = await fetch(GITHUB_RELEASE_URL, {
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': 'BL-Watchlist-Desktop-Updater',
      },
    });
    if (!releaseResponse.ok) throw new Error(`Update feed returned HTTP ${releaseResponse.status}`);
    const release = await releaseResponse.json();
    const installer = Array.isArray(release.assets)
      ? release.assets.find((asset) => typeof asset.browser_download_url === 'string' && /\.exe$/i.test(asset.name || ''))
      : null;
    if (!installer || typeof release.tag_name !== 'string') return null;
    manifest = {
      version: release.tag_name,
      downloadUrl: installer.browser_download_url,
      releaseNotes: typeof release.body === 'string' ? release.body : '',
    };
  }

  if (
    !manifest ||
    typeof manifest.version !== 'string' ||
    typeof manifest.downloadUrl !== 'string' ||
    compareVersions(manifest.version, app.getVersion()) <= 0
  ) {
    return null;
  }

  const downloadUrl = new URL(manifest.downloadUrl);
  if (downloadUrl.protocol !== 'https:') {
    throw new Error('Update URL must use HTTPS');
  }

  availableUpdate = {
    version: manifest.version,
    downloadUrl: downloadUrl.toString(),
    sha256: typeof manifest.sha256 === 'string' ? manifest.sha256.toLowerCase() : null,
    releaseNotes: typeof manifest.releaseNotes === 'string' ? manifest.releaseNotes : '',
  };
  downloadedInstallerPath = null;

  return {
    currentVersion: app.getVersion(),
    version: availableUpdate.version,
    releaseNotes: availableUpdate.releaseNotes,
  };
}

async function downloadUpdate() {
  if (!availableUpdate) throw new Error('No update is available');

  downloadAbortController?.abort();
  downloadAbortController = new AbortController();
  const { signal } = downloadAbortController;
  const response = await fetch(availableUpdate.downloadUrl, { signal });
  if (!response.ok || !response.body) {
    throw new Error(`Update download returned HTTP ${response.status}`);
  }

  const totalBytesHeader = response.headers.get('content-length');
  const totalBytes = totalBytesHeader ? Number.parseInt(totalBytesHeader, 10) : null;
  const fileName = `BL-Watchlist-update-${availableUpdate.version}.exe`;
  const installerPath = path.join(app.getPath('temp'), fileName);
  const file = await fsp.open(installerPath, 'w');
  const hash = crypto.createHash('sha256');
  const reader = response.body.getReader();
  let downloadedBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (signal.aborted) throw new Error('Update download cancelled');

      const chunk = Buffer.from(value);
      await file.write(chunk);
      hash.update(chunk);
      downloadedBytes += chunk.length;
      sendUpdateProgress({
        downloadedBytes,
        totalBytes: Number.isFinite(totalBytes) ? totalBytes : null,
        percent: totalBytes && totalBytes > 0
          ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100))
          : null,
      });
    }
  } catch (error) {
    await file.close();
    await fsp.rm(installerPath, { force: true });
    if (signal.aborted) return { cancelled: true };
    throw error;
  }

  await file.close();
  if (availableUpdate.sha256 && hash.digest('hex') !== availableUpdate.sha256) {
    await fsp.rm(installerPath, { force: true });
    throw new Error('Downloaded update checksum did not match the manifest');
  }

  downloadedInstallerPath = installerPath;
  return { cancelled: false };
}

function installUpdate() {
  if (!downloadedInstallerPath || !fs.existsSync(downloadedInstallerPath)) {
    throw new Error('The update package has not finished downloading');
  }

  const installerPath = downloadedInstallerPath;
  const installer = spawn(installerPath, ['/S'], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  installer.unref();
  app.quit();
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
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });
  mainWindow = window;

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

ipcMain.handle('updater:check', async () => checkForUpdate());
ipcMain.handle('updater:download', async () => downloadUpdate());
ipcMain.handle('updater:cancel', () => {
  downloadAbortController?.abort();
});
ipcMain.handle('updater:install', () => installUpdate());

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});