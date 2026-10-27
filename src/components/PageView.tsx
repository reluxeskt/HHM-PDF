import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  X,
  MessageSquare,
  ShieldAlert,
  FileCheck,
  Move,
  Trash2,
  Copy,
  RotateCw,
  ExternalLink,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Sliders,
  Link as LinkIcon,
  Edit3,
  AlertCircle,
  ScanText,
  CheckCircle2,
  Upload,
  Search,
  Type,
  AlertTriangle,
} from 'lucide-react';
import { usePdf } from '../context/PdfContext';
import { PdfEngine } from '../services/pdfEngine';
import { fontRegistry, FontInfo } from '../services/fontRegistry';
import {
  TextAnnotation,
  ImageAnnotation,
  HyperlinkAnnotation,
  DrawingAnnotation,
  HighlightAnnotation,
  ShapeAnnotation,
  StickyNoteAnnotation,
  SignatureAnnotation,
  StampAnnotation,
  RedactionBox,
  FormFieldItem,
  MeasurementAnnotation,
  PageTextItem,
  PageParagraphBlock,
} from '../types';

interface PageViewProps {
  pageNumber: number;
  pdfJsDoc: pdfjsLib.PDFDocumentProxy;
}

export const PageView: React.FC<PageViewProps> = ({ pageNumber, pdfJsDoc }) => {
  const {
    activeDoc,
    zoom,
    activeTool,
    toolSettings,
    selectedObjectId,
    selectedObjectType,
    setSelectedObject,
    deleteSelectedObject,
    duplicateSelectedObject,
    updateSelectedTextProps,
    updateSelectedImageProps,
    addTextAnnotation,
    updateTextAnnotation,
    addImageAnnotation,
    updateImageAnnotation,
    addHyperlink,
    addHighlightAnnotation,
    addDrawingAnnotation,
    addShapeAnnotation,
    addStickyNote,
    addSignature,
    addStamp,
    addRedactionBox,
    addFormField,
    updateFormFieldValue,
    addMeasurement,
    setIsSignatureModalOpen,
    replaceExistingText,
    setStatusMessage,
    activeEditingFont,
    setActiveEditingFont,
  } = usePdf();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [pageWidth, setPageWidth] = useState<number>(595);
  const [pageHeight, setPageHeight] = useState<number>(842);

  // Existing PDF Text Layer & OCR Detection states
  const [pageTextItems, setPageTextItems] = useState<PageTextItem[]>([]);
  const [isScannedPage, setIsScannedPage] = useState<boolean>(false);
  const [isOcrLoading, setIsOcrLoading] = useState<boolean>(false);
  const [hoveredTextId, setHoveredTextId] = useState<string | null>(null);

  // Paragraph Block Selection & Dynamic System Fonts
  const [selectedParagraph, setSelectedParagraph] = useState<PageParagraphBlock | null>(null);
  const [hoveredParagraphId, setHoveredParagraphId] = useState<string | null>(null);
  const [inlineEditText, setInlineEditText] = useState<string>('');
  const [inlineFontFamily, setInlineFontFamily] = useState<string>('Helvetica');
  const [inlineFontSize, setInlineFontSize] = useState<number>(12);
  const [inlineIsBold, setInlineIsBold] = useState<boolean>(false);
  const [inlineIsItalic, setInlineIsItalic] = useState<boolean>(false);
  const [inlineColor, setInlineColor] = useState<string>('#000000');
  const [inlineAlign, setInlineAlign] = useState<'left' | 'center' | 'right'>('left');

  const [availableFonts, setAvailableFonts] = useState<FontInfo[]>([]);
  const [fontSearch, setFontSearch] = useState<string>('');

  const paragraphBlocks = useMemo(() => {
    return PdfEngine.groupTextItemsIntoParagraphs(pageTextItems);
  }, [pageTextItems]);

  useEffect(() => {
    fontRegistry.discoverSystemFonts().then((fonts) => {
      setAvailableFonts(fonts);
    });
  }, []);

  // Synchronize toolbar formatting changes into active inline paragraph editor
  useEffect(() => {
    if (selectedParagraph && activeEditingFont) {
      if (activeEditingFont.fontFamily && activeEditingFont.fontFamily !== inlineFontFamily) {
        setInlineFontFamily(activeEditingFont.fontFamily);
      }
      if (activeEditingFont.fontSize && activeEditingFont.fontSize !== inlineFontSize) {
        setInlineFontSize(activeEditingFont.fontSize);
      }
      if (typeof activeEditingFont.isBold === 'boolean' && activeEditingFont.isBold !== inlineIsBold) {
        setInlineIsBold(activeEditingFont.isBold);
      }
      if (typeof activeEditingFont.isItalic === 'boolean' && activeEditingFont.isItalic !== inlineIsItalic) {
        setInlineIsItalic(activeEditingFont.isItalic);
      }
      if (activeEditingFont.color && activeEditingFont.color !== inlineColor) {
        setInlineColor(activeEditingFont.color);
      }
    }
  }, [activeEditingFont, selectedParagraph]);

  const handleCustomFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const fontInfo = await fontRegistry.loadCustomFontFile(file);
        setAvailableFonts(fontRegistry.getAvailableFonts());
        setInlineFontFamily(fontInfo.family);
      } catch (err: any) {
        alert(`Failed to load custom font file: ${err.message}`);
      }
    }
  };

  const handleApplyInlineParagraphReplacement = async () => {
    if (!selectedParagraph || !inlineEditText.trim()) {
      setSelectedParagraph(null);
      setActiveEditingFont(null);
      return;
    }
    const targetBlock = selectedParagraph;
    setSelectedParagraph(null);
    setActiveEditingFont(null);
    await replaceExistingText(pageNumber, targetBlock, inlineEditText, {
      fontFamily: inlineFontFamily,
      fontSize: inlineFontSize,
      isBold: inlineIsBold,
      isItalic: inlineIsItalic,
      color: inlineColor,
      align: inlineAlign,
      fontBytes: targetBlock.fontBytes,
      isSubset: targetBlock.isSubset,
    });
  };

  // Interaction States
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState<{ x: number; y: number }[]>([]);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDragBox, setCurrentDragBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Dragging / Moving existing selected object
  const [isMovingObject, setIsMovingObject] = useState(false);
  const [moveStartCoords, setMoveStartCoords] = useState<{ x: number; y: number } | null>(null);
  const [objectOriginalPos, setObjectOriginalPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Resizing existing selected object
  const [isResizing, setIsResizing] = useState<string | null>(null); // 'se' | 'sw' | 'ne' | 'nw'
  const [resizeStartCoords, setResizeStartCoords] = useState<{ x: number; y: number } | null>(null);

  // Inline text input when user clicks with 'text' tool
  const [activeTextInput, setActiveTextInput] = useState<{ x: number; y: number; text: string } | null>(null);

  // Hyperlink creation dialog
  const [pendingHyperlinkBox, setPendingHyperlinkBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [hyperlinkUrl, setHyperlinkUrl] = useState('https://');

  // Sticky note modal state
  const [activeStickyPopup, setActiveStickyPopup] = useState<string | null>(null);

  // Extract selectable text items from current page
  useEffect(() => {
    let isCancelled = false;
    if (pdfJsDoc && activeDoc && pageNumber >= 1 && pageNumber <= pdfJsDoc.numPages) {
      PdfEngine.extractPageTextItems(pdfJsDoc, pageNumber, activeDoc.data)
        .then((res) => {
          if (!isCancelled) {
            setPageTextItems(res.items);
            setIsScannedPage(res.isScanned);
          }
        })
        .catch((err) => {
          if (!isCancelled) console.warn('Could not extract text items:', err);
        });
    }
    return () => {
      isCancelled = true;
    };
  }, [pdfJsDoc, pageNumber, activeDoc?.data]);

  const handleRecognizePageOcr = async () => {
    if (!canvasRef.current || !activeDoc) return;
    setIsOcrLoading(true);
    setStatusMessage(`Running OCR text recognition on page ${pageNumber}...`);
    try {
      const pageInfo = activeDoc.pages[pageNumber - 1];
      const pw = pageInfo?.width || 595.28;
      const ph = pageInfo?.height || 841.89;
      const ocrItems = await PdfEngine.recognizeScannedPageItems(
        canvasRef.current,
        pageNumber,
        pw,
        ph
      );
      setPageTextItems(ocrItems);
      setIsScannedPage(false);
      setStatusMessage(`OCR recognized ${ocrItems.length} text region(s) on Page ${pageNumber}.`);
    } catch (err: any) {
      console.error('OCR error:', err);
      alert(`OCR recognition failed: ${err.message}`);
    } finally {
      setIsOcrLoading(false);
    }
  };

  // Render PDF.js page onto Canvas
  useEffect(() => {
    let isCancelled = false;
    if (pdfJsDoc && canvasRef.current && pageNumber >= 1 && pageNumber <= pdfJsDoc.numPages) {
      PdfEngine.renderPageToCanvas(pdfJsDoc, pageNumber, canvasRef.current, zoom)
        .then(() => {
          if (!isCancelled && canvasRef.current) {
            setPageWidth(canvasRef.current.clientWidth);
            setPageHeight(canvasRef.current.clientHeight);
          }
        })
        .catch((err) => {
          if (!isCancelled) console.error(`Error rendering page ${pageNumber}:`, err);
        });
    }
    return () => {
      isCancelled = true;
    };
  }, [pdfJsDoc, pageNumber, zoom]);

  // Convert mouse event coordinates to Page points (normalized to 1.0 zoom)
  const getEventCoords = (e: React.MouseEvent<any> | { clientX: number; clientY: number }) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    return {
      x: clientX / zoom,
      y: clientY / zoom,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const coords = getEventCoords(e);

    if (isResizing || isMovingObject) {
      return;
    }

    if (activeTool === 'draw') {
      setIsDrawing(true);
      setDrawPoints([coords]);
    } else if (
      activeTool === 'highlight' ||
      activeTool === 'underline' ||
      activeTool === 'strikethrough' ||
      activeTool === 'shape-rect' ||
      activeTool === 'shape-circle' ||
      activeTool === 'shape-line' ||
      activeTool === 'redact' ||
      activeTool === 'measure' ||
      activeTool === 'hyperlink'
    ) {
      setDragStart(coords);
      setCurrentDragBox({ x: coords.x, y: coords.y, w: 0, h: 0 });
    } else if (activeTool === 'select') {
      // Click on background unselects
      if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'CANVAS') {
        setSelectedObject(null);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const coords = getEventCoords(e);

    // Resizing selected object
    if (isResizing && resizeStartCoords && objectOriginalPos && selectedObjectId) {
      const dx = coords.x - resizeStartCoords.x;
      const dy = coords.y - resizeStartCoords.y;

      let newW = objectOriginalPos.w;
      let newH = objectOriginalPos.h;
      let newX = objectOriginalPos.x;
      let newY = objectOriginalPos.y;

      if (isResizing === 'se') {
        newW = Math.max(30, objectOriginalPos.w + dx);
        newH = Math.max(20, objectOriginalPos.h + dy);
      } else if (isResizing === 'sw') {
        newW = Math.max(30, objectOriginalPos.w - dx);
        newH = Math.max(20, objectOriginalPos.h + dy);
        newX = objectOriginalPos.x + dx;
      } else if (isResizing === 'ne') {
        newW = Math.max(30, objectOriginalPos.w + dx);
        newH = Math.max(20, objectOriginalPos.h - dy);
        newY = objectOriginalPos.y + dy;
      } else if (isResizing === 'nw') {
        newW = Math.max(30, objectOriginalPos.w - dx);
        newH = Math.max(20, objectOriginalPos.h - dy);
        newX = objectOriginalPos.x + dx;
        newY = objectOriginalPos.y + dy;
      }

      if (selectedObjectType === 'text') {
        updateTextAnnotation(selectedObjectId, { width: newW, height: newH, x: newX, y: newY });
      } else if (selectedObjectType === 'image') {
        updateImageAnnotation(selectedObjectId, { width: newW, height: newH, x: newX, y: newY });
      }
      return;
    }

    // Moving selected object
    if (isMovingObject && moveStartCoords && objectOriginalPos && selectedObjectId) {
      const dx = coords.x - moveStartCoords.x;
      const dy = coords.y - moveStartCoords.y;
      const newX = objectOriginalPos.x + dx;
      const newY = objectOriginalPos.y + dy;

      if (selectedObjectType === 'text') {
        updateTextAnnotation(selectedObjectId, { x: newX, y: newY });
      } else if (selectedObjectType === 'image') {
        updateImageAnnotation(selectedObjectId, { x: newX, y: newY });
      }
      return;
    }

    if (isDrawing && activeTool === 'draw') {
      setDrawPoints((prev) => [...prev, coords]);
    } else if (dragStart && currentDragBox) {
      const x = Math.min(dragStart.x, coords.x);
      const y = Math.min(dragStart.y, coords.y);
      const w = Math.abs(coords.x - dragStart.x);
      const h = Math.abs(coords.y - dragStart.y);
      setCurrentDragBox({ x, y, w, h });
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    const coords = getEventCoords(e);

    if (isResizing) {
      setIsResizing(null);
      setResizeStartCoords(null);
      setObjectOriginalPos(null);
      return;
    }

    if (isMovingObject) {
      setIsMovingObject(false);
      setMoveStartCoords(null);
      setObjectOriginalPos(null);
      return;
    }

    if (isDrawing && activeTool === 'draw') {
      if (drawPoints.length > 1) {
        addDrawingAnnotation({
          page: pageNumber,
          points: drawPoints,
          strokeColor: toolSettings.drawColor,
          strokeWidth: toolSettings.drawStrokeWidth,
          opacity: 1,
        });
      }
      setIsDrawing(false);
      setDrawPoints([]);
    } else if (dragStart && currentDragBox) {
      const minDimension = 6;
      if (currentDragBox.w > minDimension || currentDragBox.h > minDimension) {
        if (activeTool === 'highlight' || activeTool === 'underline' || activeTool === 'strikethrough') {
          addHighlightAnnotation({
            page: pageNumber,
            x: currentDragBox.x,
            y: currentDragBox.y,
            width: currentDragBox.w,
            height: currentDragBox.h,
            color: activeTool === 'highlight' ? toolSettings.highlightColor : activeTool === 'underline' ? '#1e88e5' : '#e53935',
            opacity: activeTool === 'highlight' ? 0.35 : 0.85,
            type: activeTool === 'highlight' ? 'highlight' : activeTool === 'underline' ? 'underline' : 'strikethrough',
          });
        } else if (activeTool === 'shape-rect') {
          addShapeAnnotation({
            page: pageNumber,
            type: 'rectangle',
            x: currentDragBox.x,
            y: currentDragBox.y,
            width: currentDragBox.w,
            height: currentDragBox.h,
            strokeColor: toolSettings.drawColor,
            strokeWidth: toolSettings.drawStrokeWidth,
          });
        } else if (activeTool === 'shape-circle') {
          addShapeAnnotation({
            page: pageNumber,
            type: 'circle',
            x: currentDragBox.x,
            y: currentDragBox.y,
            width: currentDragBox.w,
            height: currentDragBox.h,
            strokeColor: toolSettings.drawColor,
            strokeWidth: toolSettings.drawStrokeWidth,
          });
        } else if (activeTool === 'shape-line') {
          addShapeAnnotation({
            page: pageNumber,
            type: 'line',
            x: currentDragBox.x,
            y: currentDragBox.y,
            width: currentDragBox.w,
            height: currentDragBox.h,
            strokeColor: toolSettings.drawColor,
            strokeWidth: toolSettings.drawStrokeWidth,
          });
        } else if (activeTool === 'redact') {
          addRedactionBox({
            page: pageNumber,
            x: currentDragBox.x,
            y: currentDragBox.y,
            width: currentDragBox.w,
            height: currentDragBox.h,
            status: 'marked',
            overlayText: toolSettings.redactionOverlayText,
          });
        } else if (activeTool === 'measure') {
          const dx = coords.x - dragStart.x;
          const dy = coords.y - dragStart.y;
          const distPoints = Math.hypot(dx, dy);
          const distInches = distPoints / 72;
          const distMm = distInches * 25.4;
          addMeasurement({
            page: pageNumber,
            startX: dragStart.x,
            startY: dragStart.y,
            endX: coords.x,
            endY: coords.y,
            distanceInches: Number(distInches.toFixed(2)),
            distanceMm: Number(distMm.toFixed(1)),
            distancePoints: Number(distPoints.toFixed(1)),
          });
        } else if (activeTool === 'hyperlink') {
          setPendingHyperlinkBox({
            x: currentDragBox.x,
            y: currentDragBox.y,
            w: currentDragBox.w,
            h: currentDragBox.h,
          });
        }
      }
      setDragStart(null);
      setCurrentDragBox(null);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const coords = getEventCoords(e);

    if (activeTool === 'text') {
      setActiveTextInput({ x: coords.x, y: coords.y, text: '' });
    } else if (activeTool === 'sticky') {
      addStickyNote({
        page: pageNumber,
        x: coords.x,
        y: coords.y,
        author: 'Reviewer',
        text: 'New feedback note...',
        color: '#fef08a',
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } else if (activeTool === 'stamp') {
      addStamp({
        page: pageNumber,
        x: Math.max(20, coords.x - 75),
        y: Math.max(20, coords.y - 30),
        width: 150,
        height: 60,
        stampType: toolSettings.stampType,
        customText: toolSettings.customStampText,
        dateStr: new Date().toLocaleDateString(),
        user: 'Official',
        color: toolSettings.stampColor,
      });
    } else if (activeTool === 'form-text') {
      addFormField({
        page: pageNumber,
        type: 'text',
        name: `field_${Date.now()}`,
        x: coords.x,
        y: coords.y,
        width: 160,
        height: 28,
        value: '',
      });
    } else if (activeTool === 'form-check') {
      addFormField({
        page: pageNumber,
        type: 'checkbox',
        name: `check_${Date.now()}`,
        x: coords.x,
        y: coords.y,
        width: 20,
        height: 20,
        value: false,
      });
    } else if (activeTool === 'signature') {
      setIsSignatureModalOpen(true);
    }
  };

  const handleFinishText = () => {
    if (activeTextInput && activeTextInput.text.trim()) {
      addTextAnnotation({
        page: pageNumber,
        x: activeTextInput.x,
        y: activeTextInput.y,
        width: 200,
        height: 30,
        text: activeTextInput.text,
        fontSize: toolSettings.textSize,
        fontFamily: toolSettings.textFont,
        color: toolSettings.textColor,
        isBold: toolSettings.isBold,
        isItalic: toolSettings.isItalic,
        align: toolSettings.textAlign,
      });
    }
    setActiveTextInput(null);
  };

  const handleSaveHyperlink = () => {
    if (pendingHyperlinkBox && hyperlinkUrl.trim()) {
      addHyperlink({
        page: pageNumber,
        x: pendingHyperlinkBox.x,
        y: pendingHyperlinkBox.y,
        width: pendingHyperlinkBox.w,
        height: pendingHyperlinkBox.h,
        url: hyperlinkUrl,
      });
    }
    setPendingHyperlinkBox(null);
  };

  const startObjectMove = (e: React.MouseEvent, obj: { x: number; y: number; width?: number; height?: number }) => {
    e.stopPropagation();
    const coords = getEventCoords(e);
    setIsMovingObject(true);
    setMoveStartCoords(coords);
    setObjectOriginalPos({
      x: obj.x,
      y: obj.y,
      w: obj.width || 100,
      h: obj.height || 40,
    });
  };

  const startResizeHandle = (e: React.MouseEvent, handle: string, obj: { x: number; y: number; width: number; height: number }) => {
    e.stopPropagation();
    const coords = getEventCoords(e);
    setIsResizing(handle);
    setResizeStartCoords(coords);
    setObjectOriginalPos({ x: obj.x, y: obj.y, w: obj.width, h: obj.height });
  };

  if (!activeDoc) return null;

  const pageTexts = activeDoc.textAnnotations.filter((a) => a.page === pageNumber);
  const pageImages = (activeDoc.imageAnnotations || []).filter((a) => a.page === pageNumber);
  const pageHyperlinks = (activeDoc.hyperlinks || []).filter((a) => a.page === pageNumber);
  const pageHighlights = activeDoc.highlightAnnotations.filter((a) => a.page === pageNumber);
  const pageDrawings = activeDoc.drawingAnnotations.filter((a) => a.page === pageNumber);
  const pageShapes = activeDoc.shapeAnnotations.filter((a) => a.page === pageNumber);
  const pageSignatures = activeDoc.signatures.filter((a) => a.page === pageNumber);
  const pageStamps = activeDoc.stamps.filter((a) => a.page === pageNumber);
  const pageRedactions = activeDoc.redactions.filter((a) => a.page === pageNumber);
  const pageNotes = activeDoc.stickyNotes.filter((a) => a.page === pageNumber);
  const pageFields = activeDoc.formFields.filter((a) => a.page === pageNumber);
  const pageMeasurements = activeDoc.measurements.filter((a) => a.page === pageNumber);

  const selectedTextObj = pageTexts.find((t) => t.id === selectedObjectId);
  const selectedImageObj = pageImages.find((img) => img.id === selectedObjectId);

  return (
    <div className="relative mb-8 shadow-2xl transition-all duration-150 rounded-xs bg-white">
      {/* Container matching canvas size */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        className={`relative overflow-hidden ${
          activeTool === 'text'
            ? 'cursor-text'
            : activeTool === 'hand'
            ? 'cursor-grab'
            : activeTool === 'select'
            ? 'cursor-default'
            : 'cursor-crosshair'
        }`}
      >
        {/* Real PDF Canvas Render */}
        <canvas ref={canvasRef} className="block select-none" />

        {/* Scanned / Image-Based Page Detection Banner */}
        {isScannedPage && (
          <div className="absolute top-2 left-2 right-2 z-30 bg-amber-600/90 text-white px-3 py-1.5 rounded-lg shadow-lg flex items-center justify-between text-xs backdrop-blur-xs">
            <div className="flex items-center space-x-1.5 font-medium">
              <AlertCircle className="w-4 h-4 text-white shrink-0" />
              <span>Scanned / Image-Based Page (No selectable vector text)</span>
            </div>
            <button
              onClick={handleRecognizePageOcr}
              disabled={isOcrLoading}
              className="px-2.5 py-1 bg-white text-amber-900 font-bold rounded hover:bg-amber-100 transition shadow-xs text-xs flex items-center space-x-1"
            >
              <ScanText className="w-3.5 h-3.5" />
              <span>{isOcrLoading ? 'Running OCR...' : 'Recognize Text with OCR'}</span>
            </button>
          </div>
        )}

        {/* INTERACTIVE OVERLAY LAYER (Scales with zoom) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            width: `${pageWidth / zoom}px`,
            height: `${pageHeight / zoom}px`,
          }}
        >
          {/* Interactive Selectable Paragraph Blocks Layer */}
          {(activeTool === 'select' || activeTool === 'text' || activeTool === 'edit-text') &&
            paragraphBlocks.map((block) => {
              const isHovered = hoveredParagraphId === block.id;
              const isSelected = selectedParagraph?.id === block.id;
              return (
                <div
                  key={block.id}
                  onMouseEnter={() => setHoveredParagraphId(block.id)}
                  onMouseLeave={() => setHoveredParagraphId((curr) => (curr === block.id ? null : curr))}
                  onClick={(e) => {
                    fontRegistry.registerDetectedFont(block.fontFamily || 'Helvetica');
                    setAvailableFonts(fontRegistry.getAvailableFonts());
                    setSelectedParagraph(block);
                    setInlineEditText(block.str);
                    setInlineFontFamily(block.fontFamily || 'Helvetica');
                    setInlineFontSize(block.fontSize || 12);
                    setInlineIsBold(Boolean(block.isBold));
                    setInlineIsItalic(Boolean(block.isItalic));
                    setInlineColor(block.color || '#000000');
                    setInlineAlign(block.align || 'left');

                    const isSys = fontRegistry.isSystemFont(block.fontFamily || 'Helvetica');
                    const isStd = ['Helvetica', 'Times New Roman', 'Courier New', 'Times-Roman', 'Courier'].includes(block.fontFamily || '');
                    const source: 'embedded' | 'system' | 'standard' | 'fallback' = block.isEmbedded
                      ? 'embedded'
                      : isSys
                      ? 'system'
                      : isStd
                      ? 'standard'
                      : 'fallback';
                    let warningMessage: string | undefined = undefined;
                    if (block.isSubset) {
                      warningMessage = 'This font is embedded as a subset in the PDF. Newly added characters outside the subset may use a fallback font.';
                    } else if (source === 'fallback') {
                      warningMessage = `Font "${block.fontName || block.fontFamily}" is not locally installed on this system. A visual match is being used.`;
                    }

                    setActiveEditingFont({
                      fontFamily: block.fontFamily || 'Helvetica',
                      fontName: block.fontName || block.fontFamily || 'Helvetica',
                      fontSize: block.fontSize || 12,
                      isBold: Boolean(block.isBold),
                      isItalic: Boolean(block.isItalic),
                      color: block.color || '#000000',
                      isOriginalDetected: true,
                      isEmbedded: Boolean(block.isEmbedded),
                      isSubset: Boolean(block.isSubset),
                      source,
                      warningMessage,
                      fontBytes: block.fontBytes,
                    });
                  }}
                  className={`absolute pointer-events-auto cursor-pointer transition-all duration-75 rounded-xs ${
                    isSelected
                      ? 'ring-2 ring-emerald-600 bg-emerald-500/25 z-30'
                      : isHovered
                      ? 'ring-1 ring-blue-500 bg-blue-500/15 z-20'
                      : 'hover:ring-1 hover:ring-blue-400/50'
                  }`}
                  style={{
                    left: `${block.x}px`,
                    top: `${block.y}px`,
                    width: `${block.width}px`,
                    height: `${block.height}px`,
                  }}
                  title={`Click to edit complete paragraph (${block.lines.length} lines): "${block.str.substring(0, 40)}..."`}
                />
              );
            })}

          {/* Direct In-Place Inline Textarea Overlay on PDF Page */}
          {selectedParagraph && (
            <textarea
              autoFocus
              value={inlineEditText}
              onChange={(e) => setInlineEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSelectedParagraph(null);
                  setActiveEditingFont(null);
                } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  handleApplyInlineParagraphReplacement();
                }
              }}
              onBlur={handleApplyInlineParagraphReplacement}
              className="absolute z-40 bg-white/95 backdrop-blur-xs ring-2 ring-emerald-600 rounded-xs p-1 shadow-xl resize-y outline-none font-medium leading-tight text-slate-900"
              style={{
                left: `${selectedParagraph.x}px`,
                top: `${selectedParagraph.y}px`,
                width: `${Math.max(selectedParagraph.width, 120)}px`,
                minHeight: `${Math.max(selectedParagraph.height, selectedParagraph.fontSize * 1.5)}px`,
                fontSize: `${inlineFontSize}pt`,
                fontFamily: inlineFontFamily || 'sans-serif',
                fontWeight: inlineIsBold ? 700 : 400,
                fontStyle: inlineIsItalic ? 'italic' : 'normal',
                color: inlineColor || '#000000',
                textAlign: inlineAlign || 'left',
              }}
            />
          )}

          {/* Watermark Live Overlay Preview */}
          {activeDoc.watermark && activeDoc.watermark.text && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
              style={{
                opacity: activeDoc.watermark.opacity || 0.25,
                transform: `rotate(${activeDoc.watermark.rotation || 45}deg)`,
              }}
            >
              <span
                style={{
                  fontSize: `${activeDoc.watermark.fontSize || 48}px`,
                  color: activeDoc.watermark.color || '#94a3b8',
                  fontFamily: 'Helvetica, sans-serif',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                {activeDoc.watermark.text}
              </span>
            </div>
          )}

          {/* Highlights */}
          {pageHighlights.map((hl) => (
            <div
              key={hl.id}
              className="absolute pointer-events-auto"
              style={{
                left: `${hl.x}px`,
                top: `${hl.y}px`,
                width: `${hl.width}px`,
                height: `${hl.height}px`,
                backgroundColor: hl.type === 'highlight' || !hl.type ? hl.color : 'transparent',
                borderBottom: hl.type === 'underline' ? `2px solid ${hl.color}` : 'none',
                opacity: hl.opacity,
              }}
            >
              {hl.type === 'strikethrough' && (
                <div className="w-full h-0.5 bg-rose-600 absolute top-1/2 -translate-y-1/2" />
              )}
            </div>
          ))}

          {/* Freehand Drawings */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {pageDrawings.map((draw) => {
              if (draw.points.length < 2) return null;
              const pathData = draw.points
                .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`)
                .join(' ');
              return (
                <path
                  key={draw.id}
                  d={pathData}
                  fill="none"
                  stroke={draw.strokeColor}
                  strokeWidth={draw.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={draw.opacity}
                />
              );
            })}

            {isDrawing && drawPoints.length > 1 && (
              <path
                d={drawPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ')}
                fill="none"
                stroke={toolSettings.drawColor}
                strokeWidth={toolSettings.drawStrokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>

          {/* Shapes */}
          {pageShapes.map((shape) => {
            const isSelected = selectedObjectId === shape.id;
            return (
              <div
                key={shape.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedObject(shape.id, 'shape');
                }}
                className={`absolute pointer-events-auto cursor-pointer ${
                  shape.type === 'circle' ? 'rounded-full' : ''
                } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                style={{
                  left: `${shape.x}px`,
                  top: `${shape.y}px`,
                  width: `${shape.width}px`,
                  height: `${shape.height}px`,
                  border: `${shape.strokeWidth}px solid ${shape.strokeColor}`,
                  backgroundColor: shape.fillColor || 'transparent',
                }}
              />
            );
          })}

          {/* In-progress Drag Box */}
          {currentDragBox && (
            <div
              className={`absolute pointer-events-none border-2 ${
                activeTool === 'redact'
                  ? 'border-red-600 bg-red-500/20'
                  : activeTool === 'highlight'
                  ? 'border-amber-400 bg-amber-300/30'
                  : activeTool === 'hyperlink'
                  ? 'border-blue-600 bg-blue-100/40'
                  : 'border-blue-500 bg-blue-500/15'
              }`}
              style={{
                left: `${currentDragBox.x}px`,
                top: `${currentDragBox.y}px`,
                width: `${currentDragBox.w}px`,
                height: `${currentDragBox.h}px`,
              }}
            />
          )}

          {/* Hyperlinks */}
          {pageHyperlinks.map((link) => {
            const isSelected = selectedObjectId === link.id;
            return (
              <div
                key={link.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedObject(link.id, 'hyperlink');
                }}
                className={`absolute pointer-events-auto border border-blue-400/80 bg-blue-500/15 rounded flex items-center justify-between px-1.5 cursor-pointer group hover:bg-blue-500/30 transition ${
                  isSelected ? 'ring-2 ring-blue-600' : ''
                }`}
                style={{
                  left: `${link.x}px`,
                  top: `${link.y}px`,
                  width: `${link.width}px`,
                  height: `${link.height}px`,
                }}
                title={`Hyperlink: ${link.url}`}
              >
                <span className="text-[9px] text-blue-900 font-medium truncate">{link.url}</span>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white rounded text-blue-700"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            );
          })}

          {/* Inserted Image Annotations */}
          {pageImages.map((img) => {
            const isSelected = selectedObjectId === img.id;
            return (
              <div
                key={img.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedObject(img.id, 'image');
                }}
                onMouseDown={(e) => startObjectMove(e, img)}
                className={`absolute pointer-events-auto group cursor-move select-none ${
                  isSelected ? 'ring-2 ring-blue-600' : 'hover:ring-1 hover:ring-blue-400'
                }`}
                style={{
                  left: `${img.x}px`,
                  top: `${img.y}px`,
                  width: `${img.width}px`,
                  height: `${img.height}px`,
                  transform: img.rotation ? `rotate(${img.rotation}deg)` : undefined,
                  opacity: img.opacity ?? 1,
                }}
              >
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  className="w-full h-full object-contain pointer-events-none"
                />

                {/* Resizing handles for selected image */}
                {isSelected && (
                  <>
                    <div
                      onMouseDown={(e) => startResizeHandle(e, 'se', img)}
                      className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-blue-600 border border-white rounded-xs cursor-se-resize z-20"
                    />
                    <div
                      onMouseDown={(e) => startResizeHandle(e, 'sw', img)}
                      className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-blue-600 border border-white rounded-xs cursor-sw-resize z-20"
                    />
                    <div
                      onMouseDown={(e) => startResizeHandle(e, 'ne', img)}
                      className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-blue-600 border border-white rounded-xs cursor-ne-resize z-20"
                    />
                    <div
                      onMouseDown={(e) => startResizeHandle(e, 'nw', img)}
                      className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-blue-600 border border-white rounded-xs cursor-nw-resize z-20"
                    />
                  </>
                )}
              </div>
            );
          })}

          {/* Text Annotations */}
          {pageTexts.map((txt) => {
            const isSelected = selectedObjectId === txt.id;
            return (
              <div
                key={txt.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedObject(txt.id, 'text');
                }}
                onMouseDown={(e) => startObjectMove(e, txt)}
                className={`absolute pointer-events-auto group px-1 py-0.5 rounded cursor-move select-none ${
                  isSelected
                    ? 'ring-2 ring-blue-600 bg-blue-50/20 shadow-xs'
                    : 'hover:ring-1 hover:ring-blue-400'
                }`}
                style={{
                  left: `${txt.x}px`,
                  top: `${txt.y}px`,
                  width: txt.width ? `${txt.width}px` : undefined,
                  fontSize: `${txt.fontSize}px`,
                  color: txt.color,
                  fontWeight: txt.isBold ? 700 : 400,
                  fontStyle: txt.isItalic ? 'italic' : 'normal',
                  textAlign: txt.align || 'left',
                  fontFamily: txt.fontFamily || 'Helvetica, sans-serif',
                }}
              >
                <span>{txt.text}</span>

                {/* Resize handles when text is selected */}
                {isSelected && (
                  <>
                    <div
                      onMouseDown={(e) =>
                        startResizeHandle(e, 'se', {
                          x: txt.x,
                          y: txt.y,
                          width: txt.width || 120,
                          height: txt.height || 30,
                        })
                      }
                      className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-blue-600 border border-white rounded-xs cursor-se-resize"
                    />
                  </>
                )}
              </div>
            );
          })}

          {/* Floating Formatting Toolbar for Selected Text */}
          {selectedTextObj && (
            <div
              className="absolute z-30 pointer-events-auto bg-slate-900/95 text-white p-1 rounded-lg shadow-xl flex items-center space-x-1 border border-slate-700 backdrop-blur-sm -translate-y-full mb-2"
              style={{
                left: `${selectedTextObj.x}px`,
                top: `${selectedTextObj.y - 8}px`,
              }}
            >
              <select
                value={selectedTextObj.fontSize}
                onChange={(e) =>
                  updateSelectedTextProps({ fontSize: Number(e.target.value) })
                }
                className="bg-slate-800 text-white text-[11px] rounded px-1.5 py-0.5 border border-slate-700"
              >
                <option value={10}>10 pt</option>
                <option value={12}>12 pt</option>
                <option value={14}>14 pt</option>
                <option value={16}>16 pt</option>
                <option value={18}>18 pt</option>
                <option value={24}>24 pt</option>
                <option value={32}>32 pt</option>
              </select>

              <button
                onClick={() =>
                  updateSelectedTextProps({ isBold: !selectedTextObj.isBold })
                }
                className={`p-1 rounded text-xs ${
                  selectedTextObj.isBold ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'
                }`}
                title="Bold"
              >
                <Bold className="w-3 h-3" />
              </button>

              <button
                onClick={() =>
                  updateSelectedTextProps({ isItalic: !selectedTextObj.isItalic })
                }
                className={`p-1 rounded text-xs ${
                  selectedTextObj.isItalic ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'
                }`}
                title="Italic"
              >
                <Italic className="w-3 h-3" />
              </button>

              <input
                type="color"
                value={selectedTextObj.color || '#000000'}
                onChange={(e) =>
                  updateSelectedTextProps({ color: e.target.value })
                }
                className="w-5 h-5 p-0 border-none bg-transparent cursor-pointer rounded"
                title="Color"
              />

              <div className="h-3 w-px bg-slate-700" />

              <button
                onClick={() => updateSelectedTextProps({ align: 'left' })}
                className={`p-1 rounded ${
                  selectedTextObj.align === 'left' || !selectedTextObj.align
                    ? 'bg-blue-600'
                    : 'hover:bg-slate-800'
                }`}
                title="Align Left"
              >
                <AlignLeft className="w-3 h-3" />
              </button>
              <button
                onClick={() => updateSelectedTextProps({ align: 'center' })}
                className={`p-1 rounded ${
                  selectedTextObj.align === 'center' ? 'bg-blue-600' : 'hover:bg-slate-800'
                }`}
                title="Align Center"
              >
                <AlignCenter className="w-3 h-3" />
              </button>
              <button
                onClick={() => updateSelectedTextProps({ align: 'right' })}
                className={`p-1 rounded ${
                  selectedTextObj.align === 'right' ? 'bg-blue-600' : 'hover:bg-slate-800'
                }`}
                title="Align Right"
              >
                <AlignRight className="w-3 h-3" />
              </button>

              <div className="h-3 w-px bg-slate-700" />

              <button
                onClick={duplicateSelectedObject}
                className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                title="Duplicate"
              >
                <Copy className="w-3 h-3" />
              </button>

              <button
                onClick={deleteSelectedObject}
                className="p-1 hover:bg-red-600 rounded text-red-400 hover:text-white"
                title="Delete Object"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Floating Formatting Toolbar for Selected Image */}
          {selectedImageObj && (
            <div
              className="absolute z-30 pointer-events-auto bg-slate-900/95 text-white p-1 rounded-lg shadow-xl flex items-center space-x-1.5 border border-slate-700 backdrop-blur-sm -translate-y-full mb-2"
              style={{
                left: `${selectedImageObj.x}px`,
                top: `${selectedImageObj.y - 8}px`,
              }}
            >
              <button
                onClick={() =>
                  updateSelectedImageProps({
                    rotation: ((selectedImageObj.rotation || 0) + 90) % 360,
                  })
                }
                className="p-1 hover:bg-slate-800 rounded text-xs flex items-center space-x-1"
                title="Rotate 90°"
              >
                <RotateCw className="w-3 h-3" />
                <span className="text-[10px]">Rotate</span>
              </button>

              <div className="h-3 w-px bg-slate-700" />

              <button
                onClick={duplicateSelectedObject}
                className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                title="Duplicate"
              >
                <Copy className="w-3 h-3" />
              </button>

              <button
                onClick={deleteSelectedObject}
                className="p-1 hover:bg-red-600 rounded text-red-400 hover:text-white"
                title="Delete Image"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Active Inline Text Input */}
          {activeTextInput && (
            <div
              className="absolute z-20 pointer-events-auto bg-white border border-blue-500 rounded p-1 shadow-lg"
              style={{ left: `${activeTextInput.x}px`, top: `${activeTextInput.y}px` }}
            >
              <input
                type="text"
                autoFocus
                placeholder="Type text here..."
                value={activeTextInput.text}
                onChange={(e) =>
                  setActiveTextInput((prev) => (prev ? { ...prev, text: e.target.value } : null))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFinishText();
                  if (e.key === 'Escape') setActiveTextInput(null);
                }}
                onBlur={handleFinishText}
                className="border-none outline-none text-xs bg-transparent text-slate-900 min-w-[120px]"
                style={{
                  fontSize: `${toolSettings.textSize}px`,
                  color: toolSettings.textColor,
                  fontWeight: toolSettings.isBold ? 700 : 400,
                  fontStyle: toolSettings.isItalic ? 'italic' : 'normal',
                }}
              />
            </div>
          )}

          {/* Pending Hyperlink URL Dialog */}
          {pendingHyperlinkBox && (
            <div
              className="absolute z-30 pointer-events-auto bg-white p-2.5 rounded-lg border border-blue-400 shadow-xl flex items-center space-x-2 text-xs"
              style={{
                left: `${pendingHyperlinkBox.x}px`,
                top: `${pendingHyperlinkBox.y + pendingHyperlinkBox.h + 6}px`,
              }}
            >
              <LinkIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <input
                type="url"
                value={hyperlinkUrl}
                onChange={(e) => setHyperlinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="border border-slate-300 rounded px-2 py-1 text-xs w-48 outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSaveHyperlink}
                className="px-2 py-1 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => setPendingHyperlinkBox(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Signatures */}
          {pageSignatures.map((sig) => (
            <div
              key={sig.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedObject(sig.id, 'text');
              }}
              className="absolute pointer-events-auto group border border-dashed border-blue-300 hover:border-blue-600 bg-white/40 p-1 rounded cursor-move"
              style={{
                left: `${sig.x}px`,
                top: `${sig.y}px`,
                width: `${sig.width}px`,
                height: `${sig.height}px`,
              }}
            >
              <img
                src={sig.dataUrl}
                alt="Signature"
                className="w-full h-full object-contain pointer-events-none"
              />
              {sig.isDigitalCert && (
                <div className="absolute -bottom-4 left-0 flex items-center space-x-1 text-[8px] font-mono text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                  <FileCheck className="w-2.5 h-2.5 text-blue-600" />
                  <span>Certified: {sig.signerName}</span>
                </div>
              )}
            </div>
          ))}

          {/* Official Stamps */}
          {pageStamps.map((stamp) => (
            <div
              key={stamp.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedObject(stamp.id, 'stamp');
              }}
              className="absolute pointer-events-auto p-2 rounded border-2 shadow-xs bg-white/90 cursor-move"
              style={{
                left: `${stamp.x}px`,
                top: `${stamp.y}px`,
                width: `${stamp.width}px`,
                height: `${stamp.height}px`,
                borderColor: stamp.color,
                color: stamp.color,
              }}
            >
              <div className="border border-current p-1 h-full flex flex-col justify-between items-center text-center">
                <span className="font-extrabold tracking-wider text-xs">
                  {stamp.stampType === 'CUSTOM' ? stamp.customText : stamp.stampType}
                </span>
                <span className="text-[8px] font-semibold opacity-90">
                  {stamp.user} • {stamp.dateStr}
                </span>
              </div>
            </div>
          ))}

          {/* Redactions (Visual overlay preview) */}
          {pageRedactions.map((redact) => (
            <div
              key={redact.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedObject(redact.id, 'redact');
              }}
              className="absolute pointer-events-auto bg-black text-white flex items-center justify-center text-[9px] font-bold font-mono tracking-widest border border-red-500 shadow-md group cursor-pointer"
              style={{
                left: `${redact.x}px`,
                top: `${redact.y}px`,
                width: `${redact.width}px`,
                height: `${redact.height}px`,
              }}
              title="Marked for Permanent Redaction"
            >
              <span className="opacity-80 truncate px-1">
                {redact.overlayText || 'REDACTED'}
              </span>
            </div>
          ))}

          {/* Sticky Notes */}
          {pageNotes.map((note) => (
            <div
              key={note.id}
              onClick={(e) => {
                e.stopPropagation();
                setActiveStickyPopup(activeStickyPopup === note.id ? null : note.id);
              }}
              className="absolute pointer-events-auto cursor-pointer"
              style={{ left: `${note.x}px`, top: `${note.y}px` }}
            >
              <div className="w-6 h-6 rounded bg-amber-400 text-amber-900 shadow-md flex items-center justify-center hover:scale-110 transition">
                <MessageSquare className="w-3.5 h-3.5" />
              </div>

              {activeStickyPopup === note.id && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-8 -top-2 w-48 bg-amber-50 border border-amber-300 rounded shadow-lg p-2 text-xs z-30"
                >
                  <div className="flex items-center justify-between font-semibold text-amber-900 text-[10px] pb-1 border-b border-amber-200">
                    <span>{note.author}</span>
                    <span>{note.createdAt}</span>
                  </div>
                  <p className="mt-1 text-slate-800 text-xs">{note.text}</p>
                </div>
              )}
            </div>
          ))}

          {/* Form Fields */}
          {pageFields.map((field) => (
            <div
              key={field.id}
              className="absolute pointer-events-auto bg-blue-50/70 border border-blue-400 rounded p-0.5"
              style={{
                left: `${field.x}px`,
                top: `${field.y}px`,
                width: `${field.width}px`,
                height: `${field.height}px`,
              }}
            >
              {field.type === 'text' && (
                <input
                  type="text"
                  value={String(field.value || '')}
                  onChange={(e) => updateFormFieldValue(field.id, e.target.value)}
                  placeholder="Click to fill form..."
                  className="w-full h-full bg-white px-1 text-xs text-slate-800 outline-none border border-slate-200"
                />
              )}
              {field.type === 'checkbox' && (
                <input
                  type="checkbox"
                  checked={Boolean(field.value)}
                  onChange={(e) => updateFormFieldValue(field.id, e.target.checked)}
                  className="w-full h-full accent-blue-600 cursor-pointer"
                />
              )}
            </div>
          ))}

          {/* Measurements */}
          {pageMeasurements.map((m) => (
            <div key={m.id} className="absolute inset-0 pointer-events-none">
              <svg className="w-full h-full">
                <line
                  x1={m.startX}
                  y1={m.startY}
                  x2={m.endX}
                  y2={m.endY}
                  stroke="#d97706"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                />
                <circle cx={m.startX} cy={m.startY} r={3} fill="#d97706" />
                <circle cx={m.endX} cy={m.endY} r={3} fill="#d97706" />
                <rect
                  x={(m.startX + m.endX) / 2 - 35}
                  y={(m.startY + m.endY) / 2 - 10}
                  width={70}
                  height={20}
                  fill="#ffffff"
                  stroke="#d97706"
                  strokeWidth={1}
                  rx={3}
                />
                <text
                  x={(m.startX + m.endX) / 2}
                  y={(m.startY + m.endY) / 2 + 4}
                  fill="#b45309"
                  fontSize="9"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {m.distanceInches} in ({m.distanceMm} mm)
                </text>
              </svg>
            </div>
          ))}
        </div>
      </div>

      {/* Page Number Label in Footer */}
      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 font-mono">
        Page {pageNumber} of {activeDoc.pageCount}
      </div>
    </div>
  );
};
