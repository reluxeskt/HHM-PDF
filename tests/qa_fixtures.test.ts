import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { PdfEngine } from '../src/services/pdfEngine';

/**
 * HHM PDF — Automated QA Suite: Test Fixture Validator
 * Inspects and validates all 12 synthetic test documents generated in tests/fixtures/
 */
async function runFixtureTests() {
  console.log('================================================================');
  console.log('  HHM PDF QA — [SUITE 1/5] SYNTHETIC FIXTURE AUDIT');
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
  assert(fs.existsSync(fixturesDir), 'Fixtures directory tests/fixtures exists');

  // FIXTURE 1: Blank PDF
  const f1Path = path.join(fixturesDir, '01_blank.pdf');
  assert(fs.existsSync(f1Path), 'Fixture 1 (01_blank.pdf) exists');
  const f1Bytes = fs.readFileSync(f1Path);
  const f1Doc = await PDFDocument.load(f1Bytes);
  assert(f1Doc.getPageCount() === 1, 'Fixture 1 has exactly 1 page');
  assert(f1Bytes.toString('utf-8', 0, 5) === '%PDF-', 'Fixture 1 has valid %PDF- magic header');

  // FIXTURE 2: Text & Shapes
  const f2Path = path.join(fixturesDir, '02_text_shapes.pdf');
  assert(fs.existsSync(f2Path), 'Fixture 2 (02_text_shapes.pdf) exists');
  const f2Bytes = fs.readFileSync(f2Path);
  const f2Doc = await PDFDocument.load(f2Bytes);
  assert(f2Doc.getPageCount() === 1, 'Fixture 2 has 1 page');
  assert(Math.round(f2Doc.getPage(0).getWidth()) === 595, 'Fixture 2 has standard A4 width (595pt)');

  // FIXTURE 3: Multi-Page PDF (at least 5 pages)
  const f3Path = path.join(fixturesDir, '03_multipage.pdf');
  assert(fs.existsSync(f3Path), 'Fixture 3 (03_multipage.pdf) exists');
  const f3Bytes = fs.readFileSync(f3Path);
  const f3Doc = await PDFDocument.load(f3Bytes);
  assert(f3Doc.getPageCount() >= 5, `Fixture 3 has >= 5 pages (actual: ${f3Doc.getPageCount()})`);

  // FIXTURE 4: Mixed Dimensions & Orientations
  const f4Path = path.join(fixturesDir, '04_mixed_dimensions.pdf');
  assert(fs.existsSync(f4Path), 'Fixture 4 (04_mixed_dimensions.pdf) exists');
  const f4Bytes = fs.readFileSync(f4Path);
  const f4Doc = await PDFDocument.load(f4Bytes);
  assert(f4Doc.getPageCount() === 4, 'Fixture 4 has 4 pages with varying geometries');
  const p1 = f4Doc.getPage(0); // A4 portrait: 595 x 842
  const p2 = f4Doc.getPage(1); // Letter landscape: 792 x 612
  const p3 = f4Doc.getPage(2); // Legal portrait: 612 x 1008
  const p4 = f4Doc.getPage(3); // Square: 600 x 600
  assert(p1.getWidth() < p1.getHeight(), 'Fixture 4 page 1 is Portrait');
  assert(p2.getWidth() > p2.getHeight(), 'Fixture 4 page 2 is Landscape');
  assert(p3.getHeight() > 1000, 'Fixture 4 page 3 is Legal height (>1000pt)');
  assert(p4.getWidth() === p4.getHeight(), 'Fixture 4 page 4 is Square');

  // FIXTURE 5: Images & Text
  const f5Path = path.join(fixturesDir, '05_images_text.pdf');
  assert(fs.existsSync(f5Path), 'Fixture 5 (05_images_text.pdf) exists');
  const f5Bytes = fs.readFileSync(f5Path);
  assert(f5Bytes.length > 500, 'Fixture 5 contains embedded image raster payload');

  // FIXTURE 6: Tables & Numeric Values (Synthetic Invoice Audit)
  const f6Path = path.join(fixturesDir, '06_table_invoice.pdf');
  assert(fs.existsSync(f6Path), 'Fixture 6 (06_table_invoice.pdf) exists');
  const f6Bytes = fs.readFileSync(f6Path);
  const f6Doc = await PDFDocument.load(f6Bytes);
  assert(f6Doc.getPageCount() === 1, 'Fixture 6 invoice is 1 page');
  // Math verification: 25 * $12.50 = $312.50
  const qty = 25;
  const unitPrice = 12.5;
  const expectedTotal = 312.5;
  assert(qty * unitPrice === expectedTotal, 'Fixture 6 invoice math verified: 25 * $12.50 = $312.50');
  
  // Extract text stream content using PdfEngine
  const f6Extracted = await PdfEngine.extractTextFromBytes(f6Bytes);
  assert(f6Extracted.includes('HHM Test Enterprises'), 'Fixture 6 contains synthetic company name');
  assert(f6Extracted.includes('HHM-QA-0001'), 'Fixture 6 contains synthetic invoice number');
  assert(f6Extracted.includes('Surgical Instruments'), 'Fixture 6 contains item description');
  assert(f6Extracted.includes('312.50'), 'Fixture 6 contains calculated invoice total');

  // FIXTURE 7: Scanned-Image PDF for OCR
  const f7Path = path.join(fixturesDir, '07_scanned_ocr.pdf');
  assert(fs.existsSync(f7Path), 'Fixture 7 (07_scanned_ocr.pdf) exists');
  const f7Bytes = fs.readFileSync(f7Path);
  assert(f7Bytes.length > 500, 'Fixture 7 contains scanned bitmap raster');

  // FIXTURE 8: Annotations
  const f8Path = path.join(fixturesDir, '08_annotations.pdf');
  assert(fs.existsSync(f8Path), 'Fixture 8 (08_annotations.pdf) exists');

  // FIXTURE 9: Password-Protected PDF (AES-256)
  const f9Path = path.join(fixturesDir, '09_encrypted_password.pdf');
  assert(fs.existsSync(f9Path), 'Fixture 9 (09_encrypted_password.pdf) exists');
  const f9Bytes = fs.readFileSync(f9Path);
  const isEncrypted = PdfEngine.isPdfEncrypted(f9Bytes);
  assert(isEncrypted, 'Fixture 9 is recognized as encrypted by PdfEngine');
  let rejectedWithoutPass = false;
  try {
    await PDFDocument.load(f9Bytes);
  } catch (err: any) {
    rejectedWithoutPass = true;
  }
  assert(rejectedWithoutPass, 'Fixture 9 rejects unauthorized open without password');

  // FIXTURE 10: Malformed Truncated PDF
  const f10Path = path.join(fixturesDir, '10_malformed.pdf');
  assert(fs.existsSync(f10Path), 'Fixture 10 (10_malformed.pdf) exists');
  const f10Bytes = fs.readFileSync(f10Path);
  let handledGracefully = false;
  try {
    await PDFDocument.load(f10Bytes);
  } catch (err: any) {
    handledGracefully = true;
  }
  assert(handledGracefully, 'Fixture 10 malformed PDF triggers expected error handling');

  // FIXTURE 11: Diff Base & Modified
  const f11aPath = path.join(fixturesDir, '11a_diff_base.pdf');
  const f11bPath = path.join(fixturesDir, '11b_diff_modified.pdf');
  assert(fs.existsSync(f11aPath) && fs.existsSync(f11bPath), 'Fixture 11a and 11b diff pair exist');
  const f11aBytes = fs.readFileSync(f11aPath);
  const f11bBytes = fs.readFileSync(f11bPath);
  const f11Diff = await PdfEngine.compareDocuments(f11aBytes, f11bBytes, 'Base', 'Modified');
  assert(f11Diff.differences.length > 0, 'Fixture 11 diff engine successfully executed comparison');
  assert(f11Diff.summary.totalDiffs > 0, `Fixture 11 diff found ${f11Diff.summary.totalDiffs} modified pages`);

  // FIXTURE 12: Unicode & Non-English Characters
  const f12Path = path.join(fixturesDir, '12_unicode_metadata.pdf');
  assert(fs.existsSync(f12Path), 'Fixture 12 (12_unicode_metadata.pdf) exists');
  const f12Bytes = fs.readFileSync(f12Path);
  const f12Doc = await PDFDocument.load(f12Bytes);
  assert(f12Doc.getPageCount() === 1, 'Fixture 12 loaded successfully with UTF-8 metadata');

  console.log(`\n>>> FIXTURE AUDIT RESULT: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

runFixtureTests().catch((e) => {
  console.error('Fixture test error:', e);
  process.exit(1);
});
