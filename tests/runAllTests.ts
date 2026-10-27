import { execSync } from 'child_process';

console.log('================================================================');
console.log('  HHM PDF — COMPREHENSIVE AUTOMATED TEST RUNNER');
console.log('================================================================\n');

try {
  console.log('>>> [1/6] Running Phase 2 Core PDF Engine Tests...');
  execSync('./node_modules/.bin/tsx tests/pdfEngine.test.ts', { stdio: 'inherit' });

  console.log('\n>>> [2/6] Running Phase 3 Security, Signatures & Redaction Tests...');
  execSync('./node_modules/.bin/tsx tests/phase3_security.test.ts', { stdio: 'inherit' });

  console.log('\n>>> [3/6] Running Phase 4 Cross-Platform & Cloud Sync Tests...');
  execSync('./node_modules/.bin/tsx tests/phase4_firebase_sync.test.ts', { stdio: 'inherit' });

  console.log('\n>>> [4/6] Running Synthetic Test Fixtures Validation...');
  execSync('./node_modules/.bin/tsx tests/qa_fixtures.test.ts', { stdio: 'inherit' });

  console.log('\n>>> [5/6] Running Core PDF Operations & Security Audit...');
  execSync('./node_modules/.bin/tsx tests/qa_pdf_operations.test.ts', { stdio: 'inherit' });

  console.log('\n>>> [6/7] Running Existing PDF Text Selection & Editing Audit...');
  execSync('./node_modules/.bin/tsx tests/qa_text_editing.test.ts', { stdio: 'inherit' });

  console.log('\n>>> [7/8] Running PDF/A Archival Validation & Export Audit...');
  execSync('./node_modules/.bin/tsx tests/qa_pdfa_validation.test.ts', { stdio: 'inherit' });

  console.log('\n>>> [8/9] Running Original Font Detection & Preservation Audit...');
  execSync('./node_modules/.bin/tsx tests/qa_font_detection.test.ts', { stdio: 'inherit' });

  console.log('\n>>> [9/10] Running IndexedDB Storage & Account Resilience Audit...');
  execSync('./node_modules/.bin/tsx tests/qa_idb_resilience.test.ts', { stdio: 'inherit' });

  console.log('\n>>> [10/10] Running Global Light/Dark Theme & Persistence Audit...');
  execSync('./node_modules/.bin/tsx tests/qa_theme.test.ts', { stdio: 'inherit' });

  console.log('\n================================================================');
  console.log('  ALL TEST SUITES PASSED: AUTOMATED TESTS SUCCESSFUL!');
  console.log('================================================================');
} catch (err) {
  console.error('\nTest runner failed:', err);
  process.exit(1);
}
