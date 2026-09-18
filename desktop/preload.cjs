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