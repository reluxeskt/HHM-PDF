import { PDFDocument } from 'pdf-lib';
import { PdfEngine } from '../src/services/pdfEngine';
import { PdfDocumentState } from '../src/types';

/**
 * Automated test suite for HHM PDF Phase 2 Advanced Operations
 * Can be executed with `npm run test` or `npx tsx tests/pdfEngine.test.ts`
 */
async function runTests() {
  console.log('====================================================');
  console.log('  HHM PDF — Phase 2 Advanced Test Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // TEST 1: Create Blank PDF Document
    console.log('[1] Testing Blank PDF Creation...');
    const blankBytes = await PdfEngine.createBlankPdf('a4', 'portrait', 2);
    const blankDoc = await PDFDocument.load(blankBytes);
    assert(blankDoc.getPageCount() === 2, 'Created document has exactly 2 pages');
    const firstPage = blankDoc.getPage(0);
    assert(Math.round(firstPage.getWidth()) === 595, 'Page width is standard A4 (595 pt)');
    assert(Math.round(firstPage.getHeight()) === 842, 'Page height is standard A4 (842 pt)');

    // TEST 2: Inspect PDF Metadata
    console.log('\n[2] Testing PDF Inspection & Metadata...');
    const { metadata, pages, pageCount } = await PdfEngine.inspectPdf(blankBytes, 'TestDoc.pdf');
    assert(pageCount === 2, 'Inspect returns correct page count');
    assert(pages.length === 2, 'Inspect returns correct page dimensions array');
    assert(metadata.title === 'New Document', 'Default title matches');

    // TEST 3: Combine Multiple PDFs
    console.log('\n[3] Testing PDF Merging / Combining...');
    const doc1Bytes = await PdfEngine.createBlankPdf('letter', 'portrait', 1);
    const doc2Bytes = await PdfEngine.createBlankPdf('letter', 'portrait', 2);
    const mergedBytes = await PdfEngine.combinePdfs([doc1Bytes, doc2Bytes]);
    const mergedDoc = await PDFDocument.load(mergedBytes);
    assert(mergedDoc.getPageCount() === 3, 'Combined PDF contains 1 + 2 = 3 pages');

    // TEST 4: Page Reordering & Rotation
    console.log('\n[4] Testing Page Reordering & Rotation...');
    const reorderedBytes = await PdfEngine.reorderAndModifyPages(
      mergedBytes,
      [2, 0, 1],
      { 0: 90 }
    );
    const reorderedDoc = await PDFDocument.load(reorderedBytes);
    assert(reorderedDoc.getPageCount() === 3, 'Reordered PDF preserves all 3 pages');

    // TEST 5: Page Extraction & Deletion
    console.log('\n[5] Testing Page Extraction & Deletion...');
    const extractedBytes = await PdfEngine.extractPages(mergedBytes, [0, 2]);
    const extractedDoc = await PDFDocument.load(extractedBytes);
    assert(extractedDoc.getPageCount() === 2, 'Extracted document contains exactly 2 selected pages');

    const deletedBytes = await PdfEngine.deletePages(mergedBytes, [1]);
    const deletedDoc = await PDFDocument.load(deletedBytes);
    assert(deletedDoc.getPageCount() === 2, 'Deleted 1 page from 3 pages, resulting in 2 pages');

    // TEST 6: Page Insertion from External PDF
    console.log('\n[6] Testing Page Insertion from External Document...');
    const sourceToInsert = await PdfEngine.createBlankPdf('a4', 'portrait', 2);
    const insertedBytes = await PdfEngine.insertPagesFromOtherPdf(blankBytes, sourceToInsert, 1);
    const insertedDoc = await PDFDocument.load(insertedBytes);
    assert(insertedDoc.getPageCount() === 4, 'Inserted 2 pages into 2-page document (Total: 4 pages)');

    // TEST 7: Page Duplication
    console.log('\n[7] Testing Page Duplication...');
    const duplicatedBytes = await PdfEngine.duplicatePages(blankBytes, [0]);
    const duplicatedDoc = await PDFDocument.load(duplicatedBytes);
    assert(duplicatedDoc.getPageCount() === 3, 'Duplicating 1 page in 2-page document results in 3 pages');

    // TEST 8: Split PDF by Ranges
    console.log('\n[8] Testing PDF Splitting by Ranges...');
    const threePageDoc = await PdfEngine.createBlankPdf('a4', 'portrait', 3);
    const splitResults = await PdfEngine.splitPdfByRanges(threePageDoc, [
      { name: 'Part1.pdf', pageIndices0Based: [0, 1] },
      { name: 'Part2.pdf', pageIndices0Based: [2] },
    ]);
    assert(splitResults.length === 2, 'Split generated exactly 2 files');
    const part1Doc = await PDFDocument.load(splitResults[0].data);
    const part2Doc = await PDFDocument.load(splitResults[1].data);
    assert(part1Doc.getPageCount() === 2, 'Part 1 contains 2 pages');
    assert(part2Doc.getPageCount() === 1, 'Part 2 contains 1 page');

    // TEST 9: Searchable OCR Text Layer Embedding
    console.log('\n[9] Testing Searchable OCR Layer Embedding...');
    const searchableBytes = await PdfEngine.embedSearchableOcrLayer(
      blankBytes,
      1,
      'Recognized Invoice #99281\nTotal Amount Due: $1,200.00'
    );
    const searchableDoc = await PDFDocument.load(searchableBytes);
    assert(searchableDoc.getPageCount() === 2, 'Searchable PDF preserves document structure and pages');

    // TEST 10: Batch Watermarking & Batch Rotation
    console.log('\n[10] Testing Batch Watermarking & Batch Rotation...');
    const batchPdfs = [
      { name: 'DocA.pdf', data: await PdfEngine.createBlankPdf('a4', 'portrait', 1) },
      { name: 'DocB.pdf', data: await PdfEngine.createBlankPdf('a4', 'portrait', 2) },
    ];
    const watermarkedBatch = await PdfEngine.batchWatermark(batchPdfs, {
      text: 'BATCH CONFIDENTIAL',
      fontSize: 36,
      fontFamily: 'Helvetica',
      color: '#dc2626',
      opacity: 0.3,
      rotation: 45,
      position: 'diagonal',
    });
    assert(watermarkedBatch.length === 2, 'Batch watermarked all 2 documents');

    const rotatedBatch = await PdfEngine.batchRotate(batchPdfs, 90);
    assert(rotatedBatch.length === 2, 'Batch rotated all 2 documents');

    // TEST 11: Burn Permanent Redactions & Watermark
    console.log('\n[11] Testing Modifications Burning (Annotations, Redactions, Images)...');
    const testDocState: PdfDocumentState = {
      id: 'test_doc_p2',
      name: 'Advanced_Test.pdf',
      fileSize: blankBytes.byteLength,
      data: blankBytes,
      pageCount: 2,
      pages: [{ pageNumber: 1, width: 595, height: 842, rotation: 0 }],
      metadata: {
        title: 'Phase 2 Test PDF',
        author: 'HHM Test',
        subject: 'Advanced Verification',
        keywords: 'test',
        creator: 'HHM PDF',
        producer: 'HHM PDF Engine',
      },
      isModified: true,
      textAnnotations: [
        {
          id: 'txt_p2',
          page: 1,
          x: 100,
          y: 200,
          width: 150,
          height: 25,
          text: 'Phase 2 Verified',
          fontSize: 14,
          fontFamily: 'Helvetica',
          color: '#1e3a8a',
          isBold: true,
        },
      ],
      imageAnnotations: [],
      hyperlinks: [],
      drawingAnnotations: [],
      highlightAnnotations: [],
      shapeAnnotations: [],
      stickyNotes: [],
      signatures: [],
      stamps: [],
      redactions: [
        {
          id: 'red_p2',
          page: 1,
          x: 80,
          y: 150,
          width: 200,
          height: 40,
          status: 'marked',
          overlayText: 'PERMANENTLY REDACTED',
        },
      ],
      formFields: [],
      measurements: [],
      watermark: {
        text: 'PHASE 2 RESTRICTED',
        fontSize: 48,
        fontFamily: 'Helvetica',
        color: '#dc2626',
        opacity: 0.3,
        rotation: 45,
        position: 'diagonal',
      },
    };

    const burnedBytes = await PdfEngine.burnModificationsAndExport(testDocState);
    assert(burnedBytes && burnedBytes.length > 0, 'Burned PDF successfully generated');
    const burnedDoc = await PDFDocument.load(burnedBytes);
    assert(burnedDoc.getTitle() === 'Phase 2 Test PDF', 'Metadata title verified in burned output');

    console.log('\n----------------------------------------------------');
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('----------------------------------------------------');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  }
}

runTests();
