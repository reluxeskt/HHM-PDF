# HHM PDF — Monorepo Architecture & Cross-Platform Design

## 1. Executive Summary

**HHM PDF** is an enterprise-grade, cross-platform PDF manipulation, security, and document management suite. It targets three major distribution tiers:
1. **Web Browser Application** (`apps/web` / root): Full-featured ribbon-based editor with local-first processing, client-side encryption, Tesseract.js OCR, and permanent redaction.
2. **Windows Desktop Application** (`apps/desktop` / `electron`): Native Electron application featuring secure IPC, native file pickers, Windows JumpLists, automatic emergency recovery backups, and offline execution.
3. **Android & Mobile Application** (`apps/mobile`): React Native and Expo Android application featuring touch signatures, page reorganization, document scanning via device camera, and offline caching.

---

## 2. Directory Structure & Module Boundaries

```
hhm-pdf/
├── apps/
│   ├── desktop/               # Electron Windows Desktop package configuration
│   └── mobile/                # Expo React Native Android / iOS application
│       ├── assets/            # App icons, splash screens
│       ├── src/
│       │   ├── screens/       # DocumentListScreen, PdfViewerScreen, CameraScanScreen, AccountScreen
│       │   └── services/      # mobilePdf.ts (scan-to-PDF, page rotation, extraction)
│       └── app.json           # Android permissions (CAMERA, STORAGE), package config
├── packages/
│   ├── shared/                # Core domain types, validation, and constants
│   │   └── src/
│   │       ├── types.ts       # CloudDocumentRecord, Folder, UserProfile, SyncConflictInfo
│   │       └── constants.ts   # Free tier upload limits (25MB), sync intervals
│   ├── firebase/              # Firebase services & synchronization
│   │   └── src/
│   │       ├── config.ts      # Lazy client initialization with graceful offline fallback
│   │       ├── auth.ts        # Email/password & Google popup sign-in
│   │       ├── firestore.ts   # Optimistic locking, version tracking, folders & recents
│   │       ├── storage.ts     # Upload with 25MB check, download, delete
│   │       ├── offlineSync.ts # IndexedDB queue & auto-reconnect synchronization
│   │       └── errors.ts      # Structured FirestoreErrorInfo compliant handlers
│   └── pdf-core/              # Common PDF processing library interface
├── electron/
│   ├── main.cjs               # Secure Electron main process, auto-recovery, native menu
│   └── preload.cjs            # Context-isolated IPC bridge (openPdf, savePdf, autoSaveBackup)
├── src/                       # Web Application (React 19 + TypeScript + Vite)
│   ├── components/            # Ribbon, PageView, PdfCanvas, Sidebar, TopBar, HomeScreen
│   │   └── modals/            # 19 interactive modals (CloudDocs, Auth, Conflict, Redact, Protect, etc.)
│   ├── context/               # PdfContext.tsx (central state, undo/redo, cloud sync)
│   ├── services/              # pdfEngine.ts, cryptoEngine.ts, storage.ts, samplePdfs.ts
│   └── types/                 # Comprehensive PDF annotation, metadata, and tool interfaces
├── docs/                      # Architectural, setup, and troubleshooting documentation
├── tests/                     # 52 automated tests (Phase 2, Phase 3, Phase 4 suites)
├── firestore.rules            # Hardened Zero-Trust Firestore Security Rules (8 Pillars)
├── storage.rules              # Firebase Storage rules (25MB quota, application/pdf MIME guard)
├── firebase-blueprint.json    # Intermediate Representation schema
└── electron-builder.json      # Windows NSIS installer configuration with .pdf association
```

---

## 3. PDF Engine Selection Matrix

| Capability | Browser (Web) | Windows (Electron) | Android (Mobile) | Library / Engine |
| :--- | :---: | :---: | :---: | :--- |
| **PDF Inspection & Page Mod** | ✓ Full | ✓ Full | ✓ Full | `pdf-lib` |
| **High-Res Raster Rendering** | ✓ Full | ✓ Full | ✓ Native | `pdfjs-dist` (Web/Desktop) |
| **AES-256 / RC4 Encryption** | ✓ Full | ✓ Full | Documented | `@pdfsmaller/pdf-encrypt` |
| **Digital Signatures (PKCS#7)** | ✓ Full | ✓ Full | Documented | `node-forge` (RSA 2048-bit) |
| **Permanent Redaction** | ✓ Full | ✓ Full | Canvas / Mask | `pdf-lib` + 2D Pixel Canvas |
| **OCR Text Layer Embedding** | ✓ Full | ✓ Full | High-DPI Camera | `tesseract.js` |
| **Document Diff Comparison** | ✓ Full | ✓ Full | Documented | Custom Myers LCS Diff Engine |
| **Camera Scan-to-PDF** | Via Upload | Via File | ✓ Native Camera | Native Camera + `pdf-lib` |
| **Emergency Auto-Recovery** | IndexedDB | ✓ Native Disk | Storage Cache | Local Disk IPC / IDB |

---

## 4. Concurrency & Synchronization Model

1. **Optimistic Locking**: Every cloud document record maintains a strictly monotonic `version: number` counter.
2. **Conflict Detection**:
   - When a client pushes an update, it supplies its expected base version.
   - If the remote document contains a newer version, the server reject triggers a `SYNC_CONFLICT` event.
   - The user is presented with three actionable choices:
     - **Save as Copy**: Preserves both documents without data loss.
     - **Keep Local**: Forces an overwrite with an incremented version number.
     - **Discard Local**: Discards local edits and fetches the latest remote copy.
3. **Resilient Offline Queue**: If the network is unavailable, documents are stored in an IndexedDB queue. As soon as the browser receives a `window.online` event, the queue flushes in the background.
