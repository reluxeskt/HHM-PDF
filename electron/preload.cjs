const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  openPdf: () => ipcRenderer.invoke('dialog:openPdf'),
  savePdf: (options) => ipcRenderer.invoke('dialog:savePdf', options),
  autoSaveBackup: (payload) => ipcRenderer.invoke('fs:autoSaveBackup', payload),
  getRecoveryList: () => ipcRenderer.invoke('fs:getRecoveryList'),
  loadRecoveryFile: (fileName) => ipcRenderer.invoke('fs:loadRecoveryFile', fileName),
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),
  onMenuTrigger: (callback) => {
    const handler = (_, action) => callback(action);
    ipcRenderer.on('menu:trigger', handler);
    return () => ipcRenderer.removeListener('menu:trigger', handler);
  },
});
