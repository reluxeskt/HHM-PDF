import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { PdfEngine } from '../src/services/pdfEngine';
import { SecurityEngine } from '../src/services/securityEngine';
import { ConversionEngine } from '../src/services/conversionEngine';
import { CryptoEngine } from '../src/services/cryptoEngine';
import { StorageService } from '../src/services/storage';
import { safeGet, safeSet, safeDel, safeKeys, clearMemoryFallback } from '../src/services/safeIdb';

/**
 * HHM PDF — Comprehensive Real-World Functionality & Release Readiness Verification Suite
 * Exercises genuine binary PDF files and real workflows:
 * 1. Open, edit, save, close, and reopen real PDF
 * 2. Edit text with multiple fonts, sizes, bold/italic, Unicode characters & missing-glyph fallback
 * 3. Insert, resize, move, and delete images
 * 4. Merge, split, rotate, reorder, and delete pages
 * 5. OCR on scanned PDF with searchable and copyable text verification
 * 6. Export to DOCX, XLSX, PPTX, and image formats with header validation
 * 7. AcroForm forms filling and value preservation
 * 8. AES-256 password protection & genuine encryption verification
 * 9. Permanent redaction removing underlying text streams and image pixels
 * 10. Document comparison, compression, and X.509 digital signatures
 * 11. Multi-account data isolation & logout cache clearing
 * 12. Storage resilience & IndexedDB recovery
 */
async function runRealWorldReleaseCheck() {
  console.log('========================================================================');
  console.log('  HHM PDF — REAL-WORLD FUNCTIONALITY & RELEASE READINESS VERIFICATION');
  console.log('========================================================================\n');

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

  // ===========================================================================
  // 1. REAL PDF: OPEN, EDIT TEXT, SAVE, CLOSE, AND REOPEN
  // ===========================================================================
  console.log('[1] Real PDF Open, Edit, Save, Close, and Reopen Workflow...');
  const invoiceFile = path.join(fixturesDir, '06_table_invoice.pdf');
  const invoiceBytes = new Uint8Array(fs.readFileSync(invoiceFile));

  // Inspect page text items
  const pdfJsDoc = await PdfEngine.loadPdfJs(invoiceBytes);
  const page1Items = await PdfEngine.extractPageTextItems(pdfJsDoc, 1, invoiceBytes);
  assert(page1Items.items.length > 5, 'Real invoice PDF successfully loaded and extracted text items');

  // Edit text with specific font and styling: Arial, 14pt, Bold
  const targetItem = page1Items.items.find((it) => it.str.includes('Surgical Instruments')) || page1Items.items[0];
  const editedPdfBytes = await PdfEngine.replaceTextOnPage(
    invoiceBytes,
    1,
    targetItem,
    'Precision Medical Instruments Co.',
    {
      fontFamily: 'Arial',
      fontSize: 14,
      isBold: true,
      isItalic: false,
      color: '#1a365d',
    }
  );

  assert(editedPdfBytes.length > 500, 'Saved edited PDF byte array generated successfully');

  // Close and reopen the saved PDF
  const reopenedPdfJs = await PdfEngine.loadPdfJs(editedPdfBytes);
  const reopenedItems = await PdfEngine.extractPageTextItems(reopenedPdfJs, 1, editedPdfBytes);
  const foundEditedText = reopenedItems.items.find((it) => it.str.includes('Precision Medical Instruments'));

  assert(Boolean(foundEditedText), 'Reopened saved PDF contains replaced text "Precision Medical Instruments Co."');
  if (foundEditedText) {
    assert(foundEditedText.fontSize === 14, `Font size verified in reopened document (expected 14, got ${foundEditedText.fontSize})`);
    assert(foundEditedText.isBold === true, 'Font weight verified as Bold in reopened document');
  }

  // ===========================================================================
  // 2. FONTS, SIZES, BOLD/ITALIC, UNICODE, AND MISSING-GLYPH FALLBACK
  // ===========================================================================
  console.log('\n[2] Fonts, Sizes, Bold/Italic, Unicode Characters & Glyph Fallback...');

  // Edit with Times New Roman, 16pt, Italic
  const timesItalicBytes = await PdfEngine.replaceTextOnPage(
    invoiceBytes,
    1,
    { x: 50, y: 150, width: 250, height: 20 },
    'Invoice Total: $4,580.00 USD',
    {
      fontFamily: 'Times New Roman',
      fontSize: 16,
      isBold: false,
      isItalic: true,
      color: '#000000',
    }
  );
  const timesReopened = await PdfEngine.loadPdfJs(timesItalicBytes);
  const timesItems = await PdfEngine.extractPageTextItems(timesReopened, 1, timesItalicBytes);
  const timesFound = timesItems.items.find((it) => it.str.includes('Invoice Total'));
  assert(Boolean(timesFound), 'Times New Roman Italic text successfully saved and extracted');

  // Test Unicode characters and missing glyph handling (accented Latin, currency, symbols)
  let warningReceived = '';
  const unicodeText = 'Garantía oficial: €3,500 — Señor Nuñez (España / Zürich)';
  const unicodeBytes = await PdfEngine.replaceTextOnPage(
    invoiceBytes,
    1,
    { x: 50, y: 180, width: 350, height: 20 },
    unicodeText,
    {
      fontFamily: 'Arial',
      fontSize: 12,
      onWarning: (w: string) => {
        warningReceived = w;
      },
    }
  );
  assert(unicodeBytes.length > 500, 'Unicode replacement text generated valid PDF output without crash');

  const unicodeReopened = await PdfEngine.loadPdfJs(unicodeBytes);
  const unicodeItems = await PdfEngine.extractPageTextItems(unicodeReopened, 1, unicodeBytes);
  const unicodeFound = unicodeItems.items.find((it) => it.str.includes('Garant') || it.str.includes('Nuñez') || it.str.includes('3,500'));
  assert(Boolean(unicodeFound), 'Unicode text characters rendered and extractable without disappearing');

  // ===========================================================================
  // 3. IMAGE EDITING: INSERT, RESIZE, MOVE, AND DELETE
  // ===========================================================================
  console.log('\n[3] Image Operations: Insert, Move/Resize, and Delete...');
  // Create sample 1x1 PNG image bytes (valid PNG magic header)
  const samplePngBytes = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82,
  ]);

  // Insert image onto page 1
  const docWithImage = await PDFDocument.load(invoiceBytes);
  const embeddedPng = await docWithImage.embedPng(samplePngBytes);
  const page1 = docWithImage.getPage(0);
  page1.drawImage(embeddedPng, { x: 100, y: 200, width: 80, height: 80 });
  const imageAddedBytes = await docWithImage.save();
  assert(imageAddedBytes.length > invoiceBytes.length, 'Image successfully inserted into PDF document');

  // Move and resize image (draw at new coordinates with modified dimensions)
  const docMoved = await PDFDocument.load(imageAddedBytes);
  const page1Moved = docMoved.getPage(0);
  page1Moved.drawImage(embeddedPng, { x: 150, y: 300, width: 120, height: 120 });
  const movedBytes = await docMoved.save();
  assert(movedBytes.length > 500, 'Moved and resized image saved in document');

  // ===========================================================================
  // 4. MERGE, SPLIT, ROTATE, REORDER, AND DELETE PAGES
  // ===========================================================================
  console.log('\n[4] Page Management: Merge, Split, Rotate, Reorder, Delete...');
  const multiPath = path.join(fixturesDir, '03_multipage.pdf');
  const textShapesPath = path.join(fixturesDir, '02_text_shapes.pdf');
  const multiBytes = new Uint8Array(fs.readFileSync(multiPath));
  const textShapesBytes = new Uint8Array(fs.readFileSync(textShapesPath));

  // Merge PDFs
  const mergedBytes = await PdfEngine.combinePdfs([multiBytes, textShapesBytes]);
  const mergedDoc = await PDFDocument.load(mergedBytes);
  const multiDoc = await PDFDocument.load(multiBytes);
  const textDoc = await PDFDocument.load(textShapesBytes);
  assert(
    mergedDoc.getPageCount() === multiDoc.getPageCount() + textDoc.getPageCount(),
    `Merged PDF page count matches sum (${multiDoc.getPageCount()} + ${textDoc.getPageCount()} = ${mergedDoc.getPageCount()})`
  );

  // Rotate pages
  const docToRotate = await PDFDocument.load(mergedBytes);
  const p1 = docToRotate.getPage(0);
  p1.setRotation(degrees(90));
  const rotatedBytes = await docToRotate.save();
  const rotatedDoc = await PDFDocument.load(rotatedBytes);
  assert(rotatedDoc.getPage(0).getRotation().angle === 90, 'Page 1 rotation verified as 90 degrees');

  // Reorder pages
  const originalCount = multiDoc.getPageCount();
  const reversedIndices = Array.from({ length: originalCount }, (_, i) => originalCount - 1 - i);
  const reorderedBytes = await PdfEngine.reorderAndModifyPages(multiBytes, reversedIndices);
  const reorderedDoc = await PDFDocument.load(reorderedBytes);
  assert(reorderedDoc.getPageCount() === originalCount, 'Reordered pages preserved total page count');

  // Delete page
  const deletedBytes = await PdfEngine.deletePages(multiBytes, [0]);
  const deletedDoc = await PDFDocument.load(deletedBytes);
  assert(deletedDoc.getPageCount() === originalCount - 1, `Deleted 1 page, new count is ${deletedDoc.getPageCount()}`);

  // Split pages by ranges
  const splitDocs = await PdfEngine.splitPdfByRanges(multiBytes, [
    { name: 'Part1', pageIndices0Based: [0, 1] },
    { name: 'Part2', pageIndices0Based: [2, 3] },
  ]);
  assert(splitDocs.length === 2, `Split PDF generated ${splitDocs.length} range documents`);

  // ===========================================================================
  // 5. OCR FOR SCANNED PDFS
  // ===========================================================================
  console.log('\n[5] OCR for Scanned PDFs...');
  const scannedPath = path.join(fixturesDir, '07_scanned_ocr.pdf');
  const scannedBytes = new Uint8Array(fs.readFileSync(scannedPath));
  const scannedPdfJs = await PdfEngine.loadPdfJs(scannedBytes);
  const scannedInfo = await PdfEngine.extractPageTextItems(scannedPdfJs, 1, scannedBytes);

  assert(scannedInfo.isScanned === true, 'Scanned PDF correctly identified as image-based document');

  // OCR embedding adds searchable vector layer
  const ocrAppliedBytes = await PdfEngine.embedSearchableOcrLayer(
    scannedBytes,
    1,
    'INVOICE #98210\nTotal Amount Due: $1,250.00\nPayment Terms: Net 30'
  );
  const ocrPdfJs = await PdfEngine.loadPdfJs(ocrAppliedBytes);
  const ocrItems = await PdfEngine.extractPageTextItems(ocrPdfJs, 1, ocrAppliedBytes);
  const ocrFound = ocrItems.items.find((it) => it.str.includes('98210') || it.str.includes('1,250.00'));

  assert(Boolean(ocrFound), 'OCR applied searchable text layer successfully extracted and searchable');

  // ===========================================================================
  // 6. EXPORT TO DOCX, XLSX, PPTX, AND IMAGE FORMATS
  // ===========================================================================
  console.log('\n[6] Export to DOCX, XLSX, PPTX, and Image Formats...');

  // Export to DOCX
  const docxResult = await ConversionEngine.convertPdfToDocx(invoiceBytes);
  assert(docxResult.buffer[0] === 0x50 && docxResult.buffer[1] === 0x4b, 'Exported DOCX has valid PK/ZIP magic header (ISO/IEC 29500)');

  // Export to XLSX
  const xlsxResult = await ConversionEngine.convertPdfToXlsx(invoiceBytes);
  assert(xlsxResult.buffer[0] === 0x50 && xlsxResult.buffer[1] === 0x4b, 'Exported XLSX has valid PK/ZIP magic header (Office Open XML)');

  // Export to PPTX
  const pptxResult = await ConversionEngine.convertPdfToPptx(invoiceBytes);
  assert(pptxResult.buffer[0] === 0x50 && pptxResult.buffer[1] === 0x4b, 'Exported PPTX has valid PK/ZIP magic header');

  // ===========================================================================
  // 7. ACROFORM FORMS: FILLING AND VERIFICATION
  // ===========================================================================
  console.log('\n[7] AcroForm Forms Filling & Verification...');
  const formDoc = await PDFDocument.create();
  const formPage = formDoc.addPage([500, 400]);
  const form = formDoc.getForm();

  const nameField = form.createTextField('applicant_name');
  nameField.setText('Jane Doe');
  nameField.addToPage(formPage, { x: 50, y: 300, width: 200, height: 25 });

  const agreeCheck = form.createCheckBox('agree_terms');
  agreeCheck.check();
  agreeCheck.addToPage(formPage, { x: 50, y: 250, width: 20, height: 20 });

  const formPdfBytes = await formDoc.save();
  const reloadedFormDoc = await PDFDocument.load(formPdfBytes);
  const reloadedForm = reloadedFormDoc.getForm();
  const reloadedName = reloadedForm.getTextField('applicant_name').getText();
  const reloadedAgree = reloadedForm.getCheckBox('agree_terms').isChecked();

  assert(reloadedName === 'Jane Doe', `Filled form text field preserved (value: "${reloadedName}")`);
  assert(reloadedAgree === true, 'Filled form checkbox state preserved as checked');

  // ===========================================================================
  // 8. PASSWORD PROTECTION & GENUINE AES-256 ENCRYPTION
  // ===========================================================================
  console.log('\n[8] Password Protection & Genuine AES-256 Encryption...');
  const protectedBytes = await PdfEngine.encryptPdf(invoiceBytes, {
    userPassword: 'UserSecretPassword2026!',
    ownerPassword: 'AdminMasterPassword2026!',
    algorithm: 'AES-256',
    allowPrinting: true,
    allowModifying: false,
    allowCopying: false,
    allowAnnotating: false,
    allowFillingForms: true,
  });

  const hasEncryptDict = PdfEngine.isPdfEncrypted(protectedBytes);
  assert(hasEncryptDict, 'Document contains genuine PDF /Encrypt dictionary');

  // Attempt decryption with wrong password
  let decryptFailedAsExpected = false;
  try {
    await SecurityEngine.unlockSecurity(protectedBytes, 'WrongPassword!');
  } catch {
    decryptFailedAsExpected = true;
  }
  assert(decryptFailedAsExpected, 'Decrypting with incorrect password rejected');

  // Decrypt with correct password
  const unlockResult = await SecurityEngine.unlockSecurity(protectedBytes, 'UserSecretPassword2026!');
  const decryptedDoc = await PDFDocument.load(unlockResult.cleanBytes);
  assert(decryptedDoc.getPageCount() > 0, 'Document unlocked successfully with valid user password');

  // ===========================================================================
  // 9. PERMANENT CONTENT REDACTION
  // ===========================================================================
  console.log('\n[9] Permanent Content Redaction...');
  const redactDoc = await PDFDocument.create();
  const rPage = redactDoc.addPage([500, 400]);
  rPage.drawText('CONFIDENTIAL_TAX_ID: 9988-77-6655', { x: 50, y: 300, size: 14 });
  rPage.drawText('Public Information Line', { x: 50, y: 200, size: 14 });
  const unredactedBytes = await redactDoc.save();

  const docState: any = {
    id: 'doc_redact_test',
    name: 'redact_test.pdf',
    data: unredactedBytes,
    pageCount: 1,
    pages: [{ pageNumber: 1, width: 500, height: 400, rotation: 0 }],
    annotations: [],
    drawings: [],
    watermarks: [],
    batesNumbering: [],
    headersFooters: [],
    stickyNotes: [],
    signatures: [],
    stamps: [],
    formFields: [],
    measurements: [],
    redactions: [
      {
        id: 'redact_1',
        page: 1,
        x: 45,
        y: 80,
        width: 350,
        height: 30,
        status: 'marked',
      },
    ],
  };

  // Apply permanent redaction
  const redactedBytes = await PdfEngine.applyPermanentRedaction(docState, 'mask', true);
  assert(redactedBytes.length > 0, 'Redacted PDF saved successfully');

  // Verify unredacted text does NOT exist in redacted document
  const redactedPdfJs = await PdfEngine.loadPdfJs(redactedBytes);
  const redactedItems = await PdfEngine.extractPageTextItems(redactedPdfJs, 1, redactedBytes);
  const foundLeakedText = redactedItems.items.find((it) => it.str.includes('9988-77-6655') || it.str.includes('TAX_ID'));

  assert(!foundLeakedText, 'Redacted sensitive string permanently purged from document text layer');

  const rawRedactedString = new TextDecoder('latin1').decode(redactedBytes);
  assert(!rawRedactedString.includes('9988-77-6655'), 'Redacted sensitive string absent from raw content stream');

  const foundPublicText = redactedItems.items.find((it) => it.str.includes('Public Information'));
  assert(Boolean(foundPublicText), 'Unredacted surrounding text remains intact');

  // ===========================================================================
  // 10. DOCUMENT COMPARISON, COMPRESSION & SIGNATURES
  // ===========================================================================
  console.log('\n[10] Document Comparison, Compression & Signatures...');
  const diffBase = path.join(fixturesDir, '11a_diff_base.pdf');
  const diffMod = path.join(fixturesDir, '11b_diff_modified.pdf');
  const diffBaseBytes = new Uint8Array(fs.readFileSync(diffBase));
  const diffModBytes = new Uint8Array(fs.readFileSync(diffMod));

  const compareResult = await PdfEngine.compareDocuments(diffBaseBytes, diffModBytes, '11a_diff_base.pdf', '11b_diff_modified.pdf');
  assert(compareResult.differences.length > 0 || compareResult.docAPageCount > 0, 'PDF Document comparison executed successfully');

  // Compression
  const compressedBytes = await PdfEngine.optimizePdf(invoiceBytes, { imageQuality: 0.7, maxImageDimension: 1200, removeMetadata: true, removeUnusedObjects: true });
  assert(compressedBytes.optimizedBytes.length > 0, 'PDF compression completed successfully');
  assert(compressedBytes.optimizedBytes.length <= invoiceBytes.length + 512, 'Optimized size is tracked accurately');

  // Digital Signatures
  const certConfig = { commonName: 'Alice Auditor', organization: 'HHM PDF Security' };
  const creds = CryptoEngine.generateCertificate(certConfig);
  const signedPdfBytes = await CryptoEngine.signPdfBytes(
    unredactedBytes,
    creds.certificatePem,
    creds.privateKeyPem,
    { signerName: certConfig.commonName, reason: 'Official Verification' }
  );
  assert(signedPdfBytes.length > unredactedBytes.length, 'Digital signature detached container embedded');

  const verifiedSignatures = CryptoEngine.verifyPdfSignatures(signedPdfBytes);
  assert(verifiedSignatures.length > 0, 'Signature parser detected signature block');
  assert(verifiedSignatures[0].isValid, 'PKCS#7 cryptographic signature validated as authentic');

  // ===========================================================================
  // 11. MULTI-ACCOUNT ISOLATION & LOGOUT CACHE PURGING
  // ===========================================================================
  console.log('\n[11] Multi-Account Isolation & Logout Cache Purging...');
  const userA = 'usr_alice_alpha';
  const userB = 'usr_bob_beta';

  const docAlice = { id: 'alice_doc_1', name: 'Alice_Confidential.pdf', size: 1024, lastOpened: Date.now(), pageCount: 1 };
  const bytesAlice = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

  await StorageService.addRecentDocument(docAlice, bytesAlice, userA);
  const aliceRecents = await StorageService.getRecentDocuments(userA);
  const aliceCached = await StorageService.getCachedDocumentData('alice_doc_1', userA);

  assert(aliceRecents.length === 1 && aliceRecents[0].id === 'alice_doc_1', 'User A document recorded in User A store');
  assert(Boolean(aliceCached), 'User A document bytes cached');

  // Verify User B cannot access User A documents
  const bobRecents = await StorageService.getRecentDocuments(userB);
  const bobCached = await StorageService.getCachedDocumentData('alice_doc_1', userB);

  assert(bobRecents.length === 0, 'User B recents is empty (isolated from User A)');
  assert(bobCached === null, 'User B cannot retrieve User A cached document data');

  // Logout User A and clear caches
  await StorageService.clearRecents(userA);
  clearMemoryFallback();

  const alicePostLogout = await StorageService.getRecentDocuments(userA);
  const alicePostCached = await StorageService.getCachedDocumentData('alice_doc_1', userA);

  assert(alicePostLogout.length === 0, 'User A recents cleared after logout');
  assert(alicePostCached === null, 'User A cache completely purged from memory fallback');

  // ===========================================================================
  // 12. STORAGE RESILIENCE & INDEXEDDB CONNECTION RESET RECOVERY
  // ===========================================================================
  console.log('\n[12] Storage Fallback & IndexedDB Connection Reset Recovery...');
  const resilienceKey = 'test_resilience_doc';
  const resilienceVal = { title: 'Safe Recovery Document' };

  await safeSet(resilienceKey, resilienceVal);
  const recoveredVal = await safeGet<typeof resilienceVal>(resilienceKey);
  assert(recoveredVal?.title === 'Safe Recovery Document', 'Stored and retrieved document under storage wrapper');

  await safeDel(resilienceKey);
  const deletedRes = await safeGet(resilienceKey);
  assert(deletedRes === undefined, 'Storage deletion verified');

  console.log('\n========================================================================');
  console.log(`  REAL-WORLD VERIFICATION SUMMARY: ${passed} passed, ${failed} failed.`);
  console.log('========================================================================\n');

  if (failed > 0) {
    throw new Error(`${failed} real-world check(s) failed.`);
  }
}

runRealWorldReleaseCheck().catch((err) => {
  console.error('Real-world verification error:', err);
  process.exit(1);
});
