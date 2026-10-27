import fs from 'fs';
import path from 'path';
import { PDFDocument, PDFName, PDFString, StandardFonts } from 'pdf-lib';
import { PdfEngine } from '../src/services/pdfEngine';
import { PdfAProfile, PdfAValidationReport } from '../src/types';

console.log('================================================================');
console.log('  HHM PDF QA — PDF/A ARCHIVAL VALIDATION & EXPORT AUDIT');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    failed++;
  }
}

async function runPdfaTests() {
  const fixturesDir = path.resolve(process.cwd(), 'tests/fixtures');

  // -------------------------------------------------------------
  // [1] Clean Base Document Generation & PDF/A Export
  // -------------------------------------------------------------
  console.log('--- [1] Compliant PDF/A-1b and PDF/A-2b Export & Validation ---');

  // Create clean base document
  const baseDoc = await PDFDocument.create();
  baseDoc.setTitle('Contract Archival Copy');
  baseDoc.setAuthor('Enterprise Legal Dept');
  baseDoc.setSubject('Official Master Service Agreement');
  baseDoc.setKeywords(['contract', 'legal', 'archive']);
  baseDoc.addPage([595.28, 841.89]); // A4
  const basePdfBytes = await baseDoc.save();

  // Export to PDF/A-1b
  const export1b = await PdfEngine.exportToPdfA(basePdfBytes, 'PDF/A-1b', {
    title: 'Contract Archival Copy',
    author: 'Enterprise Legal Dept',
    subject: 'Official Master Service Agreement',
    keywords: 'contract, legal, archive',
  });

  assert(export1b.pdfBytes.length > basePdfBytes.length, 'PDF/A-1b output payload generated');
  const str1b = new TextDecoder('latin1').decode(export1b.pdfBytes);

  assert(str1b.includes('xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"'), 'PDF/A-1b includes pdfaid identification schema');
  assert(str1b.includes('<pdfaid:part>1</pdfaid:part>'), 'PDF/A-1b part matches 1');
  assert(str1b.includes('<pdfaid:conformance>B</pdfaid:conformance>'), 'PDF/A-1b conformance matches B');
  assert(str1b.includes('/OutputIntents'), 'Document Catalog contains /OutputIntents array');
  assert(str1b.includes('/GTS_PDFA1'), 'OutputIntent specifies GTS_PDFA1 subtype');
  assert(str1b.includes('sRGB IEC61966-2.1'), 'OutputIntent includes standard sRGB condition identifier');
  assert(!str1b.includes('/Encrypt'), 'Strictly no /Encrypt dictionary in PDF/A-1b');

  // Validate the exported PDF/A-1b
  const report1b: PdfAValidationReport = await PdfEngine.validatePdfA(export1b.pdfBytes, 'PDF/A-1b');
  assert(report1b.profile === 'PDF/A-1b', 'Report profile identified as PDF/A-1b');
  assert(
    report1b.status === 'validated_compliant' || report1b.status === 'validation_warnings',
    `PDF/A-1b preflight status is acceptable (${report1b.status})`
  );
  assert(
    report1b.checks.some((c) => c.id === 'pdfa_encryption' && c.status === 'pass'),
    'Encryption check passes'
  );
  assert(
    report1b.checks.some((c) => c.id === 'pdfa_id_schema' && c.status === 'pass'),
    'PDF/A-1b identification schema check passes'
  );
  assert(
    report1b.checks.some((c) => c.id === 'pdfa_output_intent' && c.status === 'pass'),
    'OutputIntent device-independent color check passes'
  );

  // Export to PDF/A-2b
  const export2b = await PdfEngine.exportToPdfA(basePdfBytes, 'PDF/A-2b', {
    title: 'Technical Specifications',
    author: 'Engineering Directorate',
  });
  const str2b = new TextDecoder('latin1').decode(export2b.pdfBytes);
  assert(str2b.includes('<pdfaid:part>2</pdfaid:part>'), 'PDF/A-2b part matches 2');
  assert(str2b.includes('/GTS_PDFA2'), 'PDF/A-2b OutputIntent specifies GTS_PDFA2');

  const report2b: PdfAValidationReport = await PdfEngine.validatePdfA(export2b.pdfBytes, 'PDF/A-2b');
  assert(report2b.profile === 'PDF/A-2b', 'Report profile identified as PDF/A-2b');
  assert(
    report2b.checks.some((c) => c.id === 'pdfa_id_schema' && c.status === 'pass'),
    'PDF/A-2b identification schema check passes'
  );

  // -------------------------------------------------------------
  // [2] Validation Warnings Scenario
  // -------------------------------------------------------------
  console.log('\n--- [2] Validation Warnings Scenario (Missing Title / Language) ---');

  // Create document with empty title and missing language
  const warnDoc = await PDFDocument.create();
  warnDoc.setTitle(''); // Empty title
  warnDoc.addPage();
  const warnBytes = await warnDoc.save();

  // Validate raw doc without language tag
  const rawWarnReport = await PdfEngine.validatePdfA(warnBytes, 'PDF/A-1b');
  assert(
    rawWarnReport.checks.some((c) => c.id === 'pdfa_language_tag' && c.status === 'warn'),
    'Missing document language tag (/Lang) reported as advisory warning'
  );

  // Export to PDF/A but with empty title
  const warnExport = await PdfEngine.exportToPdfA(warnBytes, 'PDF/A-1b', {
    title: '',
  });
  const warnReport = await PdfEngine.validatePdfA(warnExport.pdfBytes, 'PDF/A-1b');

  assert(
    warnReport.status === 'validation_warnings' || warnReport.status === 'validated_compliant',
    'Advisory metadata warning correctly flagged'
  );
  const titleCheck = warnReport.checks.find((c) => c.id === 'pdfa_title_metadata');
  assert(titleCheck !== undefined && titleCheck.status === 'warn', 'Title check reported as advisory warning when empty');

  // -------------------------------------------------------------
  // [3] Non-Compliant Scenarios (Encryption, Scripts, Transparency)
  // -------------------------------------------------------------
  console.log('\n--- [3] Non-Compliant Scenarios & Rejection Verification ---');

  // 3.1 Encryption Rejection: Encrypted PDF must fail validation and export
  const encFixturePath = path.join(fixturesDir, '09_encrypted_password.pdf');
  if (fs.existsSync(encFixturePath)) {
    const encBytes = fs.readFileSync(encFixturePath);
    const encReport = await PdfEngine.validatePdfA(encBytes, 'PDF/A-1b');
    assert(
      encReport.status === 'non_compliant',
      'Encrypted PDF correctly classified as non_compliant'
    );
    assert(
      encReport.checks.some((c) => c.id === 'pdfa_encryption' && c.status === 'fail'),
      'ISO 19005 encryption prohibition check fails on encrypted PDF'
    );

    // Attempting export on encrypted PDF must throw an explicit error
    let threwEncError = false;
    try {
      await PdfEngine.exportToPdfA(encBytes, 'PDF/A-1b');
    } catch (e: any) {
      threwEncError = true;
      assert(
        e.message.includes('Encrypted PDFs cannot be exported'),
        'exportToPdfA rejected encrypted PDF with clear error message'
      );
    }
    assert(threwEncError, 'Encrypted PDF export was prevented');
  }

  // 3.2 Executable JavaScript Sanitization
  const jsDoc = await PDFDocument.create();
  jsDoc.addPage();
  // Inject mock JS action in Catalog Names
  const namesDict = jsDoc.context.obj({
    JavaScript: jsDoc.context.obj({
      Names: jsDoc.context.obj([PDFString.of('ExploitScript'), jsDoc.context.obj({ S: PDFName.of('JavaScript') })]),
    }),
  });
  jsDoc.catalog.set(PDFName.of('Names'), jsDoc.context.register(namesDict));
  const rawJsBytes = await jsDoc.save({ useObjectStreams: false });

  const rawJsReport = await PdfEngine.validatePdfA(rawJsBytes, 'PDF/A-1b');
  assert(
    rawJsReport.checks.some((c) => c.id === 'pdfa_no_scripts' && c.status === 'fail'),
    'Executable JavaScript action detected and flagged as violation'
  );

  // Export sanitizes the forbidden script
  const sanitizedExport = await PdfEngine.exportToPdfA(rawJsBytes, 'PDF/A-1b');
  const sanitizedReport = await PdfEngine.validatePdfA(sanitizedExport.pdfBytes, 'PDF/A-1b');
  assert(
    sanitizedReport.checks.some((c) => c.id === 'pdfa_no_scripts' && c.status === 'pass'),
    'exportToPdfA successfully stripped forbidden JavaScript actions'
  );

  // 3.3 Transparency Constraints: PDF/A-1b vs PDF/A-2b
  const transpDoc = await PDFDocument.create();
  const tPage = transpDoc.addPage();
  // Inject transparency group dictionary
  tPage.node.set(
    PDFName.of('Group'),
    transpDoc.context.obj({
      Type: PDFName.of('Group'),
      S: PDFName.of('Transparency'),
      CS: PDFName.of('DeviceRGB'),
    })
  );
  const transpBytes = await transpDoc.save({ useObjectStreams: false });

  // PDF/A-1b strictly prohibits transparency -> Must fail
  const transpReport1b = await PdfEngine.validatePdfA(transpBytes, 'PDF/A-1b');
  assert(
    transpReport1b.checks.some((c) => c.id === 'pdfa_transparency' && c.status === 'fail'),
    'Transparency group flagged as failure under strict PDF/A-1b (ISO 19005-1)'
  );

  // PDF/A-2b permits transparency -> Must pass
  const transpReport2b = await PdfEngine.validatePdfA(transpBytes, 'PDF/A-2b');
  assert(
    transpReport2b.checks.some((c) => c.id === 'pdfa_transparency' && c.status === 'pass'),
    'Transparency group validated and accepted under PDF/A-2b (ISO 19005-2)'
  );

  // 3.4 Non-Embedded Fonts Detection
  const fontDoc = await PDFDocument.create();
  const fPage = fontDoc.addPage();
  const helvetica = await fontDoc.embedFont(StandardFonts.Helvetica);
  fPage.drawText('Standard 14 Font Reference', { font: helvetica, size: 12 });
  const fontBytes = await fontDoc.save({ useObjectStreams: false });

  const fontReport = await PdfEngine.validatePdfA(fontBytes, 'PDF/A-1b');
  assert(
    fontReport.fontsDetected.some((f) => f.fontName === 'Helvetica' && !f.isEmbedded),
    'Non-embedded standard Helvetica accurately identified'
  );
  assert(
    fontReport.checks.some((c) => c.id === 'pdfa_font_embedding' && c.status === 'fail'),
    'Non-embedded font correctly causes font embedding failure in PDF/A preflight'
  );

  // -------------------------------------------------------------
  // [4] Unsupported Files & Invalid Corrupt Input
  // -------------------------------------------------------------
  console.log('\n--- [4] Corrupted, Malformed & Empty Inputs ---');

  // 4.1 Empty byte array
  const emptyReport = await PdfEngine.validatePdfA(new Uint8Array(0), 'PDF/A-1b');
  assert(emptyReport.status === 'not_validated', 'Empty bytes return status "not_validated"');
  assert(!emptyReport.isCompliant, 'Empty bytes are marked non-compliant');

  // 4.2 Non-PDF text file
  const textBytes = new TextEncoder().encode('Hello, this is just a plain text file, not a PDF.');
  const textReport = await PdfEngine.validatePdfA(textBytes, 'PDF/A-1b');
  assert(textReport.status === 'not_validated', 'Arbitrary text payload returns "not_validated"');
  assert(
    textReport.checks.some((c) => c.id === 'pdf_validity' && c.status === 'fail'),
    'Invalid magic byte header reported'
  );

  // 4.3 Malformed PDF fixture (Fixture 10)
  const malformedPath = path.join(fixturesDir, '10_malformed.pdf');
  if (fs.existsSync(malformedPath)) {
    const malformedBytes = fs.readFileSync(malformedPath);
    const malReport = await PdfEngine.validatePdfA(malformedBytes, 'PDF/A-1b');
    assert(
      malReport.status === 'not_validated',
      'Malformed PDF fixture handled safely without crash, returning "not_validated"'
    );
  }

  // -------------------------------------------------------------
  // [5] Original Document Preservation & Disclaimer Transparency
  // -------------------------------------------------------------
  console.log('\n--- [5] Original Document Immutability & Regulatory Notice ---');

  const pristineOriginal = new Uint8Array(basePdfBytes);
  await PdfEngine.exportToPdfA(pristineOriginal, 'PDF/A-1b');
  assert(
    pristineOriginal.length === basePdfBytes.length,
    'Original document byte array length preserved exactly'
  );
  let bytesIdentical = true;
  for (let i = 0; i < pristineOriginal.length; i++) {
    if (pristineOriginal[i] !== basePdfBytes[i]) {
      bytesIdentical = false;
      break;
    }
  }
  assert(bytesIdentical, 'Original document bytes remain 100% unaltered after PDF/A export');

  assert(
    report1b.validatorLimitationsNotice.length > 20,
    'Report provides transparent disclosure regarding client-side inspection and external certification tools (e.g. VeraPDF)'
  );

  console.log(`\n================================================================`);
  console.log(`  PDF/A TEST SUITE SUMMARY: ${passed} passed, ${failed} failed.`);
  console.log(`================================================================\n`);

  if (failed > 0) process.exit(1);
}

runPdfaTests().catch((err) => {
  console.error('Fatal error in PDF/A test suite:', err);
  process.exit(1);
});
