// Dynamic Font Registry Service
// Manages Windows 11 system fonts, thousands of Google Fonts with on-demand loading,
// custom uploaded font files (.ttf, .otf, .woff, .woff2), and detected PDF fonts.

export interface FontInfo {
  family: string;
  source: 'system' | 'custom' | 'standard' | 'online';
  styles: Array<'regular' | 'medium' | 'semibold' | 'bold' | 'italic' | 'bold-italic'>;
  category?: 'serif' | 'sans-serif' | 'display' | 'handwriting' | 'monospace';
  script?: string;
  customBlobUrl?: string;
  buffer?: ArrayBuffer;
  isLoaded?: boolean;
}

export const WINDOWS_11_FONTS = [
  'Arial', 'Arial Black', 'Aptos', 'Aptos Display', 'Bahnschrift', 'Calibri', 'Cambria',
  'Candara', 'Century Gothic', 'Comic Sans MS', 'Consolas', 'Constantia', 'Corbel',
  'Courier New', 'Franklin Gothic Medium', 'Georgia', 'Helvetica', 'Impact',
  'Lucida Console', 'Lucida Sans Unicode', 'Malgun Gothic', 'Microsoft JhengHei',
  'Microsoft YaHei', 'Monaco', 'Montserrat', 'Open Sans', 'Palatino Linotype',
  'Roboto', 'Segoe Print', 'Segoe Script', 'Segoe UI', 'SimHei', 'Tahoma',
  'Times New Roman', 'Trebuchet MS', 'Ubuntu', 'Verdana'
];

const POPULAR_GOOGLE_FONTS: Array<{ family: string; category: 'serif' | 'sans-serif' | 'display' | 'handwriting' | 'monospace'; script: string }> = [
  // Sans-Serif
  { family: 'Roboto', category: 'sans-serif', script: 'Latin' },
  { family: 'Open Sans', category: 'sans-serif', script: 'Latin' },
  { family: 'Lato', category: 'sans-serif', script: 'Latin' },
  { family: 'Montserrat', category: 'sans-serif', script: 'Latin' },
  { family: 'Poppins', category: 'sans-serif', script: 'Latin' },
  { family: 'Inter', category: 'sans-serif', script: 'Latin' },
  { family: 'Source Sans 3', category: 'sans-serif', script: 'Latin' },
  { family: 'Nunito', category: 'sans-serif', script: 'Latin' },
  { family: 'Raleway', category: 'sans-serif', script: 'Latin' },
  { family: 'Ubuntu', category: 'sans-serif', script: 'Latin' },
  { family: 'Oswald', category: 'sans-serif', script: 'Latin' },
  { family: 'PT Sans', category: 'sans-serif', script: 'Latin' },
  { family: 'Noto Sans', category: 'sans-serif', script: 'Multilingual' },
  { family: 'IBM Plex Sans', category: 'sans-serif', script: 'Latin' },
  { family: 'Work Sans', category: 'sans-serif', script: 'Latin' },
  { family: 'Quicksand', category: 'sans-serif', script: 'Latin' },
  { family: 'Mulish', category: 'sans-serif', script: 'Latin' },
  { family: 'Barlow', category: 'sans-serif', script: 'Latin' },
  { family: 'DM Sans', category: 'sans-serif', script: 'Latin' },
  { family: 'Rubik', category: 'sans-serif', script: 'Latin' },
  // Serif
  { family: 'Playfair Display', category: 'serif', script: 'Latin' },
  { family: 'Merriweather', category: 'serif', script: 'Latin' },
  { family: 'Lora', category: 'serif', script: 'Latin' },
  { family: 'PT Serif', category: 'serif', script: 'Latin' },
  { family: 'Cinzel', category: 'serif', script: 'Latin' },
  { family: 'Cormorant Garamond', category: 'serif', script: 'Latin' },
  { family: 'EB Garamond', category: 'serif', script: 'Latin' },
  { family: 'Libre Baskerville', category: 'serif', script: 'Latin' },
  { family: 'Vollkorn', category: 'serif', script: 'Latin' },
  { family: 'Noto Serif', category: 'serif', script: 'Multilingual' },
  { family: 'IBM Plex Serif', category: 'serif', script: 'Latin' },
  { family: 'Cardo', category: 'serif', script: 'Latin' },
  // Arabic & Urdu Multilingual
  { family: 'Amiri', category: 'serif', script: 'Arabic/Urdu' },
  { family: 'Cairo', category: 'sans-serif', script: 'Arabic/Urdu' },
  { family: 'Tajawal', category: 'sans-serif', script: 'Arabic/Urdu' },
  { family: 'Lateef', category: 'serif', script: 'Arabic/Urdu' },
  { family: 'Scheherazade New', category: 'serif', script: 'Arabic/Urdu' },
  { family: 'Noto Nastaliq Urdu', category: 'serif', script: 'Urdu' },
  { family: 'Changa', category: 'display', script: 'Arabic' },
  { family: 'Reem Kufi', category: 'display', script: 'Arabic' },
  // Monospace
  { family: 'Fira Code', category: 'monospace', script: 'Latin' },
  { family: 'JetBrains Mono', category: 'monospace', script: 'Latin' },
  { family: 'Source Code Pro', category: 'monospace', script: 'Latin' },
  { family: 'Space Mono', category: 'monospace', script: 'Latin' },
  { family: 'IBM Plex Mono', category: 'monospace', script: 'Latin' },
  // Display & Handwriting
  { family: 'Pacifico', category: 'handwriting', script: 'Latin' },
  { family: 'Dancing Script', category: 'handwriting', script: 'Latin' },
  { family: 'Caveat', category: 'handwriting', script: 'Latin' },
  { family: 'Lobster', category: 'display', script: 'Latin' },
  { family: 'Bebas Neue', category: 'display', script: 'Latin' },
  { family: 'Abril Fatface', category: 'display', script: 'Latin' },
];

class FontRegistryService {
  private fonts: Map<string, FontInfo> = new Map();
  private isInitialized = false;

  constructor() {
    this.registerStandardAndWindowsFonts();
    this.registerOnlineFonts();
  }

  private registerStandardAndWindowsFonts() {
    // Standards
    this.fonts.set('Helvetica', {
      family: 'Helvetica',
      source: 'standard',
      styles: ['regular', 'bold', 'italic', 'bold-italic'],
      category: 'sans-serif',
    });
    this.fonts.set('Times New Roman', {
      family: 'Times New Roman',
      source: 'standard',
      styles: ['regular', 'bold', 'italic', 'bold-italic'],
      category: 'serif',
    });
    this.fonts.set('Courier New', {
      family: 'Courier New',
      source: 'standard',
      styles: ['regular', 'bold', 'italic', 'bold-italic'],
      category: 'monospace',
    });

    // Windows 11 Fonts
    for (const fontName of WINDOWS_11_FONTS) {
      if (!this.fonts.has(fontName)) {
        this.fonts.set(fontName, {
          family: fontName,
          source: 'system',
          styles: ['regular', 'medium', 'semibold', 'bold', 'italic', 'bold-italic'],
          category: fontName.toLowerCase().includes('times') || fontName.toLowerCase().includes('cambria') || fontName.toLowerCase().includes('georgia') || fontName.toLowerCase().includes('constantia') || fontName.toLowerCase().includes('palatino') ? 'serif' : fontName.toLowerCase().includes('courier') || fontName.toLowerCase().includes('consolas') || fontName.toLowerCase().includes('lucida console') ? 'monospace' : 'sans-serif',
        });
      }
    }
  }

  private registerOnlineFonts() {
    for (const gf of POPULAR_GOOGLE_FONTS) {
      if (!this.fonts.has(gf.family)) {
        this.fonts.set(gf.family, {
          family: gf.family,
          source: 'online',
          styles: ['regular', 'medium', 'semibold', 'bold', 'italic', 'bold-italic'],
          category: gf.category,
          script: gf.script,
          isLoaded: false,
        });
      }
    }
  }

  /**
   * Dynamically discover system-installed fonts where browser or system API permits.
   */
  public async discoverSystemFonts(): Promise<FontInfo[]> {
    if (this.isInitialized) {
      return this.getAvailableFonts();
    }

    if (typeof window !== 'undefined' && 'queryLocalFonts' in window) {
      try {
        const localFonts = await (window as any).queryLocalFonts();
        const familySet = new Set<string>();
        for (const font of localFonts) {
          if (font.family) {
            familySet.add(font.family);
          }
        }
        familySet.forEach((family) => {
          if (!this.fonts.has(family)) {
            this.fonts.set(family, {
              family,
              source: 'system',
              styles: ['regular', 'medium', 'semibold', 'bold', 'italic', 'bold-italic'],
              category: 'sans-serif',
            });
          }
        });
        this.isInitialized = true;
        return this.getAvailableFonts();
      } catch (e) {
        console.warn('Local Font Access API query restricted:', e);
      }
    }

    this.isInitialized = true;
    return this.getAvailableFonts();
  }

  /**
   * Load an online Google Font on demand via dynamic CSS stylesheet injection
   */
  public async loadOnlineFont(family: string): Promise<void> {
    const fontInfo = this.fonts.get(family);
    if (!fontInfo || fontInfo.source !== 'online' || fontInfo.isLoaded) return;

    if (typeof document !== 'undefined') {
      const linkId = `google_font_${family.replace(/\s+/g, '_')}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,700&display=swap`;
        document.head.appendChild(link);
      }
      fontInfo.isLoaded = true;
      this.fonts.set(family, fontInfo);
    }
  }

  /**
   * Import and load custom font file (.ttf, .otf, .woff, .woff2)
   */
  public async loadCustomFontFile(file: File): Promise<FontInfo> {
    const buffer = await file.arrayBuffer();
    const familyName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

    const fontFace = new FontFace(familyName, buffer, { style: 'normal', weight: '400' });
    await fontFace.load();
    if (typeof document !== 'undefined') {
      document.fonts.add(fontFace);
    }

    const info: FontInfo = {
      family: familyName,
      source: 'custom',
      styles: ['regular', 'medium', 'semibold', 'bold', 'italic', 'bold-italic'],
      buffer,
      isLoaded: true,
    };

    this.fonts.set(familyName, info);
    return info;
  }

  /**
   * Register a detected font family from an opened PDF document
   */
  public registerDetectedFont(family: string): FontInfo {
    if (!family || family.trim().length === 0) {
      return this.fonts.get('Times New Roman')!;
    }
    const cleanFamily = family.trim();
    if (!this.fonts.has(cleanFamily)) {
      const info: FontInfo = {
        family: cleanFamily,
        source: 'system',
        styles: ['regular', 'medium', 'semibold', 'bold', 'italic', 'bold-italic'],
      };
      this.fonts.set(cleanFamily, info);
      return info;
    }
    return this.fonts.get(cleanFamily)!;
  }

  /**
   * Get buffer for custom uploaded font
   */
  public getCustomFontBuffer(family: string): ArrayBuffer | undefined {
    const font = this.fonts.get(family);
    return font?.buffer;
  }

  /**
   * Check if a font family is available in Windows 11 system fonts
   */
  public isSystemFont(family: string): boolean {
    if (!family) return false;
    const lower = family.toLowerCase().trim();
    return WINDOWS_11_FONTS.some((f) => f.toLowerCase() === lower);
  }

  /**
   * Retrieve FontInfo by exact or case-insensitive family name
   */
  public getFontInfo(family: string): FontInfo | undefined {
    if (!family) return undefined;
    const clean = family.trim();
    return (
      this.fonts.get(clean) ||
      Array.from(this.fonts.values()).find((f) => f.family.toLowerCase() === clean.toLowerCase())
    );
  }

  /**
   * List all registered and available fonts
   */
  public getAvailableFonts(): FontInfo[] {
    return Array.from(this.fonts.values()).sort((a, b) => a.family.localeCompare(b.family));
  }
}

export const fontRegistry = new FontRegistryService();
