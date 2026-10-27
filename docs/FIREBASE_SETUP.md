# HHM PDF — Firebase Setup & Free-Tier Configuration

## 1. Overview
HHM PDF integrates Firebase to provide cross-platform document synchronization, folders, authentication, and cloud storage across Web, Windows Desktop, and Android.

> **Local-First Assurance**: A Firebase account is **not mandatory** for basic usage. If Firebase is not configured, the app operates in 100% Local Offline Mode with all PDF manipulation, annotation, encryption, OCR, and signature features intact.

---

## 2. Step-by-Step Firebase Project Setup

### Step 1: Create a Firebase Project
1. Navigate to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Create a project**, name it `hhm-pdf`, and choose whether to enable Google Analytics.
3. Keep the project on the default **Spark Plan** (100% Free).

### Step 2: Enable Firebase Authentication
1. Go to **Build** -> **Authentication** -> **Get Started**.
2. Under the **Sign-in method** tab:
   - Enable **Email/Password**.
   - Enable **Google** (Configure project support email).

### Step 3: Provision Cloud Firestore
1. Go to **Build** -> **Firestore Database** -> **Create Database**.
2. Select your preferred Cloud Region (e.g. `us-central1`).
3. Deploy the rules from `firestore.rules` located in the root of this repository.

### Step 4: Provision Firebase Cloud Storage
1. Go to **Build** -> **Storage** -> **Get Started**.
2. Deploy the rules from `storage.rules` located in the root of this repository.

### Step 5: Register Web Application & Retrieve Keys
1. In Project Settings -> General, click the **Web** icon (`</>`) to add an app.
2. Register the app as `HHM PDF Web`.
3. Copy the configuration object and populate your `.env` file:

```env
VITE_FIREBASE_API_KEY="AIzaSy..."
VITE_FIREBASE_AUTH_DOMAIN="hhm-pdf.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="hhm-pdf"
VITE_FIREBASE_STORAGE_BUCKET="hhm-pdf.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789012"
VITE_FIREBASE_APP_ID="1:123456789012:web:..."
VITE_FIREBASE_DATABASE_ID="(default)"
```

---

## 3. Spark Free-Tier Limits & Cost Controls

HHM PDF is engineered to operate strictly within the bounds of the free **Spark Plan**:

| Resource | Spark Free Tier Limit | HHM Studio Enforcement |
| :--- | :--- | :--- |
| **Cloud Storage** | 1,000 MB (1 GB) total | Visual quota gauge in Cloud Manager |
| **Max Upload Size** | Variable | Capped at **25 MB per PDF** |
| **Firestore Reads** | 50,000 reads / day | Direct UID paths, no unbounded list listeners |
| **Firestore Writes** | 20,000 writes / day | Local debouncing, batch metadata saves |
| **Network Bandwidth** | 10 GB / month | Client-side optimization and local cache |

---

## 4. Deploying Security Rules

To deploy the hardened rules directly using the Firebase CLI:

```bash
# Login to Firebase
npm install -g firebase-tools
firebase login

# Deploy rules only
firebase deploy --only firestore:rules,storage:rules

# Deploy Web Application to Firebase Hosting
npm run build
firebase deploy --only hosting

# Deploy everything (Hosting + Firestore Rules + Storage Rules)
firebase deploy
```

---

## 5. Firebase Hosting Details

The included `firebase.json` automatically configures:
- Single-page application rewriting: All non-static asset routes resolve to `/index.html`.
- Long-term asset caching: Static bundle JS/CSS files in `/assets/**` are cached with `Cache-Control: public, max-age=31536000, immutable`.
- Web security headers: Prevents mime-sniffing and cross-origin document leaks.

