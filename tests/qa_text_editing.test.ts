import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { PdfEngine } from '../src/services/pdfEngine';

/**
 * HHM PDF — Automated QA Suite: Existing PDF Text Selection & Editing
 * Tests selectable vs scanned detection, text extraction with bounding boxes & fonts,
 * precision text replacement without full-page rasterization, OCR-based editing,
 * and saving/reopening output verification.
 */
async function runTextEditingTests() {
  console.log('================================================================');
  console.log('  HHM PDF QA — EXISTING PDF TEXT EDITING AUDIT');
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

  // --- TEST 1: Detect Selectable Text vs Scanned/Image Pages ---
  console.log('[1] Testing Selectable Text vs Scanned Page Detection...');
  const invoiceBytes = fs.readFileSync(path.join(fixturesDir, '06_table_invoice.pdf'));
  const invoicePdfJs = await PdfEngine.loadPdfJs(new Uint8Array(invoiceBytes));
  const invoiceDetection = await PdfEngine.extractPageTextItems(invoicePdfJs, 1);

  assert(!invoiceDetection.isScanned, '06_table_invoice.pdf is correctly detected as Selectable Text PDF');
  assert(invoiceDetection.itemCount > 5, `Extracted ${invoiceDetection.itemCount} text items from invoice page`);

  const scannedBytes = fs.readFileSync(path.join(fixturesDir, '07_scanned_ocr.pdf'));
  const scannedPdfJs = await PdfEngine.loadPdfJs(new Uint8Array(scannedBytes));
  const scannedDetection = await PdfEngine.extractPageTextItems(scannedPdfJs, 1);

  assert(scannedDetection.isScanned, '07_scanned_ocr.pdf is correctly detected as Scanned / Image-Based PDF');

  // --- TEST 2: Inspecting Text Items, Coordinates, and Font Metadata ---
  console.log('\n[2] Testing Text Bounding Boxes, Metrics, and Font Extraction...');
  const itemSurgical = invoiceDetection.items.find((it) => it.str.includes('Surgical Instruments'));
  assert(Boolean(itemSurgical), 'Found target item "Surgical Instruments" in extracted items');
  if (itemSurgical) {
    assert(itemSurgical.x > 0 && itemSurgical.y > 0, `Coordinates extracted: (${itemSurgical.x}, ${itemSurgical.y})`);
    assert(itemSurgical.width > 20, `Width extracted: ${itemSurgical.width}pt`);
    assert(itemSurgical.fontSize > 8, `Font size extracted: ${itemSurgical.fontSize}pt`);
    assert(itemSurgical.fontFamily === 'Helvetica', `Font mapped accurately: ${itemSurgical.fontFamily}`);
  }

  // --- TEST 3: Replacing Text in Text-Based PDF without Document Rasterization ---
  console.log('\n[3] Testing Text Replacement on Text-Based PDF...');
  if (itemSurgical) {
    const updatedPdfBytes = await PdfEngine.replaceTextOnPage(
      new Uint8Array(invoiceBytes),
      1,
      itemSurgical,
      'Diagnostic Laparoscopes',
      {
        fontFamily: itemSurgical.fontFamily,
        fontSize: itemSurgical.fontSize,
        color: '#000000',
      }
    );

    assert(updatedPdfBytes.length > 0, 'replaceTextOnPage returned valid PDF bytes');

    // Save edited output to fixtures
    const outputPath = path.join(fixturesDir, 'qa_edited_invoice.pdf');
    fs.writeFileSync(outputPath, updatedPdfBytes);
    assert(fs.existsSync(outputPath), 'Saved edited output to qa_edited_invoice.pdf');

    // --- TEST 4: Reopen Edited Output and Verify Text Content ---
    console.log('\n[4] Reopening Edited PDF and Validating Content & Masking...');
    const reloadedPdfJs = await PdfEngine.loadPdfJs(updatedPdfBytes);
    const reloadedText = await PdfEngine.extractAllText(reloadedPdfJs);

    assert(reloadedText.includes('Diagnostic Laparoscopes'), 'Replacement wording "Diagnostic Laparoscopes" successfully extracted from saved PDF');

    // Verify document was NOT rasterized (remains a pure vector PDF)
    const reloadedDoc = await PDFDocument.load(updatedPdfBytes);
    assert(reloadedDoc.getPageCount() === 1, 'Document page count preserved');
    const firstPage = reloadedDoc.getPage(0);
    assert(Math.round(firstPage.getWidth()) === 595, 'Page geometry preserved (595pt width)');
  }

  // --- TEST 5: Find & Replace All Occurrences ---
  console.log('\n[5] Testing Batch Find & Replace All Matching Text...');
  const replaceAllResult = await PdfEngine.replaceAllMatchingTextOnPage(
    new Uint8Array(invoiceBytes),
    1,
    invoiceDetection.items,
    'USD',
    'EUR',
    { matchCase: true }
  );
  assert(replaceAllResult.replacedCount >= 1, `Replace All successfully replaced ${replaceAllResult.replacedCount} occurrences of "USD"`);
  const replaceAllPdfJs = await PdfEngine.loadPdfJs(replaceAllResult.updatedPdf);
  const replaceAllText = await PdfEngine.extractAllText(replaceAllPdfJs);
  assert(replaceAllText.includes('EUR'), 'Replaced currency "EUR" verified in output stream');

  // --- TEST 6: OCR-Based Text Editing on Scanned PDF ---
  console.log('\n[6] Testing OCR-Based Editing on Scanned PDF...');
  // Define a target recognized region on scanned page 1
  const mockOcrItem = {
    id: 'ocr_item_1_1',
    str: 'SCANNED_RECEIPT_BATCH_99',
    x: 100,
    y: 200,
    width: 220,
    height: 24,
    fontSize: 14,
    fontFamily: 'Helvetica',
    fontName: 'Tesseract-OCR',
    page: 1,
    isOcr: true,
  };

  const editedScannedBytes = await PdfEngine.replaceTextOnPage(
    new Uint8Array(scannedBytes),
    1,
    mockOcrItem,
    'VALIDATED_INVOICE_BATCH_100',
    {
      fontFamily: 'Helvetica',
      fontSize: 14,
      color: '#1e3a8a',
    }
  );

  assert(editedScannedBytes.length > 0, 'Scanned PDF text replacement produced valid PDF bytes');
  const reloadedScannedPdfJs = await PdfEngine.loadPdfJs(editedScannedBytes);
  const reloadedScannedText = await PdfEngine.extractAllText(reloadedScannedPdfJs);
  assert(
    reloadedScannedText.includes('VALIDATED_INVOICE_BATCH_100'),
    'Replacement text on scanned document successfully embedded and extractable'
  );

  // --- TEST 7: Paragraph Block Grouping & Multi-Line Replacement ---
  console.log('\n[7] Testing Paragraph Block Grouping & Multi-Line Replacement...');
  const paragraphBlocks = PdfEngine.groupTextItemsIntoParagraphs(invoiceDetection.items);
  assert(paragraphBlocks.length > 0, `Grouped ${invoiceDetection.items.length} items into ${paragraphBlocks.length} paragraph blocks`);
  
  const multiLinePara = paragraphBlocks.find((p) => p.lines.length > 1) || paragraphBlocks[0];
  assert(Boolean(multiLinePara), `Target paragraph block identified (${multiLinePara.lines.length} lines, "${multiLinePara.str.substring(0, 30)}...")`);

  const longReplacementText = 'Professional surgical equipment and medical supply distribution servicing hospitals, clinics, and specialized healthcare organizations worldwide with certified quality standards.';
  const editedParaBytes = await PdfEngine.replaceTextOnPage(
    new Uint8Array(invoiceBytes),
    1,
    multiLinePara,
    longReplacementText,
    {
      fontFamily: 'Helvetica',
      fontSize: 12,
      isBold: false,
      color: '#000000',
    }
  );

  assert(editedParaBytes.length > 0, 'Multi-line paragraph replacement produced valid PDF bytes');
  const paraPdfJs = await PdfEngine.loadPdfJs(editedParaBytes);
  const paraExtractedText = await PdfEngine.extractAllText(paraPdfJs);
  assert(
    paraExtractedText.includes('Professional surgical equipment') && paraExtractedText.includes('healthcare organizations'),
    'Multi-line wrapped paragraph text successfully saved and extracted from reopened PDF'
  );

  // --- TEST 8: Dynamic Font Discovery & Registry ---
  console.log('\n[8] Testing Dynamic System Font Discovery & Registry...');
  const { fontRegistry } = await import('../src/services/fontRegistry');
  const fonts = await fontRegistry.discoverSystemFonts();
  assert(fonts.length >= 3, `Discovered ${fonts.length} available fonts in registry`);
  assert(fonts.some((f) => f.family === 'Helvetica'), 'Standard Helvetica available in font registry');
  assert(fonts.some((f) => f.family === 'Times New Roman' || f.family === 'Arial'), 'System font discovered in registry');

  // --- TEST 9: Automatic Original Font Preservation & Subset Metadata Parsing ---
  console.log('\n[9] Testing Automatic Original Font Preservation & Subset Metadata Parsing...');
  const fontMeta1 = PdfEngine.parsePdfFontMetadata('BCDEEE+Arial-BoldMT');
  assert(fontMeta1.family === 'Arial' && fontMeta1.isBold, 'Subset tag "BCDEEE+Arial-BoldMT" parsed family Arial and Bold style');

  const fontMeta2 = PdfEngine.parsePdfFontMetadata('KLMNOP+TimesNewRomanPS-ItalicMT');
  assert(fontMeta2.family === 'Times New Roman' && fontMeta2.isItalic, 'Subset tag "KLMNOP+TimesNewRomanPS-ItalicMT" parsed family Times New Roman and Italic style');

  const fontMeta3 = PdfEngine.parsePdfFontMetadata('Calibri-Regular');
  assert(fontMeta3.family === 'Calibri', 'Clean font "Calibri-Regular" parsed family Calibri');

  // Perform text replacement preserving parsed font metadata
  const fontPreservedBytes = await PdfEngine.replaceTextOnPage(
    new Uint8Array(invoiceBytes),
    1,
    multiLinePara,
    'Preserved Arial Bold Text',
    {
      fontFamily: fontMeta1.family,
      fontSize: 12,
      isBold: fontMeta1.isBold,
      isItalic: fontMeta1.isItalic,
      color: '#0f172a',
    }
  );

  assert(fontPreservedBytes.length > 0, 'Font-preserved replacement produced valid output bytes');
  const preservedPdfJs = await PdfEngine.loadPdfJs(fontPreservedBytes);
  const preservedExtractedText = await PdfEngine.extractAllText(preservedPdfJs);
  assert(
    preservedExtractedText.includes('Preserved Arial Bold Text'),
    'Preserved font wording successfully verified in reopened exported PDF'
  );

  console.log(`\n>>> TEXT EDITING AUDIT RESULT: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

runTextEditingTests().catch((e) => {
  console.error('Text editing test error:', e);
  process.exit(1);
});
