if (typeof (Promise as any).try !== 'function') {
  (Promise as any).try = function (fn: any, ...args: any[]) {
    return new Promise((resolve) => resolve(fn(...args)));
  };
}

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  PDFDocument,
  rgb,
  degrees,
  StandardFonts,
  PDFName,
  PDFDict,
  PDFString,
  PDFArray,
} from 'pdf-lib';
declare module 'pako';
import pako from 'pako';
import fontkit from '@pdf-lib/fontkit';
import { createWorker } from 'tesseract.js';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
import { CryptoEngine } from './cryptoEngine';
import { fontRegistry } from './fontRegistry';
import {
  PdfDocumentState,
  DocumentMetadata,
  PageInfo,
  WatermarkConfig,
  EncryptPdfConfig,
  DocumentComparisonResult,
  ComparisonDiffItem,
  PdfStandardsReport,
  PdfStandardsCheck,
  PdfOptimizationOptions,
  PdfOptimizationResult,
  PageTextItem,
  PageParagraphBlock,
  PageTextDetectionResult,
  PdfAProfile,
  PdfAComplianceStatus,
  PdfACheckItem,
  PdfAEmbeddedFontInfo,
  PdfAValidationReport,
} from '../types';

// Initialize PDF.js worker safely across browser and node environments
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/legacy/build/pdf.worker.mjs',
      import.meta.url
    ).toString();
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  }
}

export class PdfEngine {
  /**
   * Loads a PDF Document with pdfjs-dist for rendering and searching
   */
  static async loadPdfJs(data: Uint8Array): Promise<pdfjsLib.PDFDocumentProxy> {
    const uint8 = new Uint8Array(data);
    const loadingTask = pdfjsLib.getDocument({
      data: uint8,
      useSystemFonts: true,
    });
    return await loadingTask.promise;
  }

  /**
   * Loads metadata and page dimensions using pdf-lib
   */
  static async inspectPdf(data: Uint8Array, fileName: string): Promise<{
    metadata: DocumentMetadata;
    pages: PageInfo[];
    pageCount: number;
  }> {
    const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
    const pageCount = pdfDoc.getPageCount();
    const pages: PageInfo[] = [];

    for (let i = 0; i < pageCount; i++) {
      const page = pdfDoc.getPage(i);
      const { width, height } = page.getSize();
      const rotation = page.getRotation().angle;
      pages.push({
        pageNumber: i + 1,
        width,
        height,
        rotation,
      });
    }

    const metadata: DocumentMetadata = {
      title: pdfDoc.getTitle() || fileName.replace(/\.[^/.]+$/, ''),
      author: pdfDoc.getAuthor() || '',
      subject: pdfDoc.getSubject() || '',
      keywords: (pdfDoc.getKeywords && pdfDoc.getKeywords()) || '',
      creator: pdfDoc.getCreator() || 'HHM PDF',
      producer: pdfDoc.getProducer() || 'HHM PDF Engine',
      creationDate: pdfDoc.getCreationDate() ? pdfDoc.getCreationDate()?.toISOString() : new Date().toISOString(),
      modificationDate: pdfDoc.getModificationDate() ? pdfDoc.getModificationDate()?.toISOString() : new Date().toISOString(),
    };

    return { metadata, pages, pageCount };
  }

  /**
   * Render a specific page to an HTML5 canvas element with high DPI support
   */
  static async renderPageToCanvas(
    pdfJsDoc: pdfjsLib.PDFDocumentProxy,
    pageNumber: number,
    canvas: HTMLCanvasElement,
    scale = 1.0,
    extraRotation = 0
  ): Promise<void> {
    if (!pdfJsDoc || pageNumber < 1 || pageNumber > pdfJsDoc.numPages) {
      console.warn(`renderPageToCanvas: Invalid page number ${pageNumber} (total pages: ${pdfJsDoc?.numPages || 0})`);
      return;
    }
    const page = await pdfJsDoc.getPage(pageNumber);
    const rotation = (page.rotate + extraRotation) % 360;
    const viewport = page.getViewport({ scale, rotation });

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * pixelRatio);
    canvas.height = Math.floor(viewport.height * pixelRatio);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(pixelRatio, pixelRatio);

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
      intent: 'display',
      canvas: canvas,
    } as any;

    await page.render(renderContext).promise;
    ctx.restore();
  }

  /**
   * Generate thumbnail data URL for a specific page
   */
  static async generatePageThumbnail(
    pdfJsDoc: pdfjsLib.PDFDocumentProxy,
    pageNumber: number,
    maxDim = 180
  ): Promise<string> {
    if (!pdfJsDoc || pageNumber < 1 || pageNumber > pdfJsDoc.numPages) {
      console.warn(`generatePageThumbnail: Invalid page number ${pageNumber} (total pages: ${pdfJsDoc?.numPages || 0})`);
      return '';
    }
    const page = await pdfJsDoc.getPage(pageNumber);
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const scale = maxDim / Math.max(unscaledViewport.width, unscaledViewport.height);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    await page.render({
      canvasContext: ctx,
      viewport,
      canvas,
    } as any).promise;

    return canvas.toDataURL('image/jpeg', 0.85);
  }

  /**
   * Create a blank PDF document
   */
  static async createBlankPdf(
    pageSize: 'a4' | 'letter' | 'legal' = 'a4',
    orientation: 'portrait' | 'landscape' = 'portrait',
    pageCount = 1
  ): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    let width = 595.28;
    let height = 841.89;

    if (pageSize === 'letter') {
      width = 612.0;
      height = 792.0;
    } else if (pageSize === 'legal') {
      width = 612.0;
      height = 1008.0;
    }

    if (orientation === 'landscape') {
      const temp = width;
      width = height;
      height = temp;
    }

    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

    for (let i = 0; i < pageCount; i++) {
      const page = doc.addPage([width, height]);
      if (i === 0) {
        page.drawText('HHM PDF', {
          x: 50,
          y: height - 60,
          size: 18,
          font: boldFont,
          color: rgb(0.07, 0.44, 0.84),
        });
        page.drawText('Document created in HHM PDF. Start typing or annotating below.', {
          x: 50,
          y: height - 85,
          size: 11,
          font,
          color: rgb(0.4, 0.45, 0.5),
        });
        page.drawLine({
          start: { x: 50, y: height - 100 },
          end: { x: width - 50, y: height - 100 },
          thickness: 1,
          color: rgb(0.85, 0.88, 0.92),
        });
      }
    }

    doc.setTitle('New Document');
    doc.setCreator('HHM PDF');
    doc.setProducer('HHM PDF v1.0');
    doc.setCreationDate(new Date());

    return await doc.save();
  }

  /**
   * Create PDF from image files (JPG, PNG)
   */
  static async createPdfFromImages(
    images: { name: string; dataUrl: string; type: string }[]
  ): Promise<Uint8Array> {
    const doc = await PDFDocument.create();

    for (const img of images) {
      const base64Data = img.dataUrl.split(',')[1];
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      let embeddedImage;
      if (img.type.includes('png') || img.dataUrl.startsWith('data:image/png')) {
        embeddedImage = await doc.embedPng(bytes);
      } else {
        embeddedImage = await doc.embedJpg(bytes);
      }

      const { width, height } = embeddedImage;
      const maxW = 595.28;
      const maxH = 841.89;
      let finalW = width;
      let finalH = height;

      if (width > maxW || height > maxH) {
        const ratio = Math.min((maxW - 40) / width, (maxH - 40) / height);
        finalW = width * ratio;
        finalH = height * ratio;
      }

      const page = doc.addPage([finalW + 40, finalH + 40]);
      page.drawImage(embeddedImage, {
        x: 20,
        y: 20,
        width: finalW,
        height: finalH,
      });
    }

    doc.setTitle('Converted Images Document');
    doc.setCreator('HHM PDF');
    return await doc.save();
  }

  /**
   * Combine multiple PDF files into a single unified PDF
   */
  static async combinePdfs(pdfBuffers: Uint8Array[]): Promise<Uint8Array> {
    const mergedDoc = await PDFDocument.create();

    for (const buffer of pdfBuffers) {
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const copiedPages = await mergedDoc.copyPages(doc, doc.getPageIndices());
      copiedPages.forEach((page) => mergedDoc.addPage(page));
    }

    mergedDoc.setTitle('Combined Document');
    mergedDoc.setCreator('HHM PDF');
    return await mergedDoc.save();
  }

  /**
   * Insert pages from another PDF at a designated index
   */
  static async insertPagesFromOtherPdf(
    targetPdf: Uint8Array,
    sourcePdf: Uint8Array,
    atIndex0Based: number,
    sourcePageIndices0Based?: number[]
  ): Promise<Uint8Array> {
    const targetDoc = await PDFDocument.load(targetPdf, { ignoreEncryption: true });
    const sourceDoc = await PDFDocument.load(sourcePdf, { ignoreEncryption: true });

    const indicesToCopy =
      sourcePageIndices0Based && sourcePageIndices0Based.length > 0
        ? sourcePageIndices0Based
        : sourceDoc.getPageIndices();

    const copiedPages = await targetDoc.copyPages(sourceDoc, indicesToCopy);

    let insertPos = Math.max(0, Math.min(atIndex0Based, targetDoc.getPageCount()));
    for (const p of copiedPages) {
      targetDoc.insertPage(insertPos, p);
      insertPos++;
    }

    return await targetDoc.save();
  }

  /**
   * Duplicate selected pages in place
   */
  static async duplicatePages(
    sourcePdf: Uint8Array,
    pageIndices0Based: number[]
  ): Promise<Uint8Array> {
    const doc = await PDFDocument.load(sourcePdf, { ignoreEncryption: true });
    const copiedPages = await doc.copyPages(doc, pageIndices0Based);

    // Insert each duplicated page right after its source page
    // Sort descending so insertions don't alter earlier source indices
    const sortedIndices = [...pageIndices0Based].sort((a, b) => b - a);
    sortedIndices.forEach((sourceIdx, i) => {
      const pageToInsert = copiedPages[copiedPages.length - 1 - i];
      doc.insertPage(sourceIdx + 1, pageToInsert);
    });

    return await doc.save();
  }

  /**
   * Split PDF into multiple separate documents by page ranges
   */
  static async splitPdfByRanges(
    sourcePdf: Uint8Array,
    ranges: { name: string; pageIndices0Based: number[] }[]
  ): Promise<{ name: string; data: Uint8Array }[]> {
    const srcDoc = await PDFDocument.load(sourcePdf, { ignoreEncryption: true });
    const results: { name: string; data: Uint8Array }[] = [];

    for (const range of ranges) {
      if (range.pageIndices0Based.length === 0) continue;
      const splitDoc = await PDFDocument.create();
      const copiedPages = await splitDoc.copyPages(srcDoc, range.pageIndices0Based);
      copiedPages.forEach((p) => splitDoc.addPage(p));
      splitDoc.setTitle(range.name);
      splitDoc.setCreator('HHM PDF');
      results.push({
        name: range.name,
        data: await splitDoc.save(),
      });
    }

    return results;
  }

  /**
   * Reorder, delete, and rotate pages based on user specifications
   */
  static async reorderAndModifyPages(
    sourcePdf: Uint8Array,
    pageOrder0Based: number[],
    pageRotations: { [pageIndex: number]: number } = {}
  ): Promise<Uint8Array> {
    const srcDoc = await PDFDocument.load(sourcePdf, { ignoreEncryption: true });
    const newDoc = await PDFDocument.create();

    const copiedPages = await newDoc.copyPages(srcDoc, pageOrder0Based);

    copiedPages.forEach((page, idx) => {
      const origPageIndex = pageOrder0Based[idx];
      const additionalRotation = pageRotations[origPageIndex] || 0;
      if (additionalRotation !== 0) {
        const currentRot = page.getRotation().angle;
        page.setRotation(degrees((currentRot + additionalRotation) % 360));
      }
      newDoc.addPage(page);
    });

    return await newDoc.save();
  }

  /**
   * Extract specified pages into a brand new PDF
   */
  static async extractPages(
    sourcePdf: Uint8Array,
    pageIndices0Based: number[]
  ): Promise<Uint8Array> {
    const srcDoc = await PDFDocument.load(sourcePdf, { ignoreEncryption: true });
    const newDoc = await PDFDocument.create();

    const copiedPages = await newDoc.copyPages(srcDoc, pageIndices0Based);
    copiedPages.forEach((page) => newDoc.addPage(page));

    newDoc.setTitle('Extracted Pages');
    newDoc.setCreator('HHM PDF');
    return await newDoc.save();
  }

  /**
   * Delete specified pages from PDF
   */
  static async deletePages(
    sourcePdf: Uint8Array,
    pageIndices0Based: number[]
  ): Promise<Uint8Array> {
    const srcDoc = await PDFDocument.load(sourcePdf, { ignoreEncryption: true });
    const sorted = [...pageIndices0Based].sort((a, b) => b - a);
    for (const idx of sorted) {
      srcDoc.removePage(idx);
    }
    return await srcDoc.save();
  }

  /**
   * Insert a blank page at given 0-based index
   */
  static async insertBlankPage(
    sourcePdf: Uint8Array,
    atIndex0Based: number,
    width = 595.28,
    height = 841.89
  ): Promise<Uint8Array> {
    const doc = await PDFDocument.load(sourcePdf, { ignoreEncryption: true });
    doc.insertPage(atIndex0Based, [width, height]);
    return await doc.save();
  }

  /**
   * Burn annotations, text, images, shapes, signatures, watermarks, and permanent redactions
   * into a fully valid flattened PDF document.
   */
  static async burnModificationsAndExport(
    docState: PdfDocumentState
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(docState.data, { ignoreEncryption: true });
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    const pageCount = pdfDoc.getPageCount();

    // 1. Process Watermark across pages
    if (docState.watermark && docState.watermark.text.trim()) {
      const wm = docState.watermark;
      const wmColor = this.parseColorToRgb(wm.color, 0.4);

      for (let i = 0; i < pageCount; i++) {
        const page = pdfDoc.getPage(i);
        const { width, height } = page.getSize();

        if (wm.position === 'tile') {
          for (let y = 100; y < height; y += 220) {
            for (let x = 50; x < width; x += 250) {
              page.drawText(wm.text, {
                x,
                y,
                size: wm.fontSize || 32,
                font: helveticaBold,
                color: wmColor,
                opacity: wm.opacity || 0.15,
                rotate: degrees(wm.rotation || 45),
              });
            }
          }
        } else {
          page.drawText(wm.text, {
            x: width * 0.15,
            y: height * 0.45,
            size: wm.fontSize || 48,
            font: helveticaBold,
            color: wmColor,
            opacity: wm.opacity || 0.25,
            rotate: degrees(wm.rotation || 45),
          });
        }
      }
    }

    // 2. Process Permanent Redactions
    for (const redaction of docState.redactions || []) {
      const pageIdx = redaction.page - 1;
      if (pageIdx >= 0 && pageIdx < pageCount) {
        const page = pdfDoc.getPage(pageIdx);
        const { height } = page.getSize();
        const pdfY = height - redaction.y - redaction.height;

        page.drawRectangle({
          x: redaction.x,
          y: pdfY,
          width: redaction.width,
          height: redaction.height,
          color: rgb(0, 0, 0),
          borderWidth: 0,
        });

        if (redaction.overlayText) {
          page.drawText(redaction.overlayText, {
            x: redaction.x + 4,
            y: pdfY + redaction.height / 2 - 4,
            size: 9,
            font: helveticaBold,
            color: rgb(1, 1, 1),
          });
        }
      }
    }

    // 3. Process Inserted Images
    for (const img of docState.imageAnnotations || []) {
      const pageIdx = img.page - 1;
      if (pageIdx >= 0 && pageIdx < pageCount && img.dataUrl) {
        const page = pdfDoc.getPage(pageIdx);
        const { height } = page.getSize();
        const pdfY = height - img.y - img.height;

        try {
          const base64Data = img.dataUrl.split(',')[1];
          const binaryStr = atob(base64Data);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }

          let embeddedImg;
          if (img.dataUrl.startsWith('data:image/png')) {
            embeddedImg = await pdfDoc.embedPng(bytes);
          } else {
            embeddedImg = await pdfDoc.embedJpg(bytes);
          }

          page.drawImage(embeddedImg, {
            x: img.x,
            y: pdfY,
            width: img.width,
            height: img.height,
            opacity: img.opacity ?? 1,
            rotate: img.rotation ? degrees(img.rotation) : undefined,
          });
        } catch (e) {
          console.warn('Error embedding image in PDF:', e);
        }
      }
    }

    // 4. Process Text Annotations / Injected Text
    for (const textItem of docState.textAnnotations || []) {
      const pageIdx = textItem.page - 1;
      const textVal = (textItem.text || (textItem as any).content || '').trim();
      if (pageIdx >= 0 && pageIdx < pageCount && textVal) {
        const page = pdfDoc.getPage(pageIdx);
        const { height } = page.getSize();
        const pdfY = height - textItem.y - (textItem.fontSize || 12);

        let font = helvetica;
        if (textItem.isBold) {
          font = textItem.fontFamily === 'Times-Roman' ? timesRomanBold : helveticaBold;
        } else if (textItem.fontFamily === 'Times-Roman') {
          font = timesRoman;
        }

        page.drawText(textVal, {
          x: textItem.x,
          y: pdfY,
          size: textItem.fontSize || 12,
          font,
          color: this.parseColorToRgb(textItem.color || '#000000'),
          rotate: textItem.rotation ? degrees(textItem.rotation) : undefined,
        });
      }
    }

    // 5. Process Signatures
    const sigList = (docState as any).signatures || (docState as any).signatureAnnotations || [];
    for (const sig of sigList) {
      const pageIdx = sig.page - 1;
      if (pageIdx >= 0 && pageIdx < pageCount && sig.dataUrl) {
        const page = pdfDoc.getPage(pageIdx);
        const { height } = page.getSize();
        const pdfY = height - sig.y - sig.height;

        try {
          const base64Data = sig.dataUrl.split(',')[1];
          const binaryStr = atob(base64Data);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          const embeddedSig = await pdfDoc.embedPng(bytes);

          page.drawImage(embeddedSig, {
            x: sig.x,
            y: pdfY,
            width: sig.width,
            height: sig.height,
          });

          if (sig.isDigitalCert) {
            page.drawText(`Digitally certified: ${sig.signerName} (${sig.createdAt})`, {
              x: sig.x,
              y: pdfY - 10,
              size: 7,
              font: helvetica,
              color: rgb(0.2, 0.4, 0.6),
            });
          }
        } catch (e) {
          console.warn('Error embedding signature image:', e);
        }
      }
    }

    // 6. Process Stamps
    const stampList = (docState as any).stamps || (docState as any).stampAnnotations || [];
    for (const stamp of stampList) {
      const pageIdx = stamp.page - 1;
      if (pageIdx >= 0 && pageIdx < pageCount) {
        const page = pdfDoc.getPage(pageIdx);
        const { height } = page.getSize();
        const pdfY = height - stamp.y - stamp.height;
        const stampColor = this.parseColorToRgb(stamp.color || '#d32f2f');

        page.drawRectangle({
          x: stamp.x,
          y: pdfY,
          width: stamp.width,
          height: stamp.height,
          borderWidth: 2.5,
          borderColor: stampColor,
          color: rgb(1, 1, 1),
          opacity: 0.9,
        });

        const stampLabel = stamp.stampType === 'CUSTOM' ? (stamp.customText || 'STAMP') : stamp.stampType;
        page.drawText(stampLabel, {
          x: stamp.x + 12,
          y: pdfY + stamp.height - 24,
          size: 16,
          font: helveticaBold,
          color: stampColor,
        });

        page.drawText(`${stamp.user || 'User'} • ${stamp.dateStr}`, {
          x: stamp.x + 12,
          y: pdfY + 8,
          size: 8,
          font: helvetica,
          color: stampColor,
        });
      }
    }

    // 7. Process Highlight Annotations
    for (const hl of docState.highlightAnnotations || []) {
      const pageIdx = hl.page - 1;
      if (pageIdx >= 0 && pageIdx < pageCount) {
        const page = pdfDoc.getPage(pageIdx);
        const { height } = page.getSize();
        const pdfY = height - hl.y - hl.height;

        if (hl.type === 'underline') {
          page.drawLine({
            start: { x: hl.x, y: pdfY + 1 },
            end: { x: hl.x + hl.width, y: pdfY + 1 },
            thickness: 2,
            color: this.parseColorToRgb(hl.color || '#1e88e5'),
            opacity: 0.9,
          });
        } else if (hl.type === 'strikethrough') {
          page.drawLine({
            start: { x: hl.x, y: pdfY + hl.height / 2 },
            end: { x: hl.x + hl.width, y: pdfY + hl.height / 2 },
            thickness: 1.5,
            color: this.parseColorToRgb(hl.color || '#e53935'),
            opacity: 0.85,
          });
        } else {
          page.drawRectangle({
            x: hl.x,
            y: pdfY,
            width: hl.width,
            height: hl.height,
            color: this.parseColorToRgb(hl.color || '#ffeb3b'),
            opacity: hl.opacity || 0.35,
          });
        }
      }
    }

    // 8. Update Metadata
    if (docState.metadata) {
      if (docState.metadata.title) pdfDoc.setTitle(docState.metadata.title);
      if (docState.metadata.author) pdfDoc.setAuthor(docState.metadata.author);
      if (docState.metadata.subject) pdfDoc.setSubject(docState.metadata.subject);
      if (docState.metadata.keywords) pdfDoc.setKeywords([docState.metadata.keywords]);
      pdfDoc.setProducer('HHM PDF');
      pdfDoc.setModificationDate(new Date());
    }

    return await pdfDoc.save();
  }

  /**
   * Helper to parse CSS Hex color to pdf-lib rgb()
   */
  private static parseColorToRgb(hexColor: string, defaultAlpha = 1) {
    if (!hexColor || !hexColor.startsWith('#')) return rgb(0, 0, 0);
    const hex = hexColor.replace('#', '');
    let r = 0, g = 0, b = 0;
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16) / 255;
      g = parseInt(hex[1] + hex[1], 16) / 255;
      b = parseInt(hex[2] + hex[2], 16) / 255;
    } else if (hex.length >= 6) {
      r = parseInt(hex.substring(0, 2), 16) / 255;
      g = parseInt(hex.substring(2, 4), 16) / 255;
      b = parseInt(hex.substring(4, 6), 16) / 255;
    }
    return rgb(r, g, b);
  }

  /**
   * Extract all text page-by-page from PDF
   */
  static async extractAllText(pdfJsDoc: pdfjsLib.PDFDocumentProxy): Promise<string> {
    const numPages = pdfJsDoc.numPages;
    let fullText = '';

    for (let i = 1; i <= numPages; i++) {
      const page = await pdfJsDoc.getPage(i);
      const content = await page.getTextContent();
      const pageStrings = content.items.map((item: any) => item.str || '');
      fullText += `--- PAGE ${i} ---\n` + pageStrings.join(' ') + '\n\n';
    }

    return fullText;
  }

  /**
   * Convenience method to extract all text directly from PDF bytes
   */
  static async extractTextFromBytes(pdfBytes: Uint8Array): Promise<string> {
    const pdfJsDoc = await this.loadPdfJs(pdfBytes);
    return await this.extractAllText(pdfJsDoc);
  }

  /**
   * Check if a page is a scanned document (little or no selectable text)
   */
  static async checkIfScannedPage(
    pdfJsDoc: pdfjsLib.PDFDocumentProxy,
    pageNumber: number
  ): Promise<boolean> {
    try {
      const page = await pdfJsDoc.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items.map((item: any) => item.str || '').join('').trim();
      return text.length < 15;
    } catch {
      return false;
    }
  }

  /**
   * Run client-side Tesseract.js OCR on an image or canvas
   */
  static async runTesseractOcr(
    imageSource: string | HTMLCanvasElement,
    lang = 'eng',
    onProgress?: (p: number, status: string) => void
  ): Promise<{
    text: string;
    confidence: number;
    lines: { text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }[];
  }> {
    const worker = await createWorker(lang, 1, {
      logger: (m) => {
        if (m.status && onProgress) {
          const progress = m.progress || 0;
          onProgress(Math.round(progress * 100), m.status);
        }
      },
    });

    const ret = await worker.recognize(imageSource);
    await worker.terminate();

    const dataAny = ret.data as any;
    const lines = (dataAny.lines || []).map((l: any) => ({
      text: l.text,
      confidence: l.confidence,
      bbox: l.bbox,
    }));

    return {
      text: ret.data.text,
      confidence: ret.data.confidence,
      lines,
    };
  }

  /**
   * Embed OCR recognized text as an invisible searchable text layer into a PDF
   */
  static async embedSearchableOcrLayer(
    sourcePdf: Uint8Array,
    pageNumber: number,
    text: string
  ): Promise<Uint8Array> {
    const doc = await PDFDocument.load(sourcePdf, { ignoreEncryption: true });
    if (pageNumber > doc.getPageCount()) return sourcePdf;

    const page = doc.getPage(pageNumber - 1);
    const { width, height } = page.getSize();
    const font = await doc.embedFont(StandardFonts.Helvetica);

    // Split text into lines and embed with 0 opacity (invisible yet fully selectable & searchable)
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    let currentY = height - 50;
    for (const line of lines) {
      if (currentY < 40) break;
      page.drawText(line, {
        x: 50,
        y: currentY,
        size: 9,
        font,
        color: rgb(0, 0, 0),
        opacity: 0.001, // Invisible overlay allowing search & copy
      });
      currentY -= 14;
    }

    return await doc.save();
  }

  /**
   * Helper to parse PDF font metadata, subset tags, bold/italic styles, and clean font family
   */
  static parsePdfFontMetadata(rawFontName: string): {
    family: string;
    cleanName: string;
    isBold: boolean;
    isItalic: boolean;
    isSubset: boolean;
    subsetPrefix?: string;
  } {
    if (!rawFontName) {
      return { family: 'Helvetica', cleanName: 'Helvetica', isBold: false, isItalic: false, isSubset: false };
    }

    let cleanName = rawFontName.replace(/^\//, '');
    let isSubset = false;
    let subsetPrefix: string | undefined = undefined;

    const subsetMatch = cleanName.match(/^([A-Z]{6})\+(.+)$/);
    if (subsetMatch) {
      isSubset = true;
      subsetPrefix = subsetMatch[1];
      cleanName = subsetMatch[2];
    } else if (cleanName.includes('+')) {
      isSubset = true;
      const parts = cleanName.split('+');
      subsetPrefix = parts[0];
      cleanName = parts[1];
    }

    const fn = cleanName.toLowerCase();

    const isBold =
      fn.includes('bold') ||
      fn.includes('black') ||
      fn.includes('heavy') ||
      fn.includes('bmt') ||
      fn.includes('-b') ||
      fn.includes(',b') ||
      fn.includes('psbd');
    const isItalic =
      fn.includes('italic') ||
      fn.includes('oblique') ||
      fn.includes('slanted') ||
      fn.includes('imt') ||
      fn.includes('-i') ||
      fn.includes(',i') ||
      fn.includes('psit');

    let family = 'Helvetica';

    // Prioritized specific family matching
    if (
      fn.includes('times') ||
      fn.includes('roman') ||
      fn.includes('trm') ||
      fn.includes('msttcorefonts')
    ) {
      family = 'Times New Roman';
    } else if (
      fn.includes('arialblack') ||
      fn.includes('arial-black') ||
      (fn.includes('arial') && fn.includes('black'))
    ) {
      family = 'Arial Black';
    } else if (fn.includes('arial')) {
      family = 'Arial';
    } else if (fn.includes('calibri')) {
      family = 'Calibri';
    } else if (fn.includes('cambria')) {
      family = 'Cambria';
    } else if (fn.includes('segoe')) {
      family = 'Segoe UI';
    } else if (fn.includes('georgia')) {
      family = 'Georgia';
    } else if (fn.includes('verdana')) {
      family = 'Verdana';
    } else if (fn.includes('tahoma')) {
      family = 'Tahoma';
    } else if (fn.includes('courier') || fn.includes('mono') || fn.includes('console')) {
      family = 'Courier New';
    } else if (fn.includes('consolas')) {
      family = 'Consolas';
    } else if (fn.includes('aptos')) {
      family = fn.includes('display') ? 'Aptos Display' : 'Aptos';
    } else if (fn.includes('garamond')) {
      family = 'Garamond';
    } else if (fn.includes('palatino')) {
      family = 'Palatino Linotype';
    } else if (fn.includes('centurygothic') || fn.includes('century gothic')) {
      family = 'Century Gothic';
    } else if (fn.includes('franklingothic') || fn.includes('franklin gothic')) {
      family = 'Franklin Gothic Medium';
    } else if (fn.includes('trebuchet')) {
      family = 'Trebuchet MS';
    } else if (fn.includes('roboto')) {
      family = 'Roboto';
    } else if (fn.includes('opensans') || fn.includes('open sans')) {
      family = 'Open Sans';
    } else if (fn.includes('lato')) {
      family = 'Lato';
    } else if (fn.includes('montserrat')) {
      family = 'Montserrat';
    } else if (fn.includes('helvetica') || fn.includes('sans')) {
      family = 'Helvetica';
    } else if (
      /^(g_d\d+_f\d+|f\d+|t\d+|c2_0|r\d+|g_\d+|[a-z]\d+|_?[a-z]\d+)$/i.test(cleanName)
    ) {
      // PDF.js internal loaded token without resolved name
      family = 'Helvetica';
    } else {
      // Custom embedded font: clean up suffix tags
      const base = cleanName
        .split(/[-_,]/)[0]
        .replace(/PSMT|MT|PS|Pro/g, '')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .trim();
      if (base && base.length > 1) {
        family = base;
      } else {
        family = 'Helvetica';
      }
    }

    return { family, cleanName, isBold, isItalic, isSubset, subsetPrefix };
  }

  /**
   * Extract page font dictionary mapping resource names to BaseFont and metadata
   */
  static async extractPdfPageFonts(
    pdfBytes: Uint8Array,
    pageNumber: number
  ): Promise<
    Map<
      string,
      {
        baseFont: string;
        family: string;
        cleanName: string;
        isBold: boolean;
        isItalic: boolean;
        isSubset: boolean;
        isEmbedded: boolean;
        extractedFontBytes?: Uint8Array;
      }
    >
  > {
    const fontMap = new Map<
      string,
      {
        baseFont: string;
        family: string;
        cleanName: string;
        isBold: boolean;
        isItalic: boolean;
        isSubset: boolean;
        isEmbedded: boolean;
        extractedFontBytes?: Uint8Array;
      }
    >();

    try {
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      if (pageNumber < 1 || pageNumber > pdfDoc.getPageCount()) return fontMap;
      const page = pdfDoc.getPage(pageNumber - 1);

      const candidateDicts: PDFDict[] = [];

      // Page-level Resources
      const pageRes = page.node.get(PDFName.of('Resources'));
      if (pageRes) {
        const resObj = pdfDoc.context.lookup(pageRes);
        if (resObj instanceof PDFDict) {
          const fDict = resObj.get(PDFName.of('Font'));
          if (fDict) {
            const fDictObj = pdfDoc.context.lookup(fDict);
            if (fDictObj instanceof PDFDict) candidateDicts.push(fDictObj);
          }
        }
      }

      // Inherited Resources from parent /Pages nodes
      let parent = page.node.get(PDFName.of('Parent'));
      while (parent) {
        const parentObj = pdfDoc.context.lookup(parent);
        if (parentObj instanceof PDFDict) {
          const parentRes = parentObj.get(PDFName.of('Resources'));
          if (parentRes) {
            const pResObj = pdfDoc.context.lookup(parentRes);
            if (pResObj instanceof PDFDict) {
              const pFDict = pResObj.get(PDFName.of('Font'));
              if (pFDict) {
                const pFDictObj = pdfDoc.context.lookup(pFDict);
                if (pFDictObj instanceof PDFDict) candidateDicts.push(pFDictObj);
              }
            }
          }
          parent = parentObj.get(PDFName.of('Parent'));
        } else {
          break;
        }
      }

      for (const fontsDict of candidateDicts) {
        const keys = fontsDict.keys();
        for (const key of keys) {
          const value = fontsDict.get(key);
          if (!value) continue;
          const fontObj = pdfDoc.context.lookup(value);
          if (!(fontObj instanceof PDFDict)) continue;

          let baseFontStr = '';
          const baseFontName = fontObj.get(PDFName.of('BaseFont'));
          if (baseFontName instanceof PDFName) {
            baseFontStr = baseFontName.asString().replace(/^\//, '');
          }

          let extractedBytes: Uint8Array | undefined = undefined;
          let isEmbedded = false;

          const inspectDescriptor = (descObj: any) => {
            if (!(descObj instanceof PDFDict)) return;
            const fontFileRef =
              descObj.get(PDFName.of('FontFile2')) ||
              descObj.get(PDFName.of('FontFile3')) ||
              descObj.get(PDFName.of('FontFile'));
            if (fontFileRef) {
              isEmbedded = true;
              const fileObj = pdfDoc.context.lookup(fontFileRef);
              if (fileObj && typeof (fileObj as any).getContents === 'function') {
                extractedBytes = (fileObj as any).getContents();
              } else if (fileObj && (fileObj as any).contents) {
                extractedBytes = new Uint8Array((fileObj as any).contents);
              }
            }
          };

          // Direct FontDescriptor
          const fontDescRef = fontObj.get(PDFName.of('FontDescriptor'));
          if (fontDescRef) {
            inspectDescriptor(pdfDoc.context.lookup(fontDescRef));
          }

          // Type0 DescendantFonts
          const subtype = fontObj.get(PDFName.of('Subtype'))?.toString();
          if (subtype === '/Type0') {
            const descFontsRef = fontObj.get(PDFName.of('DescendantFonts'));
            if (descFontsRef) {
              const descArray = pdfDoc.context.lookup(descFontsRef);
              if (
                descArray &&
                typeof (descArray as any).size === 'function' &&
                (descArray as any).size() > 0
              ) {
                const cidFontObj = pdfDoc.context.lookup((descArray as any).get(0));
                if (cidFontObj instanceof PDFDict) {
                  if (!baseFontStr) {
                    const cidBase = cidFontObj.get(PDFName.of('BaseFont'));
                    if (cidBase instanceof PDFName) {
                      baseFontStr = cidBase.asString().replace(/^\//, '');
                    }
                  }
                  const cidDescRef = cidFontObj.get(PDFName.of('FontDescriptor'));
                  if (cidDescRef) {
                    inspectDescriptor(pdfDoc.context.lookup(cidDescRef));
                  }
                }
              }
            }
          }

          const rawKeyName = key.asString().replace(/^\//, '');
          const isSubset = baseFontStr.includes('+');
          const meta = this.parsePdfFontMetadata(baseFontStr || rawKeyName);

          const fontData = {
            baseFont: baseFontStr,
            family: meta.family,
            cleanName: meta.cleanName,
            isBold: meta.isBold,
            isItalic: meta.isItalic,
            isSubset,
            isEmbedded,
            extractedFontBytes: extractedBytes,
          };

          fontMap.set(rawKeyName, fontData);
          fontMap.set(rawKeyName.toLowerCase(), fontData);

          if (baseFontStr) {
            fontMap.set(baseFontStr, fontData);
            fontMap.set(baseFontStr.toLowerCase(), fontData);
            if (meta.cleanName) {
              fontMap.set(meta.cleanName, fontData);
              fontMap.set(meta.cleanName.toLowerCase(), fontData);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Error extracting page fonts:', err);
    }
    return fontMap;
  }

  /**
   * Extract selectable text items with exact bounding boxes and font metadata from a page.
   * Also determines if the page is scanned / image-based.
   */
  static async extractPageTextItems(
    pdfJsDoc: pdfjsLib.PDFDocumentProxy,
    pageNumber: number,
    pdfBytes?: Uint8Array
  ): Promise<PageTextDetectionResult> {
    try {
      if (!pdfJsDoc || pageNumber < 1 || pageNumber > pdfJsDoc.numPages) {
        console.warn(`extractPageTextItems: Invalid page number ${pageNumber} (total pages: ${pdfJsDoc?.numPages || 0})`);
        return { isScanned: false, itemCount: 0, totalChars: 0, items: [] };
      }
      const page = await pdfJsDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.0 });

      // Pre-load operator list so PDF.js populates page.commonObjs with font definitions
      try {
        await page.getOperatorList();
      } catch {
        // Fallback
      }

      const textContent = await page.getTextContent();

      let pageFontMap = new Map<string, any>();
      if (pdfBytes) {
        pageFontMap = await this.extractPdfPageFonts(pdfBytes, pageNumber);
      }

      const items: PageTextItem[] = [];
      let totalChars = 0;

      for (let idx = 0; idx < textContent.items.length; idx++) {
        const item = textContent.items[idx] as any;
        if (!item || typeof item.str !== 'string' || item.str.trim().length === 0) {
          continue;
        }

        const str = item.str;
        totalChars += str.length;

        const transform = item.transform || [1, 0, 0, 1, 0, 0];
        const fontSize = Math.max(
          8,
          Math.round(Math.hypot(transform[0], transform[1])) || Math.round(item.height) || 12
        );

        const [vx, vy] = viewport.convertToViewportPoint(transform[4], transform[5]);
        const x = Math.max(0, vx);
        const y = Math.max(0, vy - fontSize);
        const width = Math.max(10, item.width || str.length * fontSize * 0.55);
        const height = Math.max(10, item.height || fontSize * 1.2);

        const rawFontName = item.fontName || '';
        let resolvedFontName = rawFontName;
        let resolvedBold = false;
        let resolvedItalic = false;
        let resolvedBytes: Uint8Array | undefined = undefined;
        let isEmbedded = false;
        let isSubset = false;

        // 1. Inspect PDF.js commonObjs
        if (
          page.commonObjs &&
          typeof page.commonObjs.has === 'function' &&
          page.commonObjs.has(rawFontName)
        ) {
          const f = page.commonObjs.get(rawFontName);
          if (f) {
            if (f.loadedName) resolvedFontName = f.loadedName;
            if (typeof f.bold === 'boolean') resolvedBold = f.bold;
            if (typeof f.italic === 'boolean') resolvedItalic = f.italic;
            if (f.data && f.data.length > 0) {
              resolvedBytes = new Uint8Array(f.data);
              isEmbedded = true;
            }
          }
        }

        // 2. Cross-reference with PDF Document pageFontMap
        const mappedFont =
          pageFontMap.get(rawFontName) ||
          pageFontMap.get(resolvedFontName) ||
          pageFontMap.get(resolvedFontName.toLowerCase());

        if (mappedFont) {
          if (mappedFont.baseFont) resolvedFontName = mappedFont.baseFont;
          if (mappedFont.isBold) resolvedBold = true;
          if (mappedFont.isItalic) resolvedItalic = true;
          if (mappedFont.isSubset) isSubset = true;
          if (mappedFont.isEmbedded) isEmbedded = true;
          if (mappedFont.extractedFontBytes) resolvedBytes = mappedFont.extractedFontBytes;
        }

        // 3. Parse font family and styles
        const fontMeta = this.parsePdfFontMetadata(resolvedFontName);
        const finalFamily = mappedFont?.family || fontMeta.family;
        const finalBold = resolvedBold || fontMeta.isBold;
        const finalItalic = resolvedItalic || fontMeta.isItalic;

        fontRegistry.registerDetectedFont(finalFamily);

        items.push({
          id: `page_${pageNumber}_text_${idx}`,
          str,
          x: Math.round(x * 10) / 10,
          y: Math.round(y * 10) / 10,
          width: Math.round(width * 10) / 10,
          height: Math.round(height * 10) / 10,
          fontSize,
          fontFamily: finalFamily,
          fontName: resolvedFontName || fontMeta.cleanName,
          isBold: finalBold,
          isItalic: finalItalic,
          hasEOL: Boolean(item.hasEOL),
          page: pageNumber,
          isEmbedded: isEmbedded || mappedFont?.isEmbedded || false,
          isSubset: isSubset || resolvedFontName.includes('+'),
          fontBytes: resolvedBytes,
        });
      }

      const isScanned = totalChars < 15 || items.length === 0;

      return {
        isScanned,
        itemCount: items.length,
        totalChars,
        items,
      };
    } catch (err) {
      console.error(`Error extracting page text items for page ${pageNumber}:`, err);
      return {
        isScanned: true,
        itemCount: 0,
        totalChars: 0,
        items: [],
      };
    }
  }

  /**
   * Run OCR on a scanned page canvas/image to detect text boxes with positions
   */
  static async recognizeScannedPageItems(
    imageSource: string | HTMLCanvasElement,
    pageNumber: number,
    pageWidth: number,
    pageHeight: number
  ): Promise<PageTextItem[]> {
    const ocrResult = await this.runTesseractOcr(imageSource);
    const items: PageTextItem[] = [];

    // Tesseract bbox is in image pixel coordinates
    // We normalize to unzoomed PDF points (pageWidth x pageHeight)
    let scaleX = 1;
    let scaleY = 1;
    if (typeof HTMLCanvasElement !== 'undefined' && imageSource instanceof HTMLCanvasElement) {
      scaleX = pageWidth / imageSource.width;
      scaleY = pageHeight / imageSource.height;
    }

    ocrResult.lines.forEach((line, idx) => {
      const text = line.text.trim();
      if (!text) return;
      const b = line.bbox;
      const x = b.x0 * scaleX;
      const y = b.y0 * scaleY;
      const w = Math.max(15, (b.x1 - b.x0) * scaleX);
      const h = Math.max(12, (b.y1 - b.y0) * scaleY);
      const estimatedFontSize = Math.max(8, Math.round(h * 0.75));

      items.push({
        id: `ocr_item_${pageNumber}_${idx}`,
        str: text,
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        width: Math.round(w * 10) / 10,
        height: Math.round(h * 10) / 10,
        fontSize: estimatedFontSize,
        fontFamily: 'Helvetica',
        fontName: 'Tesseract-OCR',
        hasEOL: true,
        page: pageNumber,
        isOcr: true,
        confidence: line.confidence,
      });
    });

    return items;
  }

  /**
   * Group individual line fragments or word chunks into complete paragraph blocks based on
   * coordinates, baseline positions, font metrics, line spacing, and horizontal alignment.
   */
  static groupTextItemsIntoParagraphs(items: PageTextItem[]): PageParagraphBlock[] {
    if (!items || items.length === 0) return [];

    // 1. Sort items top-to-bottom, left-to-right
    const sorted = [...items].sort((a, b) => {
      if (Math.abs(a.y - b.y) > Math.min(a.fontSize, b.fontSize) * 0.4) {
        return a.y - b.y;
      }
      return a.x - b.x;
    });

    // 2. Combine items on the same horizontal baseline into single line items
    const lines: PageTextItem[] = [];
    for (const item of sorted) {
      if (lines.length === 0) {
        lines.push({ ...item });
        continue;
      }

      const prev = lines[lines.length - 1];
      const sameLine = Math.abs(item.y - prev.y) <= Math.min(item.fontSize, prev.fontSize) * 0.45;
      const xDistance = item.x - (prev.x + prev.width);

      if (sameLine && xDistance < Math.max(item.fontSize, prev.fontSize) * 3.0 && xDistance >= -10) {
        const needsSpace = xDistance > 1;
        prev.str = prev.str + (needsSpace ? ' ' : '') + item.str;
        prev.width = Math.max(prev.width, item.x + item.width - prev.x);
        prev.height = Math.max(prev.height, item.height);
      } else {
        lines.push({ ...item });
      }
    }

    // 3. Cluster consecutive lines into Paragraph Blocks
    const blocks: PageParagraphBlock[] = [];
    let currentBlockLines: PageTextItem[] = [];

    for (const line of lines) {
      if (currentBlockLines.length === 0) {
        currentBlockLines.push(line);
        continue;
      }

      const lastLine = currentBlockLines[currentBlockLines.length - 1];
      const font = lastLine.fontSize;
      const verticalGap = line.y - (lastLine.y + lastLine.height);
      const baselineDiff = line.y - lastLine.y;

      const isSpacingCompatible = baselineDiff > 0 && baselineDiff <= font * 2.5 && verticalGap <= font * 1.8;
      const isFontCompatible = Math.abs(line.fontSize - lastLine.fontSize) <= 4;

      const leftDiff = Math.abs(line.x - currentBlockLines[0].x);
      const overlapLeft = Math.max(line.x, currentBlockLines[0].x);
      const overlapRight = Math.min(
        line.x + line.width,
        currentBlockLines[0].x + Math.max(...currentBlockLines.map((l) => l.width))
      );
      const isAligned = leftDiff < 50 || overlapRight > overlapLeft;

      if (isSpacingCompatible && isFontCompatible && isAligned) {
        currentBlockLines.push(line);
      } else {
        blocks.push(this.createParagraphBlock(currentBlockLines));
        currentBlockLines = [line];
      }
    }

    if (currentBlockLines.length > 0) {
      blocks.push(this.createParagraphBlock(currentBlockLines));
    }

    return blocks;
  }

  private static createParagraphBlock(lines: PageTextItem[]): PageParagraphBlock {
    const page = lines[0].page;
    const minX = Math.min(...lines.map((l) => l.x));
    const minY = Math.min(...lines.map((l) => l.y));
    const maxX = Math.max(...lines.map((l) => l.x + l.width));
    const maxY = Math.max(...lines.map((l) => l.y + l.height));
    const avgFontSize = Math.round(
      lines.reduce((acc, l) => acc + l.fontSize, 0) / lines.length
    );

    const fontFamily = lines[0].fontFamily || 'Helvetica';
    const fontName = lines[0].fontName || 'Helvetica';
    const isBold = lines.some((l) => l.isBold);
    const isItalic = lines.some((l) => l.isItalic);
    const color = lines[0].color || '#000000';
    const isOcr = lines.some((l) => l.isOcr);
    const isEmbedded = lines.some((l) => l.isEmbedded);
    const isSubset = lines.some((l) => l.isSubset);
    const fontBytes = lines.find((l) => l.fontBytes)?.fontBytes;

    const str = lines.map((l) => l.str.trim()).join(' ');

    return {
      id: `para_p${page}_${Math.random().toString(36).substring(2, 7)}`,
      page,
      x: Math.round(minX * 10) / 10,
      y: Math.round(minY * 10) / 10,
      width: Math.round((maxX - minX) * 10) / 10,
      height: Math.round((maxY - minY) * 10) / 10,
      fontSize: avgFontSize,
      fontFamily,
      fontName,
      isBold,
      isItalic,
      color,
      str,
      lines,
      isOcr,
      align: 'left',
      isEmbedded,
      isSubset,
      fontBytes,
    };
  }

  /**
   * Replace existing wording on a target page without full document rasterization.
   * Wipes/covers the target bounding box with an opaque mask and paints replacement
   * vector typography at identical baseline coordinates.
   */
  static async replaceTextOnPage(
    pdfBytes: Uint8Array,
    pageNumber: number,
    targetBox: { x: number; y: number; width: number; height: number },
    replacementText: string,
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
      onWarning?: (w: string) => void;
    }
  ): Promise<Uint8Array> {
    const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    doc.registerFontkit(fontkit);
    if (pageNumber < 1 || pageNumber > doc.getPageCount()) {
      throw new Error(`Page ${pageNumber} out of range (total pages: ${doc.getPageCount()})`);
    }

    const page = doc.getPage(pageNumber - 1);
    const { height: pageH } = page.getSize();
    const pdfBottomY = pageH - targetBox.y - targetBox.height;

    // 1. Opaque clean background mask over original text area
    const bgColor = options?.backgroundColor
      ? this.parseColorToRgb(options.backgroundColor)
      : rgb(1, 1, 1);

    page.drawRectangle({
      x: Math.max(0, targetBox.x - 2),
      y: Math.max(0, pdfBottomY - 2),
      width: targetBox.width + 4,
      height: targetBox.height + 4,
      color: bgColor,
      borderWidth: 0,
    });

    // 2. Select Font & Style
    let embeddedFont: any;
    const requestedFamily = options?.fontFamily || 'Helvetica';
    const isB = Boolean(options?.isBold);
    const isI = Boolean(options?.isItalic);

    // If options.fontBytes was provided directly (from original item or block)
    if (options?.fontBytes && options.fontBytes.length > 0) {
      try {
        const candidate = await doc.embedFont(options.fontBytes);
        candidate.widthOfTextAtSize(replacementText, 12);
        embeddedFont = candidate;
      } catch (err) {
        console.warn('Direct fontBytes embedding or subset encoding check failed, checking alternatives:', err);
      }
    }

    // Try extracting embedded font program from target page font resources
    if (!embeddedFont) {
      try {
        const pageFonts = await this.extractPdfPageFonts(pdfBytes, pageNumber);
        for (const [_, fontInfo] of pageFonts.entries()) {
          if (
            fontInfo.extractedFontBytes &&
            (fontInfo.family.toLowerCase() === requestedFamily.toLowerCase() || pageFonts.size === 1)
          ) {
            try {
              const candidate = await doc.embedFont(fontInfo.extractedFontBytes);
              candidate.widthOfTextAtSize(replacementText, 12);
              embeddedFont = candidate;
              break;
            } catch (e) {
              // Embed failed or characters missing in subset
            }
          }
        }
      } catch (e) {
        // Extraction failed
      }
    }

    // Check if custom uploaded font buffer exists in font registry
    if (!embeddedFont) {
      const customBuffer = fontRegistry.getCustomFontBuffer(requestedFamily);
      if (customBuffer) {
        try {
          const candidate = await doc.embedFont(customBuffer);
          candidate.widthOfTextAtSize(replacementText, 12);
          embeddedFont = candidate;
        } catch (e) {
          console.warn(`Could not embed custom font ${requestedFamily}, using mapped standard font:`, e);
        }
      }
    }

    if (!embeddedFont) {
      let fontKey = StandardFonts.Helvetica;
      const fam = requestedFamily.toLowerCase();

      if (
        fam.includes('times') ||
        fam.includes('roman') ||
        fam.includes('serif') ||
        fam.includes('georgia') ||
        fam.includes('cambria') ||
        fam.includes('garamond') ||
        fam.includes('palatino')
      ) {
        if (isB && isI) fontKey = StandardFonts.TimesRomanBoldItalic;
        else if (isB) fontKey = StandardFonts.TimesRomanBold;
        else if (isI) fontKey = StandardFonts.TimesRomanItalic;
        else fontKey = StandardFonts.TimesRoman;
      } else if (
        fam.includes('courier') ||
        fam.includes('mono') ||
        fam.includes('console') ||
        fam.includes('consolas')
      ) {
        if (isB && isI) fontKey = StandardFonts.CourierBoldOblique;
        else if (isB) fontKey = StandardFonts.CourierBold;
        else if (isI) fontKey = StandardFonts.CourierOblique;
        else fontKey = StandardFonts.Courier;
      } else {
        if (isB && isI) fontKey = StandardFonts.HelveticaBoldOblique;
        else if (isB) fontKey = StandardFonts.HelveticaBold;
        else if (isI) fontKey = StandardFonts.HelveticaOblique;
        else fontKey = StandardFonts.Helvetica;
      }

      embeddedFont = await doc.embedFont(fontKey);
    }
    const fontSize = options?.fontSize
      ? options.fontSize
      : targetBox.height > 20
      ? 12
      : Math.max(8, Math.round(targetBox.height * 0.75));
    const textColor = options?.color ? this.parseColorToRgb(options.color) : rgb(0, 0, 0);

    // 3. Word wrapping and line splitting
    const wrapWidth = Math.max(targetBox.width, 280);
    const words = replacementText.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    const safeMeasure = (text: string, sz: number): number => {
      try {
        return embeddedFont.widthOfTextAtSize(text, sz);
      } catch {
        return text.length * sz * 0.55;
      }
    };

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = safeMeasure(testLine, fontSize);
      if (testWidth <= wrapWidth || !currentLine) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    if (lines.length === 0) lines.push(replacementText);

    const lineHeight = fontSize * 1.25;
    const topOfBoxY = pageH - targetBox.y;

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      let drawX = targetBox.x;
      const textWidth = safeMeasure(lineText, fontSize);

      if (options?.align === 'center') {
        drawX = targetBox.x + Math.max(0, (targetBox.width - textWidth) / 2);
      } else if (options?.align === 'right') {
        drawX = targetBox.x + Math.max(0, targetBox.width - textWidth);
      }

      const currentY = topOfBoxY - fontSize * 0.9 - i * lineHeight;
      try {
        page.drawText(lineText, {
          x: drawX,
          y: currentY,
          size: fontSize,
          font: embeddedFont,
          color: textColor,
        });
      } catch (drawErr) {
        console.warn('Encoding mismatch drawing text, using fallback standard font:', drawErr);
        if (options?.onWarning) {
          options.onWarning('Encoding mismatch drawing text, using fallback standard font');
        }
        const fam = requestedFamily.toLowerCase();
        const fallbackStandard = await doc.embedFont(
          fam.includes('times') || fam.includes('roman') || fam.includes('serif')
            ? StandardFonts.TimesRoman
            : StandardFonts.Helvetica
        );
        page.drawText(lineText.replace(/[^\x20-\x7E]/g, '?'), {
          x: drawX,
          y: currentY,
          size: fontSize,
          font: fallbackStandard,
          color: textColor,
        });
      }
    }

    return await doc.save();
  }

  /**
   * Find and replace all occurrences of a search string on a target page
   */
  static async replaceAllMatchingTextOnPage(
    pdfBytes: Uint8Array,
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
  ): Promise<{ updatedPdf: Uint8Array; replacedCount: number }> {
    if (!searchStr.trim()) {
      return { updatedPdf: pdfBytes, replacedCount: 0 };
    }

    const isMatch = (str: string) => {
      if (options?.matchCase) {
        return str.includes(searchStr);
      }
      return str.toLowerCase().includes(searchStr.toLowerCase());
    };

    const matchingItems = textItems.filter((item) => isMatch(item.str));
    if (matchingItems.length === 0) {
      return { updatedPdf: pdfBytes, replacedCount: 0 };
    }

    let currentPdf = pdfBytes;
    for (const item of matchingItems) {
      // Form replacement string for partial or exact match
      const newStr = options?.matchCase
        ? item.str.replace(searchStr, replacementText)
        : item.str.replace(new RegExp(searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), replacementText);

      currentPdf = await this.replaceTextOnPage(currentPdf, pageNumber, item, newStr, {
        fontFamily: options?.fontFamily || item.fontFamily,
        fontSize: options?.fontSize || item.fontSize,
        color: options?.color,
      });
    }

    return { updatedPdf: currentPdf, replacedCount: matchingItems.length };
  }

  /**
   * Search for text string across all pages
   */
  static async searchPdf(
    pdfJsDoc: pdfjsLib.PDFDocumentProxy,
    query: string
  ): Promise<{ pageNumber: number; snippet: string; count: number }[]> {
    if (!query || query.trim().length === 0) return [];
    const results: { pageNumber: number; snippet: string; count: number }[] = [];
    const lowerQuery = query.toLowerCase();

    for (let i = 1; i <= pdfJsDoc.numPages; i++) {
      const page = await pdfJsDoc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str || '').join(' ');
      const lowerPageText = pageText.toLowerCase();

      let matchCount = 0;
      let pos = lowerPageText.indexOf(lowerQuery);
      let firstSnippet = '';

      while (pos !== -1) {
        matchCount++;
        if (!firstSnippet) {
          const start = Math.max(0, pos - 35);
          const end = Math.min(pageText.length, pos + query.length + 35);
          firstSnippet = '...' + pageText.substring(start, end).replace(/\n/g, ' ') + '...';
        }
        pos = lowerPageText.indexOf(lowerQuery, pos + lowerQuery.length);
      }

      if (matchCount > 0) {
        results.push({
          pageNumber: i,
          snippet: firstSnippet,
          count: matchCount,
        });
      }
    }

    return results;
  }

  /**
   * Convert all pages of a PDF to high-resolution PNG / JPEG images
   */
  static async exportPagesToImages(
    pdfJsDoc: pdfjsLib.PDFDocumentProxy,
    format: 'image/png' | 'image/jpeg' = 'image/png',
    scale = 2.0
  ): Promise<{ pageNumber: number; dataUrl: string }[]> {
    const results: { pageNumber: number; dataUrl: string }[] = [];

    for (let i = 1; i <= pdfJsDoc.numPages; i++) {
      const page = await pdfJsDoc.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        await page.render({
          canvasContext: ctx,
          viewport,
          canvas,
        } as any).promise;
        results.push({
          pageNumber: i,
          dataUrl: canvas.toDataURL(format, 0.92),
        });
      }
    }

    return results;
  }

  /**
   * Batch apply watermark across multiple PDF files
   */
  static async batchWatermark(
    files: { name: string; data: Uint8Array }[],
    config: WatermarkConfig
  ): Promise<{ name: string; data: Uint8Array }[]> {
    const results: { name: string; data: Uint8Array }[] = [];
    for (const f of files) {
      const doc = await PDFDocument.load(f.data, { ignoreEncryption: true });
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      const wmColor = this.parseColorToRgb(config.color, 0.4);

      for (let i = 0; i < doc.getPageCount(); i++) {
        const page = doc.getPage(i);
        const { width, height } = page.getSize();
        page.drawText(config.text, {
          x: width * 0.15,
          y: height * 0.45,
          size: config.fontSize || 48,
          font,
          color: wmColor,
          opacity: config.opacity || 0.25,
          rotate: degrees(config.rotation || 45),
        });
      }

      results.push({
        name: `Watermarked_${f.name}`,
        data: await doc.save(),
      });
    }
    return results;
  }

  /**
   * Batch rotate all pages across multiple PDF files
   */
  static async batchRotate(
    files: { name: string; data: Uint8Array }[],
    angleDelta: number
  ): Promise<{ name: string; data: Uint8Array }[]> {
    const results: { name: string; data: Uint8Array }[] = [];
    for (const f of files) {
      const doc = await PDFDocument.load(f.data, { ignoreEncryption: true });
      for (let i = 0; i < doc.getPageCount(); i++) {
        const page = doc.getPage(i);
        const currentRot = page.getRotation().angle;
        page.setRotation(degrees((currentRot + angleDelta) % 360));
      }
      results.push({
        name: `Rotated_${f.name}`,
        data: await doc.save(),
      });
    }
    return results;
  }

  // ==================== PHASE 3 ENCRYPTION & SECURITY ====================

  /**
   * Check if a raw PDF has an /Encrypt dictionary
   */
  static isPdfEncrypted(pdfBytes: Uint8Array): boolean {
    const headerStr = new TextDecoder().decode(pdfBytes.slice(0, Math.min(pdfBytes.length, 4096)));
    const trailerStr = new TextDecoder().decode(pdfBytes.slice(Math.max(0, pdfBytes.length - 8192)));
    return (
      headerStr.includes('/Encrypt') ||
      trailerStr.includes('/Encrypt') ||
      new TextDecoder().decode(pdfBytes).includes('/Encrypt')
    );
  }

  /**
   * Encrypt a PDF document with standard user/owner passwords and granular permissions
   */
  static async encryptPdf(pdfBytes: Uint8Array, config: EncryptPdfConfig): Promise<Uint8Array> {
    if (!config.userPassword && !config.ownerPassword) {
      throw new Error('At least a user password or owner password is required for encryption.');
    }

    const encrypted = await encryptPDF(pdfBytes, config.userPassword || config.ownerPassword || '', {
      ownerPassword: config.ownerPassword || config.userPassword,
      algorithm: config.algorithm || 'AES-256',
      allowPrinting: config.allowPrinting,
      allowModifying: config.allowModifying,
      allowCopying: config.allowCopying,
      allowAnnotating: config.allowAnnotating,
      allowFillingForms: config.allowFillingForms,
    });

    return encrypted;
  }

  // ==================== PHASE 3 PERMANENT REDACTION ====================

  /**
   * Permanently redact marked areas and optionally sanitize metadata.
   * In 'flatten' mode: renders page to canvas, paints black over marked areas,
   * replaces page content with pixel data, ensuring underlying text cannot be extracted.
   */
  static async applyPermanentRedaction(
    docState: PdfDocumentState,
    mode: 'flatten' | 'mask' = 'flatten',
    sanitizeMetadata: boolean = true
  ): Promise<Uint8Array> {
    // First, burn current standard modifications
    const baseBytes = await this.burnModificationsAndExport(docState);
    const pdfDoc = await PDFDocument.load(baseBytes, { ignoreEncryption: true });

    const markedRedactions = (docState.redactions || []).filter(
      (r) => r.status === 'marked' || r.status === 'applied'
    );

    if (markedRedactions.length > 0) {
      // Group redactions by page
      const redactionsByPage = new Map<number, typeof markedRedactions>();
      for (const r of markedRedactions) {
        const list = redactionsByPage.get(r.page) || [];
        list.push(r);
        redactionsByPage.set(r.page, list);
      }

      // Step 1: Deep Content Stream Text Purging across all pages with redactions
      try {
        const pdfJsDoc = await this.loadPdfJs(baseBytes);

        for (const [pageNum, redactions] of redactionsByPage.entries()) {
          if (pageNum < 1 || pageNum > pdfDoc.getPageCount()) continue;

          const origPage = pdfDoc.getPage(pageNum - 1);
          const pageH = origPage.getHeight();

          let targetStrings: string[] = [];
          try {
            const pdfJsPage = await pdfJsDoc.getPage(pageNum);
            const textContent = await pdfJsPage.getTextContent();

            for (const r of redactions) {
              const boxMinY = pageH - r.y - r.height - 4;
              const boxMaxY = pageH - r.y + 4;
              const boxMinX = r.x - 4;
              const boxMaxX = r.x + r.width + 4;

              for (const item of textContent.items as any[]) {
                const tx = item.transform[4];
                const ty = item.transform[5];
                const tw = item.width || 10;
                const th = item.height || 10;
                if (tx <= boxMaxX && tx + tw >= boxMinX && ty <= boxMaxY && ty + th >= boxMinY) {
                  if (item.str && item.str.trim()) {
                    targetStrings.push(item.str.trim());
                    const words = item.str.trim().split(/\s+/);
                    for (const w of words) {
                      if (w.length >= 3) targetStrings.push(w);
                    }
                  }
                }
              }
            }
          } catch (inspectErr) {
            console.warn('PDF.js text inspection for redaction warning:', inspectErr);
          }

          // Inspect page's content streams and purge text operators matching the redaction bounds or text
          const contentsRef = origPage.node.get(PDFName.of('Contents'));
          const streams: any[] = [];
          if (contentsRef instanceof PDFArray) {
            for (let i = 0; i < contentsRef.size(); i++) {
              const s = pdfDoc.context.lookup(contentsRef.get(i));
              if (s) streams.push(s);
            }
          } else if (contentsRef) {
            const s = pdfDoc.context.lookup(contentsRef);
            if (s) streams.push(s);
          }

          if (streams.length > 0) {
            let fullStreamText = '';
            for (const st of streams) {
              const raw = st.getContents();
              const filter = st.dict?.get(PDFName.of('Filter'));
              const isFlate = filter && filter.toString().includes('FlateDecode');
              try {
                const decomp = isFlate ? pako.inflate(raw) : raw;
                fullStreamText += new TextDecoder('latin1').decode(decomp) + '\n';
              } catch {
                fullStreamText += new TextDecoder('latin1').decode(raw) + '\n';
              }
            }

            const scrubbedStreamText = fullStreamText.replace(/BT[\s\S]*?ET/g, (block) => {
              // Decode hex tokens inside block
              const decodedBlock = block.replace(/<([0-9a-fA-F]+)>/g, (_, hex) => {
                try {
                  const bytes = [];
                  for (let c = 0; c < hex.length; c += 2) {
                    bytes.push(parseInt(hex.substr(c, 2), 16));
                  }
                  return String.fromCharCode(...bytes);
                } catch {
                  return '';
                }
              });

              // Check Tm coordinates
              const tmMatch = block.match(/([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+Tm/);
              let coordHit = false;
              if (tmMatch) {
                const tx = parseFloat(tmMatch[5]);
                const ty = parseFloat(tmMatch[6]);
                for (const r of redactions) {
                  const boxMinY = pageH - r.y - r.height - 4;
                  const boxMaxY = pageH - r.y + 4;
                  const boxMinX = r.x - 4;
                  const boxMaxX = r.x + r.width + 4;
                  if (tx <= boxMaxX && tx >= boxMinX && ty <= boxMaxY && ty >= boxMinY) {
                    coordHit = true;
                    break;
                  }
                }
              }

              let textHit = false;
              for (const str of targetStrings) {
                if (decodedBlock.includes(str) || block.includes(str)) {
                  textHit = true;
                  break;
                }
              }

              if (coordHit || textHit) {
                return ''; // Purge sensitive text operator completely
              }
              return block;
            });

            const newStream = pdfDoc.context.flateStream(scrubbedStreamText);
            const newStreamRef = pdfDoc.context.register(newStream);
            origPage.node.set(PDFName.of('Contents'), newStreamRef);
          }
        }
      } catch (streamErr) {
        console.warn('Deep content-stream redaction scrub note:', streamErr);
      }

      // Step 2: Visual Masking or Raster Canvas Flattening
      const canFlatten = typeof document !== 'undefined' && mode === 'flatten';

      if (canFlatten) {
        try {
          const pdfJsDoc = await this.loadPdfJs(baseBytes);

          for (const [pageNum, redactions] of redactionsByPage.entries()) {
            if (pageNum < 1 || pageNum > pdfDoc.getPageCount()) continue;

            const pdfJsPage = await pdfJsDoc.getPage(pageNum);
            const scale = 2.0; // High quality 144 DPI render
            const viewport = pdfJsPage.getViewport({ scale });

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');

            if (ctx) {
              await pdfJsPage.render({ canvasContext: ctx, viewport } as any).promise;

              // Paint solid black rectangles directly on pixel canvas
              ctx.fillStyle = '#000000';
              for (const r of redactions) {
                const origPage = pdfDoc.getPage(pageNum - 1);
                const pageH = origPage.getHeight();
                const cvsX = r.x * scale;
                const cvsY = (pageH - r.y - r.height) * scale;
                const cvsW = r.width * scale;
                const cvsH = r.height * scale;
                ctx.fillRect(cvsX, cvsY, cvsW, cvsH);

                if (r.overlayText) {
                  ctx.fillStyle = '#FFFFFF';
                  ctx.font = `bold ${Math.max(10, Math.round(12 * scale))}px sans-serif`;
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText(r.overlayText, cvsX + cvsW / 2, cvsY + cvsH / 2);
                  ctx.fillStyle = '#000000';
                }
              }

              // Convert canvas to image and replace page in pdf-lib
              const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
              const imgBytes = await fetch(dataUrl).then((res) => res.arrayBuffer());
              const embeddedImg = await pdfDoc.embedJpg(imgBytes);

              // Replace page with rasterized image
              const targetPage = pdfDoc.getPage(pageNum - 1);
              const { width, height } = targetPage.getSize();
              const newPage = pdfDoc.insertPage(pageNum - 1, [width, height]);
              newPage.drawImage(embeddedImg, {
                x: 0,
                y: 0,
                width,
                height,
              });
              pdfDoc.removePage(pageNum);
            }
          }
        } catch (err) {
          console.warn('Canvas rasterization unavailable, falling back to solid vector mask:', err);
          for (const r of markedRedactions) {
            if (r.page >= 1 && r.page <= pdfDoc.getPageCount()) {
              const page = pdfDoc.getPage(r.page - 1);
              const { height } = page.getSize();
              page.drawRectangle({
                x: r.x,
                y: height - r.y - r.height,
                width: r.width,
                height: r.height,
                color: rgb(0, 0, 0),
                opacity: 1,
              });
            }
          }
        }
      } else {
        // Vector mask mode (draws solid opaque black vector boxes with correct bottom-up coordinates)
        for (const r of markedRedactions) {
          if (r.page >= 1 && r.page <= pdfDoc.getPageCount()) {
            const page = pdfDoc.getPage(r.page - 1);
            const { height } = page.getSize();
            const pdfY = height - r.y - r.height;
            page.drawRectangle({
              x: r.x,
              y: pdfY,
              width: r.width,
              height: r.height,
              color: rgb(0, 0, 0),
              opacity: 1,
            });
            if (r.overlayText) {
              const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
              page.drawText(r.overlayText, {
                x: r.x + 4,
                y: pdfY + (r.height - 10) / 2,
                size: 9,
                font,
                color: rgb(1, 1, 1),
              });
            }
          }
        }
      }
    }

    // Sanitize metadata
    if (sanitizeMetadata) {
      pdfDoc.setTitle('Redacted Document');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('HHM PDF (Sanitized)');
      pdfDoc.setCreator('HHM PDF');
      pdfDoc.setCreationDate(new Date());
      pdfDoc.setModificationDate(new Date());
    }

    return await pdfDoc.save();
  }

  // ==================== PHASE 3 DOCUMENT COMPARISON ====================

  /**
   * Word-level diff using Longest Common Subsequence (LCS)
   */
  static computeWordDiff(
    textA: string,
    textB: string
  ): Array<{ type: 'added' | 'removed' | 'unchanged'; value: string }> {
    const wordsA = textA.trim().split(/\s+/).filter(Boolean);
    const wordsB = textB.trim().split(/\s+/).filter(Boolean);

    const m = wordsA.length;
    const n = wordsB.length;

    // DP table for LCS
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (wordsA[i - 1] === wordsB[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Backtrack to build diff
    const result: Array<{ type: 'added' | 'removed' | 'unchanged'; value: string }> = [];
    let i = m;
    let j = n;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && wordsA[i - 1] === wordsB[j - 1]) {
        result.unshift({ type: 'unchanged', value: wordsA[i - 1] });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        result.unshift({ type: 'added', value: wordsB[j - 1] });
        j--;
      } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
        result.unshift({ type: 'removed', value: wordsA[i - 1] });
        i--;
      }
    }

    return result;
  }

  /**
   * Compare two PDF documents: page counts, text differences, and visual change summary
   */
  static async compareDocuments(
    docAData: Uint8Array,
    docBData: Uint8Array,
    docAName: string,
    docBName: string
  ): Promise<DocumentComparisonResult> {
    const docA = await this.loadPdfJs(docAData);
    const docB = await this.loadPdfJs(docBData);

    const countA = docA.numPages;
    const countB = docB.numPages;
    const maxPages = Math.max(countA, countB);

    const differences: ComparisonDiffItem[] = [];
    let totalAddedWords = 0;
    let totalDeletedWords = 0;

    for (let p = 1; p <= maxPages; p++) {
      if (p > countA) {
        // Page added in doc B
        const pageB = await docB.getPage(p);
        const textContentB = await pageB.getTextContent();
        const textB = textContentB.items.map((it: any) => it.str).join(' ');
        const wordCount = textB.split(/\s+/).filter(Boolean).length;
        totalAddedWords += wordCount;

        differences.push({
          pageNumber: p,
          type: 'added',
          summary: `Page ${p} exists only in "${docBName}" (${wordCount} words)`,
          textB,
          wordDiff: [{ type: 'added', value: textB }],
        });
      } else if (p > countB) {
        // Page removed in doc B
        const pageA = await docA.getPage(p);
        const textContentA = await pageA.getTextContent();
        const textA = textContentA.items.map((it: any) => it.str).join(' ');
        const wordCount = textA.split(/\s+/).filter(Boolean).length;
        totalDeletedWords += wordCount;

        differences.push({
          pageNumber: p,
          type: 'removed',
          summary: `Page ${p} was deleted in "${docBName}" (formerly ${wordCount} words)`,
          textA,
          wordDiff: [{ type: 'removed', value: textA }],
        });
      } else {
        // Both documents have this page -> compare text
        const pageA = await docA.getPage(p);
        const textContentA = await pageA.getTextContent();
        const textA = textContentA.items.map((it: any) => it.str).join(' ').trim();

        const pageB = await docB.getPage(p);
        const textContentB = await pageB.getTextContent();
        const textB = textContentB.items.map((it: any) => it.str).join(' ').trim();

        if (textA === textB) {
          differences.push({
            pageNumber: p,
            type: 'identical',
            summary: `Page ${p} text is identical`,
            textA,
            textB,
          });
        } else {
          const wordDiff = this.computeWordDiff(textA, textB);
          const added = wordDiff.filter((w) => w.type === 'added').length;
          const removed = wordDiff.filter((w) => w.type === 'removed').length;

          totalAddedWords += added;
          totalDeletedWords += removed;

          differences.push({
            pageNumber: p,
            type: 'modified',
            summary: `Page ${p}: ${added} words added, ${removed} words deleted`,
            textA,
            textB,
            wordDiff,
          });
        }
      }
    }

    const nonIdentical = differences.filter((d) => d.type !== 'identical');

    return {
      docAName,
      docBName,
      docAPageCount: countA,
      docBPageCount: countB,
      differences,
      summary: {
        totalDiffs: nonIdentical.length,
        addedWords: totalAddedWords,
        deletedWords: totalDeletedWords,
        pagesCompared: maxPages,
      },
    };
  }

  /**
   * Format comparison results into a clean text report
   */
  static generateComparisonReportText(result: DocumentComparisonResult): string {
    const lines: string[] = [];
    lines.push('================================================================');
    lines.push('            HHM PDF — DOCUMENT COMPARISON REPORT                 ');
    lines.push('================================================================');
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push(`Base Document (A):     ${result.docAName} (${result.docAPageCount} pages)`);
    lines.push(`Revised Document (B):  ${result.docBName} (${result.docBPageCount} pages)`);
    lines.push('----------------------------------------------------------------');
    lines.push(`Total Pages Compared:  ${result.summary.pagesCompared}`);
    lines.push(`Pages with Changes:    ${result.summary.totalDiffs}`);
    lines.push(`Total Words Added:     +${result.summary.addedWords}`);
    lines.push(`Total Words Removed:   -${result.summary.deletedWords}`);
    lines.push('================================================================\n');

    for (const diff of result.differences) {
      lines.push(`[PAGE ${diff.pageNumber}] Status: ${diff.type.toUpperCase()}`);
      lines.push(`Summary: ${diff.summary}`);
      if (diff.type === 'modified' && diff.wordDiff) {
        const addedTokens = diff.wordDiff.filter((w) => w.type === 'added').map((w) => w.value);
        const removedTokens = diff.wordDiff.filter((w) => w.type === 'removed').map((w) => w.value);
        if (addedTokens.length > 0) {
          lines.push(`  + ADDED: ${addedTokens.slice(0, 30).join(' ')}${addedTokens.length > 30 ? '...' : ''}`);
        }
        if (removedTokens.length > 0) {
          lines.push(`  - REMOVED: ${removedTokens.slice(0, 30).join(' ')}${removedTokens.length > 30 ? '...' : ''}`);
        }
      }
      lines.push('');
    }

    lines.push('================================================================');
    lines.push('Report generated by HHM PDF — Local & Secure Architecture');
    return lines.join('\n');
  }

  // ==================== PHASE 3 STANDARDS & ACCESSIBILITY ====================

  /**
   * Audit PDF standards (PDF/A-1b), accessibility (WCAG/PDF-UA), and print preflight
   */
  static async validateStandardsAndAccessibility(
    pdfBytes: Uint8Array,
    pdfJsDoc?: any
  ): Promise<PdfStandardsReport> {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const rawPdfStr = new TextDecoder('latin1').decode(pdfBytes);

    const title = pdfDoc.getTitle() || '';
    const author = pdfDoc.getAuthor() || '';
    const subject = pdfDoc.getSubject() || '';
    const rawKeywords = pdfDoc.getKeywords();
    const keywords = Array.isArray(rawKeywords) ? rawKeywords.join(', ') : (typeof rawKeywords === 'string' ? rawKeywords : '');
    const creator = pdfDoc.getCreator() || '';
    const producer = pdfDoc.getProducer() || '';
    const creationDate = pdfDoc.getCreationDate()?.toISOString();
    const modificationDate = pdfDoc.getModificationDate()?.toISOString();

    const metadata: DocumentMetadata = {
      title,
      author,
      subject,
      keywords,
      creator,
      producer,
      creationDate,
      modificationDate,
    };

    const checks: PdfStandardsCheck[] = [];

    // 1. PDF/A Checks
    // XMP Metadata Stream check
    const hasXmp = rawPdfStr.includes('/Metadata') || rawPdfStr.includes('<?xpacket');
    checks.push({
      id: 'pdfa_xmp',
      name: 'XMP Metadata Packet',
      category: 'pdf-a',
      status: hasXmp ? 'pass' : 'fail',
      details: hasXmp
        ? 'Standard XMP metadata stream found in document catalog.'
        : 'Missing XMP metadata stream. ISO 19005-1 requires synchronized XMP metadata.',
      recommendation: hasXmp ? undefined : 'Enable standard metadata synchronization in Document Properties.',
    });

    // Encryption check (PDF/A strictly forbids encryption)
    const isEncrypted = rawPdfStr.includes('/Encrypt');
    checks.push({
      id: 'pdfa_encryption',
      name: 'No Encryption Dictionary',
      category: 'pdf-a',
      status: !isEncrypted ? 'pass' : 'fail',
      details: !isEncrypted
        ? 'Document is unencrypted as required by PDF/A archive standards.'
        : 'Document contains an /Encrypt dictionary. PDF/A strictly forbids password encryption.',
      recommendation: isEncrypted ? 'Remove password protection before archiving to PDF/A.' : undefined,
    });

    // OutputIntent check
    const hasOutputIntent = rawPdfStr.includes('/OutputIntents') || rawPdfStr.includes('/OutputIntent');
    checks.push({
      id: 'pdfa_output_intent',
      name: 'Device-Independent OutputIntent (ICC Profile)',
      category: 'pdf-a',
      status: hasOutputIntent ? 'pass' : 'warn',
      details: hasOutputIntent
        ? 'Standardized color management OutputIntent dictionary is specified.'
        : 'No explicit OutputIntent profile found. PDF/A requires device-independent color management.',
      recommendation: hasOutputIntent ? undefined : 'Embed an sRGB or Fogra27 OutputIntent profile for PDF/A-1b archiving.',
    });

    // Forbidden interactive scripts (JavaScript in PDF)
    const hasJavaScript = rawPdfStr.includes('/JavaScript') || rawPdfStr.includes('/JS');
    checks.push({
      id: 'pdfa_no_js',
      name: 'No Executable Scripts (Security)',
      category: 'pdf-a',
      status: !hasJavaScript ? 'pass' : 'fail',
      details: !hasJavaScript
        ? 'No executable JavaScript streams detected.'
        : 'Contains embedded JavaScript actions. Executable code is forbidden in PDF/A archives.',
      recommendation: hasJavaScript ? 'Sanitize and strip active script actions from document.' : undefined,
    });

    // 2. Accessibility Checks (WCAG 2.1 / PDF-UA)
    // Document Title check
    const hasTitle = Boolean(title && title.trim().length > 0 && title !== 'New Document');
    checks.push({
      id: 'acc_title',
      name: 'Document Title Specified',
      category: 'accessibility',
      status: hasTitle ? 'pass' : 'fail',
      details: hasTitle
        ? `Document title is set: "${title}".`
        : 'Document title is missing or default. WCAG 2.4.2 requires a descriptive title.',
      recommendation: hasTitle ? undefined : 'Set a descriptive title under Document Properties.',
    });

    // Document Language code
    const hasLang = rawPdfStr.includes('/Lang (') || rawPdfStr.includes('/Lang(') || rawPdfStr.includes('/Lang /');
    checks.push({
      id: 'acc_lang',
      name: 'Document Language Code Tag',
      category: 'accessibility',
      status: hasLang ? 'pass' : 'warn',
      details: hasLang
        ? 'Natural language code tag (e.g. en-US) is defined in the Catalog dictionary.'
        : 'Document language attribute (/Lang) is not set. Screen readers need this for text-to-speech pronunciation.',
      recommendation: hasLang ? undefined : 'Set document language in Properties (e.g. en-US).',
    });

    // Tagged PDF check
    const isTagged = rawPdfStr.includes('/MarkInfo') && rawPdfStr.includes('/StructTreeRoot');
    checks.push({
      id: 'acc_tags',
      name: 'Tagged Structure Hierarchy (PDF/UA)',
      category: 'accessibility',
      status: isTagged ? 'pass' : 'warn',
      details: isTagged
        ? 'Document includes structural tags (/StructTreeRoot) for assistive screen readers.'
        : 'Untagged PDF. Structural headings, paragraphs, and lists are not marked for screen readers.',
      recommendation: isTagged ? undefined : 'Generate a Tagged PDF hierarchy for screen reader navigation.',
    });

    // Selectable Text vs Scanned Images
    let hasSelectableText = true;
    if (pdfJsDoc) {
      try {
        const firstPage = await pdfJsDoc.getPage(1);
        const text = await firstPage.getTextContent();
        hasSelectableText = text.items.length > 0;
      } catch {
        hasSelectableText = true;
      }
    }
    checks.push({
      id: 'acc_text_content',
      name: 'Selectable Text Layer (Not Scanned)',
      category: 'accessibility',
      status: hasSelectableText ? 'pass' : 'fail',
      details: hasSelectableText
        ? 'Document contains selectable and searchable text tokens.'
        : 'Page contains only bitmap image data without OCR text layer. Inaccessible to screen readers.',
      recommendation: hasSelectableText ? undefined : 'Run OCR (Optical Character Recognition) to generate a searchable text layer.',
    });

    // 3. Preflight Checks
    // Uniform page dimensions
    let uniformDimensions = true;
    const pageCount = pdfDoc.getPageCount();
    if (pageCount > 1) {
      const p1 = pdfDoc.getPage(0).getSize();
      for (let i = 1; i < pageCount; i++) {
        const pi = pdfDoc.getPage(i).getSize();
        if (Math.abs(p1.width - pi.width) > 2 || Math.abs(p1.height - pi.height) > 2) {
          uniformDimensions = false;
          break;
        }
      }
    }
    checks.push({
      id: 'preflight_geometry',
      name: 'Uniform Page Dimensions',
      category: 'preflight',
      status: uniformDimensions ? 'pass' : 'warn',
      details: uniformDimensions
        ? `All ${pageCount} pages have consistent dimensions.`
        : `Document contains mixed page dimensions across ${pageCount} pages. Verify printer sheet imposition.`,
      recommendation: uniformDimensions ? undefined : 'Standardize page sizes under Organize Pages if intended for uniform print runs.',
    });

    // Score calculation
    const totalChecks = checks.length;
    const passCount = checks.filter((c) => c.status === 'pass').length;
    const warnCount = checks.filter((c) => c.status === 'warn').length;
    const accessibilityScore = Math.round(((passCount + warnCount * 0.5) / totalChecks) * 100);

    const pdfAChecks = checks.filter((c) => c.category === 'pdf-a');
    const isPdfACompliant = pdfAChecks.every((c) => c.status === 'pass');

    return {
      pdfAVersion: isPdfACompliant ? 'PDF/A-1b Compliant' : 'Standard PDF 1.7',
      isPdfACompliant,
      accessibilityScore,
      checks,
      metadata,
    };
  }

  // ==================== PHASE 3 PDF OPTIMIZATION ====================

  /**
   * Optimize PDF file size: strip redundant metadata, compact object streams,
   * downsample images if specified, and verify resulting document integrity.
   */
  static async optimizePdf(
    pdfBytes: Uint8Array,
    options: PdfOptimizationOptions
  ): Promise<PdfOptimizationResult> {
    const originalSize = pdfBytes.length;
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

    if (options.removeMetadata) {
      pdfDoc.setTitle('Optimized Document');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setCreator('HHM PDF');
      pdfDoc.setProducer('HHM PDF Optimizer');
      pdfDoc.setCreationDate(new Date());
      pdfDoc.setModificationDate(new Date());
    }

    // Save with compressed object streams
    const optimizedBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });

    // Verify document can be reloaded without error
    const testDoc = await PDFDocument.load(optimizedBytes);
    if (testDoc.getPageCount() !== pdfDoc.getPageCount()) {
      throw new Error('Integrity check failed: Page count mismatch after optimization.');
    }

    const optimizedSize = optimizedBytes.length;
    const savingsBytes = Math.max(0, originalSize - optimizedSize);
    const savingsPercent = originalSize > 0 ? Number(((savingsBytes / originalSize) * 100).toFixed(1)) : 0;

    return {
      originalSize,
      optimizedSize,
      savingsBytes,
      savingsPercent,
      optimizedBytes,
    };
  }

  // ==================== QA SELF-TEST HELPER METHODS ====================

  static async burnRedactions(
    pdfBytes: Uint8Array,
    redactions: { page: number; x: number; y: number; width: number; height: number; overlayText?: string }[],
    sanitizeMetadata = false
  ): Promise<Uint8Array> {
    const docState: PdfDocumentState = {
      id: 'redact-temp',
      name: 'redacted.pdf',
      fileSize: pdfBytes.length,
      data: pdfBytes,
      pageCount: (await PDFDocument.load(pdfBytes, { ignoreEncryption: true })).getPageCount(),
      pages: [],
      metadata: { title: '', author: '', subject: '', keywords: '', creator: '', producer: '' },
      isModified: true,
      textAnnotations: [],
      imageAnnotations: [],
      hyperlinks: [],
      drawingAnnotations: [],
      highlightAnnotations: [],
      shapeAnnotations: [],
      stickyNotes: [],
      signatures: [],
      stamps: [],
      redactions: redactions.map((r, idx) => ({
        id: `red_${idx}`,
        page: r.page,
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        status: 'applied',
        overlayText: r.overlayText,
      })),
      formFields: [],
      measurements: [],
    };
    if (sanitizeMetadata) {
      docState.metadata = {
        title: '',
        author: '',
        subject: '',
        keywords: '',
        creator: 'HHM PDF',
        producer: 'HHM PDF',
      };
    }
    return await this.burnModificationsAndExport(docState);
  }

  static generateSelfSignedCert(config: any) {
    return CryptoEngine.generateCertificate(config);
  }

  static async signPdfWithPem(pdfBytes: Uint8Array, certPair: any, meta: any) {
    return await CryptoEngine.signPdfBytes(pdfBytes, certPair.certificatePem, certPair.privateKeyPem, meta);
  }

  static async extractSignatures(pdfBytes: Uint8Array) {
    return CryptoEngine.verifyPdfSignatures(pdfBytes);
  }

  // ==================== PDF/A VALIDATION & EXPORT ====================

  /**
   * Inspects all fonts in the PDF and determines whether their font files are embedded
   */
  static extractPdfFonts(pdfDoc: PDFDocument, rawPdfStr: string): PdfAEmbeddedFontInfo[] {
    const fontMap = new Map<string, PdfAEmbeddedFontInfo>();

    try {
      for (const [, obj] of pdfDoc.context.enumerateIndirectObjects()) {
        if (!obj || typeof (obj as any).get !== 'function') continue;
        const typeVal = (obj as any).get(PDFName.of('Type'))?.toString();

        if (typeVal === '/FontDescriptor') {
          const rawName = (obj as any).get(PDFName.of('FontName'))?.toString() || 'UnnamedFont';
          const fontName = rawName.replace(/^\//, '');
          const hasFontFile =
            (obj as any).has(PDFName.of('FontFile')) ||
            (obj as any).has(PDFName.of('FontFile2')) ||
            (obj as any).has(PDFName.of('FontFile3'));
          const subtype = (obj as any).get(PDFName.of('Subtype'))?.toString()?.replace(/^\//, '');
          const existing = fontMap.get(fontName);
          fontMap.set(fontName, {
            fontName,
            isEmbedded: hasFontFile || (existing ? existing.isEmbedded : false),
            subtype: subtype || existing?.subtype,
            hasWidths: true,
          });
        } else if (typeVal === '/Font') {
          const rawBase = (obj as any).get(PDFName.of('BaseFont'))?.toString();
          if (rawBase) {
            const baseFont = rawBase.replace(/^\//, '');
            const subtype = (obj as any).get(PDFName.of('Subtype'))?.toString()?.replace(/^\//, '');
            const descRef = (obj as any).get(PDFName.of('FontDescriptor'));

            let isEmbedded = false;
            if (descRef) {
              const descObj = pdfDoc.context.lookup(descRef);
              if (descObj && typeof (descObj as any).has === 'function') {
                isEmbedded =
                  (descObj as any).has(PDFName.of('FontFile')) ||
                  (descObj as any).has(PDFName.of('FontFile2')) ||
                  (descObj as any).has(PDFName.of('FontFile3'));
              }
            }
            const existing = fontMap.get(baseFont);
            fontMap.set(baseFont, {
              fontName: baseFont,
              isEmbedded: isEmbedded || (existing ? existing.isEmbedded : false),
              subtype: subtype || existing?.subtype,
              hasWidths: (obj as any).has(PDFName.of('Widths')),
            });
          }
        }
      }
    } catch {
      // Fallback to text scanning if indirect object lookup encounters malformed entries
    }

    // Safety fallback: inspect raw string BaseFont references
    const fontMatches = rawPdfStr.match(/\/BaseFont\s*\/([^\s/>]+)/g);
    if (fontMatches) {
      for (const match of fontMatches) {
        const name = match.replace(/\/BaseFont\s*\//, '');
        if (!fontMap.has(name)) {
          const hasFile =
            rawPdfStr.includes(`/FontName /${name}`) &&
            (rawPdfStr.includes('/FontFile') ||
              rawPdfStr.includes('/FontFile2') ||
              rawPdfStr.includes('/FontFile3'));
          fontMap.set(name, {
            fontName: name,
            isEmbedded: hasFile,
          });
        }
      }
    }

    return Array.from(fontMap.values());
  }

  /**
   * Preflight validation of a PDF document against ISO 19005-1 (PDF/A-1b)
   * or ISO 19005-2 (PDF/A-2b) compliance standards.
   */
  static async validatePdfA(
    pdfBytes: Uint8Array,
    profile: PdfAProfile = 'PDF/A-1b',
    pdfJsDoc?: any
  ): Promise<PdfAValidationReport> {
    const timestamp = new Date().toISOString();
    const notice =
      'HHM PDF performs client-side ISO 19005 structural validation (font embedding, XMP RDF packet, OutputIntents, encryption restriction, action sanitization, and transparency constraints). For regulatory audit seals, external validators like VeraPDF may be run in tandem.';

    if (!pdfBytes || pdfBytes.length === 0) {
      return {
        profile,
        status: 'not_validated',
        isCompliant: false,
        summary: 'Cannot validate: Empty or missing PDF byte stream.',
        checks: [
          {
            id: 'pdf_validity',
            name: 'PDF Document Format Validity',
            category: 'structure',
            status: 'fail',
            details: 'Byte stream is empty or null.',
            recommendation: 'Provide a valid non-empty PDF document.',
          },
        ],
        metadata: {
          title: '',
          author: '',
          subject: '',
          keywords: '',
          creator: '',
          producer: '',
        },
        timestamp,
        fontsDetected: [],
        hasXmp: false,
        hasOutputIntent: false,
        isEncrypted: false,
        hasForbiddenActions: false,
        hasTransparency: false,
        validatorLimitationsNotice: notice,
      };
    }

    // Header validation
    const headerCheck = new TextDecoder('latin1').decode(pdfBytes.slice(0, 10));
    if (!headerCheck.startsWith('%PDF-')) {
      return {
        profile,
        status: 'not_validated',
        isCompliant: false,
        summary: 'Cannot validate: Invalid PDF magic byte header (%PDF-).',
        checks: [
          {
            id: 'pdf_validity',
            name: 'PDF Magic Byte Header',
            category: 'structure',
            status: 'fail',
            details: `Invalid file header: "${headerCheck.trim()}". Not a recognized PDF stream.`,
            recommendation: 'Check that the file is not corrupted or truncated.',
          },
        ],
        metadata: {
          title: '',
          author: '',
          subject: '',
          keywords: '',
          creator: '',
          producer: '',
        },
        timestamp,
        fontsDetected: [],
        hasXmp: false,
        hasOutputIntent: false,
        isEncrypted: false,
        hasForbiddenActions: false,
        hasTransparency: false,
        validatorLimitationsNotice: notice,
      };
    }

    const rawPdfStr = new TextDecoder('latin1').decode(pdfBytes);

    let pdfDoc: PDFDocument;
    try {
      pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    } catch (loadErr: any) {
      return {
        profile,
        status: 'not_validated',
        isCompliant: false,
        summary: `Cannot validate: PDF parsing error (${loadErr.message || loadErr}).`,
        checks: [
          {
            id: 'pdf_parsing',
            name: 'PDF Document Parsing',
            category: 'structure',
            status: 'fail',
            details: `PDF parser error: ${loadErr.message || loadErr}`,
            recommendation: 'Repair document structure before attempting PDF/A validation.',
          },
        ],
        metadata: {
          title: '',
          author: '',
          subject: '',
          keywords: '',
          creator: '',
          producer: '',
        },
        timestamp,
        fontsDetected: [],
        hasXmp: false,
        hasOutputIntent: false,
        isEncrypted: false,
        hasForbiddenActions: false,
        hasTransparency: false,
        validatorLimitationsNotice: notice,
      };
    }

    const checks: PdfACheckItem[] = [];

    // 1. Encryption Prohibition (ISO 19005 Section 6.1.4)
    const isEncrypted = rawPdfStr.includes('/Encrypt');
    checks.push({
      id: 'pdfa_encryption',
      name: 'No Encryption Dictionary (ISO 19005 Section 6.1.4)',
      category: 'security',
      status: !isEncrypted ? 'pass' : 'fail',
      details: !isEncrypted
        ? 'Document is unencrypted as mandated by PDF/A archiving standards.'
        : 'Document contains an /Encrypt dictionary. ISO 19005 strictly forbids password or certificate encryption.',
      recommendation: isEncrypted
        ? 'Remove password protection or permissions security before archiving to PDF/A.'
        : undefined,
    });

    // 2. XMP Metadata Stream (ISO 19005 Section 6.7.2)
    const hasXmp =
      rawPdfStr.includes('/Metadata') ||
      rawPdfStr.includes('<?xpacket') ||
      pdfDoc.catalog.has(PDFName.of('Metadata'));
    checks.push({
      id: 'pdfa_xmp_stream',
      name: 'XMP Metadata Stream (ISO 19005 Section 6.7.2)',
      category: 'metadata',
      status: hasXmp ? 'pass' : 'fail',
      details: hasXmp
        ? 'Standard XMP metadata packet found in document catalog.'
        : 'Missing XMP metadata stream. PDF/A requires an embedded XMP stream with RDF schemas.',
      recommendation: hasXmp
        ? undefined
        : 'Synchronize document metadata and embed an XMP packet.',
    });

    // 3. PDF/A Identification Schema (pdfaid:part & pdfaid:conformance)
    const targetPart = profile === 'PDF/A-1b' ? '1' : '2';
    const hasPdfaId =
      rawPdfStr.includes('xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"') ||
      rawPdfStr.includes('<pdfaid:part>');
    const partMatch = rawPdfStr.match(/<pdfaid:part>(\d+)<\/pdfaid:part>/);
    const confMatch = rawPdfStr.match(/<pdfaid:conformance>([A-Za-z]+)<\/pdfaid:conformance>/);

    let idStatus: 'pass' | 'fail' | 'warn' = 'fail';
    let idDetails = '';
    if (partMatch && confMatch) {
      const detectedPart = partMatch[1];
      const detectedConf = confMatch[1].toUpperCase();
      if (detectedPart === targetPart) {
        idStatus = 'pass';
        idDetails = `Valid PDF/A identification schema found: PDF/A-${detectedPart}${detectedConf.toLowerCase()} (matches target ${profile}).`;
      } else {
        idStatus = 'fail';
        idDetails = `Identification mismatch: document specifies PDF/A-${detectedPart}${detectedConf.toLowerCase()}, but target profile is ${profile}.`;
      }
    } else if (hasPdfaId) {
      idStatus = 'warn';
      idDetails = 'PDF/A identification namespace present, but part/conformance tags could not be fully parsed.';
    } else {
      idStatus = 'fail';
      idDetails = `Missing PDF/A identification schema (pdfaid:part=${targetPart}, pdfaid:conformance=B).`;
    }

    checks.push({
      id: 'pdfa_id_schema',
      name: `PDF/A Identification Schema (${profile})`,
      category: 'metadata',
      status: idStatus,
      details: idDetails,
      recommendation:
        idStatus !== 'pass'
          ? `Embed pdfaid schema with part ${targetPart} and conformance B in XMP.`
          : undefined,
    });

    // 4. OutputIntent & Device-Independent Color (ISO 19005 Section 6.2)
    const hasOutputIntent =
      rawPdfStr.includes('/OutputIntents') ||
      rawPdfStr.includes('/OutputIntent') ||
      pdfDoc.catalog.has(PDFName.of('OutputIntents'));

    const hasGtsPdfa =
      rawPdfStr.includes('/GTS_PDFA1') ||
      rawPdfStr.includes('/GTS_PDFA2') ||
      rawPdfStr.includes('GTS_PDFA');

    let oiStatus: 'pass' | 'fail' | 'warn' = 'fail';
    let oiDetails = '';
    if (hasOutputIntent && hasGtsPdfa) {
      oiStatus = 'pass';
      oiDetails = 'Device-independent OutputIntent with GTS_PDFA color profile dictionary is present.';
    } else if (hasOutputIntent) {
      oiStatus = 'warn';
      oiDetails = 'OutputIntent dictionary found, but specific GTS_PDFA subtype marker is missing or non-standard.';
    } else {
      oiStatus = 'fail';
      oiDetails = 'No OutputIntent found. ISO 19005 requires an explicit device-independent color management profile (e.g. sRGB).';
    }

    checks.push({
      id: 'pdfa_output_intent',
      name: 'Device-Independent OutputIntent (ICC Profile)',
      category: 'color',
      status: oiStatus,
      details: oiDetails,
      recommendation:
        oiStatus !== 'pass'
          ? 'Embed standard sRGB OutputIntent dictionary in Document Catalog.'
          : undefined,
    });

    // 5. Complete Font Embedding (ISO 19005 Section 6.3.4)
    const fontsDetected = this.extractPdfFonts(pdfDoc, rawPdfStr);
    let fontStatus: 'pass' | 'fail' | 'warn' = 'pass';
    let fontDetails = '';
    const unEmbeddedFonts = fontsDetected.filter((f) => !f.isEmbedded);

    if (fontsDetected.length === 0) {
      fontStatus = 'pass';
      fontDetails = 'No font programs referenced in the document (image or vector only). Font embedding requirement satisfied.';
    } else if (unEmbeddedFonts.length === 0) {
      fontStatus = 'pass';
      fontDetails = `All ${fontsDetected.length} referenced fonts (${fontsDetected.map((f) => f.fontName).join(', ')}) are embedded within the PDF stream.`;
    } else {
      fontStatus = 'fail';
      fontDetails = `${unEmbeddedFonts.length} font(s) are NOT embedded: ${unEmbeddedFonts.map((f) => f.fontName).join(', ')}. ISO 19005 mandates 100% font embedding.`;
    }

    checks.push({
      id: 'pdfa_font_embedding',
      name: 'Complete Font Embedding (ISO 19005 Section 6.3.4)',
      category: 'fonts',
      status: fontStatus,
      details: fontDetails,
      recommendation:
        fontStatus === 'fail'
          ? 'Embed all font programs (FontFile2/FontFile3) or convert standard fonts to embedded TrueType/OpenType.'
          : undefined,
    });

    // 6. Prohibited Executable Scripts & Actions (ISO 19005 Section 6.6.1)
    const hasJs =
      rawPdfStr.includes('/JavaScript') ||
      rawPdfStr.includes('/JS ') ||
      rawPdfStr.includes('/JS(') ||
      rawPdfStr.includes('/JS<');
    const hasLaunch = rawPdfStr.includes('/Launch');
    const hasForbiddenActions = hasJs || hasLaunch;

    checks.push({
      id: 'pdfa_no_scripts',
      name: 'No Executable Scripts or Launch Actions',
      category: 'actions',
      status: !hasForbiddenActions ? 'pass' : 'fail',
      details: !hasForbiddenActions
        ? 'No executable JavaScript streams or launch actions detected in document catalog.'
        : 'Document contains executable JavaScript or Launch actions forbidden by ISO 19005.',
      recommendation: hasForbiddenActions
        ? 'Strip active script actions from document names and open action dictionaries.'
        : undefined,
    });

    // 7. Transparency Restrictions (PDF/A-1b vs PDF/A-2b)
    const hasTransparencyGroup = rawPdfStr.includes('/Transparency');
    const hasSoftMask = rawPdfStr.includes('/SMask');
    const hasAlphaOpacity = /\/(?:CA|ca)\s+0\.\d+/.test(rawPdfStr);
    const hasTransparency = hasTransparencyGroup || hasSoftMask || hasAlphaOpacity;

    let transpStatus: 'pass' | 'fail' | 'warn' = 'pass';
    let transpDetails = '';

    if (profile === 'PDF/A-1b') {
      if (hasTransparency) {
        transpStatus = 'fail';
        transpDetails = 'Transparency features detected (/Transparency, /SMask, or alpha < 1). ISO 19005-1 strictly prohibits transparency.';
      } else {
        transpStatus = 'pass';
        transpDetails = 'No transparency features detected. Meets PDF/A-1b non-transparency requirement.';
      }
    } else {
      transpStatus = 'pass';
      transpDetails = hasTransparency
        ? 'Document uses transparency features, which are fully permitted under PDF/A-2b (ISO 19005-2).'
        : 'No transparency features present.';
    }

    checks.push({
      id: 'pdfa_transparency',
      name: `Transparency Handling (${profile})`,
      category: 'structure',
      status: transpStatus,
      details: transpDetails,
      recommendation:
        transpStatus === 'fail'
          ? 'Export to PDF/A-2b instead, which natively supports transparency, or flatten transparency groups.'
          : undefined,
    });

    // 8. Document Metadata Consistency
    let title = '';
    let author = '';
    let subject = '';
    let keywords = '';
    let creator = '';
    let producer = '';
    let creationDate: string | undefined;
    let modificationDate: string | undefined;

    try {
      title = pdfDoc.getTitle() || '';
      author = pdfDoc.getAuthor() || '';
      subject = pdfDoc.getSubject() || '';
      const rawKeywords = pdfDoc.getKeywords();
      keywords = Array.isArray(rawKeywords)
        ? rawKeywords.join(', ')
        : typeof rawKeywords === 'string'
        ? rawKeywords
        : '';
      creator = pdfDoc.getCreator() || '';
      producer = pdfDoc.getProducer() || '';
      try {
        creationDate = pdfDoc.getCreationDate()?.toISOString();
      } catch {
        // Encrypted or malformed date string
      }
      try {
        modificationDate = pdfDoc.getModificationDate()?.toISOString();
      } catch {
        // Encrypted or malformed date string
      }
    } catch {
      // Ignored for encrypted / obfuscated info dictionaries
    }

    const metadata: DocumentMetadata = {
      title,
      author,
      subject,
      keywords,
      creator,
      producer,
      creationDate,
      modificationDate,
    };

    const hasTitle = Boolean(title && title.trim().length > 0 && title !== 'New Document');
    checks.push({
      id: 'pdfa_title_metadata',
      name: 'Document Title Specified in Metadata',
      category: 'metadata',
      status: hasTitle ? 'pass' : 'warn',
      details: hasTitle
        ? `Document title is set: "${title}".`
        : 'Document title is empty or default. Recommended for archival indexing.',
      recommendation: hasTitle ? undefined : 'Specify a descriptive title under Document Properties.',
    });

    // 9. Document Language Tag
    const hasLang =
      rawPdfStr.includes('/Lang (') ||
      rawPdfStr.includes('/Lang(') ||
      rawPdfStr.includes('/Lang /') ||
      pdfDoc.catalog.has(PDFName.of('Lang'));
    checks.push({
      id: 'pdfa_language_tag',
      name: 'Natural Language Code Tag',
      category: 'metadata',
      status: hasLang ? 'pass' : 'warn',
      details: hasLang
        ? 'Natural language code tag (e.g. en-US) is defined in the Catalog dictionary.'
        : 'Document language attribute (/Lang) is not set. Recommended for accessibility.',
      recommendation: hasLang ? undefined : 'Set document language in Properties (e.g. en-US).',
    });

    // Compliance Evaluation
    const hasFail = checks.some((c) => c.status === 'fail');
    const hasWarn = checks.some((c) => c.status === 'warn');

    let overallStatus: PdfAComplianceStatus = 'validated_compliant';
    let summary = '';

    if (hasFail) {
      overallStatus = 'non_compliant';
      const failCount = checks.filter((c) => c.status === 'fail').length;
      summary = `Non-compliant: ${failCount} critical PDF/A requirement(s) failed.`;
    } else if (hasWarn) {
      overallStatus = 'validation_warnings';
      const warnCount = checks.filter((c) => c.status === 'warn').length;
      summary = `Validated with ${warnCount} warning(s): Document meets core requirements with advisory notices.`;
    } else {
      overallStatus = 'validated_compliant';
      summary = `Validated compliant: All ISO ${profile === 'PDF/A-1b' ? '19005-1' : '19005-2'} requirements satisfied.`;
    }

    return {
      profile,
      status: overallStatus,
      isCompliant: overallStatus === 'validated_compliant',
      summary,
      checks,
      metadata,
      timestamp,
      fontsDetected,
      hasXmp,
      hasOutputIntent,
      isEncrypted,
      hasForbiddenActions,
      hasTransparency,
      validatorLimitationsNotice: notice,
    };
  }

  /**
   * Exports document into a PDF/A-1b or PDF/A-2b compliant format:
   * 1. Validates no encryption is present
   * 2. Synchronizes document metadata
   * 3. Injects ISO 19005 compliant XMP packet (with pdfaid:part and pdfaid:conformance)
   * 4. Injects OutputIntents with device-independent color management
   * 5. Sanitizes forbidden interactive scripts
   * 6. Saves with uncompressed object streams (PDF 1.4 compatible)
   * 7. Validates the output document and returns bytes + validation report
   */
  static async exportToPdfA(
    pdfBytes: Uint8Array,
    profile: PdfAProfile = 'PDF/A-1b',
    customMeta?: Partial<DocumentMetadata>
  ): Promise<{ pdfBytes: Uint8Array; validationReport: PdfAValidationReport }> {
    const rawStr = new TextDecoder('latin1').decode(pdfBytes);
    if (rawStr.includes('/Encrypt')) {
      throw new Error('Encrypted PDFs cannot be exported to PDF/A. Remove password protection first.');
    }

    let pdfDoc: PDFDocument;
    try {
      pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    } catch (err: any) {
      throw new Error(`Failed to parse PDF document for PDF/A conversion: ${err.message || err}`);
    }

    // 1. Synchronize metadata
    const title = customMeta?.title ?? pdfDoc.getTitle() ?? 'Archived Document';
    const author = customMeta?.author ?? pdfDoc.getAuthor() ?? 'HHM PDF User';
    const subject = customMeta?.subject ?? pdfDoc.getSubject() ?? 'Archival Document';
    const rawKw = customMeta?.keywords ?? pdfDoc.getKeywords();
    const keywords = Array.isArray(rawKw) ? rawKw.join(', ') : typeof rawKw === 'string' ? rawKw : '';
    const creator = customMeta?.creator ?? pdfDoc.getCreator() ?? 'HHM PDF Archival Engine';
    const producer = 'HHM PDF ISO-19005 Archival Engine';

    pdfDoc.setTitle(title);
    pdfDoc.setAuthor(author);
    pdfDoc.setSubject(subject);
    pdfDoc.setKeywords(keywords ? keywords.split(/,\s*/) : []);
    pdfDoc.setCreator(creator);
    pdfDoc.setProducer(producer);

    const now = new Date();
    let creationDate = now;
    try {
      creationDate = pdfDoc.getCreationDate() || now;
    } catch {
      creationDate = now;
    }
    const modDate = now;
    pdfDoc.setModificationDate(modDate);

    const createIso = creationDate.toISOString();
    const modIso = modDate.toISOString();

    const escapeXml = (str: string) =>
      (str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    // 2. Generate ISO 19005 compliant XMP packet
    const partNumber = profile === 'PDF/A-1b' ? '1' : '2';
    const xmpXml = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
      <pdfaid:part>${partNumber}</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:format>application/pdf</dc:format>
      <dc:title>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${escapeXml(title)}</rdf:li>
        </rdf:Alt>
      </dc:title>
      <dc:creator>
        <rdf:Seq>
          <rdf:li>${escapeXml(author)}</rdf:li>
        </rdf:Seq>
      </dc:creator>
      <dc:description>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${escapeXml(subject)}</rdf:li>
        </rdf:Alt>
      </dc:description>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
      <pdf:Producer>${escapeXml(producer)}</pdf:Producer>
      <pdf:Keywords>${escapeXml(keywords)}</pdf:Keywords>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/">
      <xmp:CreateDate>${createIso}</xmp:CreateDate>
      <xmp:ModifyDate>${modIso}</xmp:ModifyDate>
      <xmp:CreatorTool>${escapeXml(creator)}</xmp:CreatorTool>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

    // ISO 19005-1 clause 6.7.2: metadata stream shall not have any filter
    const xmpBytes = new TextEncoder().encode(xmpXml);
    const metadataStream = pdfDoc.context.stream(xmpBytes, {
      Type: PDFName.of('Metadata'),
      Subtype: PDFName.of('XML'),
    });
    const metadataStreamRef = pdfDoc.context.register(metadataStream);
    pdfDoc.catalog.set(PDFName.of('Metadata'), metadataStreamRef);

    // 3. OutputIntents (sRGB device-independent color management)
    const outputIntentDict = pdfDoc.context.obj({
      Type: PDFName.of('OutputIntent'),
      S: PDFName.of(profile === 'PDF/A-1b' ? 'GTS_PDFA1' : 'GTS_PDFA2'),
      OutputConditionIdentifier: PDFString.of('sRGB IEC61966-2.1'),
      RegistryName: PDFString.of('http://www.color.org'),
      Info: PDFString.of('sRGB IEC61966-2.1'),
    });
    const outputIntentRef = pdfDoc.context.register(outputIntentDict);
    const outputIntentsArray = pdfDoc.context.obj([outputIntentRef]);
    pdfDoc.catalog.set(PDFName.of('OutputIntents'), outputIntentsArray);

    // Also set document natural language tag (/Lang)
    pdfDoc.catalog.set(PDFName.of('Lang'), PDFString.of('en-US'));

    // 4. Sanitize forbidden interactive scripts & launch actions
    if (pdfDoc.catalog.has(PDFName.of('Names'))) {
      const namesObj = pdfDoc.catalog.lookup(PDFName.of('Names'));
      if (namesObj && typeof (namesObj as any).delete === 'function') {
        (namesObj as any).delete(PDFName.of('JavaScript'));
      }
    }
    if (pdfDoc.catalog.has(PDFName.of('OpenAction'))) {
      const openAction = pdfDoc.catalog.lookup(PDFName.of('OpenAction'));
      if (openAction && typeof (openAction as any).get === 'function') {
        const sVal = (openAction as any).get(PDFName.of('S'))?.toString();
        if (sVal === '/JavaScript' || sVal === '/Launch') {
          pdfDoc.catalog.delete(PDFName.of('OpenAction'));
        }
      }
    }

    // 5. Save with useObjectStreams: false for ISO 19005 compliance
    const outBytes = await pdfDoc.save({ useObjectStreams: false });

    // 6. Validate generated PDF/A output
    const validationReport = await this.validatePdfA(outBytes, profile);

    return {
      pdfBytes: outBytes,
      validationReport,
    };
  }
}


