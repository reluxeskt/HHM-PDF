const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

// Ensure recovery directory exists
const getRecoveryDir = () => {
  const recoveryPath = path.join(app.getPath('userData'), 'recovery');
  if (!fs.existsSync(recoveryPath)) {
    fs.mkdirSync(recoveryPath, { recursive: true });
  }
  return recoveryPath;
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: 'HHM PDF',
    icon: path.join(__dirname, '../public/icon.png'),
    backgroundColor: '#0b2545',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    autoHideMenuBar: false,
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Build native application menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open PDF...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            if (mainWindow) mainWindow.webContents.send('menu:trigger', 'open');
          },
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('menu:trigger', 'save');
          },
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('menu:trigger', 'saveAs');
          },
        },
        { type: 'separator' },
        {
          label: 'Print...',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            if (mainWindow) mainWindow.webContents.print();
          },
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About HHM PDF',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About HHM PDF',
              message: 'HHM PDF v1.0.0',
              detail: 'Professional PDF Editor with Page Organization, OCR, Redaction, Digital Signatures, and Firebase Cloud Synchronization.\n\nEngine: PDF-Lib, PDF.js, Tesseract.js, Node-Forge.\nPlatform: Electron Windows Desktop.',
              buttons: ['OK'],
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC handler: Show Native Windows Open File Dialog
ipcMain.handle('dialog:openPdf', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open PDF Document - HHM PDF',
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const fileBuffer = fs.readFileSync(filePath);

  // Add to Windows Recent Documents
  app.addRecentDocument(filePath);

  return {
    name: path.basename(filePath),
    path: filePath,
    data: Array.from(fileBuffer),
  };
});

// IPC handler: Show Native Windows Save File Dialog
ipcMain.handle('dialog:savePdf', async (_, { defaultName, data }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save PDF Document - HHM PDF',
    defaultPath: defaultName || 'Document.pdf',
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
  });

  if (result.canceled || !result.filePath) {
    return { success: false };
  }

  const buffer = Buffer.from(data);
  fs.writeFileSync(result.filePath, buffer);
  app.addRecentDocument(result.filePath);

  return { success: true, filePath: result.filePath };
});

// IPC handler: Save Emergency Backup for File Recovery
ipcMain.handle('fs:autoSaveBackup', async (_, { documentId, name, data }) => {
  try {
    const recoveryDir = getRecoveryDir();
    const safeName = `${documentId || 'unnamed'}_recovery.pdf`;
    const fullPath = path.join(recoveryDir, safeName);
    fs.writeFileSync(fullPath, Buffer.from(data));

    // Save manifest
    const manifestPath = path.join(recoveryDir, 'recovery_manifest.json');
    let manifest = [];
    if (fs.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      } catch {}
    }
    const filtered = manifest.filter((m) => m.documentId !== documentId);
    filtered.unshift({
      documentId,
      name,
      file: safeName,
      savedAt: new Date().toISOString(),
      size: data.length,
    });
    fs.writeFileSync(manifestPath, JSON.stringify(filtered.slice(0, 10), null, 2));
    return { success: true };
  } catch (err) {
    console.warn('Auto-save recovery failed:', err);
    return { success: false, error: err.message };
  }
});

// IPC handler: List Recoverable Documents
ipcMain.handle('fs:getRecoveryList', async () => {
  try {
    const recoveryDir = getRecoveryDir();
    const manifestPath = path.join(recoveryDir, 'recovery_manifest.json');
    if (fs.existsSync(manifestPath)) {
      return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    }
    return [];
  } catch {
    return [];
  }
});

// IPC handler: Load Recovered File
ipcMain.handle('fs:loadRecoveryFile', async (_, fileName) => {
  try {
    const recoveryDir = getRecoveryDir();
    const filePath = path.join(recoveryDir, fileName);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath);
      return { success: true, data: Array.from(data) };
    }
    return { success: false, error: 'File not found' };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// IPC handler: Application Info
ipcMain.handle('app:getInfo', async () => {
  return {
    name: 'HHM PDF',
    version: '1.0.0',
    platform: process.platform,
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    nodeVersion: process.versions.node,
    userDataPath: app.getPath('userData'),
  };
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
