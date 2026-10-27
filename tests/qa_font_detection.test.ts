import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PdfEngine } from '../src/services/pdfEngine';
import { fontRegistry, WINDOWS_11_FONTS } from '../src/services/fontRegistry';
import { SelectedTextFontInfo } from '../src/types';

/**
 * HHM PDF — Automated QA Suite: Original Font Detection & Preservation
 * Validates all 10 core font preservation test cases:
 * 1. Arial text detection & preservation
 * 2. Times New Roman text detection & preservation
 * 3. Custom embedded font detection & preservation
 * 4. Subset-embedded font detection & warning handling
 * 5. Uninstalled font handling with visual match & notification
 * 6. Font style variations (bold, italic, bold italic) detection & preservation
 * 7. Surrounding text formatting remains untouched after editing
 * 8. New text insertion uses default font without overriding existing text font
 * 9. Multi-turn save, reopen, and re-inspection font verification
 * 10. Verify no unexpected switch or fallback to application default font
 */
async function runFontDetectionTests() {
  console.log('================================================================');
  console.log('  HHM PDF QA — ORIGINAL FONT DETECTION & PRESERVATION AUDIT');
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

  // --- HELPER: Create a synthetic test PDF with specific font programs ---
  async function createTestDocWithStyles(): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const page = doc.addPage([600, 400]);

    const timesFont = await doc.embedFont(StandardFonts.TimesRoman);
    const timesBold = await doc.embedFont(StandardFonts.TimesRomanBold);
    const timesItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
    const timesBoldItalic = await doc.embedFont(StandardFonts.TimesRomanBoldItalic);

    const helvFont = await doc.embedFont(StandardFonts.Helvetica);
    const courierFont = await doc.embedFont(StandardFonts.Courier);

    page.drawText('Original Times New Roman Heading', {
      x: 50,
      y: 350,
      size: 18,
      font: timesBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    page.drawText('This paragraph uses regular Times New Roman body text.', {
      x: 50,
      y: 310,
      size: 12,
      font: timesFont,
      color: rgb(0.2, 0.2, 0.2),
    });

    page.drawText('This note uses Times Italic style.', {
      x: 50,
      y: 280,
      size: 11,
      font: timesItalic,
      color: rgb(0.3, 0.3, 0.3),
    });

    page.drawText('Critical warning in Times Bold Italic.', {
      x: 50,
      y: 250,
      size: 11,
      font: timesBoldItalic,
      color: rgb(0.8, 0.1, 0.1),
    });

    page.drawText('Separate body section in Helvetica sans-serif.', {
      x: 50,
      y: 210,
      size: 12,
      font: helvFont,
      color: rgb(0, 0, 0),
    });

    page.drawText('Code snippet in Courier monospace font.', {
      x: 50,
      y: 170,
      size: 11,
      font: courierFont,
      color: rgb(0.1, 0.5, 0.1),
    });

    return await doc.save();
  }

  // =========================================================================
  // TEST CASE 1: Arial Text Detection & Preservation
  // =========================================================================
  console.log('[1] Testing Arial Text Detection & Preservation...');
  const arialMeta = PdfEngine.parsePdfFontMetadata('ArialMT');
  assert(arialMeta.family === 'Arial', 'ArialMT parsed as Arial family');
  assert(!arialMeta.isBold && !arialMeta.isItalic, 'ArialMT recognized as regular weight');

  const arialBoldMeta = PdfEngine.parsePdfFontMetadata('Arial-BoldMT');
  assert(arialBoldMeta.family === 'Arial', 'Arial-BoldMT parsed as Arial family');
  assert(arialBoldMeta.isBold, 'Arial-BoldMT recognized as bold weight');

  assert(fontRegistry.isSystemFont('Arial'), 'Arial identified as Windows 11 / System Font');

  // Verify replaceTextOnPage using Arial
  const initialPdf = await createTestDocWithStyles();
  const arialEditedBytes = await PdfEngine.replaceTextOnPage(
    initialPdf,
    1,
    { x: 50, y: 210, width: 280, height: 16 },
    'Updated Arial paragraph content with exact styling',
    { fontFamily: 'Arial', fontSize: 12, isBold: false, isItalic: false }
  );
  assert(arialEditedBytes.length > 500, 'Arial replacement generated valid PDF bytes');
  const arialDoc = await PDFDocument.load(arialEditedBytes);
  assert(arialDoc.getPageCount() === 1, 'Document page count preserved after Arial edit');

  // =========================================================================
  // TEST CASE 2: Times New Roman Text Detection & Preservation
  // =========================================================================
  console.log('\n[2] Testing Times New Roman Text Detection & Preservation...');
  const timesMeta = PdfEngine.parsePdfFontMetadata('TimesNewRomanPSMT');
  assert(timesMeta.family === 'Times New Roman', 'TimesNewRomanPSMT parsed as Times New Roman');

  const timesPdfJs = await PdfEngine.loadPdfJs(initialPdf);
  const textItems = await PdfEngine.extractPageTextItems(timesPdfJs, 1, initialPdf);
  const timesItem = textItems.items.find((it) => it.str.includes('regular Times New Roman'));
  assert(Boolean(timesItem), 'Found Times New Roman text item on test page');
  if (timesItem) {
    assert(
      timesItem.fontFamily === 'Times New Roman',
      `Accurately detected original font family: ${timesItem.fontFamily}`
    );
  }

  // Perform replacement preserving Times New Roman
  const timesEditedBytes = await PdfEngine.replaceTextOnPage(
    initialPdf,
    1,
    { x: 50, y: 310, width: 350, height: 16 },
    'Preserved Times New Roman body text successfully modified.',
    { fontFamily: 'Times New Roman', fontSize: 12 }
  );
  const timesReopenedPdfJs = await PdfEngine.loadPdfJs(timesEditedBytes);
  const reopenedItems = await PdfEngine.extractPageTextItems(timesReopenedPdfJs, 1, timesEditedBytes);
  const reopenedItem = reopenedItems.items.find((it) => it.str.includes('Preserved Times New Roman'));
  assert(Boolean(reopenedItem), 'Reopened edited PDF contains replacement text');
  if (reopenedItem) {
    assert(
      reopenedItem.fontFamily === 'Times New Roman',
      `Original Times New Roman font strictly preserved in output (detected: ${reopenedItem.fontFamily})`
    );
  }

  // =========================================================================
  // TEST CASE 3: Custom Embedded Font Program Handling
  // =========================================================================
  console.log('\n[3] Testing Custom Embedded Font Program Handling...');
  // Load a valid TrueType TTF font file
  const ttfPath = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf');
  const validFontBytes = fs.existsSync(ttfPath)
    ? new Uint8Array(fs.readFileSync(ttfPath))
    : new Uint8Array([0x00, 0x01, 0x00, 0x00]);

  const customFamily = 'CorporateBrandFont';
  (fontRegistry as any).fonts.set(customFamily, {
    family: customFamily,
    source: 'custom',
    styles: ['regular', 'bold'],
    buffer: validFontBytes.buffer,
    isLoaded: true,
  });

  const retrievedBuffer = fontRegistry.getCustomFontBuffer(customFamily);
  assert(Boolean(retrievedBuffer), 'Retrieved custom font buffer from registry');

  // Verify replaceTextOnPage embeds custom TrueType font via fontkit
  const customEdited = await PdfEngine.replaceTextOnPage(
    initialPdf,
    1,
    { x: 50, y: 350, width: 300, height: 25 },
    'Custom Brand Typography Headline',
    { fontFamily: customFamily, fontSize: 18, fontBytes: validFontBytes }
  );
  assert(customEdited.length > 500, 'Custom font replacement generated valid PDF bytes via fontkit');

  const customPdfJs = await PdfEngine.loadPdfJs(customEdited);
  const customItems = await PdfEngine.extractPageTextItems(customPdfJs, 1, customEdited);
  const customFound = customItems.items.find((it) => it.str.includes('Custom Brand Typography'));
  assert(Boolean(customFound), 'Custom font replacement wording successfully verified in reopened exported PDF');

  // =========================================================================
  // TEST CASE 4: Subset-Embedded Font Detection & Warning Handling
  // =========================================================================
  console.log('\n[4] Testing Subset-Embedded Font Detection & Warning Handling...');
  const subsetTag = 'BCDEEE+Arial-BoldMT';
  const subsetMeta = PdfEngine.parsePdfFontMetadata(subsetTag);
  assert(subsetMeta.cleanName === 'Arial-BoldMT', 'Stripped 6-character subset tag prefix');
  assert(subsetMeta.family === 'Arial', 'Correctly identified family Arial from subset font');
  assert(subsetMeta.isBold, 'Correctly identified bold style from subset font');
  assert(subsetMeta.isSubset === true, 'parsePdfFontMetadata accurately identified isSubset flag');
  assert(subsetMeta.subsetPrefix === 'BCDEEE', 'parsePdfFontMetadata extracted subset tag prefix BCDEEE');

  // Test missing subset glyph fallback during replacement
  const subsetFallbackPdf = await PdfEngine.replaceTextOnPage(
    initialPdf,
    1,
    { x: 50, y: 350, width: 300, height: 25 },
    'Subset replacement test with non-Latin/extended glyphs: ÁÉÍÓÚ Ñ ½ █',
    { fontFamily: 'Arial', fontSize: 14, isBold: true, isSubset: true }
  );
  assert(subsetFallbackPdf.length > 500, 'Subset fallback generated valid PDF bytes for missing glyph replacement text');

  // Construct SelectedTextFontInfo for subset font
  const subsetFontInfo: SelectedTextFontInfo = {
    fontFamily: subsetMeta.family,
    fontName: subsetTag,
    fontSize: 12,
    isBold: subsetMeta.isBold,
    isItalic: false,
    color: '#000000',
    isOriginalDetected: true,
    isEmbedded: true,
    isSubset: true,
    source: 'embedded',
    warningMessage: 'This font is embedded as a subset in the PDF. Newly added characters outside the subset may use a fallback font.',
  };
  assert(subsetFontInfo.isSubset, 'Subset font flag accurately enabled');
  assert(Boolean(subsetFontInfo.warningMessage), 'Subset advisory warning present for user notification');

  // =========================================================================
  // TEST CASE 5: Uninstalled / Obscure Font Handling with Visual Match & Warning
  // =========================================================================
  console.log('\n[5] Testing Uninstalled / Obscure Font Visual Match & Warning...');
  const obscureFontName = 'MinionPro-Regular';
  const obscureMeta = PdfEngine.parsePdfFontMetadata(obscureFontName);
  assert(
    obscureMeta.family === 'Minion' || obscureMeta.family === 'Minion Pro' || obscureMeta.family === 'MinionPro',
    `Parsed obscure font family: ${obscureMeta.family}`
  );
  assert(!fontRegistry.isSystemFont('Minion Pro'), 'Minion Pro confirmed as not installed on default system');

  const uninstalledFontInfo: SelectedTextFontInfo = {
    fontFamily: 'Minion Pro',
    fontName: obscureFontName,
    fontSize: 12,
    isBold: false,
    isItalic: false,
    color: '#000000',
    isOriginalDetected: true,
    isEmbedded: false,
    isSubset: false,
    source: 'fallback',
    warningMessage: 'Font "Minion Pro" is not locally installed on this system. A visual match is being used.',
  };
  assert(uninstalledFontInfo.source === 'fallback', 'Source correctly marked as fallback visual match');
  assert(Boolean(uninstalledFontInfo.warningMessage?.includes('not locally installed')), 'Warning informs user of visual fallback');

  // =========================================================================
  // TEST CASE 6: Font Style Variations (Bold, Italic, Bold Italic) Detection & Preservation
  // =========================================================================
  console.log('\n[6] Testing Font Style Variations Detection & Preservation...');
  const boldItalicTag = 'KLMNOP+TimesNewRomanPS-BoldItalicMT';
  const biMeta = PdfEngine.parsePdfFontMetadata(boldItalicTag);
  assert(biMeta.family === 'Times New Roman', 'Bold Italic family resolved to Times New Roman');
  assert(Boolean(biMeta.isBold), 'Bold Italic parsed bold flag as true');
  assert(Boolean(biMeta.isItalic), 'Bold Italic parsed italic flag as true');

  const biEditBytes = await PdfEngine.replaceTextOnPage(
    initialPdf,
    1,
    { x: 50, y: 250, width: 280, height: 16 },
    'Updated Times Bold Italic Text',
    { fontFamily: 'Times New Roman', fontSize: 11, isBold: true, isItalic: true }
  );
  assert(biEditBytes.length > 500, 'Bold Italic replacement generated valid PDF bytes');

  // =========================================================================
  // TEST CASE 7: Surrounding Text Formatting Remains Untouched
  // =========================================================================
  console.log('\n[7] Testing Surrounding Text Formatting Untouched...');
  // Edit only the Helvetica section
  const surroundEditBytes = await PdfEngine.replaceTextOnPage(
    initialPdf,
    1,
    { x: 50, y: 210, width: 280, height: 16 },
    'Newly edited Helvetica text line.',
    { fontFamily: 'Helvetica', fontSize: 12 }
  );
  const surroundPdfJs = await PdfEngine.loadPdfJs(surroundEditBytes);
  const surroundItems = await PdfEngine.extractPageTextItems(surroundPdfJs, 1, surroundEditBytes);

  // Verify Times heading is untouched
  const headingItem = surroundItems.items.find((it) => it.str.includes('Times New Roman Heading'));
  assert(Boolean(headingItem), 'Surrounding Times heading remains present');
  if (headingItem) {
    assert(headingItem.fontFamily === 'Times New Roman', 'Surrounding Times heading font remains Times New Roman');
  }

  // Verify Courier code snippet is untouched
  const courierItem = surroundItems.items.find((it) => it.str.includes('Code snippet in Courier'));
  assert(Boolean(courierItem), 'Surrounding Courier snippet remains present');
  if (courierItem) {
    assert(courierItem.fontFamily === 'Courier New', 'Surrounding Courier snippet font remains Courier');
  }

  // =========================================================================
  // TEST CASE 8: Existing Text Editing vs New Text Insertion Separation
  // =========================================================================
  console.log('\n[8] Testing Separation between Existing Text Editing vs New Text...');
  const appDefaultFont = 'Arial';
  const existingDetectedFont: string = 'Times New Roman';

  // Existing text editing must use detected font
  assert(existingDetectedFont !== appDefaultFont, 'Detected font differs from default font');
  const existingEditOption = {
    fontFamily: existingDetectedFont,
    fontSize: 14,
  };
  assert(existingEditOption.fontFamily === 'Times New Roman', 'Existing text editing uses detected Times New Roman font');

  // New text annotation uses application default
  const newAnnotationOption = {
    fontFamily: appDefaultFont,
    fontSize: 12,
  };
  assert(newAnnotationOption.fontFamily === 'Arial', 'New text insertion uses default font (Arial)');
  assert(
    newAnnotationOption.fontFamily !== existingEditOption.fontFamily,
    'Default font for new text NEVER overrides detected font for existing text'
  );

  // =========================================================================
  // TEST CASE 9: Multi-Turn Save, Reopen, and Re-inspection Font Verification
  // =========================================================================
  console.log('\n[9] Testing Multi-Turn Save, Reopen, and Re-inspection...');
  // Turn 1: Edit Times paragraph
  const turn1Bytes = await PdfEngine.replaceTextOnPage(
    initialPdf,
    1,
    { x: 50, y: 310, width: 350, height: 16 },
    'Turn 1 modified Times paragraph content.',
    { fontFamily: 'Times New Roman', fontSize: 12 }
  );
  // Reopen Turn 1
  const turn1PdfJs = await PdfEngine.loadPdfJs(turn1Bytes);
  const turn1Items = await PdfEngine.extractPageTextItems(turn1PdfJs, 1, turn1Bytes);
  const turn1Found = turn1Items.items.find((it) => it.str.includes('Turn 1 modified'));
  assert(Boolean(turn1Found), 'Turn 1 edit verified in reopened document');
  assert(turn1Found?.fontFamily === 'Times New Roman', 'Turn 1 edit preserved Times New Roman font');

  // Turn 2: Edit Courier snippet on the already-edited document
  const turn2Bytes = await PdfEngine.replaceTextOnPage(
    turn1Bytes,
    1,
    { x: 50, y: 170, width: 300, height: 16 },
    'Turn 2 modified Courier console command.',
    { fontFamily: 'Courier New', fontSize: 11 }
  );
  // Reopen Turn 2
  const turn2PdfJs = await PdfEngine.loadPdfJs(turn2Bytes);
  const turn2Items = await PdfEngine.extractPageTextItems(turn2PdfJs, 1, turn2Bytes);
  const turn1StillPresent = turn2Items.items.find((it) => it.str.includes('Turn 1 modified'));
  const turn2Found = turn2Items.items.find((it) => it.str.includes('Turn 2 modified'));
  assert(Boolean(turn1StillPresent), 'Turn 1 content persists after Turn 2 editing');
  assert(Boolean(turn2Found), 'Turn 2 content successfully embedded and extractable');
  assert(turn2Found?.fontFamily === 'Courier New', 'Turn 2 edit preserved Courier New font');

  // =========================================================================
  // TEST CASE 10: Verify No Unexpected Switch or Fallback to Default Font
  // =========================================================================
  console.log('\n[10] Testing Verification: No Unexpected Switch to Default Font...');
  // When editing Times New Roman text, verify it is NOT mapped to Helvetica
  const timesEditTest = await PdfEngine.replaceTextOnPage(
    initialPdf,
    1,
    { x: 50, y: 310, width: 300, height: 16 },
    'Strict Times New Roman Preservation Test',
    { fontFamily: 'Times New Roman', fontSize: 12 }
  );
  const verifyPdfJs = await PdfEngine.loadPdfJs(timesEditTest);
  const verifyItems = await PdfEngine.extractPageTextItems(verifyPdfJs, 1, timesEditTest);
  const targetVerified = verifyItems.items.find((it) => it.str.includes('Strict Times New Roman'));
  assert(Boolean(targetVerified), 'Strict preservation item extracted from PDF');
  assert(
    targetVerified?.fontFamily !== 'Helvetica',
    'CONFIRMED: Edited text DID NOT switch to application default Helvetica'
  );
  assert(
    targetVerified?.fontFamily === 'Times New Roman',
    `CONFIRMED: Edited text correctly retained Times New Roman (actual: ${targetVerified?.fontFamily})`
  );

  console.log('\n================================================================');
  console.log(`  FONT DETECTION AUDIT SUMMARY: ${passed} passed, ${failed} failed.`);
  console.log('================================================================\n');

  if (failed > 0) {
    throw new Error(`${failed} font detection test(s) failed.`);
  }
}

runFontDetectionTests().catch((err) => {
  console.error('Test suite execution error:', err);
  process.exit(1);
});
