# HHM PDF — Complete Cross-Platform PDF & Cloud Studio

**HHM PDF** is an enterprise-grade, cross-platform PDF manipulation, security, and document management suite. It supports three target platforms:
1. **Web Browser Application** (`apps/web` / root): Full-featured ribbon-based editor with local-first processing, client-side encryption, Tesseract.js OCR, and permanent redaction.
2. **Windows Desktop Application** (`apps/desktop` / `electron`): Native Electron application featuring secure IPC, native file pickers, Windows JumpLists, automatic emergency recovery backups, and offline execution.
3. **Android & Mobile Application** (`apps/mobile`): React Native and Expo Android application featuring touch signatures, page reorganization, document scanning via device camera, and offline caching.

---

## 🚀 Key Features & Capabilities

### 1. Document Creation & Page Management
- **Create Blank Documents**: Configure custom page standards (ISO A4, US Letter, US Legal), orientation (Portrait / Landscape), and multi-page counts.
- **Convert Images to PDF**: Automatically convert JPEG and PNG files into high-resolution, proportional PDF documents.
- **Combine / Merge PDFs**: Visual multi-file merge queue with drag-and-drop reordering, page count previews, and 1-click execution.
- **Visual Page Organizer**: Interactive full-screen thumbnail grid for batch operations:
  - Reorder pages via drag-and-drop
  - Rotate selected or all pages in 90° increments
  - Delete individual or multiple pages
  - Duplicate pages
  - Extract page ranges into a separate PDF
  - Insert pages from external PDF documents
  - Split documents by ranges or fixed intervals

### 2. Interactive Editing, Annotations & OCR
- **Text Editing & Insertion**: Add editable text objects with custom font sizes (8pt to 72pt), colors, bold, italic, text alignment, and coordinate placement.
- **Image Insertion & Manipulation**: Upload, move, resize (8-point handles), and delete images.
- **Text Markup Tools**: Highlighting, Underlining, and Strikethrough with customizable opacity and colors.
- **Freehand Pen Drawing & Geometric Shapes**: Rectangles, circles, arrows, lines, and smooth pen drawing.
- **Sticky Notes & Comments**: Collapsible notes with author name, timestamp, and reply threads.
- **Tesseract.js Client OCR**: Completely offline optical character recognition supporting English, Spanish, French, and German with confidence scores and invisible searchable PDF text layers.
- **Measurement Tool**: Calibrated measurement across architectural plans converting points to inches and millimeters.

### 3. Forms, Signatures & Official Stamps
- **Fill & Sign Tool**:
  - **Draw**: Natural ink signature pad with stylus/touch/mouse support.
  - **Type**: 4 authentic cursive typography presets rendered to transparent PNGs.
  - **Upload**: Import existing signature images.
  - **Signature Library**: Store signatures in local IndexedDB for instant 1-click signing.
- **Cryptographic Digital Signatures (Phase 3)**:
  - Genuine X.509 2048-bit RSA certificate generation.
  - Detached PKCS#7 CMS digital signature embedding.
  - Cryptographic verification checking byte range hash integrity, certificate chain, and post-signing alterations.
- **Interactive Form Fields**: Fillable text inputs and interactive checkboxes.
- **Official Stamps**: Pre-configured rubber stamps ("APPROVED", "CONFIDENTIAL", "DRAFT", "FINAL", "VOID", "RECEIVED") with real-time date and user metadata.

### 4. True Permanent Redaction & Security (Phase 3)
- **Permanent Redaction Engine**: 2D canvas pixel destruction and vector removal ensuring redacted text cannot be copied, selected, or extracted.
- **AES-256 / RC4 PDF Encryption**: Password-protected PDF generation with granular permission controls (printing, copying, annotations, form filling).
- **Document Comparison**: Word-by-word diffing using Longest Common Subsequence (LCS) algorithm to detect added, removed, and modified text across versions.
- **PDF/A & Accessibility Standards Audit**: Automated pre-flight checks evaluating title, language tags, image alt text, and PDF/A-1b compliance.
- **PDF Size Optimizer**: Metadata sanitization, object stream compression, and lossless compaction with before/after savings reporting.

### 5. Firebase Cloud Integration & Synchronization (Phase 4)
- **Firebase Authentication**: Email/Password and Google sign-in via popup.
- **Cloud Firestore Synchronization**: Per-user document metadata, folders, and cross-device recent documents with optimistic locking.
- **Conflict Handling**: Detection of concurrent edits across devices with 3-way resolution (*Save as Copy*, *Overwrite Cloud*, or *Discard Local*).
- **Firebase Cloud Storage**: Secure document storage with strict 25MB per-file quota checks aligned with the Spark Free Tier.
- **Offline Resiliency Queue**: IndexedDB offline queue automatically retries and flushes uploads when internet connectivity is restored.
- **Local-Only Mode**: Users can operate completely offline without a Firebase account; all editing tools remain 100% functional.

---

## 🛠️ Monorepo Architecture

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
│   ├── firebase/              # Auth, Firestore, Cloud Storage, offline queue & error handlers
│   └── pdf-core/              # Common PDF processing library interface
├── electron/
│   ├── main.cjs               # Secure Electron main process, auto-recovery, native menu
│   └── preload.cjs            # Context-isolated IPC bridge (openPdf, savePdf, autoSaveBackup)
├── src/                       # Web Application (React 19 + TypeScript + Vite)
├── docs/                      # Architectural, setup, and troubleshooting documentation
├── tests/                     # 52 automated tests (Phase 2, Phase 3, Phase 4 suites)
├── firestore.rules            # Hardened Zero-Trust Firestore Security Rules (8 Pillars)
├── storage.rules              # Firebase Storage rules (25MB quota, application/pdf MIME guard)
├── firebase-blueprint.json    # Intermediate Representation schema
└── electron-builder.json      # Windows NSIS installer configuration with .pdf association
```

---

## 💻 Running the Applications

### 1. Web Browser Application
```bash
# Start Vite development server on port 3000
npm run dev

# Open in browser: http://localhost:3000
```

### 2. Windows Desktop Application (Electron)
```bash
# In development (with Vite dev server running in another terminal)
npm run electron:dev

# Building the Windows Installer (.exe / NSIS with .pdf association)
npm run electron:build
```

### 3. Android Mobile Application (React Native / Expo)
```bash
cd apps/mobile
npm install

# Start the Expo Dev Server (Scan QR code with Expo Go on Android or iOS)
npm start

# Run on Android emulator or connected device
npm run android

# Build standalone Android APK with EAS
npm run build:android
```

---

## 🧪 Comprehensive Automated Testing

HHM PDF includes a **132-test automated verification suite** across 6 specialized audit suites with **100% passing results**:

```bash
# Run all 132 tests in single consolidated execution
npm run test:all
```

### Audit Breakdown:
1. **Phase 2 Core PDF Engine Tests (20 tests passed)**:
   - Blank PDF creation with standard dimensions (A4: 595 × 842 pt)
   - PDF inspection and metadata extraction
   - Multi-file combining and reordering
   - Page extraction and deletion logic
   - Page insertion from external PDF documents
   - Page duplication and range splitting
   - Searchable OCR text layer embedding
   - Batch watermarking and rotation
   - Modification burning
2. **Phase 3 Security, Signatures & Redaction Tests (18 tests passed)**:
   - AES-256 PDF encryption and password protection
   - Password rejection when opening protected files without key
   - 2048-bit RSA X.509 certificate generation
   - Detached PKCS#7 CMS digital signature creation and byte-range verification
   - Post-signing tampering detection
   - Permanent redaction sanitization
   - Document comparison and word-by-word token diffing
   - PDF file size optimization and integrity validation
3. **Phase 4 Cross-Platform & Cloud Sync Tests (14 tests passed)**:
   - Spark free-tier 25MB file upload limit enforcement
   - 1,000MB storage quota boundary protection
   - Optimistic concurrency and multi-device version conflict detection
   - Folder association and metadata tagging
   - Offline queue data model and exponential backoff retry counter
   - Cross-platform feature parity verification (Web, Desktop, Mobile)
4. **Synthetic Fixtures Audit (`qa_fixtures.test.ts` — 37 tests passed)**:
   - Generation and verification of 12 synthetic test fixtures:
     - 01: Blank PDF (1 page)
     - 02: Text & vector shapes (A4 width 595pt)
     - 03: Multi-page document (6 pages)
     - 04: Mixed dimensions (Portrait, Landscape, Legal, Square)
     - 05: Images and text
     - 06: Synthetic tabular invoice (KPS-QA-0001, 25 x $12.50 = $312.50)
     - 07: Scanned-image bitmap for OCR testing
     - 08: Annotations and sticky comments
     - 09: Password encryption
     - 10: Malformed/corrupted PDF error handling
     - 11: Diff comparison pair (11a and 11b)
     - 12: Unicode metadata and non-English characters
5. **Core PDF Operations Deep Audit (`qa_pdf_operations.test.ts` — 26 tests passed)**:
   - Reverse reordering, 2-page extraction, page duplication, 90° rotation
   - Multi-file concatenation (2 + 3 = 5 pages)
   - Range splitting into multiple files
   - Plain text extraction (.txt) with invoice contents
   - Rendered watermark and burned overlays
   - Permanent redaction metadata strip
   - Certificate X.509 generation, PKCS#7 CMS signing, and tamper detection
6. **Existing PDF Text Selection & Editing Audit (`qa_text_editing.test.ts` — 17 tests passed)**:
   - Selectable text vs scanned image page classification
   - Extracting text bounding boxes, coordinates, widths, and font sizes
   - Mapping embedded fonts to standard ISO families (Helvetica, Times, Courier)
   - Zero-rasterization text replacement via precision vector background masking
   - Reopening saved PDF and verifying replacement text is extractable
   - Batch "Find & Replace All" across page items
   - Scanned PDF OCR region detection and text replacement fallback

---

## 🔒 Security & Privacy Notice

- **Zero Document Uploads Without Consent**: Documents are processed locally. Files are only uploaded to Firebase Cloud when the user explicitly clicks *Upload to Cloud* or enables cloud sync.
- **Zero-Trust ABAC Rules**: Firestore and Cloud Storage access is mathematically restricted to authenticated document owners (`request.auth.uid == userId`).
- **Emergency File Recovery**: Desktop mode backs up unsaved edits every 2 minutes to a secure local application directory to prevent data loss.

