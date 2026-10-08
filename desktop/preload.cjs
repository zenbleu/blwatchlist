const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('blDesktopUpdater', {
  checkForUpdate: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  cancelDownload: () => ipcRenderer.invoke('updater:cancel'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  onProgress: (listener) => {
    const handler = (_event, progress) => listener(progress);
    ipcRenderer.on('updater:progress', handler);
    return () => ipcRenderer.removeListener('updater:progress', handler);
  },
});

contextBridge.exposeInMainWorld('blDesktopShell', {
  getDisplayMode: () => ipcRenderer.invoke('display-mode:get'),
  setDisplayMode: (mode) => ipcRenderer.invoke('display-mode:set', mode),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('window:toggle-maximize'),
  isWindowMaximized: () => ipcRenderer.invoke('window:maximized:get'),
  onMaximizeStateChange: (listener) => {
    const handler = (_event, maximized) => listener(maximized);
    ipcRenderer.on('window:maximize-state', handler);
    return () => ipcRenderer.removeListener('window:maximize-state', handler);
  },
  closeWindow: () => ipcRenderer.invoke('window:close'),
});