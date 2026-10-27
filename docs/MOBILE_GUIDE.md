# HHM PDF — Android & Mobile Application (React Native / Expo)

## 1. Overview
The mobile application (`apps/mobile`) provides native mobile PDF workflows:
- Document list with search and cloud sync indicators.
- Genuine camera scan-to-PDF pipeline with auto-cropping and multi-page compilation.
- Mobile PDF viewing, page rotation, deletion, and extraction using `pdf-lib`.
- Touch signature canvas for finger signing.
- Native OS share sheet export (`expo-sharing`).
- Offline document cache for viewing and editing on the go.

---

## 2. Running in Development

```bash
cd apps/mobile
npm install

# Start the Expo Dev Server (Scan QR code with Expo Go on Android or iOS)
npm start

# Run directly on an Android emulator or connected device
npm run android
```

---

## 3. Building the Android Standalone APK

Using Expo Application Services (EAS):

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login to your Expo account
eas login

# 3. Build preview APK (installs directly on Android without Play Store)
eas build --platform android --profile preview
```

---

## 4. Mobile vs Desktop Feature Separation

| Feature | Mobile App (Android/iOS) | Web / Windows Desktop |
| :--- | :---: | :---: |
| **Document Scanning** | ✓ Direct Camera Hardware | Flatbed / Image Import |
| **Finger Signing** | ✓ Smooth Touch Canvas | Mouse / Trackpad / Upload |
| **Page Rotation & Deletion** | ✓ Lightweight Native | ✓ Full Visual Grid |
| **Tesseract OCR (100MB+ packs)** | Cloud Sync Recommended | ✓ Local Web Worker OCR |
| **PKCS#7 Digital Certificate Signing** | Cloud Sync Recommended | ✓ Local RSA Crypto Engine |
| **Side-by-side Document Compare** | Cloud Sync Recommended | ✓ Dual-canvas Visual Diff |
