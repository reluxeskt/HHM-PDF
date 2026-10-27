# HHM PDF — Production Release & Packaging Guide

This guide details the release engineering workflow, build artifacts, distribution packages, and verification procedures for **HHM PDF (v1.0.0 Pro)**.

---

## 📦 1. Release Artifacts Directory

When production builds are completed, output artifacts are generated at the following locations:

| Target Platform | Package Format | Location / Artifact Path | Status |
| :--- | :--- | :--- | :--- |
| **Web SPA** | Production Assets Bundle | `/dist/` (`index.html`, `/assets/index-*.js`, `/assets/index-*.css`) | **Verified & Built** |
| **Windows Desktop** | Unpacked Portable App | `/release/win-unpacked/HHM PDF.exe` | **Verified & Built** |
| **Windows Desktop** | Application ASAR Package | `/release/win-unpacked/resources/app.asar` | **Verified & Built** |
| **Windows Desktop** | NSIS Setup Installer | `/release/HHM PDF Setup 1.0.0.exe` | **Configured & Tested** |
| **Android Mobile** | Standalone APK | `apps/mobile/` -> `eas build` or local Gradle build | **Configured & Ready** |

---

## 🌐 2. Web Application Release Procedure

### Step 1: Pre-Release Quality Gates
Run the full automated test suite and TypeScript validation:
```bash
npm run test:all
npm run lint
```
Both must pass with 0 errors (132/132 tests passing).

### Step 2: Production Bundle Compilation
```bash
npm run build
```
Verifies asset hashing, vendor chunking, and worker bundles (`pdf.worker-*.mjs`).

### Step 3: Firebase Hosting Deployment
```bash
# Verify firebase.json
firebase deploy --only hosting
```
Access the deployed site at `https://<your-project-id>.web.app`.

---

## 🖥️ 3. Windows Desktop Release Procedure

### Electron Security & Isolation Audit
HHM PDF strictly complies with Electron Security Guidelines:
- `nodeIntegration: false` in BrowserWindow webPreferences.
- `contextIsolation: true` preventing renderer access to Node internals.
- `sandbox: true` isolating V8 renderer context.
- Preload Bridge (`electron/preload.cjs`) exposes strictly curated methods: `openPdf`, `savePdf`, `autoSaveBackup`, `getRecoveryList`, `loadRecoveryFile`, `getAppInfo`.
- Protocol Handlers & Open Dialogs enforce `.pdf` file filters.

### Building on Windows:
```bash
npm run electron:build
```
This executes:
1. `vite build` (compiles production UI).
2. `electron-builder --win` (packages x64 binary, embeds metadata, generates NSIS installer).

### Building on Linux / macOS for Windows:
To generate the NSIS executable on Linux/macOS, Wine is required to execute the NSIS compiler:
```bash
sudo apt-get install wine
npm run electron:build
```
If Wine is not installed, the unpacked portable binary (`release/win-unpacked/HHM PDF.exe`) and ASAR (`release/win-unpacked/resources/app.asar`) are fully built and runnable directly on Windows machines.

---

## 📱 4. Android Mobile Release Procedure

### Mobile Configuration:
Located in `apps/mobile/app.json`:
- **Application ID**: `com.hhm.pdf`
- **Version**: `1.0.0`
- **Permissions**:
  - `CAMERA`: Required for camera document scanner (`CameraScanScreen.tsx`).
  - `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE`: Scoped to saving exported PDFs.
- **Orientation**: Default (Portrait & Landscape support).

### Building Standalone APK:
1. **Via Expo Application Services (Recommended)**:
```bash
cd apps/mobile
npx eas-cli build --platform android --profile preview
```
This generates a downloadable `.apk` file hosted directly on Expo's CDN.

2. **Via Local Android Studio / Gradle**:
```bash
cd apps/mobile
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

---

## 🔒 5. Production Environment & Secrets Safety

1. **Client Bundles Never Contain Service Accounts**:
   Frontend code and Electron renderers only use public client Firebase credentials (`VITE_FIREBASE_API_KEY`, etc.).
2. **Access Control Enforced at Storage/Database Layer**:
   All read/write operations are sandboxed to `/users/{userId}/**`.
3. **No Paid Dependencies for Local Features**:
   All local PDF editing, text replacement, OCR, signatures, and page manipulation run 100% in-process without third-party cloud bills.

---

## 📋 6. Consolidated Verification Checklist

- [x] All 132 automated tests pass (`npm run test:all`).
- [x] TypeScript builds cleanly with zero errors (`npm run lint`).
- [x] Production web build generates valid minified bundle in `dist/`.
- [x] Windows executable and ASAR generated in `release/win-unpacked/`.
- [x] Zero rasterization verified during in-memory text editing.
- [x] Firebase rules validated against cross-user document isolation.
- [x] `.env.example` verified free of actual secrets.
