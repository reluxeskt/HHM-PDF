import { safeGet, safeSet, safeDel, safeKeys } from './safeIdb';
import { RecentDocument } from '../types';

const RECENT_DOCS_KEY = (userId?: string | null) => `hhm_pdf_recents_${userId || 'guest'}`;
const SAVED_SIGNATURES_KEY = (userId?: string | null) => `hhm_pdf_signatures_${userId || 'guest'}`;
const PREFERENCES_KEY = (userId?: string | null) => `hhm_pdf_prefs_${userId || 'guest'}`;
const DOC_STORE_PREFIX = (userId?: string | null) => `hhm_doc_blob_${userId || 'guest'}_`;

export interface UserPreferences {
  userName: string;
  defaultZoom: number;
  continuousScroll: boolean;
  theme: 'hhm-light' | 'dark' | 'acrobat-light';
}

const DEFAULT_PREFS: UserPreferences = {
  userName: 'HHM User',
  defaultZoom: 1.0,
  continuousScroll: true,
  theme: 'hhm-light',
};

export class StorageService {
  /**
   * Get list of recent documents for current user/guest
   */
  static async getRecentDocuments(userId?: string | null): Promise<RecentDocument[]> {
    try {
      const recents = (await safeGet<RecentDocument[]>(RECENT_DOCS_KEY(userId))) || [];
      return recents.sort((a, b) => b.lastOpened - a.lastOpened);
    } catch {
      return [];
    }
  }

  /**
   * Add or update a recent document for current user/guest
   */
  static async addRecentDocument(doc: RecentDocument, data?: Uint8Array, userId?: string | null): Promise<void> {
    try {
      const recents = await this.getRecentDocuments(userId);
      const filtered = recents.filter((r) => r.id !== doc.id && r.name !== doc.name);
      filtered.unshift({ ...doc, userId: userId || 'guest' });
      // Keep up to 20 recent files
      await safeSet(RECENT_DOCS_KEY(userId), filtered.slice(0, 20));

      if (data) {
        await safeSet(`${DOC_STORE_PREFIX(userId)}${doc.id}`, data);
      }
    } catch (e) {
      console.warn('Could not save recent document to IDB:', e);
    }
  }

  /**
   * Retrieve cached PDF data for a document ID
   */
  static async getCachedDocumentData(docId: string, userId?: string | null): Promise<Uint8Array | null> {
    try {
      const data = await safeGet<Uint8Array>(`${DOC_STORE_PREFIX(userId)}${docId}`);
      return data || null;
    } catch {
      return null;
    }
  }

  /**
   * Clear all recent document records for current user/guest
   */
  static async clearRecents(userId?: string | null): Promise<void> {
    try {
      await safeDel(RECENT_DOCS_KEY(userId));
      const allKeys = await safeKeys();
      const prefix = DOC_STORE_PREFIX(userId);
      for (const k of allKeys) {
        if (typeof k === 'string' && k.startsWith(prefix)) {
          await safeDel(k);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Get saved user signatures (dataUrls)
   */
  static async getSavedSignatures(userId?: string | null): Promise<{ id: string; dataUrl: string; name: string }[]> {
    try {
      return (await safeGet(SAVED_SIGNATURES_KEY(userId))) || [];
    } catch {
      return [];
    }
  }

  /**
   * Save a user signature for fast reuse
   */
  static async saveSignature(sig: { id: string; dataUrl: string; name: string }, userId?: string | null): Promise<void> {
    try {
      const list = await this.getSavedSignatures(userId);
      list.push(sig);
      await safeSet(SAVED_SIGNATURES_KEY(userId), list);
    } catch (e) {
      console.warn('Could not save signature:', e);
    }
  }

  /**
   * Get user preferences
   */
  static async getPreferences(userId?: string | null): Promise<UserPreferences> {
    try {
      const p = await safeGet<UserPreferences>(PREFERENCES_KEY(userId));
      return { ...DEFAULT_PREFS, ...p };
    } catch {
      return DEFAULT_PREFS;
    }
  }

  /**
   * Save preferences
   */
  static async savePreferences(prefs: Partial<UserPreferences>, userId?: string | null): Promise<void> {
    try {
      const current = await this.getPreferences(userId);
      await safeSet(PREFERENCES_KEY(userId), { ...current, ...prefs });
    } catch (e) {
      console.warn('Could not save preferences:', e);
    }
  }
}
