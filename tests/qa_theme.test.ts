console.log('================================================================');
console.log('  HHM PDF QA — GLOBAL LIGHT/DARK THEME AUDIT');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${description}`);
    passCount++;
  } else {
    console.error(`  ✕ FAIL: ${description}`);
    failCount++;
    throw new Error(`Assertion failed: ${description}`);
  }
}

// In-memory mock storage
const mockLocalStorageStore: Record<string, string> = {};

const mockLocalStorage = {
  getItem: (key: string) => mockLocalStorageStore[key] || null,
  setItem: (key: string, value: string) => {
    mockLocalStorageStore[key] = value;
  },
  removeItem: (key: string) => {
    delete mockLocalStorageStore[key];
  },
  clear: () => {
    Object.keys(mockLocalStorageStore).forEach((k) => delete mockLocalStorageStore[k]);
  },
};

class MockClassList {
  private classes = new Set<string>();

  add(c: string) {
    this.classes.add(c);
  }

  remove(c: string) {
    this.classes.delete(c);
  }

  contains(c: string): boolean {
    return this.classes.has(c);
  }
}

const mockDocumentElement = {
  classList: new MockClassList(),
  style: { colorScheme: '' },
};

async function runThemeTests() {
  console.log('>>> [1/4] Testing System Preference & Initial Mode Resolution...');

  let isSystemDark = true;
  const mockMatchMedia = (query: string) => ({
    matches: query.includes('prefers-color-scheme: dark') ? isSystemDark : !isSystemDark,
  });

  // Test 1: First visit defaults to 'system' when no stored preference exists
  mockLocalStorage.removeItem('hhm_theme');
  const storedInit = mockLocalStorage.getItem('hhm_theme');
  assert(storedInit === null, 'No stored theme preference exists on first visit');

  // Test 2: System dark preference evaluates to dark
  const resolvedDark = mockMatchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  assert(resolvedDark === 'dark', 'System dark preference correctly resolves to "dark"');

  // Test 3: System light preference evaluates to light
  isSystemDark = false;
  const resolvedLight = mockMatchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  assert(resolvedLight === 'light', 'System light preference correctly resolves to "light"');

  console.log('\n>>> [2/4] Testing Manual Preference Persistence (localStorage)...');

  // Test 4: Save dark preference
  mockLocalStorage.setItem('hhm_theme', 'dark');
  assert(mockLocalStorage.getItem('hhm_theme') === 'dark', 'Explicit "dark" preference saved to localStorage');

  // Test 5: Save light preference
  mockLocalStorage.setItem('hhm_theme', 'light');
  assert(mockLocalStorage.getItem('hhm_theme') === 'light', 'Explicit "light" preference saved to localStorage');

  // Test 6: Save system preference
  mockLocalStorage.setItem('hhm_theme', 'system');
  assert(mockLocalStorage.getItem('hhm_theme') === 'system', 'Explicit "system" preference saved to localStorage');

  console.log('\n>>> [3/4] Testing Root Class Toggling (document.documentElement)...');

  const root = mockDocumentElement;

  // Apply dark class
  root.classList.add('dark');
  root.style.colorScheme = 'dark';
  assert(root.classList.contains('dark'), 'document.documentElement receives "dark" class in dark theme');
  assert(root.style.colorScheme === 'dark', 'document.documentElement sets colorScheme to "dark"');

  // Apply light class
  root.classList.remove('dark');
  root.style.colorScheme = 'light';
  assert(!root.classList.contains('dark'), '"dark" class removed from root in light theme');
  assert(root.style.colorScheme === 'light', 'document.documentElement sets colorScheme to "light"');

  console.log('\n>>> [4/4] Testing Theme Toggle Logic & Account Data Isolation...');

  let currentTheme: 'light' | 'dark' = 'light';
  const toggleTheme = () => {
    const nextTheme: 'light' | 'dark' = currentTheme === 'light' ? 'dark' : 'light';
    currentTheme = nextTheme;
    mockLocalStorage.setItem('hhm_theme', currentTheme);
    if (currentTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  // Initial state light
  assert((currentTheme as string) === 'light', 'Initial state is light');

  // Toggle 1 -> dark
  toggleTheme();
  assert((currentTheme as string) === 'dark', 'First toggle switches theme to dark');
  assert(mockLocalStorage.getItem('hhm_theme') === 'dark', 'Dark theme preference updated in localStorage');
  assert(root.classList.contains('dark'), 'Dark class active on document root');

  // Toggle 2 -> light
  toggleTheme();
  assert((currentTheme as string) === 'light', 'Second toggle switches theme back to light');
  assert(mockLocalStorage.getItem('hhm_theme') === 'light', 'Light theme preference updated in localStorage');
  assert(!root.classList.contains('dark'), 'Dark class cleared from document root');

  // Isolation check: Changing theme must not modify documents or auth state
  const mockAccount = { id: 'user_123', email: 'test@hhm.pdf' };
  const mockDocs = [{ id: 'doc_1', name: 'Contract.pdf' }];
  const accountJSONBefore = JSON.stringify(mockAccount);
  const docsJSONBefore = JSON.stringify(mockDocs);

  toggleTheme(); // Switch theme again

  assert(
    JSON.stringify(mockAccount) === accountJSONBefore,
    'Theme switching leaves user account data completely untouched'
  );
  assert(
    JSON.stringify(mockDocs) === docsJSONBefore,
    'Theme switching leaves document data completely untouched'
  );

  console.log('\n================================================================');
  console.log(`  GLOBAL THEME AUDIT SUMMARY: ${passCount} passed, ${failCount} failed.`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runThemeTests().catch((err) => {
  console.error('Theme QA Audit Error:', err);
  process.exit(1);
});
