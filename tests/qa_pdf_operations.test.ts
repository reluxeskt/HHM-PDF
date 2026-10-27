import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { PdfEngine } from '../src/services/pdfEngine';
import { CryptoEngine } from '../src/services/cryptoEngine';
import { PdfDocumentState } from '../src/types';

/**
 * HHM PDF — Automated QA Suite: PDF Operations Deep Test
 * Tests document manipulation, editing/overlay rendering, security sanitization, and cryptographic signing.
 */
async function runPdfOperationsTest() {
  console.log('================================================================');
  console.log('  HHM PDF QA — [SUITE 2/5] CORE PDF OPERATIONS DEEP AUDIT');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name}`);
      failed++;
    }
  }

  const fixturesDir = path.resolve(process.cwd(), 'tests/fixtures');

  // --- SECTION 1: DOCUMENT OPERATIONS ---
  console.log('--- [1] Document Structure & Modification Operations ---');
  const multiPath = path.join(fixturesDir, '03_multipage.pdf');
  const multiBytes = fs.readFileSync(multiPath);

  // 1.1 Page Reordering
  const reordered = await PdfEngine.reorderAndModifyPages(multiBytes, [5, 4, 3, 2, 1, 0]);
  const docReordered = await PDFDocument.load(reordered);
  assert(docReordered.getPageCount() === 6, 'Reordering reversed 6 pages without data loss');

  // 1.2 Page Extraction
  const extracted = await PdfEngine.extractPages(multiBytes, [0, 2]);
  const docExtracted = await PDFDocument.load(extracted);
  assert(docExtracted.getPageCount() === 2, 'Page extraction produces exactly 2 selected pages');

  // 1.3 Page Insertion (Insert blank page at index 1)
  const inserted = await PdfEngine.insertBlankPage(multiBytes, 1, 595.28, 841.89);
  const docInserted = await PDFDocument.load(inserted);
  assert(docInserted.getPageCount() === 7, 'Blank page insertion increases page count to 7');

  // 1.4 Page Deletion
  const deleted = await PdfEngine.deletePages(multiBytes, [0, 1]);
  const docDeleted = await PDFDocument.load(deleted);
  assert(docDeleted.getPageCount() === 4, 'Page deletion removes 2 pages (6 - 2 = 4)');

  // 1.5 Page Duplication
  const duplicated = await PdfEngine.duplicatePages(multiBytes, [0]);
  const docDuplicated = await PDFDocument.load(duplicated);
  assert(docDuplicated.getPageCount() === 7, 'Page duplication duplicates page 1 to 7 pages total');

  // 1.6 Page Rotation
  const rotated = await PdfEngine.reorderAndModifyPages(multiBytes, [0, 1, 2, 3, 4, 5], { 0: 90 });
  const docRotated = await PDFDocument.load(rotated);
  const rotAngle = docRotated.getPage(0).getRotation().angle;
  assert(rotAngle === 90, `Page rotation sets target page rotation to 90 degrees (actual: ${rotAngle})`);

  // 1.7 Combining multiple PDFs
  const blank1 = await PdfEngine.createBlankPdf('a4', 'portrait', 2);
  const blank2 = await PdfEngine.createBlankPdf('letter', 'landscape', 3);
  const combined = await PdfEngine.combinePdfs([blank1, blank2]);
  const docCombined = await PDFDocument.load(combined);
  assert(docCombined.getPageCount() === 5, 'Combine correctly concatenates 2 + 3 = 5 pages');

  // 1.8 Split PDF by ranges
  const splitDocs = await PdfEngine.splitPdfByRanges(multiBytes, [
    { name: 'Part1.pdf', pageIndices0Based: [0, 1] },
    { name: 'Part2.pdf', pageIndices0Based: [2, 3, 4, 5] },
  ]);
  assert(splitDocs.length === 2, 'Split returns 2 separate document files');
  const split1Doc = await PDFDocument.load(splitDocs[0].data);
  const split2Doc = await PDFDocument.load(splitDocs[1].data);
  assert(split1Doc.getPageCount() === 2, 'Split Part1 contains 2 pages');
  assert(split2Doc.getPageCount() === 4, 'Split Part2 contains 4 pages');

  // 1.9 Export to Text
  const tablePdf = fs.readFileSync(path.join(fixturesDir, '06_table_invoice.pdf'));
  const extractedText = await PdfEngine.extractTextFromBytes(tablePdf);
  assert(typeof extractedText === 'string', 'Export to TXT returns a valid string');
  assert(extractedText.includes('Invoice') || extractedText.includes('KPS-QA-0001'), 'Export to TXT contains invoice content');

  // --- SECTION 2: EDITING & OVERLAYS ---
  console.log('\n--- [2] Editing Overlays, Annotations & Watermarks ---');
  
  // 2.1 Burn Text, Watermark, and Shapes onto Document State
  const testDocState: PdfDocumentState = {
    id: 'test_doc_qa',
    name: 'Burn_Test.pdf',
    fileSize: blank1.byteLength,
    data: blank1,
    pageCount: 2,
    pages: [
      { pageNumber: 1, width: 595, height: 842, rotation: 0 },
      { pageNumber: 2, width: 595, height: 842, rotation: 0 },
    ],
    metadata: {
      title: 'QA Overlay Document',
      author: 'QA Architect',
      subject: 'Burn Verification',
      keywords: 'qa, test',
      creator: 'HHM PDF',
      producer: 'HHM QA',
      creationDate: new Date().toISOString(),
      modificationDate: new Date().toISOString(),
    },
    textAnnotations: [
      {
        id: 'txt-1',
        page: 1,
        x: 100,
        y: 100,
        width: 250,
        height: 40,
        text: 'Approved Surgical Equipment',
        fontSize: 16,
        fontFamily: 'Helvetica',
        color: '#ff0000',
        isBold: true,
        isItalic: false,
        isUnderline: false,
        align: 'left',
      },
    ],
    imageAnnotations: [],
    highlightAnnotations: [
      {
        id: 'hl-1',
        type: 'highlight',
        page: 1,
        x: 100,
        y: 150,
        width: 200,
        height: 20,
        color: '#ffeb3b',
        opacity: 0.35,
      },
    ],
    drawingAnnotations: [],
    shapeAnnotations: [
      {
        id: 'shape-1',
        type: 'rectangle',
        page: 1,
        x: 80,
        y: 80,
        width: 300,
        height: 120,
        strokeColor: '#0055ff',
        fillColor: '#e0f2fe',
        strokeWidth: 2,
      },
    ],
    signatures: [],
    stamps: [
      {
        id: 'stamp-1',
        page: 2,
        x: 200,
        y: 200,
        width: 140,
        height: 50,
        stampType: 'APPROVED',
        customText: 'VERIFIED QA',
        color: '#16a34a',
        dateStr: '2026-10-23',
        user: 'QA Engineer',
      },
    ],
    stickyNotes: [],
    hyperlinks: [],
    formFields: [],
    measurements: [],
    redactions: [],
    watermark: {
      text: 'CONFIDENTIAL QA TEST',
      opacity: 0.25,
      fontSize: 48,
      rotation: 45,
      fontFamily: 'Helvetica',
      color: '#0055ff',
      position: 'center',
    },
    isModified: false,
  };

  const burned = await PdfEngine.burnModificationsAndExport(testDocState);
  assert(burned.length > blank1.length, 'Burned PDF payload incorporates rendered watermark and text');

  // 2.2 Searchable OCR Layer Application
  console.log('\n--- [3] OCR & Searchable Text Layer ---');
  const ocrBase = await PdfEngine.createBlankPdf('a4', 'portrait', 1);
  const ocrSearchable = await PdfEngine.embedSearchableOcrLayer(
    ocrBase,
    1,
    'HHM PDF Searchable Text OCR Layer Line 1\nSurgical Instruments Batch #8812'
  );
  const ocrDoc = await PDFDocument.load(ocrSearchable);
  assert(ocrDoc.getPageCount() === 1, 'Searchable OCR layer successfully applied without altering page structure');

  // --- SECTION 4: SECURITY, REDACTION & CRYPTO SIGNING ---
  console.log('\n--- [4] Security, Permanent Redaction & Digital Signatures ---');

  // 4.1 AES-256 Encryption & Wrong Password Test
  const encBytes = await PdfEngine.encryptPdf(blank1, {
    userPassword: 'CorrectPassword123',
    ownerPassword: 'MasterPassword456',
    algorithm: 'AES-256',
    allowPrinting: true,
    allowModifying: false,
    allowCopying: false,
    allowAnnotating: true,
    allowFillingForms: true,
  });
  assert(PdfEngine.isPdfEncrypted(encBytes), 'PDF is properly encrypted with AES-256');

  // 4.2 Permanent Redaction Sanitization Test
  console.log('Testing permanent redaction sanitization...');
  const secretDocState: PdfDocumentState = {
    id: 'secret_doc',
    name: 'Secret_Doc.pdf',
    fileSize: blank1.byteLength,
    data: blank1,
    pageCount: 1,
    pages: [{ pageNumber: 1, width: 595, height: 842, rotation: 0 }],
    metadata: {
      title: 'Secret Internal Hospital Records',
      author: 'Dr. Private',
      subject: 'Classified',
      keywords: 'secret',
      creator: 'HHM PDF',
      producer: 'HHM QA',
      creationDate: new Date().toISOString(),
      modificationDate: new Date().toISOString(),
    },
    textAnnotations: [],
    imageAnnotations: [],
    highlightAnnotations: [],
    drawingAnnotations: [],
    shapeAnnotations: [],
    signatures: [],
    stamps: [],
    stickyNotes: [],
    hyperlinks: [],
    formFields: [],
    measurements: [],
    redactions: [
      {
        id: 'red-1',
        page: 1,
        x: 50,
        y: 200,
        width: 300,
        height: 40,
        status: 'marked',
        overlayText: 'REDACTED CONFIDENTIAL',
      },
    ],
    watermark: undefined,
    isModified: false,
  };

  const sanitizedBytes = await PdfEngine.applyPermanentRedaction(secretDocState, 'mask', true);
  assert(sanitizedBytes.length > 0, 'Permanent redaction applied successfully');
  const sanitizedDoc = await PDFDocument.load(sanitizedBytes, { ignoreEncryption: true });
  assert(sanitizedDoc.getTitle() === 'Redacted Document', 'Document title sanitized to prevent metadata leakage');
  assert(sanitizedDoc.getAuthor() === '', 'Author metadata cleared during sanitization');

  // 4.3 Digital Certificate Generation & CMS Signing
  console.log('Testing X.509 Certificate Generation & PKCS#7 CMS Signing...');
  const certData = CryptoEngine.generateCertificate({
    commonName: 'Dr. HHM Test QA',
    organization: 'HHM Surgical QA Labs',
    country: 'US',
    validityDays: 365,
    reason: 'Automated QA Contract Approval',
  });
  assert(certData.certificatePem.includes('BEGIN CERTIFICATE'), 'X.509 certificate PEM generated');
  assert(certData.privateKeyPem.includes('BEGIN RSA PRIVATE KEY'), 'RSA private key PEM generated');

  // Sign document: (pdfBytes, certificatePem, privateKeyPem, meta)
  const signedPdfBytes = await CryptoEngine.signPdfBytes(
    blank1,
    certData.certificatePem,
    certData.privateKeyPem,
    {
      signerName: 'Dr. HHM Test QA',
      reason: 'Automated QA Contract Approval',
      location: 'QA Testing Suite',
      contactInfo: 'qa@hhm-pdf.internal',
    }
  );
  assert(signedPdfBytes.length > blank1.length, 'Signed PDF includes CMS signature dictionary');

  // Verify signature validity
  const verificationSignatures = CryptoEngine.verifyPdfSignatures(signedPdfBytes);
  assert(verificationSignatures.length >= 1, 'Signature entry extracted from signed PDF');
  assert(verificationSignatures[0].signerName.includes('HHM'), 'Signer common name matches cert');
  assert(verificationSignatures[0].isValid, 'Signature cryptographic validation passes for intact document');
  assert(!verificationSignatures[0].isTampered, 'Signature byte-range check confirms document is pristine');

  // 4.4 Tamper Detection (Modify 1 byte of the signed PDF and verify it fails!)
  console.log('Testing Cryptographic Tamper Detection...');
  const tamperedBytes = new Uint8Array(signedPdfBytes);
  // Alter a byte inside the PDF body
  tamperedBytes[200] = tamperedBytes[200] === 65 ? 66 : 65;
  const tamperVerification = CryptoEngine.verifyPdfSignatures(tamperedBytes);
  const isFailedOrTampered = tamperVerification.length === 0 || tamperVerification.some((s) => !s.isValid || s.isTampered);
  assert(
    isFailedOrTampered,
    'Tampered PDF successfully fails cryptographic validation (tamper detected!)'
  );

  console.log(`\n>>> PDF OPERATIONS AUDIT RESULT: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

runPdfOperationsTest().catch((e) => {
  console.error('PDF Operations test error:', e);
  process.exit(1);
});
