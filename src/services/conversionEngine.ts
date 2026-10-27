import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  HeadingLevel,
  AlignmentType,
} from 'docx';
import * as XLSX from 'xlsx';
import pptxgen from 'pptxgenjs';
import * as pdfjsLib from 'pdfjs-dist';
import { PdfEngine } from './pdfEngine';

export interface DocxConversionResult {
  blob: Blob;
  buffer: Uint8Array;
  summary: {
    pagesProcessed: number;
    paragraphs: number;
    tables: number;
    headings: number;
    ocrApplied: boolean;
  };
}

export interface XlsxConversionResult {
  blob: Blob;
  buffer: Uint8Array;
  summary: {
    sheets: number;
    totalRows: number;
    tablesFound: number;
    ocrApplied: boolean;
  };
}

export interface PptxConversionResult {
  blob: Blob;
  buffer: Uint8Array;
  summary: {
    slides: number;
    layoutMode: 'editable' | 'slide_image';
    ocrApplied: boolean;
  };
}

interface ExtractedLine {
  y: number;
  items: Array<{
    str: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    isBold: boolean;
    isItalic: boolean;
  }>;
}

export class ConversionEngine {
  /**
   * Helper to ensure PDF.js document proxy is available from bytes
   */
  private static async getPdfJsDoc(pdfBytes: Uint8Array): Promise<pdfjsLib.PDFDocumentProxy> {
    const uint8 = new Uint8Array(pdfBytes);
    const loadingTask = pdfjsLib.getDocument({
      data: uint8,
      useSystemFonts: true,
    });
    return await loadingTask.promise;
  }

  /**
   * Extract line-grouped text and table candidates for a page
   */
  private static async extractStructuredPage(
    pdfJsDoc: pdfjsLib.PDFDocumentProxy,
    pageNum: number,
    enableOcr: boolean = false,
    onProgress?: (msg: string, pct: number) => void
  ): Promise<{
    lines: ExtractedLine[];
    isScanned: boolean;
    pageWidth: number;
    pageHeight: number;
  }> {
    const page = await pdfJsDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textItemsResult = await PdfEngine.extractPageTextItems(pdfJsDoc, pageNum);

    let items = textItemsResult.items;
    let isScanned = textItemsResult.isScanned;

    // If scanned/image-based and OCR is enabled, perform OCR
    if ((isScanned || items.length === 0) && enableOcr) {
      if (onProgress) onProgress(`Running OCR on Page ${pageNum}...`, 50);
      try {
        const thumbDataUrl = await PdfEngine.generatePageThumbnail(pdfJsDoc, pageNum, 1200);
        const ocrResult = await PdfEngine.runTesseractOcr(thumbDataUrl, 'eng');
        if (ocrResult.lines && ocrResult.lines.length > 0) {
          items = ocrResult.lines.map((l: any, idx: number) => ({
            id: `ocr_${pageNum}_${idx}`,
            str: l.text,
            x: l.bbox.x0 * (viewport.width / 1200),
            y: l.bbox.y0 * (viewport.height / 1200),
            width: (l.bbox.x1 - l.bbox.x0) * (viewport.width / 1200),
            height: (l.bbox.y1 - l.bbox.y0) * (viewport.height / 1200),
            fontSize: 11,
            fontFamily: 'Helvetica',
            fontName: 'Helvetica',
            page: pageNum,
            isOcr: true,
            confidence: l.confidence,
          }));
          isScanned = false;
        }
      } catch (err) {
        console.warn('OCR fallback in conversion failed:', err);
      }
    }

    // Group items into vertical lines (Y tolerance 4pt)
    const sortedItems = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
    const lineBuckets: ExtractedLine[] = [];

    for (const item of sortedItems) {
      const match = lineBuckets.find((l) => Math.abs(l.y - item.y) <= 4);
      if (match) {
        match.items.push({
          str: item.str,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          fontSize: item.fontSize,
          isBold: (item as any).isBold || false,
          isItalic: (item as any).isItalic || false,
        });
      } else {
        lineBuckets.push({
          y: item.y,
          items: [
            {
              str: item.str,
              x: item.x,
              y: item.y,
              width: item.width,
              height: item.height,
              fontSize: item.fontSize,
              isBold: (item as any).isBold || false,
              isItalic: (item as any).isItalic || false,
            },
          ],
        });
      }
    }

    // Sort items within each line from left to right (X ascending)
    lineBuckets.forEach((line) => {
      line.items.sort((a, b) => a.x - b.x);
    });

    // Sort lines from top to bottom
    lineBuckets.sort((a, b) => a.y - b.y);

    return {
      lines: lineBuckets,
      isScanned,
      pageWidth: viewport.width,
      pageHeight: viewport.height,
    };
  }

  // =========================================================================
  // 1. PDF TO WORD (DOCX)
  // =========================================================================
  static async convertPdfToDocx(
    pdfBytes: Uint8Array,
    options?: {
      enableOcr?: boolean;
      onProgress?: (status: string, progress: number) => void;
    }
  ): Promise<DocxConversionResult> {
    const pdfJsDoc = await this.getPdfJsDoc(pdfBytes);
    const totalPages = pdfJsDoc.numPages;

    let totalParagraphs = 0;
    let totalTables = 0;
    let totalHeadings = 0;
    let anyOcrApplied = false;

    const sectionsChildren: any[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      if (options?.onProgress) {
        const pct = Math.round(((pageNum - 1) / totalPages) * 100);
        options.onProgress(`Analyzing page ${pageNum} of ${totalPages}...`, pct);
      }

      const { lines, isScanned } = await this.extractStructuredPage(
        pdfJsDoc,
        pageNum,
        options?.enableOcr,
        options?.onProgress
      );

      if (isScanned) anyOcrApplied = true;

      // Detect table rows vs paragraphs
      let tableRowsBuffer: ExtractedLine[] = [];

      const flushTable = () => {
        if (tableRowsBuffer.length >= 2) {
          const maxCols = Math.max(...tableRowsBuffer.map((r) => r.items.length));
          const docxRows: TableRow[] = [];

          tableRowsBuffer.forEach((r, rowIdx) => {
            const isHeader = rowIdx === 0;
            const cells: TableCell[] = [];

            for (let c = 0; c < maxCols; c++) {
              const cellItem = r.items[c];
              const cellText = cellItem ? cellItem.str.trim() : '';

              cells.push(
                new TableCell({
                  width: { size: Math.floor(100 / maxCols), type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: cellText,
                          bold: isHeader || (cellItem?.isBold ?? false),
                          size: isHeader ? 22 : 20,
                          color: isHeader ? '0B2545' : '333333',
                        }),
                      ],
                      alignment: cellText.match(/^[$€£]?\d+(\.\d+)?$/)
                        ? AlignmentType.RIGHT
                        : AlignmentType.LEFT,
                    }),
                  ],
                  shading: isHeader ? { fill: 'F1F5F9' } : undefined,
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
                    left: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
                    right: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
                  },
                })
              );
            }

            docxRows.push(new TableRow({ children: cells, tableHeader: isHeader }));
          });

          sectionsChildren.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: docxRows,
            })
          );
          sectionsChildren.push(new Paragraph({ text: '' }));
          totalTables++;
        } else if (tableRowsBuffer.length === 1) {
          const r = tableRowsBuffer[0];
          const fullLineText = r.items.map((i) => i.str).join('   ');
          sectionsChildren.push(
            new Paragraph({
              children: [new TextRun({ text: fullLineText, size: 22 })],
            })
          );
          totalParagraphs++;
        }
        tableRowsBuffer = [];
      };

      for (let lIdx = 0; lIdx < lines.length; lIdx++) {
        const line = lines[lIdx];
        const isMultiColumn =
          line.items.length >= 3 ||
          (line.items.length >= 2 &&
            line.items.some((it) => it.str.match(/^[$€£]?\d+(\.\d+)?$/)));

        if (isMultiColumn) {
          tableRowsBuffer.push(line);
        } else {
          flushTable();

          const lineText = line.items.map((it) => it.str).join(' ');
          if (!lineText.trim()) continue;

          const maxFontSize = Math.max(...line.items.map((it) => it.fontSize));
          const hasBold = line.items.some((it) => it.isBold);

          if (maxFontSize >= 18) {
            sectionsChildren.push(
              new Paragraph({
                text: lineText,
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 200, after: 100 },
              })
            );
            totalHeadings++;
          } else if (maxFontSize >= 14 || (maxFontSize >= 12 && hasBold && lineText.length < 50)) {
            sectionsChildren.push(
              new Paragraph({
                text: lineText,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 160, after: 80 },
              })
            );
            totalHeadings++;
          } else {
            sectionsChildren.push(
              new Paragraph({
                children: line.items.map(
                  (it) =>
                    new TextRun({
                      text: it.str + ' ',
                      bold: it.isBold,
                      italics: it.isItalic,
                      size: Math.max(16, Math.min(36, Math.round(it.fontSize * 2))),
                    })
                ),
                spacing: { after: 80 },
              })
            );
            totalParagraphs++;
          }
        }
      }

      flushTable();

      if (pageNum < totalPages) {
        sectionsChildren.push(
          new Paragraph({
            children: [new TextRun({ text: '', break: 1 })],
          })
        );
      }
    }

    const docxDoc = new Document({
      sections: [
        {
          properties: {},
          children: sectionsChildren.length > 0
            ? sectionsChildren
            : [new Paragraph({ text: 'No text extracted from document.' })],
        },
      ],
    });

    const blob = await Packer.toBlob(docxDoc);
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Buf = new Uint8Array(arrayBuffer);

    if (options?.onProgress) options.onProgress('Word document generated successfully!', 100);

    return {
      blob,
      buffer: uint8Buf,
      summary: {
        pagesProcessed: totalPages,
        paragraphs: totalParagraphs,
        tables: totalTables,
        headings: totalHeadings,
        ocrApplied: anyOcrApplied,
      },
    };
  }

  // =========================================================================
  // 2. PDF TO EXCEL (XLSX)
  // =========================================================================
  static async convertPdfToXlsx(
    pdfBytes: Uint8Array,
    options?: {
      enableOcr?: boolean;
      onProgress?: (status: string, progress: number) => void;
    }
  ): Promise<XlsxConversionResult> {
    const pdfJsDoc = await this.getPdfJsDoc(pdfBytes);
    const totalPages = pdfJsDoc.numPages;

    const wb = XLSX.utils.book_new();
    let totalRowsCount = 0;
    let totalTablesCount = 0;
    let anyOcrApplied = false;

    const overviewData: any[][] = [
      ['HHM PDF — Excel Export Summary'],
      ['Generated', new Date().toLocaleString()],
      ['Total Pages Processed', totalPages],
      [],
      ['Sheet Name', 'Rows Extracted', 'Columns Detected'],
    ];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      if (options?.onProgress) {
        const pct = Math.round(((pageNum - 1) / totalPages) * 100);
        options.onProgress(`Extracting spreadsheet tables from page ${pageNum}...`, pct);
      }

      const { lines, isScanned } = await this.extractStructuredPage(
        pdfJsDoc,
        pageNum,
        options?.enableOcr,
        options?.onProgress
      );

      if (isScanned) anyOcrApplied = true;

      const colAnchors: number[] = [];
      lines.forEach((l) => {
        l.items.forEach((it) => {
          if (!colAnchors.some((a) => Math.abs(a - it.x) < 25)) {
            colAnchors.push(it.x);
          }
        });
      });
      colAnchors.sort((a, b) => a - b);

      const sheetRows: any[][] = [];

      for (const line of lines) {
        if (colAnchors.length <= 1) {
          const txt = line.items.map((i) => i.str).join(' ');
          sheetRows.push([txt]);
        } else {
          const rowCells: any[] = new Array(colAnchors.length).fill('');
          line.items.forEach((it) => {
            let bestCol = 0;
            let minDiff = Infinity;
            colAnchors.forEach((anchor, colIdx) => {
              const diff = Math.abs(anchor - it.x);
              if (diff < minDiff) {
                minDiff = diff;
                bestCol = colIdx;
              }
            });

            const cleanStr = it.str.trim();
            const numVal = parseFloat(cleanStr.replace(/[^0-9.-]+/g, ''));
            if (!isNaN(numVal) && cleanStr.match(/^-?\$?[\d,]+(\.\d+)?%?$/)) {
              rowCells[bestCol] = numVal;
            } else {
              rowCells[bestCol] = (rowCells[bestCol] ? rowCells[bestCol] + ' ' : '') + cleanStr;
            }
          });

          sheetRows.push(rowCells);
        }
      }

      if (sheetRows.length > 0) {
        const ws = XLSX.utils.aoa_to_sheet(sheetRows);
        const colWidths = colAnchors.map(() => ({ wch: 20 }));
        ws['!cols'] = colWidths.length > 0 ? colWidths : [{ wch: 50 }];

        const sheetTitle = `Page ${pageNum}`;
        XLSX.utils.book_append_sheet(wb, ws, sheetTitle);

        totalRowsCount += sheetRows.length;
        totalTablesCount++;

        overviewData.push([sheetTitle, sheetRows.length, Math.max(1, colAnchors.length)]);
      }
    }

    const overviewWs = XLSX.utils.aoa_to_sheet(overviewData);
    overviewWs['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, overviewWs, 'Overview');

    wb.SheetNames = ['Overview', ...wb.SheetNames.filter((s) => s !== 'Overview')];

    const xlsxArray = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const buffer = new Uint8Array(xlsxArray);
    const blob = new Blob([buffer as any], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    if (options?.onProgress) options.onProgress('Excel spreadsheet created successfully!', 100);

    return {
      blob,
      buffer,
      summary: {
        sheets: wb.SheetNames.length,
        totalRows: totalRowsCount,
        tablesFound: totalTablesCount,
        ocrApplied: anyOcrApplied,
      },
    };
  }

  // =========================================================================
  // 3. PDF TO POWERPOINT (PPTX)
  // =========================================================================
  static async convertPdfToPptx(
    pdfBytes: Uint8Array,
    options?: {
      layoutMode?: 'editable' | 'slide_image';
      onProgress?: (status: string, progress: number) => void;
    }
  ): Promise<PptxConversionResult> {
    const pdfJsDoc = await this.getPdfJsDoc(pdfBytes);
    const totalPages = pdfJsDoc.numPages;
    const mode = options?.layoutMode || 'editable';

    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';

    const slideWidth = 10.0;
    const slideHeight = 5.625;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      if (options?.onProgress) {
        const pct = Math.round(((pageNum - 1) / totalPages) * 100);
        options.onProgress(`Converting page ${pageNum} to PowerPoint slide...`, pct);
      }

      const slide = pptx.addSlide();

      if (mode === 'slide_image') {
        const pageImg = await PdfEngine.generatePageThumbnail(pdfJsDoc, pageNum, 1600);
        slide.background = { data: pageImg };
      } else {
        const { lines, pageWidth, pageHeight } = await this.extractStructuredPage(
          pdfJsDoc,
          pageNum,
          false
        );

        slide.addText(`Page ${pageNum}`, {
          x: 0.5,
          y: 0.3,
          fontSize: 9,
          color: '94A3B8',
          bold: true,
        });

        for (const line of lines) {
          const lineText = line.items.map((i) => i.str).join(' ');
          if (!lineText.trim()) continue;

          const firstItem = line.items[0];
          const xInches = Math.max(0.5, (firstItem.x / pageWidth) * slideWidth);
          const yInches = Math.max(0.5, (firstItem.y / pageHeight) * slideHeight);
          const maxFontSize = Math.max(...line.items.map((i) => i.fontSize));
          const isBold = line.items.some((i) => i.isBold);

          slide.addText(lineText, {
            x: Number(xInches.toFixed(2)),
            y: Number(yInches.toFixed(2)),
            w: Math.min(9.0, Number(((pageWidth - firstItem.x) / pageWidth * slideWidth).toFixed(2))),
            h: 0.45,
            fontSize: Math.max(10, Math.min(28, Math.round(maxFontSize * 0.9))),
            bold: isBold,
            color: isBold && maxFontSize >= 16 ? '0B2545' : '1E293B',
          });
        }
      }
    }

    const pptxArray = (await pptx.write({ outputType: 'arraybuffer' })) as ArrayBuffer;
    const buffer = new Uint8Array(pptxArray);
    const blob = new Blob([buffer as any], {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });

    if (options?.onProgress) options.onProgress('PowerPoint presentation created successfully!', 100);

    return {
      blob,
      buffer,
      summary: {
        slides: totalPages,
        layoutMode: mode,
        ocrApplied: false,
      },
    };
  }
}
