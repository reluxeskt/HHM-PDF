# HHM PDF — Windows Desktop Application (Electron)

## 1. Overview
The Windows desktop application provides a desktop experience with native Windows file dialogs, secure IPC, offline local execution, Windows JumpList integration, and automatic file recovery.

---

## 2. Security Architecture
- **Context Isolation**: `contextIsolation: true` is strictly enforced.
- **Node Integration Disabled**: `nodeIntegration: false` prevents arbitrary code execution in the renderer.
- **Preload Bridge**: Only validated methods (`openPdf`, `savePdf`, `autoSaveBackup`, `getRecoveryList`, `loadRecoveryFile`, `getAppInfo`) are exposed via `window.electronAPI`.
- **Sandbox**: Enabled.

---

## 3. Emergency File Recovery System
When working in the desktop app:
1. Every 2 minutes (if the document has unsaved edits), the document buffer is automatically backed up to `%APPDATA%/hhm-pdf/recovery/`.
2. A `recovery_manifest.json` tracks document IDs, names, timestamps, and sizes.
3. If the application or system closes unexpectedly, the user can recover unsaved work upon reopening.

---

## 4. Running and Building the Windows Desktop App

### Development Mode:
```bash
# Terminal 1: Run Vite dev server
npm run dev

# Terminal 2: Run Electron
npm run electron:dev
```

### Building the Windows Installer (`.exe` / NSIS):
```bash
# 1. Compile the web bundle
npm run build

# 2. Package with electron-builder
npm run electron:build
```
The output installer will be placed in the `release/` directory:
- `HHM PDF Setup 1.0.0.exe` (NSIS installer with desktop shortcut and `.pdf` file association).
