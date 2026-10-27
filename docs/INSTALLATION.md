# HHM PDF — Complete Installation & Setup Guide

This guide provides end-to-end instructions for installing, configuring, and building **HHM PDF** across all supported platforms: **Web Application (React 19 + Vite)**, **Windows Desktop Application (Electron)**, and **Android Mobile Application (React Native / Expo)**.

---

## 📋 System Prerequisites

| Platform | Minimum Requirement | Recommended |
| :--- | :--- | :--- |
| **Node.js** | `v20.x` or higher | `v22.x LTS` |
| **Package Manager** | `npm v10+` or `bun v1.1+` | `npm v10.8+` |
| **OS** | Windows 10/11, macOS 13+, Ubuntu 22.04+ | Windows 11 64-bit for Desktop packaging |
| **Memory** | 4 GB RAM | 8+ GB RAM (for heavy OCR & multi-page renders) |
| **Disk Space** | 1 GB free | 5 GB free (for Electron packages and Android builds) |

---

## 🌐 1. Web Application Installation

The web application runs entirely client-side using WebAssembly-accelerated PDF rendering (Mozilla PDF.js) and vector manipulation (`pdf-lib`).

### Step 1: Clone and Install Dependencies
```bash
git clone https://github.com/your-org/hhm-pdf.git
cd hhm-pdf

# Install root dependencies
npm install
```

### Step 2: Configure Environment Variables
Copy the template configuration file:
```bash
cp .env.example .env
```
*(If running in 100% offline local-only mode, no Firebase API keys are needed! Leave them empty or with defaults).*

### Step 3: Run the Development Server
```bash
npm run dev
```
Open your browser at:
```
http://localhost:3000
```

### Step 4: Production Web Build
```bash
npm run build
```
This produces an optimized, minified production build in the `dist/` directory, ready to deploy to Firebase Hosting, Netlify, Vercel, or any static HTTP server.

---

## 🖥️ 2. Windows Desktop Application (Electron)

The Windows desktop version wraps the high-performance web core in an isolated Electron container with native Windows file dialogs, JumpList recent files, and auto-recovery backup capabilities.

### Development Mode:
In terminal 1:
```bash
npm run dev
```
In terminal 2:
```bash
npm run electron:dev
```

### Packaging Windows Installer (`.exe` / NSIS):
On Windows:
```bash
npm run electron:build
```
This command compiles the web bundle and runs `electron-builder` using `electron-builder.json`.

**Generated Output in `release/`:**
1. **Unpacked Portable Executable**: `release/win-unpacked/HHM PDF.exe`
2. **Packaged ASAR Archive**: `release/win-unpacked/resources/app.asar`
3. **NSIS Installer**: `release/HHM PDF Setup 1.0.0.exe`

*(Note: If building from a Linux or macOS host for Windows, install `wine` to allow NSIS compilation: `sudo apt-get install wine`).*

---

## 📱 3. Android Mobile Application (Expo / React Native)

The mobile application is located in `apps/mobile` and provides camera document scanning, touch stylus signatures, offline caching, and native document sharing.

### Step 1: Navigate to the Mobile Directory
```bash
cd apps/mobile
npm install
```

### Step 2: Start Expo Development Server
```bash
npx expo start
```
- Press `a` in the terminal to launch the connected Android Emulator.
- Or scan the terminal QR code with the **Expo Go** app on any physical Android smartphone.

### Step 3: Generate Standalone Android APK
To compile a production Android `.apk` or `.aab` (Google Play Store):
```bash
# Using EAS Build (Expo Application Services cloud build)
npx eas-cli login
npx eas-cli build --platform android --profile preview

# Or local build using Gradle (requires Android Studio & Android SDK)
npx expo run:android --variant release
```

---

## 🧪 4. Automated QA Verification Suite

Execute the full automated self-testing diagnostic suite across all 6 audit tiers:

```bash
# Run all 132 tests
npm run test:all

# Or run individual specialized suites:
npm run test:pdf       # Core PDF engine operations (26 tests)
npm run test:text      # Existing text editing & OCR replacement (17 tests)
npm run test:fixtures  # Synthetic fixture integrity (37 tests)
```

In-browser self-testing is also accessible anytime via the **Help** tab -> **Automated QA Self-Test** button.
