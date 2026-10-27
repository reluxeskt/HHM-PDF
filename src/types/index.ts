export interface DocumentMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  creationDate?: string;
  modificationDate?: string;
}

export interface TextAnnotation {
  id: string;
  page: number; // 1-indexed
  x: number; // PDF coordinates (points)
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  align?: 'left' | 'center' | 'right';
  rotation?: number;
}

export interface ImageAnnotation {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  dataUrl: string;
  name: string;
  opacity?: number;
}

export interface HyperlinkAnnotation {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  url: string;
  title?: string;
}

export interface DrawingAnnotation {
  id: string;
  page: number;
  points: { x: number; y: number }[];
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
}

export interface HighlightAnnotation {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  opacity: number;
  type?: 'highlight' | 'underline' | 'strikethrough';
}

export interface ShapeAnnotation {
  id: string;
  page: number;
  type: 'rectangle' | 'circle' | 'line' | 'arrow';
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string;
}

export interface StickyNoteAnnotation {
  id: string;
  page: number;
  x: number;
  y: number;
  author: string;
  text: string;
  color: string;
  createdAt: string;
  replies?: { author: string; text: string; createdAt: string }[];
}

export interface SignatureAnnotation {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;
  signerName: string;
  createdAt: string;
  isDigitalCert?: boolean;
  certificateDetails?: {
    issuer: string;
    algorithm: string;
    validUntil: string;
  };
}

export interface StampAnnotation {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  stampType: 'APPROVED' | 'CONFIDENTIAL' | 'DRAFT' | 'FINAL' | 'VOID' | 'CUSTOM' | 'RECEIVED';
  customText?: string;
  dateStr: string;
  user: string;
  color: string;
}

export interface RedactionBox {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  status: 'marked' | 'applied';
  overlayText?: string;
}

export interface FormFieldItem {
  id: string;
  page: number;
  type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'date';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  value: string | boolean;
  options?: string[];
  required?: boolean;
}

export interface MeasurementAnnotation {
  id: string;
  page: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  distanceInches: number;
  distanceMm: number;
  distancePoints: number;
}

export interface WatermarkConfig {
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  opacity: number;
  rotation: number;
  position: 'center' | 'diagonal' | 'tile';
}

export interface PageInfo {
  pageNumber: number; // 1-indexed
  width: number; // in points
  height: number;
  rotation: number;
  thumbnailUrl?: string;
  isScanned?: boolean;
}

export interface PageTextItem {
  id: string;
  str: string;
  x: number; // in PDF points (top-left origin for UI overlay)
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  fontName: string;
  isBold?: boolean;
  isItalic?: boolean;
  color?: string;
  hasEOL?: boolean;
  page: number;
  isOcr?: boolean;
  confidence?: number;
  isEmbedded?: boolean;
  isSubset?: boolean;
  fontBytes?: Uint8Array;
}

export interface SelectedTextFontInfo {
  fontFamily: string;
  fontName: string;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  color: string;
  isOriginalDetected: boolean;
  isEmbedded: boolean;
  isSubset: boolean;
  hasMissingGlyphs?: boolean;
  source: 'embedded' | 'system' | 'standard' | 'fallback';
  warningMessage?: string;
  fontBytes?: Uint8Array;
}

export interface PageParagraphBlock {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  fontName: string;
  isBold?: boolean;
  isItalic?: boolean;
  color?: string;
  str: string;
  lines: PageTextItem[];
  isOcr?: boolean;
  align?: 'left' | 'center' | 'right';
  isEmbedded?: boolean;
  isSubset?: boolean;
  fontBytes?: Uint8Array;
}

export interface PageTextDetectionResult {
  isScanned: boolean;
  itemCount: number;
  totalChars: number;
  items: PageTextItem[];
}

export interface PdfDocumentState {
  id: string;
  name: string;
  fileSize: number;
  data: Uint8Array;
  pageCount: number;
  pages: PageInfo[];
  metadata: DocumentMetadata;
  isModified: boolean;
  // Annotations & overlay edits:
  textAnnotations: TextAnnotation[];
  imageAnnotations: ImageAnnotation[];
  hyperlinks: HyperlinkAnnotation[];
  drawingAnnotations: DrawingAnnotation[];
  highlightAnnotations: HighlightAnnotation[];
  shapeAnnotations: ShapeAnnotation[];
  stickyNotes: StickyNoteAnnotation[];
  signatures: SignatureAnnotation[];
  stamps: StampAnnotation[];
  redactions: RedactionBox[];
  formFields: FormFieldItem[];
  measurements: MeasurementAnnotation[];
  watermark?: WatermarkConfig;
}

export type ToolMode =
  | 'select'
  | 'hand'
  | 'text'
  | 'edit-text'
  | 'highlight'
  | 'underline'
  | 'strikethrough'
  | 'draw'
  | 'sticky'
  | 'shape-rect'
  | 'shape-circle'
  | 'shape-line'
  | 'shape-arrow'
  | 'image'
  | 'hyperlink'
  | 'signature'
  | 'stamp'
  | 'watermark'
  | 'redact'
  | 'form-text'
  | 'form-check'
  | 'form-dropdown'
  | 'measure'
  | 'ocr';

export type RibbonTab =
  | 'home'
  | 'file'
  | 'edit'
  | 'view'
  | 'organize'
  | 'comment'
  | 'form'
  | 'protect'
  | 'share'
  | 'help';

export type SidebarTab = 'thumbnails' | 'bookmarks' | 'comments' | 'search' | 'fields' | null;

export interface RecentDocument {
  id: string;
  name: string;
  size: number;
  lastOpened: number;
  pageCount: number;
  thumbnailUrl?: string;
  userId?: string;
}

export type SelectedObjectType =
  | 'text'
  | 'image'
  | 'shape'
  | 'note'
  | 'stamp'
  | 'redact'
  | 'hyperlink'
  | null;

// ==================== PHASE 3 TYPES ====================

export interface EncryptPdfConfig {
  userPassword: string;
  ownerPassword?: string;
  algorithm: 'AES-256' | 'RC4';
  allowPrinting: boolean;
  allowModifying: boolean;
  allowCopying: boolean;
  allowAnnotating: boolean;
  allowFillingForms: boolean;
}

export interface DigitalCertificateConfig {
  commonName: string;
  organization?: string;
  department?: string;
  country?: string;
  email?: string;
  validityDays?: number;
  reason?: string;
  location?: string;
}

export interface DigitalSignatureInfo {
  id: string;
  signerName: string;
  organization?: string;
  email?: string;
  reason?: string;
  location?: string;
  signingTime: string;
  validityNotBefore: string;
  validityNotAfter: string;
  algorithm: string;
  isValid: boolean;
  isExpired: boolean;
  isTampered: boolean;
  certificateSubject: string;
  certificateIssuer: string;
  subFilter: string;
  byteRange: number[];
  page?: number;
}

export interface ComparisonDiffItem {
  pageNumber: number;
  type: 'added' | 'removed' | 'modified' | 'identical';
  summary: string;
  textA?: string;
  textB?: string;
  wordDiff?: Array<{ type: 'added' | 'removed' | 'unchanged'; value: string }>;
}

export interface DocumentComparisonResult {
  docAName: string;
  docBName: string;
  docAPageCount: number;
  docBPageCount: number;
  differences: ComparisonDiffItem[];
  summary: {
    totalDiffs: number;
    addedWords: number;
    deletedWords: number;
    pagesCompared: number;
  };
}

export interface PdfStandardsCheck {
  id: string;
  name: string;
  category: 'pdf-a' | 'accessibility' | 'preflight';
  status: 'pass' | 'fail' | 'warn';
  details: string;
  recommendation?: string;
}

export interface PdfStandardsReport {
  pdfAVersion: string;
  isPdfACompliant: boolean;
  accessibilityScore: number; // 0 - 100
  checks: PdfStandardsCheck[];
  metadata: DocumentMetadata;
}

export interface PdfOptimizationOptions {
  imageQuality: number; // 0.1 to 1.0 (e.g. 0.7)
  maxImageDimension: number; // e.g. 1200
  removeMetadata: boolean;
  removeUnusedObjects: boolean;
  flattenAnnotations?: boolean;
}

export interface PdfOptimizationResult {
  originalSize: number;
  optimizedSize: number;
  savingsBytes: number;
  savingsPercent: number;
  optimizedBytes: Uint8Array;
}

// ==================== PDF/A VALIDATION & EXPORT TYPES ====================

export type PdfAProfile = 'PDF/A-1b' | 'PDF/A-2b';

export type PdfAComplianceStatus =
  | 'validated_compliant'
  | 'validation_warnings'
  | 'non_compliant'
  | 'not_validated';

export interface PdfACheckItem {
  id: string;
  name: string;
  category: 'fonts' | 'metadata' | 'color' | 'security' | 'structure' | 'actions';
  status: 'pass' | 'fail' | 'warn';
  details: string;
  recommendation?: string;
}

export interface PdfAEmbeddedFontInfo {
  fontName: string;
  isEmbedded: boolean;
  subtype?: string;
  hasWidths?: boolean;
}

export interface PdfAValidationReport {
  profile: PdfAProfile;
  status: PdfAComplianceStatus;
  isCompliant: boolean;
  summary: string;
  checks: PdfACheckItem[];
  metadata: DocumentMetadata;
  timestamp: string;
  fontsDetected: PdfAEmbeddedFontInfo[];
  hasXmp: boolean;
  hasOutputIntent: boolean;
  isEncrypted: boolean;
  hasForbiddenActions: boolean;
  hasTransparency: boolean;
  validatorLimitationsNotice: string;
}


// ==================== PHASE 4 TYPES ====================

export type {
  PlatformType,
  UserProfile,
  CloudFolder,
  CloudDocumentRecord,
  RecentRecord,
  SyncConflictInfo,
  OfflineQueueItem,
} from '../../packages/shared/src/types';

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      platform: string;
      openPdf: () => Promise<{ name: string; path: string; data: number[] } | null>;
      savePdf: (options: { defaultName?: string; data: number[] }) => Promise<{ success: boolean; filePath?: string }>;
      autoSaveBackup: (payload: { documentId: string; name: string; data: number[] }) => Promise<{ success: boolean }>;
      getRecoveryList: () => Promise<Array<{ documentId: string; name: string; file: string; savedAt: string; size: number }>>;
      loadRecoveryFile: (fileName: string) => Promise<{ success: boolean; data?: number[]; error?: string }>;
      getAppInfo: () => Promise<{ name: string; version: string; platform: string }>;
      onMenuTrigger: (callback: (action: 'open' | 'save' | 'saveAs') => void) => () => void;
    };
    __FIREBASE_CONFIG__?: any;
  }
}


