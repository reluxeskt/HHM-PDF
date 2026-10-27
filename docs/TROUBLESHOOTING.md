# HHM PDF — Troubleshooting & Common Issues

## 1. Web Application Issues

### Issue: "Firebase is in Local-First Mode" banner appears.
- **Cause**: The `.env` file does not contain `VITE_FIREBASE_API_KEY` or `VITE_FIREBASE_PROJECT_ID`.
- **Solution**: This is expected for local-only use! All editing, signing, redaction, and OCR features work without Firebase. To enable cloud synchronization, add your Firebase project keys to `.env` as documented in `FIREBASE_SETUP.md`.

### Issue: "File exceeds free-tier limit of 25MB".
- **Cause**: To protect users from accidental cloud billing on the Spark free tier, uploads over 25MB are blocked.
- **Solution**: Run **PDF Optimization** under the *Protect & Redact* ribbon tab to compact image streams and remove metadata before uploading.

---

## 2. Windows Desktop (Electron) Issues

### Issue: Electron fails to load `http://localhost:3000`.
- **Cause**: The Vite development server is not running.
- **Solution**: Start the web dev server with `npm run dev` before running `npm run electron:dev`. Alternatively, build the static bundle with `npm run build` so Electron loads `dist/index.html`.

### Issue: Application closed unexpectedly; how do I find my unsaved work?
- **Solution**: Unsaved work is preserved in `%APPDATA%/hhm-pdf/recovery/`. The recovery manifest (`recovery_manifest.json`) lists all emergency backups created within the last 2 minutes of active editing.

---

## 3. Mobile Application (Expo / Android) Issues

### Issue: Camera permissions denied during Scan-to-PDF.
- **Cause**: Android runtime permission was not granted by the user.
- **Solution**: Go to Android Settings -> Apps -> HHM PDF -> Permissions, and enable **Camera**.

### Issue: Large PDF viewing performance is sluggish on low-end Android devices.
- **Cause**: Very high DPI rasterization on devices with low RAM.
- **Solution**: Tap the document in the mobile viewer and tap the **Offline Ready** switch to download a compressed local copy, or optimize the PDF on Desktop/Web before reading.
