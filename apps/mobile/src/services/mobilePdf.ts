import { PDFDocument, degrees } from 'pdf-lib';

export class MobilePdfService {
  /**
   * Scan-to-PDF: Convert an array of image buffers (JPEG/PNG) into a single PDF document
   */
  static async convertImagesToPdf(
    images: Array<{ data: Uint8Array; format: 'jpeg' | 'png' }>
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();

    for (const imgData of images) {
      const embedded =
        imgData.format === 'png'
          ? await pdfDoc.embedPng(imgData.data)
          : await pdfDoc.embedJpg(imgData.data);

      const page = pdfDoc.addPage([embedded.width, embedded.height]);
      page.drawImage(embedded, {
        x: 0,
        y: 0,
        width: embedded.width,
        height: embedded.height,
      });
    }

    return await pdfDoc.save();
  }

  /**
   * Rotate a specific page in a PDF document
   */
  static async rotatePage(
    pdfBytes: Uint8Array,
    pageIndex: number,
    angleDegrees: number = 90
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const page = pdfDoc.getPage(pageIndex);
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees((currentRotation + angleDegrees) % 360));
    return await pdfDoc.save();
  }

  /**
   * Delete specific pages from a PDF document
   */
  static async deletePage(pdfBytes: Uint8Array, pageIndex: number): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    pdfDoc.removePage(pageIndex);
    return await pdfDoc.save();
  }

  /**
   * Extract specified pages into a new PDF document
   */
  static async extractPages(pdfBytes: Uint8Array, pageIndices: number[]): Promise<Uint8Array> {
    const sourceDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(sourceDoc, pageIndices);
    copiedPages.forEach((p) => newDoc.addPage(p));
    return await newDoc.save();
  }

  /**
   * Embed touch signature PNG onto a PDF page
   */
  static async addSignature(
    pdfBytes: Uint8Array,
    pageIndex: number,
    signaturePngBytes: Uint8Array,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const pngImage = await pdfDoc.embedPng(signaturePngBytes);
    const page = pdfDoc.getPage(pageIndex);
    page.drawImage(pngImage, { x, y, width, height });
    return await pdfDoc.save();
  }
}
