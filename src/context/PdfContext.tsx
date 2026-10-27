import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  PdfDocumentState,
  RibbonTab,
  ToolMode,
  SidebarTab,
  TextAnnotation,
  ImageAnnotation,
  HyperlinkAnnotation,
  HighlightAnnotation,
  DrawingAnnotation,
  ShapeAnnotation,
  StickyNoteAnnotation,
  SignatureAnnotation,
  StampAnnotation,
  RedactionBox,
  FormFieldItem,
  MeasurementAnnotation,
  WatermarkConfig,
  SelectedObjectType,
  CloudDocumentRecord,
  CloudFolder,
  SyncConflictInfo,
  PageTextItem,
  PageParagraphBlock,
  PageTextDetectionResult,
  SelectedTextFontInfo,
} from '../types';
import { PdfEngine } from '../services/pdfEngine';
import { StorageService } from '../services/storage';
import { generateSamplePdf } from '../services/samplePdfs';
import { AuthService } from '../../packages/firebase/src/auth';
import { CloudFirestoreService } from '../../packages/firebase/src/firestore';
import { CloudStorageService } from '../../packages/firebase/src/storage';
import { OfflineSyncService } from '../../packages/firebase/src/offlineSync';
import { isFirebaseConfigured } from '../../packages/firebase/src/config';


interface ToolSettings {
  textColor: string;
  textSize: number;
  textFont: string;
  isBold: boolean;
  isItalic: boolean;
  textAlign: 'left' | 'center' | 'right';
  highlightColor: string;
  drawColor: string;
  drawStrokeWidth: number;
  stampType: 'APPROVED' | 'CONFIDENTIAL' | 'DRAFT' | 'FINAL' | 'VOID' | 'CUSTOM' | 'RECEIVED';
  customStampText: string;
  stampColor: string;
  redactionOverlayText: string;
  activeWatermark: WatermarkConfig;
}

interface PdfContextType {
  documents: PdfDocumentState[];
  activeDocIndex: number;
  activeDoc: PdfDocumentState | null;
  currentPage: number;
  zoom: number;
  activeRibbonTab: RibbonTab;
  activeTool: ToolMode;
  sidebarTab: SidebarTab;
  continuousScroll: boolean;
  toolSettings: ToolSettings;
  pdfJsDoc: pdfjsLib.PDFDocumentProxy | null;
  statusMessage: string;
  setStatusMessage: (msg: string) => void;
  isProcessing: boolean;
  progressPercent: number;

  // Selected Object
  selectedObjectId: string | null;
  selectedObjectType: SelectedObjectType;
  setSelectedObject: (id: string | null, type?: SelectedObjectType) => void;
  deleteSelectedObject: () => void;
  duplicateSelectedObject: () => void;
  updateSelectedTextProps: (props: Partial<TextAnnotation>) => void;
  updateSelectedImageProps: (props: Partial<ImageAnnotation>) => void;

  // Active Text Editing Font State (Original Font Preservation)
  activeEditingFont: SelectedTextFontInfo | null;
  setActiveEditingFont: (info: SelectedTextFontInfo | null) => void;
  updateActiveEditingFont: (props: Partial<SelectedTextFontInfo>) => void;

  // Navigation & View Actions
  setActiveDocIndex: (idx: number) => void;
  setCurrentPage: (page: number) => void;
  setZoom: (z: number | ((prev: number) => number)) => void;
  setActiveRibbonTab: (tab: RibbonTab) => void;
  setActiveTool: (tool: ToolMode) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setContinuousScroll: (val: boolean) => void;
  setToolSettings: React.Dispatch<React.SetStateAction<ToolSettings>>;

  // Document Management
  openPdfBuffer: (data: Uint8Array, name: string) => Promise<void>;
  openPdfFile: (file: File) => Promise<void>;
  openSample: (sampleId: string) => Promise<void>;
  createBlank: (pageSize?: 'a4' | 'letter' | 'legal', orientation?: 'portrait' | 'landscape', count?: number) => Promise<void>;
  createFromImages: (images: { name: string; dataUrl: string; type: string }[]) => Promise<void>;
  closeDocument: (index: number) => void;
  saveCurrentDocument: (triggerDownload?: boolean) => Promise<Uint8Array | null>;
  exportToTxt: () => Promise<void>;
  exportToImages: (format?: 'image/png' | 'image/jpeg') => Promise<void>;

  // Page Operations
  reorderPages: (newOrder0Based: number[], rotations?: { [key: number]: number }) => Promise<void>;
  deletePages: (pageIndices0Based: number[]) => Promise<void>;
  rotateCurrentPage: (angleDelta: number) => Promise<void>;
  rotateAllPages: (angleDelta: number) => Promise<void>;
  extractPages: (pageIndices0Based: number[]) => Promise<void>;
  insertBlankPageAt: (atIndex0Based: number) => Promise<void>;
  insertPagesFromPdf: (sourceBytes: Uint8Array, atIndex0Based: number, pageIndices?: number[]) => Promise<void>;
  duplicatePages: (pageIndices0Based: number[]) => Promise<void>;
  splitPdfByRanges: (ranges: { name: string; pageIndices0Based: number[] }[]) => Promise<void>;
  movePageBetweenDocuments: (targetDocIndex: number, pageIndex0Based: number) => Promise<void>;

  // Editing & Overlays
  addTextAnnotation: (item: Omit<TextAnnotation, 'id'>) => void;
  updateTextAnnotation: (id: string, updates: Partial<TextAnnotation>) => void;
  deleteTextAnnotation: (id: string) => void;
  addImageAnnotation: (item: Omit<ImageAnnotation, 'id'>) => void;
  updateImageAnnotation: (id: string, updates: Partial<ImageAnnotation>) => void;
  deleteImageAnnotation: (id: string) => void;
  addHyperlink: (item: Omit<HyperlinkAnnotation, 'id'>) => void;
  deleteHyperlink: (id: string) => void;
  addHighlightAnnotation: (item: Omit<HighlightAnnotation, 'id'>) => void;
  addDrawingAnnotation: (item: Omit<DrawingAnnotation, 'id'>) => void;
  addShapeAnnotation: (item: Omit<ShapeAnnotation, 'id'>) => void;
  addStickyNote: (item: Omit<StickyNoteAnnotation, 'id'>) => void;
  addSignature: (item: Omit<SignatureAnnotation, 'id'>) => void;
  addStamp: (item: Omit<StampAnnotation, 'id'>) => void;
  addRedactionBox: (item: Omit<RedactionBox, 'id'>) => void;
  applyBurnedRedactions: () => Promise<void>;
  setWatermark: (config: WatermarkConfig) => void;
  addFormField: (item: Omit<FormFieldItem, 'id'>) => void;
  updateFormFieldValue: (fieldId: string, val: string | boolean) => void;
  addMeasurement: (item: Omit<MeasurementAnnotation, 'id'>) => void;
  applySearchableOcrLayer: (pageNum: number, text: string) => Promise<void>;

  // Existing Text Selection, Inspection & Replacement
  replaceExistingText: (
    pageNumber: number,
    originalItem: PageTextItem | PageParagraphBlock | { x: number; y: number; width: number; height: number; str: string },
    newText: string,
    options?: {
      fontFamily?: string;
      fontSize?: number;
      isBold?: boolean;
      isItalic?: boolean;
      color?: string;
      backgroundColor?: string;
      align?: 'left' | 'center' | 'right';
      fontBytes?: Uint8Array;
      isSubset?: boolean;
    }
  ) => Promise<void>;
  replaceAllMatchingText: (
    pageNumber: number,
    textItems: PageTextItem[],
    searchStr: string,
    replacementText: string,
    options?: {
      matchCase?: boolean;
      fontFamily?: string;
      fontSize?: number;
      color?: string;
    }
  ) => Promise<number>;
  inspectPageText: (pageNumber: number) => Promise<PageTextDetectionResult | null>;

  // History & Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Modals
  isOrganizeModalOpen: boolean;
  setIsOrganizeModalOpen: (open: boolean) => void;
  isCombineModalOpen: boolean;
  setIsCombineModalOpen: (open: boolean) => void;
  isSignatureModalOpen: boolean;
  setIsSignatureModalOpen: (open: boolean) => void;
  isWatermarkModalOpen: boolean;
  setIsWatermarkModalOpen: (open: boolean) => void;
  isRedactionModalOpen: boolean;
  setIsRedactionModalOpen: (open: boolean) => void;
  isPropertiesModalOpen: boolean;
  setIsPropertiesModalOpen: (open: boolean) => void;
  isProtectModalOpen: boolean;
  setIsProtectModalOpen: (open: boolean) => void;
  isUnlockModalOpen: boolean;
  setIsUnlockModalOpen: (open: boolean) => void;
  isExportModalOpen: boolean;
  setIsExportModalOpen: (open: boolean) => void;
  isOcrModalOpen: boolean;
  setIsOcrModalOpen: (open: boolean) => void;
  isCompareModalOpen: boolean;
  setIsCompareModalOpen: (open: boolean) => void;
  isHelpModalOpen: boolean;
  setIsHelpModalOpen: (open: boolean) => void;
  isNewBlankModalOpen: boolean;
  setIsNewBlankModalOpen: (open: boolean) => void;
  isSplitModalOpen: boolean;
  setIsSplitModalOpen: (open: boolean) => void;
  isInsertPagesModalOpen: boolean;
  setIsInsertPagesModalOpen: (open: boolean) => void;
  isBatchModalOpen: boolean;
  setIsBatchModalOpen: (open: boolean) => void;
  isExistingTextEditModalOpen: boolean;
  setIsExistingTextEditModalOpen: (open: boolean) => void;
  isQaModalOpen: boolean;
  setIsQaModalOpen: (open: boolean) => void;

  // Phase 4 Cloud & Desktop Modals and Sync State
  isCloudModalOpen: boolean;
  setIsCloudModalOpen: (open: boolean) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isConflictModalOpen: boolean;
  setIsConflictModalOpen: (open: boolean) => void;
  currentUser: any;
  setCurrentUser: (user: any) => void;
  cloudDocuments: CloudDocumentRecord[];
  cloudFolders: CloudFolder[];
  conflictInfo: SyncConflictInfo | null;
  isSyncing: boolean;
  pendingSyncCount: number;
  cloudSyncStatus: 'synced' | 'syncing' | 'offline' | 'local_only';
  uploadToCloud: (pdfBytes: Uint8Array, name: string, folderId?: string) => Promise<void>;
  deleteFromCloud: (docId: string) => Promise<void>;
  createCloudFolder: (name: string, color?: string) => Promise<void>;
  refreshCloudDocs: () => Promise<void>;
  resolveConflict: (choice: 'keep_local' | 'keep_remote' | 'save_copy') => Promise<void>;
}

const PdfContext = createContext<PdfContextType | null>(null);

const DEFAULT_TOOL_SETTINGS: ToolSettings = {
  textColor: '#0f172a',
  textSize: 14,
  textFont: 'Helvetica',
  isBold: false,
  isItalic: false,
  textAlign: 'left',
  highlightColor: '#ffeb3b',
  drawColor: '#e11d48',
  drawStrokeWidth: 3,
  stampType: 'APPROVED',
  customStampText: 'OFFICIALLY APPROVED',
  stampColor: '#16a34a',
  redactionOverlayText: 'REDACTED',
  activeWatermark: {
    text: 'CONFIDENTIAL',
    fontSize: 48,
    fontFamily: 'Helvetica',
    color: '#94a3b8',
    opacity: 0.25,
    rotation: 45,
    position: 'diagonal',
  },
};

export const PdfProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [documents, setDocuments] = useState<PdfDocumentState[]>([]);
  const [activeDocIndex, setActiveDocIndex] = useState<number>(-1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1.0);
  const [activeRibbonTab, setActiveRibbonTab] = useState<RibbonTab>('home');
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('thumbnails');
  const [continuousScroll, setContinuousScroll] = useState<boolean>(true);
  const [toolSettings, setToolSettings] = useState<ToolSettings>(DEFAULT_TOOL_SETTINGS);
  const [activeEditingFont, setActiveEditingFont] = useState<SelectedTextFontInfo | null>(null);

  const updateActiveEditingFont = useCallback((props: Partial<SelectedTextFontInfo>) => {
    setActiveEditingFont((prev) => (prev ? { ...prev, ...props } : null));
  }, []);

  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedObjectType, setSelectedObjectType] = useState<SelectedObjectType>(null);

  const [pdfJsDoc, setPdfJsDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Ready');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);

  // Modals state
  const [isOrganizeModalOpen, setIsOrganizeModalOpen] = useState(false);
  const [isCombineModalOpen, setIsCombineModalOpen] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isWatermarkModalOpen, setIsWatermarkModalOpen] = useState(false);
  const [isRedactionModalOpen, setIsRedactionModalOpen] = useState(false);
  const [isPropertiesModalOpen, setIsPropertiesModalOpen] = useState(false);
  const [isProtectModalOpen, setIsProtectModalOpen] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isNewBlankModalOpen, setIsNewBlankModalOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [isInsertPagesModalOpen, setIsInsertPagesModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isExistingTextEditModalOpen, setIsExistingTextEditModalOpen] = useState(false);
  const [isQaModalOpen, setIsQaModalOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [cloudDocuments, setCloudDocuments] = useState<CloudDocumentRecord[]>([]);
  const [cloudFolders, setCloudFolders] = useState<CloudFolder[]>([]);
  const [conflictInfo, setConflictInfo] = useState<SyncConflictInfo | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);



  // Undo/Redo stacks
  const [undoStack, setUndoStack] = useState<{ [docId: string]: PdfDocumentState[] }>({});
  const [redoStack, setRedoStack] = useState<{ [docId: string]: PdfDocumentState[] }>({});

  const activeDoc = useMemo(() => {
    if (activeDocIndex >= 0 && activeDocIndex < documents.length) {
      return documents[activeDocIndex];
    }
    return null;
  }, [documents, activeDocIndex]);

  const pushUndoState = useCallback((doc: PdfDocumentState) => {
    setUndoStack((prev) => ({
      ...prev,
      [doc.id]: [...(prev[doc.id] || []).slice(-20), JSON.parse(JSON.stringify(doc))],
    }));
    setRedoStack((prev) => ({
      ...prev,
      [doc.id]: [],
    }));
  }, []);

  const setSelectedObject = useCallback((id: string | null, type?: SelectedObjectType) => {
    setSelectedObjectId(id);
    setSelectedObjectType(type || null);
  }, []);

  useEffect(() => {
    let isCancelled = false;
    if (activeDoc && activeDoc.data) {
      setIsProcessing(true);
      setStatusMessage('Loading document pages...');
      PdfEngine.loadPdfJs(activeDoc.data)
        .then((doc) => {
          if (!isCancelled) {
            setPdfJsDoc(doc);
            setIsProcessing(false);
            setStatusMessage(`Loaded "${activeDoc.name}" (${activeDoc.pageCount} pages)`);
          }
        })
        .catch((err) => {
          if (!isCancelled) {
            console.error('Failed to load PDF in PDF.js:', err);
            setIsProcessing(false);
            setStatusMessage('Error rendering PDF');
          }
        });
    } else {
      setPdfJsDoc(null);
      setStatusMessage('Ready');
    }
    return () => {
      isCancelled = true;
    };
  }, [activeDoc?.id, activeDoc?.data]);

  const openPdfBuffer = useCallback(
    async (data: Uint8Array, name: string) => {
      try {
        setIsProcessing(true);
        setStatusMessage(`Reading ${name}...`);
        const { metadata, pages, pageCount } = await PdfEngine.inspectPdf(data, name);

        const newDoc: PdfDocumentState = {
          id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name,
          fileSize: data.byteLength,
          data,
          pageCount,
          pages,
          metadata,
          isModified: false,
          textAnnotations: [],
          imageAnnotations: [],
          hyperlinks: [],
          drawingAnnotations: [],
          highlightAnnotations: [],
          shapeAnnotations: [],
          stickyNotes: [],
          signatures: [],
          stamps: [],
          redactions: [],
          formFields: [],
          measurements: [],
        };

        StorageService.addRecentDocument(
          {
            id: newDoc.id,
            name: newDoc.name,
            size: newDoc.fileSize,
            lastOpened: Date.now(),
            pageCount: newDoc.pageCount,
          },
          data
        );

        setDocuments((prev) => {
          const updated = [...prev, newDoc];
          setActiveDocIndex(updated.length - 1);
          return updated;
        });

        setCurrentPage(1);
        setActiveRibbonTab('home');
        setStatusMessage(`Opened ${name}`);
      } catch (err) {
        console.error('Error opening PDF buffer:', err);
        alert('Could not open this PDF document. The file may be corrupt or encrypted.');
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  const openPdfFile = useCallback(
    async (file: File) => {
      const buffer = await file.arrayBuffer();
      await openPdfBuffer(new Uint8Array(buffer), file.name);
    },
    [openPdfBuffer]
  );

  const openSample = useCallback(
    async (sampleId: string) => {
      setIsProcessing(true);
      setStatusMessage('Generating professional sample document...');
      try {
        const { data, name } = await generateSamplePdf(sampleId);
        await openPdfBuffer(data, name);
      } catch (err) {
        console.error('Failed generating sample doc:', err);
        alert('Could not generate sample document.');
      } finally {
        setIsProcessing(false);
      }
    },
    [openPdfBuffer]
  );

  const createBlank = useCallback(
    async (pageSize: 'a4' | 'letter' | 'legal' = 'a4', orientation: 'portrait' | 'landscape' = 'portrait', count = 1) => {
      setIsProcessing(true);
      setStatusMessage('Creating new PDF document...');
      try {
        const data = await PdfEngine.createBlankPdf(pageSize, orientation, count);
        await openPdfBuffer(data, `Untitled_${Date.now().toString().slice(-4)}.pdf`);
      } catch (err) {
        console.error('Failed creating blank PDF:', err);
      } finally {
        setIsProcessing(false);
      }
    },
    [openPdfBuffer]
  );

  const createFromImages = useCallback(
    async (images: { name: string; dataUrl: string; type: string }[]) => {
      setIsProcessing(true);
      setStatusMessage('Converting images to PDF...');
      try {
        const data = await PdfEngine.createPdfFromImages(images);
        await openPdfBuffer(data, `Image_Document_${Date.now().toString().slice(-4)}.pdf`);
      } catch (err) {
        console.error('Failed converting images to PDF:', err);
      } finally {
        setIsProcessing(false);
      }
    },
    [openPdfBuffer]
  );

  const closeDocument = useCallback(
    (index: number) => {
      setDocuments((prev) => {
        const next = prev.filter((_, i) => i !== index);
        if (next.length === 0) {
          setActiveDocIndex(-1);
        } else if (activeDocIndex >= next.length) {
          setActiveDocIndex(next.length - 1);
        }
        return next;
      });
    },
    [activeDocIndex]
  );

  const saveCurrentDocument = useCallback(
    async (triggerDownload = true): Promise<Uint8Array | null> => {
      if (!activeDoc) return null;
      setIsProcessing(true);
      setStatusMessage('Saving & processing PDF modifications...');
      try {
        const burnedData = await PdfEngine.burnModificationsAndExport(activeDoc);
        const { pages } = await PdfEngine.inspectPdf(burnedData, activeDoc.name);

        const updatedDoc: PdfDocumentState = {
          ...activeDoc,
          data: burnedData,
          fileSize: burnedData.byteLength,
          pages,
          isModified: false,
          textAnnotations: [],
          imageAnnotations: [],
          hyperlinks: [],
          drawingAnnotations: [],
          highlightAnnotations: [],
          shapeAnnotations: [],
          signatures: [],
          stamps: [],
          redactions: [],
          watermark: undefined,
        };

        setDocuments((prev) =>
          prev.map((doc, idx) => (idx === activeDocIndex ? updatedDoc : doc))
        );

        if (triggerDownload) {
          const blob = new Blob([burnedData.buffer as ArrayBuffer], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = activeDoc.name.endsWith('.pdf') ? activeDoc.name : `${activeDoc.name}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setStatusMessage(`Saved and downloaded "${activeDoc.name}"`);
        } else {
          setStatusMessage(`Saved "${activeDoc.name}"`);
        }

        return burnedData;
      } catch (err) {
        console.error('Error saving document:', err);
        alert('Failed to save document.');
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [activeDoc, activeDocIndex]
  );

  const exportToTxt = useCallback(async () => {
    if (!pdfJsDoc || !activeDoc) return;
    setIsProcessing(true);
    setStatusMessage('Extracting text content from all pages...');
    try {
      const text = await PdfEngine.extractAllText(pdfJsDoc);
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeDoc.name.replace(/\.[^/.]+$/, '')}_Extracted_Text.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage('Text exported successfully.');
    } catch (e) {
      console.error(e);
      alert('Could not extract text.');
    } finally {
      setIsProcessing(false);
    }
  }, [pdfJsDoc, activeDoc]);

  const exportToImages = useCallback(
    async (format: 'image/png' | 'image/jpeg' = 'image/png') => {
      if (!pdfJsDoc || !activeDoc) return;
      setIsProcessing(true);
      setStatusMessage('Rendering pages to high-resolution images...');
      try {
        const images = await PdfEngine.exportPagesToImages(pdfJsDoc, format);
        images.forEach((img) => {
          const a = document.createElement('a');
          a.href = img.dataUrl;
          a.download = `${activeDoc.name.replace(/\.[^/.]+$/, '')}_Page_${img.pageNumber}.${format === 'image/png' ? 'png' : 'jpg'}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        });
        setStatusMessage(`Exported ${images.length} pages as ${format === 'image/png' ? 'PNG' : 'JPG'}`);
      } catch (e) {
        console.error(e);
        alert('Could not export images.');
      } finally {
        setIsProcessing(false);
      }
    },
    [pdfJsDoc, activeDoc]
  );

  const reorderPages = useCallback(
    async (newOrder0Based: number[], rotations: { [key: number]: number } = {}) => {
      if (!activeDoc) return;
      pushUndoState(activeDoc);
      setIsProcessing(true);
      setStatusMessage('Reorganizing pages...');
      try {
        const modifiedBytes = await PdfEngine.reorderAndModifyPages(activeDoc.data, newOrder0Based, rotations);
        const { pages, pageCount } = await PdfEngine.inspectPdf(modifiedBytes, activeDoc.name);

        setDocuments((prev) =>
          prev.map((doc, idx) =>
            idx === activeDocIndex
              ? {
                  ...doc,
                  data: modifiedBytes,
                  pages,
                  pageCount,
                  isModified: true,
                }
              : doc
          )
        );
        setCurrentPage(1);
        setStatusMessage('Pages reorganized successfully.');
      } catch (e) {
        console.error('Error reordering pages:', e);
        alert('Failed to reorganize pages.');
      } finally {
        setIsProcessing(false);
      }
    },
    [activeDoc, activeDocIndex, pushUndoState]
  );

  const deletePages = useCallback(
    async (pageIndices0Based: number[]) => {
      if (!activeDoc) return;
      if (pageIndices0Based.length >= activeDoc.pageCount) {
        alert('A document must have at least one page.');
        return;
      }
      pushUndoState(activeDoc);
      setIsProcessing(true);
      setStatusMessage('Deleting selected pages...');
      try {
        const modifiedBytes = await PdfEngine.deletePages(activeDoc.data, pageIndices0Based);
        const { pages, pageCount } = await PdfEngine.inspectPdf(modifiedBytes, activeDoc.name);

        setDocuments((prev) =>
          prev.map((doc, idx) =>
            idx === activeDocIndex
              ? {
                  ...doc,
                  data: modifiedBytes,
                  pages,
                  pageCount,
                  isModified: true,
                }
              : doc
          )
        );
        setCurrentPage(1);
        setStatusMessage(`Deleted ${pageIndices0Based.length} page(s).`);
      } catch (e) {
        console.error('Error deleting pages:', e);
        alert('Failed to delete pages.');
      } finally {
        setIsProcessing(false);
      }
    },
    [activeDoc, activeDocIndex, pushUndoState]
  );

  const duplicatePages = useCallback(
    async (pageIndices0Based: number[]) => {
      if (!activeDoc) return;
      pushUndoState(activeDoc);
      setIsProcessing(true);
      setStatusMessage('Duplicating pages...');
      try {
        const modifiedBytes = await PdfEngine.duplicatePages(activeDoc.data, pageIndices0Based);
        const { pages, pageCount } = await PdfEngine.inspectPdf(modifiedBytes, activeDoc.name);

        setDocuments((prev) =>
          prev.map((doc, idx) =>
            idx === activeDocIndex
              ? {
                  ...doc,
                  data: modifiedBytes,
                  pages,
                  pageCount,
                  isModified: true,
                }
              : doc
          )
        );
        setStatusMessage(`Duplicated ${pageIndices0Based.length} page(s).`);
      } catch (e) {
        console.error('Error duplicating pages:', e);
        alert('Failed to duplicate pages.');
      } finally {
        setIsProcessing(false);
      }
    },
    [activeDoc, activeDocIndex, pushUndoState]
  );

  const insertPagesFromPdf = useCallback(
    async (sourceBytes: Uint8Array, atIndex0Based: number, pageIndices?: number[]) => {
      if (!activeDoc) return;
      pushUndoState(activeDoc);
      setIsProcessing(true);
      setStatusMessage('Inserting pages from document...');
      try {
        const modifiedBytes = await PdfEngine.insertPagesFromOtherPdf(
          activeDoc.data,
          sourceBytes,
          atIndex0Based,
          pageIndices
        );
        const { pages, pageCount } = await PdfEngine.inspectPdf(modifiedBytes, activeDoc.name);

        setDocuments((prev) =>
          prev.map((doc, idx) =>
            idx === activeDocIndex
              ? {
                  ...doc,
                  data: modifiedBytes,
                  pages,
                  pageCount,
                  isModified: true,
                }
              : doc
          )
        );
        setStatusMessage('Pages inserted successfully.');
      } catch (e) {
        console.error('Error inserting pages:', e);
        alert('Failed to insert pages.');
      } finally {
        setIsProcessing(false);
      }
    },
    [activeDoc, activeDocIndex, pushUndoState]
  );

  const splitPdfByRanges = useCallback(
    async (ranges: { name: string; pageIndices0Based: number[] }[]) => {
      if (!activeDoc) return;
      setIsProcessing(true);
      setStatusMessage('Splitting document...');
      try {
        const splitResults = await PdfEngine.splitPdfByRanges(activeDoc.data, ranges);
        for (const res of splitResults) {
          const blob = new Blob([res.data.buffer as ArrayBuffer], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = res.name.endsWith('.pdf') ? res.name : `${res.name}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        setStatusMessage(`Split into ${splitResults.length} PDF files.`);
      } catch (e) {
        console.error('Error splitting PDF:', e);
        alert('Failed to split document.');
      } finally {
        setIsProcessing(false);
      }
    },
    [activeDoc]
  );

  const movePageBetweenDocuments = useCallback(
    async (targetDocIndex: number, pageIndex0Based: number) => {
      if (!activeDoc || targetDocIndex < 0 || targetDocIndex >= documents.length) return;
      const targetDoc = documents[targetDocIndex];
      setIsProcessing(true);
      try {
        // Copy page into targetDoc
        const updatedTargetBytes = await PdfEngine.insertPagesFromOtherPdf(
          targetDoc.data,
          activeDoc.data,
          targetDoc.pageCount,
          [pageIndex0Based]
        );
        const updatedTarget = await PdfEngine.inspectPdf(updatedTargetBytes, targetDoc.name);

        // Delete page from activeDoc if more than 1 page
        let updatedSourceBytes = activeDoc.data;
        if (activeDoc.pageCount > 1) {
          updatedSourceBytes = await PdfEngine.deletePages(activeDoc.data, [pageIndex0Based]);
        }
        const updatedSource = await PdfEngine.inspectPdf(updatedSourceBytes, activeDoc.name);

        setDocuments((prev) =>
          prev.map((d, i) => {
            if (i === activeDocIndex) {
              return {
                ...d,
                data: updatedSourceBytes,
                pageCount: updatedSource.pageCount,
                pages: updatedSource.pages,
                isModified: true,
              };
            }
            if (i === targetDocIndex) {
              return {
                ...d,
                data: updatedTargetBytes,
                pageCount: updatedTarget.pageCount,
                pages: updatedTarget.pages,
                isModified: true,
              };
            }
            return d;
          })
        );
        setStatusMessage(`Moved page to "${targetDoc.name}"`);
      } catch (e) {
        console.error('Failed moving page between documents:', e);
      } finally {
        setIsProcessing(false);
      }
    },
    [activeDoc, activeDocIndex, documents]
  );

  const rotateCurrentPage = useCallback(
    async (angleDelta: number) => {
      if (!activeDoc) return;
      const order = Array.from({ length: activeDoc.pageCount }, (_, i) => i);
      const rotations: { [key: number]: number } = {
        [currentPage - 1]: angleDelta,
      };
      await reorderPages(order, rotations);
    },
    [activeDoc, currentPage, reorderPages]
  );

  const rotateAllPages = useCallback(
    async (angleDelta: number) => {
      if (!activeDoc) return;
      const order = Array.from({ length: activeDoc.pageCount }, (_, i) => i);
      const rotations: { [key: number]: number } = {};
      for (let i = 0; i < activeDoc.pageCount; i++) {
        rotations[i] = angleDelta;
      }
      await reorderPages(order, rotations);
    },
    [activeDoc, reorderPages]
  );

  const extractPages = useCallback(
    async (pageIndices0Based: number[]) => {
      if (!activeDoc) return;
      setIsProcessing(true);
      setStatusMessage('Extracting pages...');
      try {
        const extractedData = await PdfEngine.extractPages(activeDoc.data, pageIndices0Based);
        await openPdfBuffer(
          extractedData,
          `${activeDoc.name.replace(/\.[^/.]+$/, '')}_Extracted_Pages.pdf`
        );
        setStatusMessage('Extracted pages opened in new tab.');
      } catch (e) {
        console.error('Error extracting pages:', e);
        alert('Failed to extract pages.');
      } finally {
        setIsProcessing(false);
      }
    },
    [activeDoc, openPdfBuffer]
  );

  const insertBlankPageAt = useCallback(
    async (atIndex0Based: number) => {
      if (!activeDoc) return;
      pushUndoState(activeDoc);
      setIsProcessing(true);
      setStatusMessage('Inserting blank page...');
      try {
        const updatedBytes = await PdfEngine.insertBlankPage(activeDoc.data, atIndex0Based);
        const { pages, pageCount } = await PdfEngine.inspectPdf(updatedBytes, activeDoc.name);

        setDocuments((prev) =>
          prev.map((doc, idx) =>
            idx === activeDocIndex
              ? {
                  ...doc,
                  data: updatedBytes,
                  pages,
                  pageCount,
                  isModified: true,
                }
              : doc
          )
        );
        setStatusMessage('Inserted blank page.');
      } catch (e) {
        console.error('Error inserting blank page:', e);
      } finally {
        setIsProcessing(false);
      }
    },
    [activeDoc, activeDocIndex, pushUndoState]
  );

  // Edit / Annotation Appenders
  const addTextAnnotation = useCallback(
    (item: Omit<TextAnnotation, 'id'>) => {
      if (!activeDoc) return;
      pushUndoState(activeDoc);
      const newItem: TextAnnotation = {
        ...item,
        id: `text_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      };
      setDocuments((prev) =>
        prev.map((doc, idx) =>
          idx === activeDocIndex
            ? { ...doc, isModified: true, textAnnotations: [...doc.textAnnotations, newItem] }
            : doc
        )
      );
      setSelectedObject(newItem.id, 'text');
    },
    [activeDoc, activeDocIndex, pushUndoState, setSelectedObject]
  );

  const updateTextAnnotation = useCallback(
    (id: string, updates: Partial<TextAnnotation>) => {
      if (!activeDoc) return;
      setDocuments((prev) =>
        prev.map((doc, idx) =>
          idx === activeDocIndex
            ? {
                ...doc,
                isModified: true,
                textAnnotations: doc.textAnnotations.map((t) => (t.id === id ? { ...t, ...updates } : t)),
              }
            : doc
        )
      );
    },
    [activeDoc, activeDocIndex]
  );

  const deleteTextAnnotation = useCallback(
    (id: string) => {
      if (!activeDoc) return;
      pushUndoState(activeDoc);
      setDocuments((prev) =>
        prev.map((doc, idx) =>
          idx === activeDocIndex
            ? {
                ...doc,
                isModified: true,
                textAnnotations: doc.textAnnotations.filter((t) => t.id !== id),
              }
            : doc
        )
      );
      if (selectedObjectId === id) setSelectedObject(null);
    },
    [activeDoc, activeDocIndex, pushUndoState, selectedObjectId, setSelectedObject]
  );

  const addImageAnnotation = useCallback(
    (item: Omit<ImageAnnotation, 'id'>) => {
      if (!activeDoc) return;
      pushUndoState(activeDoc);
      const newItem: ImageAnnotation = {
        ...item,
        id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      };
      setDocuments((prev) =>
        prev.map((doc, idx) =>
          idx === activeDocIndex
            ? { ...doc, isModified: true, imageAnnotations: [...(doc.imageAnnotations || []), newItem] }
            : doc
        )
      );
      setSelectedObject(newItem.id, 'image');
    },
    [activeDoc, activeDocIndex, pushUndoState, setSelectedObject]
  );

  const updateImageAnnotation = useCallback(
    (id: string, updates: Partial<ImageAnnotation>) => {
      if (!activeDoc) return;
      setDocuments((prev) =>
        prev.map((doc, idx) =>
          idx === activeDocIndex
            ? {
                ...doc,
                isModified: true,
                imageAnnotations: (doc.imageAnnotations || []).map((img) =>
                  img.id === id ? { ...img, ...updates } : img
                ),
              }
            : doc
        )
      );
    },
    [activeDoc, activeDocIndex]
  );

  const deleteImageAnnotation = useCallback(
    (id: string) => {
      if (!activeDoc) return;
      pushUndoState(activeDoc);
      setDocuments((prev) =>
        prev.map((doc, idx) =>
          idx === activeDocIndex
            ? {
                ...doc,
                isModified: true,
                imageAnnotations: (doc.imageAnnotations || []).filter((img) => img.id !== id),
              }
            : doc
        )
      );
      if (selectedObjectId === id) setSelectedObject(null);
    },
    [activeDoc, activeDocIndex, pushUndoState, selectedObjectId, setSelectedObject]
  );

  const addHyperlink = useCallback(
    (item: Omit<HyperlinkAnnotation, 'id'>) => {
      if (!activeDoc) return;
      pushUndoState(activeDoc);
      const newItem: HyperlinkAnnotation = {
        ...item,
        id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      };
      setDocuments((prev) =>
        prev.map((doc, idx) =>
          idx === activeDocIndex
            ? { ...doc, isModified: true, hyperlinks: [...(doc.hyperlinks || []), newItem] }
            : doc
        )
      );
      setSelectedObject(newItem.id, 'hyperlink');
    },
    [activeDoc, activeDocIndex, pushUndoState, setSelectedObject]
  );

  const deleteHyperlink = useCallback(
    (id: string) => {
      if (!activeDoc) return;
      pushUndoState(activeDoc);
      setDocuments((prev) =>
        prev.map((doc, idx) =>
          idx === activeDocIndex
            ? {
                ...doc,
                isModified: true,
                hyperlinks: (doc.hyperlinks || []).filter((l) => l.id !== id),
              }
            : doc
        )
      );
      if (selectedObjectId === id) setSelectedObject(null);
    },
    [activeDoc, activeDocIndex, pushUndoState, selectedObjectId, setSelectedObject]
  );

  const addHighlightAnnotation = useCallback(
    (item: Omit<HighlightAnnotation, 'id'>) => {
      if (!activeDoc) return;
      pushUndoState(activeDoc);
      const newItem: HighlightAnnotation = {
        ...item,
        id: `hl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      };
      setDocuments((prev) =>
        prev.map((doc, idx) =>
          idx === activeDocIndex
            ? { ...doc, isModified: true, highlightAnnotations: [...doc.highlightAnnotations, newItem] }
            : doc
        )
      );
    },
    [activeDoc, activeDocIndex, pushUndoState]
  );

  const addDrawingAnnotation = useCallback(
    (item: Omit<DrawingAnnotation, 'id'>) => {
      if (!activeDoc) return;
      pushUndoState(activeDoc);
      const newItem: DrawingAnnotation = {
        ...item,
        id: `draw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      };
      setDocuments((prev) =>
        prev.map((doc, idx) =>
          idx === activeDocIndex
            ? { ...doc, isModified: true, drawingAnnotations: [...doc.drawingAnnotations, newItem] }
            : doc
        )
      );
    },
    [activeDoc, activeDocIndex, pushUndoState]
  );

  const addShapeAnnotation = useCallback(
    (item: Omit<ShapeAnnotation, 'id'>) => {
      if (!activeDoc) return;
      pushUndoState(activeDoc);
      const newItem: ShapeAnnotation = {
        ...item,
        id: `shape_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      };
      setDocuments((prev) =>
        prev.map((doc, idx) =>
          idx === activeDocIndex
            ? { ...doc, isModified: true, shapeAnnotations: [...doc.shapeAnnotations, newItem] }
            : doc
        )
      );
      setSelectedObject(newItem.id, 'shape');
    },
    [activeDoc, activeDocIndex, pushUndoState, setSelectedObject]
  );

  const addStickyNote = useCallback(
    (item: Omit<StickyNoteAnnotation, 'id'>) => {
      if (!activeDoc) return;
      pushUndoState(activeDoc);
      const newItem: StickyNoteAnnotation = {
        ...item,
        id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      };
      setDocuments((prev) =>
        prev.map((doc, idx) =>
          idx === activeDocIndex
            ? { ...doc, isModified: true, stickyNotes: [...doc.stickyNotes, newItem] }
            : doc
        )
      );
      setSelectedObject(newItem.id, 'note');
    },
    [activeDoc, activeDocIndex, pushUndoState, setSelectedObject]
  );

  const addSignature = useCallback(
    (item: Omit<SignatureAnnotation, 'id'>) => {
      if (!activeDoc) return;
      pushUndoState(activeDoc);
      const newItem: SignatureAnnotation = {
        ...item,
        id: `sig_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      };
      setDocuments((prev) =>
        prev.map((doc, idx) =>
          idx === activeDocIndex
            ? { ...doc, isModified: true, signatures: [...doc.signatures, newItem] }
            : doc
        )
      );
      setSelectedObject(newItem.id, 'text');
    },
    [activeDoc, activeDocIndex, pushUndoState, setSelectedObject]
  );

  const addStamp = useCallback(
    (item: Omit<StampAnnotation, 'id'>) => {
      if (!activeDoc) return;
      pushUndoState(activeDoc);
      const newItem: StampAnnotation = {
        ...item,
        id: `stamp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      };
      setDocuments((prev) =>
        prev.map((doc, idx) =>
          idx === activeDocIndex
            ? { ...doc, isModified: true, stamps: [...doc.stamps, newItem] }
            : doc
        )
      );
      setSelectedObject(newItem.id, 'stamp');
    },
    [activeDoc, activeDocIndex, pushUndoState, setSelectedObject]
  );

  const addRedactionBox = useCallback(
    (item: Omit<RedactionBox, 'id'>) => {
      if (!activeDoc) return;
      pushUndoState(activeDoc);
      const newItem: RedactionBox = {
        ...item,
        id: `redact_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      };
      setDocuments((prev) =>
        prev.map((doc, idx) =>
          idx === activeDocIndex
            ? { ...doc, isModified: true, redactions: [...doc.redactions, newItem] }
            : doc
        )
      );
      setSelectedObject(newItem.id, 'redact');
    },
    [activeDoc, activeDocIndex, pushUndoState, setSelectedObject]
  );

  const applyBurnedRedactions = useCallback(async () => {
    if (!activeDoc) return;
    if (activeDoc.redactions.length === 0) {
      alert('No redactions marked on the document.');
      return;
    }
    await saveCurrentDocument(false);
    setStatusMessage('Permanent redactions applied. Underlying content wiped.');
  }, [activeDoc, saveCurrentDocument]);

  const setWatermark = useCallback(
    (config: WatermarkConfig) => {
      if (!activeDoc) return;
      pushUndoState(activeDoc);
      setDocuments((prev) =>
        prev.map((doc, idx) =>
          idx === activeDocIndex
            ? { ...doc, isModified: true, watermark: config }
            : doc
        )
      );
    },
    [activeDoc, activeDocIndex, pushUndoState]
  );

  const addFormField = useCallback(
    (item: Omit<FormFieldItem, 'id'>) => {
      if (!activeDoc) return;
      pushUndoState(activeDoc);
      const newItem: FormFieldItem = {
        ...item,
        id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      };
      setDocuments((prev) =>
        prev.map((doc, idx) =>
          idx === activeDocIndex
            ? { ...doc, isModified: true, formFields: [...doc.formFields, newItem] }
            : doc
        )
      );
    },
    [activeDoc, activeDocIndex, pushUndoState]
  );

  const updateFormFieldValue = useCallback(
    (fieldId: string, val: string | boolean) => {
      if (!activeDoc) return;
      setDocuments((prev) =>
        prev.map((doc, idx) =>
          idx === activeDocIndex
            ? {
                ...doc,
                isModified: true,
                formFields: doc.formFields.map((f) => (f.id === fieldId ? { ...f, value: val } : f)),
              }
            : doc
        )
      );
    },
    [activeDoc, activeDocIndex]
  );

  const addMeasurement = useCallback(
    (item: Omit<MeasurementAnnotation, 'id'>) => {
      if (!activeDoc) return;
      pushUndoState(activeDoc);
      const newItem: MeasurementAnnotation = {
        ...item,
        id: `measure_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      };
      setDocuments((prev) =>
        prev.map((doc, idx) =>
          idx === activeDocIndex
            ? { ...doc, isModified: true, measurements: [...doc.measurements, newItem] }
            : doc
        )
      );
    },
    [activeDoc, activeDocIndex, pushUndoState]
  );

  const applySearchableOcrLayer = useCallback(
    async (pageNum: number, text: string) => {
      if (!activeDoc) return;
      setIsProcessing(true);
      setStatusMessage('Embedding searchable text layer...');
      try {
        const updatedBytes = await PdfEngine.embedSearchableOcrLayer(activeDoc.data, pageNum, text);
        const { pages } = await PdfEngine.inspectPdf(updatedBytes, activeDoc.name);
        setDocuments((prev) =>
          prev.map((doc, idx) =>
            idx === activeDocIndex
              ? {
                  ...doc,
                  data: updatedBytes,
                  pages,
                  isModified: true,
                }
              : doc
          )
        );
        setStatusMessage('Searchable text layer embedded.');
      } catch (e) {
        console.error(e);
        alert('Failed to embed searchable text layer.');
      } finally {
        setIsProcessing(false);
      }
    },
    [activeDoc, activeDocIndex]
  );

  const replaceExistingText = useCallback(
    async (
      pageNumber: number,
      originalItem: PageTextItem | PageParagraphBlock | { x: number; y: number; width: number; height: number; str: string },
      newText: string,
      options?: {
        fontFamily?: string;
        fontSize?: number;
        isBold?: boolean;
        isItalic?: boolean;
        color?: string;
        backgroundColor?: string;
        align?: 'left' | 'center' | 'right';
        fontBytes?: Uint8Array;
        isSubset?: boolean;
      }
    ) => {
      if (!activeDoc) return;
      pushUndoState(activeDoc);
      setIsProcessing(true);
      setStatusMessage(`Replacing text on page ${pageNumber}...`);
      try {
        const updatedBytes = await PdfEngine.replaceTextOnPage(
          activeDoc.data,
          pageNumber,
          originalItem,
          newText,
          {
            ...options,
            fontBytes: (originalItem as any).fontBytes || (options as any)?.fontBytes,
          }
        );
        const { pages, pageCount } = await PdfEngine.inspectPdf(updatedBytes, activeDoc.name);

        setDocuments((prev) =>
          prev.map((doc, idx) =>
            idx === activeDocIndex
              ? {
                  ...doc,
                  data: updatedBytes,
                  pages,
                  pageCount,
                  isModified: true,
                }
              : doc
          )
        );

        setStatusMessage(`Replaced "${originalItem.str}" with "${newText}".`);
      } catch (err: any) {
        console.error('Error replacing text:', err);
        setStatusMessage(`Failed to replace text: ${err.message}`);
        alert(`Could not replace text: ${err.message}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [activeDoc, activeDocIndex, pushUndoState]
  );

  const replaceAllMatchingText = useCallback(
    async (
      pageNumber: number,
      textItems: PageTextItem[],
      searchStr: string,
      replacementText: string,
      options?: {
        matchCase?: boolean;
        fontFamily?: string;
        fontSize?: number;
        color?: string;
      }
    ): Promise<number> => {
      if (!activeDoc) return 0;
      pushUndoState(activeDoc);
      setIsProcessing(true);
      setStatusMessage(`Replacing all occurrences of "${searchStr}"...`);
      try {
        const { updatedPdf, replacedCount } = await PdfEngine.replaceAllMatchingTextOnPage(
          activeDoc.data,
          pageNumber,
          textItems,
          searchStr,
          replacementText,
          options
        );

        if (replacedCount > 0) {
          const { pages, pageCount } = await PdfEngine.inspectPdf(updatedPdf, activeDoc.name);
          setDocuments((prev) =>
            prev.map((doc, idx) =>
              idx === activeDocIndex
                ? {
                    ...doc,
                    data: updatedPdf,
                    pages,
                    pageCount,
                    isModified: true,
                  }
                : doc
            )
          );
          setStatusMessage(`Replaced ${replacedCount} occurrence(s) on Page ${pageNumber}.`);
        } else {
          setStatusMessage(`No matches found for "${searchStr}".`);
        }

        return replacedCount;
      } catch (err: any) {
        console.error('Error replacing all matches:', err);
        alert(`Could not replace all matches: ${err.message}`);
        return 0;
      } finally {
        setIsProcessing(false);
      }
    },
    [activeDoc, activeDocIndex, pushUndoState]
  );

  const inspectPageText = useCallback(
    async (pageNumber: number): Promise<PageTextDetectionResult | null> => {
      if (!pdfJsDoc || !activeDoc) return null;
      return await PdfEngine.extractPageTextItems(pdfJsDoc, pageNumber, activeDoc.data);
    },
    [pdfJsDoc, activeDoc]
  );

  // Selected Object Manipulation
  const deleteSelectedObject = useCallback(() => {
    if (!activeDoc || !selectedObjectId) return;
    pushUndoState(activeDoc);

    setDocuments((prev) =>
      prev.map((doc, idx) => {
        if (idx !== activeDocIndex) return doc;
        return {
          ...doc,
          isModified: true,
          textAnnotations: doc.textAnnotations.filter((t) => t.id !== selectedObjectId),
          imageAnnotations: (doc.imageAnnotations || []).filter((i) => i.id !== selectedObjectId),
          hyperlinks: (doc.hyperlinks || []).filter((h) => h.id !== selectedObjectId),
          shapeAnnotations: doc.shapeAnnotations.filter((s) => s.id !== selectedObjectId),
          stickyNotes: doc.stickyNotes.filter((n) => n.id !== selectedObjectId),
          stamps: doc.stamps.filter((s) => s.id !== selectedObjectId),
          redactions: doc.redactions.filter((r) => r.id !== selectedObjectId),
          signatures: doc.signatures.filter((s) => s.id !== selectedObjectId),
        };
      })
    );
    setSelectedObjectId(null);
  }, [activeDoc, activeDocIndex, pushUndoState, selectedObjectId]);

  const duplicateSelectedObject = useCallback(() => {
    if (!activeDoc || !selectedObjectId) return;
    const txt = activeDoc.textAnnotations.find((t) => t.id === selectedObjectId);
    if (txt) {
      addTextAnnotation({ ...txt, x: txt.x + 20, y: txt.y + 20 });
      return;
    }
    const img = (activeDoc.imageAnnotations || []).find((i) => i.id === selectedObjectId);
    if (img) {
      addImageAnnotation({ ...img, x: img.x + 20, y: img.y + 20 });
      return;
    }
    const stamp = activeDoc.stamps.find((s) => s.id === selectedObjectId);
    if (stamp) {
      addStamp({ ...stamp, x: stamp.x + 20, y: stamp.y + 20 });
    }
  }, [activeDoc, selectedObjectId, addTextAnnotation, addImageAnnotation, addStamp]);

  const updateSelectedTextProps = useCallback(
    (props: Partial<TextAnnotation>) => {
      if (!selectedObjectId) return;
      updateTextAnnotation(selectedObjectId, props);
    },
    [selectedObjectId, updateTextAnnotation]
  );

  const updateSelectedImageProps = useCallback(
    (props: Partial<ImageAnnotation>) => {
      if (!selectedObjectId) return;
      updateImageAnnotation(selectedObjectId, props);
    },
    [selectedObjectId, updateImageAnnotation]
  );

  // Undo / Redo
  const undo = useCallback(() => {
    if (!activeDoc) return;
    const stack = undoStack[activeDoc.id] || [];
    if (stack.length === 0) return;

    const previousState = stack[stack.length - 1];
    setUndoStack((prev) => ({
      ...prev,
      [activeDoc.id]: stack.slice(0, -1),
    }));
    setRedoStack((prev) => ({
      ...prev,
      [activeDoc.id]: [...(prev[activeDoc.id] || []), activeDoc],
    }));

    setDocuments((prev) =>
      prev.map((doc, idx) => (idx === activeDocIndex ? previousState : doc))
    );
  }, [activeDoc, activeDocIndex, undoStack]);

  const redo = useCallback(() => {
    if (!activeDoc) return;
    const stack = redoStack[activeDoc.id] || [];
    if (stack.length === 0) return;

    const nextState = stack[stack.length - 1];
    setRedoStack((prev) => ({
      ...prev,
      [activeDoc.id]: stack.slice(0, -1),
    }));
    setUndoStack((prev) => ({
      ...prev,
      [activeDoc.id]: [...(prev[activeDoc.id] || []), activeDoc],
    }));

    setDocuments((prev) =>
      prev.map((doc, idx) => (idx === activeDocIndex ? nextState : doc))
    );
  }, [activeDoc, activeDocIndex, redoStack]);

  const canUndo = activeDoc ? (undoStack[activeDoc.id] || []).length > 0 : false;
  const canRedo = activeDoc ? (redoStack[activeDoc.id] || []).length > 0 : false;

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+S, Delete key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if (cmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (cmdOrCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveCurrentDocument(true);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only if not actively typing in an input or textarea
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea' && selectedObjectId) {
          e.preventDefault();
          deleteSelectedObject();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, saveCurrentDocument, selectedObjectId, deleteSelectedObject]);

  // ==================== PHASE 4 CLOUD & DESKTOP HANDLERS ====================

  const refreshCloudDocs = useCallback(async () => {
    if (!currentUser) {
      const recents = await StorageService.getRecentDocuments();
      const mapped: CloudDocumentRecord[] = recents.map((r) => ({
        id: r.id,
        userId: 'local_user',
        name: r.name,
        sizeBytes: r.size,
        pageCount: r.pageCount,
        storagePath: `local/${r.id}`,
        version: 1,
        createdAt: new Date(r.lastOpened).toISOString(),
        updatedAt: new Date(r.lastOpened).toISOString(),
        syncStatus: 'synced' as const,
      }));
      setCloudDocuments(mapped);
      return;
    }

    try {
      setIsSyncing(true);
      const docs = await CloudFirestoreService.getUserDocuments(currentUser.uid, undefined, currentUser);
      const folders = await CloudFirestoreService.getUserFolders(currentUser.uid, currentUser);
      setCloudDocuments(docs);
      setCloudFolders(folders);
    } catch (e) {
      console.warn('Could not load cloud documents:', e);
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser]);

  const uploadToCloud = useCallback(
    async (pdfBytes: Uint8Array, name: string, folderId?: string) => {
      const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const effectiveUserId = currentUser?.uid || 'local_user';

      if (!isFirebaseConfigured() || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        await OfflineSyncService.enqueueUpload(effectiveUserId, docId, name, pdfBytes, 1, folderId, 1);
        await refreshCloudDocs();
        setStatusMessage(`Document saved locally and queued for cloud sync when online.`);
        return;
      }

      try {
        setIsSyncing(true);
        const { storagePath, downloadUrl } = await CloudStorageService.uploadPdf(
          effectiveUserId,
          docId,
          pdfBytes,
          name
        );

        await CloudFirestoreService.saveDocument(
          effectiveUserId,
          {
            id: docId,
            name,
            sizeBytes: pdfBytes.length,
            pageCount: activeDoc?.pageCount || 1,
            storagePath,
            downloadUrl,
            version: 1,
            folderId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          0,
          currentUser
        );

        await refreshCloudDocs();
        setStatusMessage(`"${name}" successfully uploaded to Firebase Cloud.`);
      } catch (err: any) {
        if (err.conflictInfo) {
          setConflictInfo(err.conflictInfo);
          setIsConflictModalOpen(true);
          return;
        }
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [currentUser, activeDoc, refreshCloudDocs]
  );

  const deleteFromCloud = useCallback(
    async (docId: string) => {
      if (!confirm('Are you sure you want to delete this document from Cloud?')) return;
      const doc = cloudDocuments.find((d) => d.id === docId);
      if (!doc) return;

      try {
        if (currentUser && isFirebaseConfigured()) {
          await CloudFirestoreService.deleteDocument(currentUser.uid, docId, currentUser);
          if (doc.storagePath) {
            await CloudStorageService.deletePdf(doc.storagePath);
          }
        }
        setCloudDocuments((prev) => prev.filter((d) => d.id !== docId));
        setStatusMessage(`Document removed from cloud.`);
      } catch (err: any) {
        alert(`Could not delete document: ${err.message}`);
      }
    },
    [currentUser, cloudDocuments]
  );

  const createCloudFolder = useCallback(
    async (name: string, color?: string) => {
      const effectiveUserId = currentUser?.uid || 'local_user';
      if (currentUser && isFirebaseConfigured()) {
        const folder = await CloudFirestoreService.createFolder(
          effectiveUserId,
          name,
          color,
          currentUser
        );
        setCloudFolders((prev) => [...prev, folder]);
      } else {
        const localFolder: CloudFolder = {
          id: `folder_${Date.now()}`,
          userId: effectiveUserId,
          name,
          color: color || '#2563eb',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setCloudFolders((prev) => [...prev, localFolder]);
      }
    },
    [currentUser]
  );

  const resolveConflict = useCallback(
    async (choice: 'keep_local' | 'keep_remote' | 'save_copy') => {
      if (!conflictInfo || !activeDoc) return;

      if (choice === 'save_copy') {
        const copyName = `${conflictInfo.documentName.replace(/\.pdf$/i, '')}_copy.pdf`;
        await uploadToCloud(activeDoc.data, copyName);
        setStatusMessage(`Saved copy as "${copyName}" in Cloud.`);
      } else if (choice === 'keep_local') {
        if (currentUser && isFirebaseConfigured()) {
          const { storagePath, downloadUrl } = await CloudStorageService.uploadPdf(
            currentUser.uid,
            conflictInfo.documentId,
            activeDoc.data,
            conflictInfo.documentName
          );
          await CloudFirestoreService.saveDocument(
            currentUser.uid,
            {
              id: conflictInfo.documentId,
              name: conflictInfo.documentName,
              sizeBytes: activeDoc.data.length,
              pageCount: activeDoc.pageCount,
              storagePath,
              downloadUrl,
              version: conflictInfo.remoteVersion + 1,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            undefined,
            currentUser
          );
        }
        setStatusMessage(`Cloud document overwritten with local edits (v${conflictInfo.remoteVersion + 1}).`);
      } else if (choice === 'keep_remote') {
        if (currentUser && isFirebaseConfigured()) {
          const remoteDoc = cloudDocuments.find((d) => d.id === conflictInfo.documentId);
          if (remoteDoc?.storagePath) {
            const bytes = await CloudStorageService.downloadPdf(remoteDoc.storagePath);
            await openPdfBuffer(bytes, remoteDoc.name);
            setStatusMessage(`Loaded latest remote version (v${conflictInfo.remoteVersion}).`);
          }
        }
      }

      setIsConflictModalOpen(false);
      setConflictInfo(null);
    },
    [conflictInfo, activeDoc, currentUser, cloudDocuments, uploadToCloud, openPdfBuffer]
  );

  useEffect(() => {
    const unsubAuth = AuthService.onAuthChange((user) => {
      setCurrentUser(user);
    });

    const unsubSync = OfflineSyncService.subscribe((status) => {
      setIsSyncing(status.isSyncing);
      setPendingSyncCount(status.pendingCount);
    });

    if (typeof window !== 'undefined' && window.electronAPI?.onMenuTrigger) {
      window.electronAPI.onMenuTrigger((action) => {
        if (action === 'open') {
          window.electronAPI?.openPdf().then((result) => {
            if (result && result.data) {
              openPdfBuffer(new Uint8Array(result.data), result.name);
            }
          });
        } else if (action === 'save') {
          saveCurrentDocument(false);
        } else if (action === 'saveAs') {
          saveCurrentDocument(true);
        }
      });
    }

    return () => {
      unsubAuth();
      unsubSync();
    };
  }, [openPdfBuffer, saveCurrentDocument]);

  useEffect(() => {
    if (!activeDoc || !activeDoc.isModified || typeof window === 'undefined' || !window.electronAPI?.autoSaveBackup) {
      return;
    }

    const interval = setInterval(() => {
      window.electronAPI?.autoSaveBackup({
        documentId: activeDoc.id,
        name: activeDoc.name,
        data: Array.from(activeDoc.data),
      });
    }, 120000);

    return () => clearInterval(interval);
  }, [activeDoc]);


  const cloudSyncStatus: 'synced' | 'syncing' | 'offline' | 'local_only' = useMemo(() => {
    if (!isFirebaseConfigured()) return 'local_only';
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
    if (isSyncing) return 'syncing';
    return 'synced';
  }, [isSyncing]);

  return (
    <PdfContext.Provider

      value={{
        documents,
        activeDocIndex,
        activeDoc,
        currentPage,
        zoom,
        activeRibbonTab,
        activeTool,
        sidebarTab,
        continuousScroll,
        toolSettings,
        pdfJsDoc,
        statusMessage,
        setStatusMessage,
        isProcessing,
        progressPercent,
        selectedObjectId,
        selectedObjectType,
        setSelectedObject,
        deleteSelectedObject,
        duplicateSelectedObject,
        updateSelectedTextProps,
        updateSelectedImageProps,
        activeEditingFont,
        setActiveEditingFont,
        updateActiveEditingFont,
        setActiveDocIndex,
        setCurrentPage,
        setZoom,
        setActiveRibbonTab,
        setActiveTool,
        setSidebarTab,
        setContinuousScroll,
        setToolSettings,
        openPdfBuffer,
        openPdfFile,
        openSample,
        createBlank,
        createFromImages,
        closeDocument,
        saveCurrentDocument,
        exportToTxt,
        exportToImages,
        reorderPages,
        deletePages,
        rotateCurrentPage,
        rotateAllPages,
        extractPages,
        insertBlankPageAt,
        insertPagesFromPdf,
        duplicatePages,
        splitPdfByRanges,
        movePageBetweenDocuments,
        addTextAnnotation,
        updateTextAnnotation,
        deleteTextAnnotation,
        addImageAnnotation,
        updateImageAnnotation,
        deleteImageAnnotation,
        addHyperlink,
        deleteHyperlink,
        addHighlightAnnotation,
        addDrawingAnnotation,
        addShapeAnnotation,
        addStickyNote,
        addSignature,
        addStamp,
        addRedactionBox,
        applyBurnedRedactions,
        setWatermark,
        addFormField,
        updateFormFieldValue,
        addMeasurement,
        applySearchableOcrLayer,
        replaceExistingText,
        replaceAllMatchingText,
        inspectPageText,
        undo,
        redo,
        canUndo,
        canRedo,
        isOrganizeModalOpen,
        setIsOrganizeModalOpen,
        isCombineModalOpen,
        setIsCombineModalOpen,
        isSignatureModalOpen,
        setIsSignatureModalOpen,
        isWatermarkModalOpen,
        setIsWatermarkModalOpen,
        isRedactionModalOpen,
        setIsRedactionModalOpen,
        isPropertiesModalOpen,
        setIsPropertiesModalOpen,
        isProtectModalOpen,
        setIsProtectModalOpen,
        isUnlockModalOpen,
        setIsUnlockModalOpen,
        isExportModalOpen,
        setIsExportModalOpen,
        isOcrModalOpen,
        setIsOcrModalOpen,
        isCompareModalOpen,
        setIsCompareModalOpen,
        isHelpModalOpen,
        setIsHelpModalOpen,
        isNewBlankModalOpen,
        setIsNewBlankModalOpen,
        isSplitModalOpen,
        setIsSplitModalOpen,
        isInsertPagesModalOpen,
        setIsInsertPagesModalOpen,
        isBatchModalOpen,
        setIsBatchModalOpen,
        isExistingTextEditModalOpen,
        setIsExistingTextEditModalOpen,
        isQaModalOpen,
        setIsQaModalOpen,

        // Phase 4 Cloud & Desktop Modals and Sync State
        isCloudModalOpen,
        setIsCloudModalOpen,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isConflictModalOpen,
        setIsConflictModalOpen,
        currentUser,
        setCurrentUser,
        cloudDocuments,
        cloudFolders,
        conflictInfo,
        isSyncing,
        pendingSyncCount,
        cloudSyncStatus,
        uploadToCloud,
        deleteFromCloud,
        createCloudFolder,
        refreshCloudDocs,
        resolveConflict,
      }}
    >
      {children}
    </PdfContext.Provider>
  );
};

export const usePdf = (): PdfContextType => {
  const context = useContext(PdfContext);
  if (!context) {
    throw new Error('usePdf must be used within a PdfProvider');
  }
  return context;
};
