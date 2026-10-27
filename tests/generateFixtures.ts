import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';

const FIXTURES_DIR = path.join(process.cwd(), 'tests', 'fixtures');

export async function generateAllFixtures(): Promise<string[]> {
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }

  const generatedFiles: string[] = [];

  // Helper to save fixture
  const saveFixture = (fileName: string, bytes: Uint8Array) => {
    const fullPath = path.join(FIXTURES_DIR, fileName);
    fs.writeFileSync(fullPath, Buffer.from(bytes));
    generatedFiles.push(fileName);
    return fullPath;
  };

  console.log('Generating Synthetic Test Document Fixtures in:', FIXTURES_DIR);

  // 1. Blank PDF
  const doc1 = await PDFDocument.create();
  doc1.addPage([595.28, 841.89]); // A4
  saveFixture('01_blank.pdf', await doc1.save());

  // 2. One-page PDF containing text and geometric shapes
  const doc2 = await PDFDocument.create();
  const page2 = doc2.addPage([595.28, 841.89]);
  const font2 = await doc2.embedFont(StandardFonts.HelveticaBold);
  const regularFont2 = await doc2.embedFont(StandardFonts.Helvetica);
  page2.drawText('HHM PDF — QA Geometry & Vector Test', {
    x: 50,
    y: 780,
    size: 18,
    font: font2,
    color: rgb(0.04, 0.15, 0.27),
  });
  page2.drawText('This document validates geometric shapes, bounding boxes, and typography.', {
    x: 50,
    y: 750,
    size: 11,
    font: regularFont2,
    color: rgb(0.2, 0.25, 0.3),
  });
  // Draw Rectangle
  page2.drawRectangle({
    x: 50,
    y: 600,
    width: 200,
    height: 120,
    borderColor: rgb(0.14, 0.39, 0.92),
    borderWidth: 2,
    color: rgb(0.93, 0.96, 1.0),
  });
  // Draw Circle (approx via ellipse)
  page2.drawEllipse({
    x: 400,
    y: 660,
    xScale: 60,
    yScale: 60,
    color: rgb(0.9, 0.97, 0.9),
    borderColor: rgb(0.1, 0.6, 0.2),
    borderWidth: 2,
  });
  // Draw Lines
  page2.drawLine({
    start: { x: 50, y: 550 },
    end: { x: 545, y: 550 },
    thickness: 1.5,
    color: rgb(0.8, 0.85, 0.9),
  });
  saveFixture('02_text_shapes.pdf', await doc2.save());

  // 3. Multi-page PDF with at least five pages (6 pages total)
  const doc3 = await PDFDocument.create();
  const font3 = await doc3.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= 6; i++) {
    const page = doc3.addPage([595.28, 841.89]);
    page.drawText(`HHM PDF Multi-Page Test — Section ${i}`, {
      x: 50,
      y: 780,
      size: 16,
      font: font3,
      color: rgb(0.1, 0.15, 0.2),
    });
    page.drawText(`Page content body text for page index ${i} of 6. Validates navigation, reorganization and thumbnail rendering.`, {
      x: 50,
      y: 740,
      size: 11,
      font: font3,
      color: rgb(0.3, 0.35, 0.4),
    });
    page.drawText(`Page ${i} of 6`, {
      x: 270,
      y: 40,
      size: 10,
      font: font3,
      color: rgb(0.5, 0.55, 0.6),
    });
  }
  saveFixture('03_multipage.pdf', await doc3.save());

  // 4. PDF with different page sizes and orientations
  const doc4 = await PDFDocument.create();
  const font4 = await doc4.embedFont(StandardFonts.Helvetica);
  // Page 1: A4 Portrait
  const p4_1 = doc4.addPage([595.28, 841.89]);
  p4_1.drawText('Page 1: ISO A4 Portrait (595 x 842 pt)', { x: 50, y: 800, size: 14, font: font4 });
  // Page 2: US Letter Landscape
  const p4_2 = doc4.addPage([792.0, 612.0]);
  p4_2.drawText('Page 2: US Letter Landscape (792 x 612 pt)', { x: 50, y: 560, size: 14, font: font4 });
  // Page 3: US Legal Portrait
  const p4_3 = doc4.addPage([612.0, 1008.0]);
  p4_3.drawText('Page 3: US Legal Portrait (612 x 1008 pt)', { x: 50, y: 960, size: 14, font: font4 });
  // Page 4: Square 600x600 pt
  const p4_4 = doc4.addPage([600.0, 600.0]);
  p4_4.drawText('Page 4: Square Custom Dimensions (600 x 600 pt)', { x: 50, y: 550, size: 14, font: font4 });
  saveFixture('04_mixed_dimensions.pdf', await doc4.save());

  // 5. PDF with images and text
  const doc5 = await PDFDocument.create();
  const page5 = doc5.addPage([595.28, 841.89]);
  const font5 = await doc5.embedFont(StandardFonts.Helvetica);
  // Valid minimal 1x1 PNG byte array
  const samplePngBytes = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
    0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x02, 0x08, 0x02,
    0x00, 0x00, 0x00, 0xfd, 0xd4, 0x9a, 0x73, 0x00, 0x00, 0x00, 0x15, 0x49, 0x44,
    0x41, 0x54, 0x78, 0x9c, 0x63, 0xf8, 0xcf, 0xc0, 0xc0, 0xc4, 0xc0, 0xc0, 0x00,
    0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xdd, 0x04, 0xb0, 0x00, 0x00, 0x00, 0x00,
    0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
  const embeddedPng = await doc5.embedPng(samplePngBytes);
  page5.drawText('HHM PDF — Image Insertion Verification', { x: 50, y: 800, size: 16, font: font5 });
  page5.drawImage(embeddedPng, {
    x: 50,
    y: 650,
    width: 120,
    height: 120,
  });
  page5.drawText('Embedded PNG raster image (120x120 pt scaled viewport)', { x: 190, y: 710, size: 12, font: font5 });
  saveFixture('05_images_text.pdf', await doc5.save());

  // 6. PDF containing tables and numeric values (Invoice KPS-QA-0001)
  const doc6 = await PDFDocument.create();
  const page6 = doc6.addPage([595.28, 841.89]);
  const boldFont6 = await doc6.embedFont(StandardFonts.HelveticaBold);
  const regularFont6 = await doc6.embedFont(StandardFonts.Helvetica);

  page6.drawText('INVOICE / STATEMENT', { x: 50, y: 800, size: 20, font: boldFont6, color: rgb(0.04, 0.15, 0.27) });
  page6.drawText('Company: HHM Test Enterprises', { x: 50, y: 760, size: 12, font: regularFont6 });
  page6.drawText('Invoice: HHM-QA-0001', { x: 50, y: 740, size: 12, font: boldFont6 });
  page6.drawText('Date: 2026-10-23', { x: 420, y: 760, size: 11, font: regularFont6 });
  page6.drawText('Currency: USD', { x: 420, y: 740, size: 11, font: regularFont6 });

  // Table header bar
  page6.drawRectangle({
    x: 50,
    y: 680,
    width: 495,
    height: 25,
    color: rgb(0.14, 0.39, 0.92),
  });
  page6.drawText('Item Description', { x: 60, y: 688, size: 10, font: boldFont6, color: rgb(1, 1, 1) });
  page6.drawText('Quantity', { x: 260, y: 688, size: 10, font: boldFont6, color: rgb(1, 1, 1) });
  page6.drawText('Unit Price', { x: 360, y: 688, size: 10, font: boldFont6, color: rgb(1, 1, 1) });
  page6.drawText('Total', { x: 470, y: 688, size: 10, font: boldFont6, color: rgb(1, 1, 1) });

  // Line item row: Surgical Instruments, Qty: 25, Price: 12.50, Total: 312.50
  page6.drawRectangle({
    x: 50,
    y: 645,
    width: 495,
    height: 30,
    color: rgb(0.97, 0.98, 1.0),
    borderColor: rgb(0.9, 0.92, 0.95),
    borderWidth: 1,
  });
  page6.drawText('Surgical Instruments', { x: 60, y: 655, size: 11, font: regularFont6 });
  page6.drawText('25', { x: 280, y: 655, size: 11, font: regularFont6 });
  page6.drawText('USD 12.50', { x: 360, y: 655, size: 11, font: regularFont6 });
  page6.drawText('USD 312.50', { x: 460, y: 655, size: 11, font: boldFont6 });

  // Summary box
  page6.drawText('Subtotal: USD 312.50', { x: 390, y: 600, size: 11, font: regularFont6 });
  page6.drawText('Tax (0%): USD 0.00', { x: 390, y: 580, size: 11, font: regularFont6 });
  page6.drawText('Total: USD 312.50', { x: 390, y: 555, size: 13, font: boldFont6, color: rgb(0.04, 0.45, 0.15) });
  saveFixture('06_table_invoice.pdf', await doc6.save());

  // 7. Scanned-image PDF for OCR testing
  // 7. Scanned-image PDF for OCR testing (pure bitmap, 0 vector text characters)
  const doc7 = await PDFDocument.create();
  const page7 = doc7.addPage([595.28, 841.89]);
  const scannedPng = await doc7.embedPng(samplePngBytes);
  page7.drawImage(scannedPng, {
    x: 40,
    y: 100,
    width: 515,
    height: 640,
  });
  saveFixture('07_scanned_ocr.pdf', await doc7.save());

  // 8. PDF with annotations (Watermark, Stamp, Highlight simulation)
  const doc8 = await PDFDocument.create();
  const page8 = doc8.addPage([595.28, 841.89]);
  const font8 = await doc8.embedFont(StandardFonts.HelveticaBold);
  page8.drawText('Document with Pre-Existing Annotations & Review Stamps', { x: 50, y: 780, size: 16, font: font8 });
  // Watermark
  page8.drawText('DRAFT REVIEW', {
    x: 100,
    y: 450,
    size: 54,
    font: font8,
    color: rgb(0.85, 0.85, 0.9),
    rotate: degrees(45),
  });
  // Stamp box
  page8.drawRectangle({
    x: 350,
    y: 720,
    width: 140,
    height: 40,
    borderColor: rgb(0.1, 0.6, 0.2),
    borderWidth: 2,
    color: rgb(0.95, 1.0, 0.95),
  });
  page8.drawText('APPROVED', { x: 375, y: 735, size: 14, font: font8, color: rgb(0.1, 0.6, 0.2) });
  saveFixture('08_annotations.pdf', await doc8.save());

  // 9. Password-protected PDF using verified AES-256 encryption
  const doc9 = await PDFDocument.create();
  const page9 = doc9.addPage([500, 700]);
  const font9 = await doc9.embedFont(StandardFonts.HelveticaBold);
  page9.drawText('TOP SECRET ENCRYPTED REPORT', { x: 50, y: 640, size: 18, font: font9 });
  page9.drawText('Authorized personnel access only. Password required for decrypt.', { x: 50, y: 600, size: 12, font: font9 });
  const rawBytes9 = await doc9.save();
  const encryptedBytes9 = await encryptPDF(rawBytes9, 'HHMTest2026!', {
    ownerPassword: 'HHMAdminMasterKey!',
    algorithm: 'AES-256',
    allowPrinting: true,
    allowModifying: false,
    allowCopying: false,
    allowAnnotating: true,
    allowFillingForms: true,
  });
  saveFixture('09_encrypted_password.pdf', encryptedBytes9);

  // 10. Deliberately malformed or truncated PDF for error handling tests
  const malformedBytes = new Uint8Array([
    0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, // %PDF-1.7
    0x0a, 0x25, 0xff, 0xff, 0xff, 0xff, 0x0a, // binary marker
    0x31, 0x20, 0x30, 0x20, 0x6f, 0x62, 0x6a, 0x0a, // 1 0 obj
    0x3c, 0x3c, 0x2f, 0x54, 0x79, 0x70, 0x65, 0x2f, 0x43, 0x61, 0x74, 0x61, 0x6c, 0x6f, 0x67, // << /Type /Catalog
    // TRUNCATED PREMATURELY - Missing pages tree, xref table, and %%EOF
  ]);
  saveFixture('10_malformed.pdf', malformedBytes);

  // 11. Two similar PDFs with known text differences (for diff testing)
  const doc11a = await PDFDocument.create();
  const p11a = doc11a.addPage([500, 600]);
  const font11 = await doc11a.embedFont(StandardFonts.Helvetica);
  p11a.drawText('Original Contract Agreement v1.0', { x: 50, y: 550, size: 14, font: font11 });
  p11a.drawText('Clause 1: Payment will be issued within 30 days of completion.', { x: 50, y: 500, size: 11, font: font11 });
  p11a.drawText('Clause 2: Contractor retains standard liability of $10,000.', { x: 50, y: 460, size: 11, font: font11 });
  p11a.drawText('Clause 3: Governing law is California.', { x: 50, y: 420, size: 11, font: font11 });
  saveFixture('11a_diff_base.pdf', await doc11a.save());

  const doc11b = await PDFDocument.create();
  const p11b = doc11b.addPage([500, 600]);
  p11b.drawText('Revised Contract Agreement v2.0', { x: 50, y: 550, size: 14, font: font11 });
  p11b.drawText('Clause 1: Payment will be issued within 15 days of completion.', { x: 50, y: 500, size: 11, font: font11 });
  p11b.drawText('Clause 2: Contractor retains enhanced liability of $50,000.', { x: 50, y: 460, size: 11, font: font11 });
  p11b.drawText('Clause 3: Governing law is California.', { x: 50, y: 420, size: 11, font: font11 });
  p11b.drawText('Clause 4: Arbitration clause added for expedited disputes.', { x: 50, y: 380, size: 11, font: font11 });
  saveFixture('11b_diff_modified.pdf', await doc11b.save());

  // 12. Test PDF with metadata and non-English characters
  const doc12 = await PDFDocument.create();
  doc12.setTitle('HHM PDF — Multilingual Specimen');
  doc12.setAuthor('Émile & Joséphine González');
  doc12.setSubject('International Characters & Unicode UTF-8 Metadata Test');
  doc12.setKeywords(['Spécimen', 'Verificación', 'Qualitätsprüfung', 'QA']);
  const page12 = doc12.addPage([595.28, 841.89]);
  const font12 = await doc12.embedFont(StandardFonts.Helvetica);
  page12.drawText('Internationalization & Multilingual Verification', { x: 50, y: 800, size: 16, font: font12 });
  page12.drawText('Spanish: Operación de Facturación y Verificación Exitosa', { x: 50, y: 760, size: 12, font: font12 });
  page12.drawText('French: Éditeur de documents PDF avec signatures numériques', { x: 50, y: 730, size: 12, font: font12 });
  page12.drawText('German: Qualitätsprüfung und permanente Schwärzung', { x: 50, y: 700, size: 12, font: font12 });
  saveFixture('12_unicode_metadata.pdf', await doc12.save());

  console.log(`Successfully generated ${generatedFiles.length} synthetic test fixtures:`);
  generatedFiles.forEach((f, idx) => console.log(`  [${idx + 1}] ${f}`));

  return generatedFiles;
}

// Direct execution support
if (process.argv[1]?.endsWith('generateFixtures.ts')) {
  generateAllFixtures().catch((err) => {
    console.error('Fixture generation failed:', err);
    process.exit(1);
  });
}
