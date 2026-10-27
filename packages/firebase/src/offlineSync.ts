import { safeGet, safeSet, safeDel } from '../../../src/services/safeIdb';
import { OfflineQueueItem, CloudDocumentRecord } from '../../shared/src/types';
import { CloudStorageService } from './storage';
import { CloudFirestoreService } from './firestore';
import { isFirebaseConfigured } from './config';

const OFFLINE_QUEUE_KEY = 'hhm_offline_sync_queue';
const LEGACY_QUEUE_KEY = 'kabeer_offline_sync_queue';

export class OfflineSyncService {
  private static listeners: Array<(status: { isSyncing: boolean; pendingCount: number }) => void> = [];
  private static isSyncing = false;

  static subscribe(fn: (status: { isSyncing: boolean; pendingCount: number }) => void): () => void {
    this.listeners.push(fn);
    this.notify();
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private static async notify() {
    const queue = await this.getQueue();
    for (const fn of this.listeners) {
      fn({ isSyncing: this.isSyncing, pendingCount: queue.length });
    }
  }

  static async getQueue(): Promise<OfflineQueueItem[]> {
    try {
      let q = await safeGet<OfflineQueueItem[]>(OFFLINE_QUEUE_KEY);
      if (!q) {
        q = await safeGet<OfflineQueueItem[]>(LEGACY_QUEUE_KEY);
        if (q && q.length > 0) {
          await safeSet(OFFLINE_QUEUE_KEY, q);
          await safeDel(LEGACY_QUEUE_KEY);
        }
      }
      return q || [];
    } catch {
      return [];
    }
  }

  static async enqueueUpload(
    userId: string,
    docId: string,
    name: string,
    data: Uint8Array,
    pageCount: number,
    folderId?: string,
    version: number = 1
  ): Promise<void> {
    const queue = await this.getQueue();
    const existingIndex = queue.findIndex((item) => item.documentId === docId);

    const item: OfflineQueueItem = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      documentId: docId,
      userId,
      name,
      data,
      folderId,
      version,
      action: 'upload',
      timestamp: Date.now(),
      retryCount: 0,
    };

    if (existingIndex >= 0) {
      queue[existingIndex] = item;
    } else {
      queue.push(item);
    }

    await safeSet(OFFLINE_QUEUE_KEY, queue);
    this.notify();

    // Trigger immediate background sync if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.processQueue();
    }
  }

  static async processQueue(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing || !isFirebaseConfigured()) return { synced: 0, failed: 0 };
    if (typeof navigator !== 'undefined' && !navigator.onLine) return { synced: 0, failed: 0 };

    this.isSyncing = true;
    this.notify();

    let synced = 0;
    let failed = 0;
    const queue = await this.getQueue();
    const remaining: OfflineQueueItem[] = [];

    for (const item of queue) {
      try {
        if (item.action === 'upload' || item.action === 'update') {
          // 1. Upload bytes to storage
          const { storagePath, downloadUrl } = await CloudStorageService.uploadPdf(
            item.userId,
            item.documentId,
            item.data,
            item.name
          );

          // 2. Save metadata to firestore
          await CloudFirestoreService.saveDocument(
            item.userId,
            {
              id: item.documentId,
              name: item.name,
              sizeBytes: item.data.length,
              pageCount: 1, // updated from inspect if available
              storagePath,
              downloadUrl,
              version: item.version,
              folderId: item.folderId,
              createdAt: new Date(item.timestamp).toISOString(),
              updatedAt: new Date().toISOString(),
            },
            item.version - 1
          );

          synced++;
        }
      } catch (err: any) {
        console.warn(`Failed to process sync item ${item.documentId}:`, err);
        item.retryCount++;
        item.error = err.message;
        if (item.retryCount < 5) {
          remaining.push(item);
        }
        failed++;
      }
    }

    await safeSet(OFFLINE_QUEUE_KEY, remaining);
    this.isSyncing = false;
    this.notify();

    return { synced, failed };
  }

  static async clearQueue(): Promise<void> {
    await safeDel(OFFLINE_QUEUE_KEY);
    this.notify();
  }
}

// Auto-register online event listener
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    OfflineSyncService.processQueue();
  });
}
