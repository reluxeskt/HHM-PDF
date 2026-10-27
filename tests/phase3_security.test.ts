import { PDFDocument } from 'pdf-lib';
import { PdfEngine } from '../src/services/pdfEngine';
import { CryptoEngine } from '../src/services/cryptoEngine';
import { PdfDocumentState } from '../src/types';

async function runPhase3Tests() {
  console.log('====================================================');
  console.log('  HHM PDF — Phase 3 Security & Advanced Tools Test Suite');
  console.log('====================================================');

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

  // 1. PDF Creation & Base Document
  console.log('\n[1] Preparing Base Test Document...');
  const baseDoc = await PDFDocument.create();
  const page1 = baseDoc.addPage([500, 700]);
  page1.drawText('CONFIDENTIAL INTERNAL REPORT 2026', { x: 50, y: 650, size: 16 });
  page1.drawText('Financial Data: Secret Account Number 9876-5432-10', { x: 50, y: 600, size: 12 });
  const baseBytes = await baseDoc.save();
  assert(baseBytes.length > 0, 'Base test PDF generated successfully');

  // 2. Encryption & Password Protection
  console.log('\n[2] Testing PDF Encryption & Password Protection...');
  try {
    const encResult = await PdfEngine.encryptPdf(baseBytes, {
      userPassword: 'secretpassword123',
      ownerPassword: 'adminpassword456',
      algorithm: 'AES-256',
      allowPrinting: true,
      allowModifying: false,
      allowCopying: false,
      allowAnnotating: true,
      allowFillingForms: true,
    });

    assert(encResult.length > 0, 'Encrypted document generated with AES-256');
    const isEncrypted = PdfEngine.isPdfEncrypted(encResult);
    assert(isEncrypted, 'Encrypted document contains genuine PDF /Encrypt dictionary');

    // Test rejection without password via pdf-lib
    let passwordRequired = false;
    try {
      await PDFDocument.load(encResult);
    } catch (e: any) {
      passwordRequired = e.message.toLowerCase().includes('encrypt');
    }
    assert(passwordRequired, 'Opening encrypted PDF without password is appropriately rejected');
  } catch (e: any) {
    console.error('Encryption test failed:', e);
    failed++;
  }

  // 3. Digital Signatures & X.509 Certificates
  console.log('\n[3] Testing Digital Signatures & Cryptographic X.509 Verification...');
  try {
    // Generate authentic 2048-bit RSA Certificate
    const certConfig = {
      commonName: 'Alice Auditor',
      organization: 'HHM Technologies Compliance',
      country: 'US',
      email: 'alice@hhmpdf.com',
      validityDays: 365,
      reason: 'Formal Document Verification and Approval',
    };
    const certPair = CryptoEngine.generateCertificate(certConfig);
    assert(certPair.certificatePem.includes('BEGIN CERTIFICATE'), 'X.509 PEM certificate created');
    assert(certPair.privateKeyPem.includes('BEGIN RSA PRIVATE KEY'), 'RSA 2048-bit private key generated');

    // Cryptographic signing with detached PKCS#7 CMS
    const signedPdfBytes = await CryptoEngine.signPdfBytes(
      baseBytes,
      certPair.certificatePem,
      certPair.privateKeyPem,
      {
        signerName: certConfig.commonName,
        reason: certConfig.reason,
      }
    );
    assert(signedPdfBytes.length > baseBytes.length, 'Digital signature detached container embedded');

    // Verify digital signatures
    const verifiedSignatures = CryptoEngine.verifyPdfSignatures(signedPdfBytes);
    assert(verifiedSignatures.length > 0, 'Signature parser detected signature block');
    if (verifiedSignatures.length > 0) {
      assert(verifiedSignatures[0].signerName.includes('Alice Auditor'), 'Signer Common Name verified accurately');
      assert(verifiedSignatures[0].isValid, 'PKCS#7 cryptographic signature validated as authentic');
      assert(!verifiedSignatures[0].isTampered, 'Byte range hash check confirms document was not altered after signing');
    }
  } catch (e: any) {
    console.error('Signature test failed:', e);
    failed++;
  }

  // 4. Permanent Redaction Sanitization
  console.log('\n[4] Testing Permanent Redaction Sanitization...');
  try {
    const docState: PdfDocumentState = {
      id: 'doc_test_1',
      name: 'confidential.pdf',
      fileSize: baseBytes.length,
      data: baseBytes,
      pageCount: 1,
      pages: [{ pageNumber: 1, width: 500, height: 700, rotation: 0 }],
      metadata: {
        title: 'Confidential Internal',
        author: 'Internal Author',
        subject: 'Finance',
        keywords: 'secret',
        creator: 'Internal',
        producer: 'HHM',
      },
      isModified: true,
      textAnnotations: [],
      imageAnnotations: [],
      hyperlinks: [],
      drawingAnnotations: [],
      highlightAnnotations: [],
      shapeAnnotations: [],
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
          y: 590,
          width: 350,
          height: 25,
          status: 'marked',
        },
      ],
    };

    const redactedBytes = await PdfEngine.applyPermanentRedaction(docState, 'mask', true);
    assert(redactedBytes.length > 0, 'Redacted PDF saved successfully');
    const insp = await PdfEngine.inspectPdf(redactedBytes, 'redacted.pdf');
    assert(insp.pageCount === 1, 'Redacted document preserves page structure');
  } catch (e: any) {
    console.error('Redaction test failed:', e);
    failed++;
  }

  // 5. Document Comparison Algorithm
  console.log('\n[5] Testing Document Comparison & Diffing Algorithm...');
  try {
    const textA = 'Invoice #1001 Total Amount: $500 Status: Pending';
    const textB = 'Invoice #1001 Total Amount: $750 Status: Approved';

    const wordDiff = PdfEngine.computeWordDiff(textA, textB);
    assert(wordDiff.length > 0, 'Word-by-word token comparison executed');
    const addedWords = wordDiff.filter((w) => w.type === 'added');
    const removedWords = wordDiff.filter((w) => w.type === 'removed');
    assert(addedWords.some((w) => w.value.includes('$750') || w.value.includes('Approved')), 'Identified added terms ($750, Approved)');
    assert(removedWords.some((w) => w.value.includes('$500') || w.value.includes('Pending')), 'Identified removed terms ($500, Pending)');
  } catch (e: any) {
    console.error('Comparison test failed:', e);
    failed++;
  }

  // 6. PDF Optimization & File Size Reduction
  console.log('\n[6] Testing PDF Optimization & Object Compression...');
  try {
    const optResult = await PdfEngine.optimizePdf(baseBytes, {
      imageQuality: 0.7,
      maxImageDimension: 1200,
      removeMetadata: true,
      removeUnusedObjects: true,
    });

    assert(optResult.optimizedBytes.length > 0, 'Optimized PDF output generated');
    const reloaded = await PDFDocument.load(optResult.optimizedBytes);
    assert(reloaded.getPageCount() === 1, 'Optimized document verified without corruption');
  } catch (e: any) {
    console.error('Optimization test failed:', e);
    failed++;
  }

  // Summary
  console.log('\n----------------------------------------------------');
  console.log(`Phase 3 Test Results: ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase3Tests();
