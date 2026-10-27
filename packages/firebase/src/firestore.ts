import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { getFirebaseDb } from './config';
import { handleFirestoreError, OperationType } from './errors';
import {
  CloudDocumentRecord,
  CloudFolder,
  RecentRecord,
  UserProfile,
  SyncConflictInfo,
} from '../../shared/src/types';

export class CloudFirestoreService {
  /**
   * Save or update document metadata with versioning and conflict detection
   */
  static async saveDocument(
    userId: string,
    docData: Omit<CloudDocumentRecord, 'userId'>,
    expectedVersion?: number,
    currentUserAuth?: any
  ): Promise<CloudDocumentRecord> {
    const db = getFirebaseDb();
    if (!db) {
      throw new Error('Firestore is not configured. Running in Local Offline Mode.');
    }

    const docRef = doc(db, 'users', userId, 'documents', docData.id);
    const path = `users/${userId}/documents/${docData.id}`;

    try {
      // Conflict Detection & Optimistic Locking
      if (expectedVersion !== undefined) {
        const existingSnap = await getDoc(docRef);
        if (existingSnap.exists()) {
          const remoteData = existingSnap.data() as CloudDocumentRecord;
          if (remoteData.version > expectedVersion) {
            const conflict: SyncConflictInfo = {
              documentId: docData.id,
              documentName: docData.name,
              localVersion: expectedVersion,
              remoteVersion: remoteData.version,
              remoteUpdatedAt: remoteData.updatedAt,
              remoteModifiedBy: remoteData.lastModifiedBy,
            };
            const error = new Error(`SYNC_CONFLICT: Remote document is newer (v${remoteData.version} vs local v${expectedVersion})`);
            (error as any).conflictInfo = conflict;
            throw error;
          }
        }
      }

      const fullRecord: CloudDocumentRecord = {
        ...docData,
        userId,
        version: (docData.version || 0) + 1,
        updatedAt: new Date().toISOString(),
        createdAt: docData.createdAt || new Date().toISOString(),
      };

      await setDoc(docRef, fullRecord);
      return fullRecord;
    } catch (err: any) {
      if (err.message?.startsWith('SYNC_CONFLICT')) {
        throw err;
      }
      handleFirestoreError(err, OperationType.WRITE, path, currentUserAuth);
    }
  }

  /**
   * List all cloud documents for a user, optionally filtered by folder
   */
  static async getUserDocuments(
    userId: string,
    folderId?: string,
    currentUserAuth?: any
  ): Promise<CloudDocumentRecord[]> {
    const db = getFirebaseDb();
    if (!db) return [];

    const path = `users/${userId}/documents`;
    try {
      const colRef = collection(db, 'users', userId, 'documents');
      const q = folderId
        ? query(colRef, where('folderId', '==', folderId))
        : colRef;

      const snap = await getDocs(q);
      const docs: CloudDocumentRecord[] = [];
      snap.forEach((d) => docs.push(d.data() as CloudDocumentRecord));
      return docs.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path, currentUserAuth);
    }
  }

  /**
   * Delete document metadata
   */
  static async deleteDocument(
    userId: string,
    docId: string,
    currentUserAuth?: any
  ): Promise<void> {
    const db = getFirebaseDb();
    if (!db) return;

    const path = `users/${userId}/documents/${docId}`;
    try {
      await deleteDoc(doc(db, 'users', userId, 'documents', docId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path, currentUserAuth);
    }
  }

  /**
   * Folders: Create a new user folder
   */
  static async createFolder(
    userId: string,
    name: string,
    color?: string,
    currentUserAuth?: any
  ): Promise<CloudFolder> {
    const db = getFirebaseDb();
    if (!db) throw new Error('Firestore is not configured.');

    const folderId = `folder_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `users/${userId}/folders/${folderId}`;

    const folder: CloudFolder = {
      id: folderId,
      userId,
      name,
      color: color || '#2563eb',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'users', userId, 'folders', folderId), folder);
      return folder;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path, currentUserAuth);
    }
  }

  /**
   * Folders: List all user folders
   */
  static async getUserFolders(
    userId: string,
    currentUserAuth?: any
  ): Promise<CloudFolder[]> {
    const db = getFirebaseDb();
    if (!db) return [];

    const path = `users/${userId}/folders`;
    try {
      const snap = await getDocs(collection(db, 'users', userId, 'folders'));
      const folders: CloudFolder[] = [];
      snap.forEach((d) => folders.push(d.data() as CloudFolder));
      return folders.sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path, currentUserAuth);
    }
  }

  /**
   * Folders: Delete folder
   */
  static async deleteFolder(
    userId: string,
    folderId: string,
    currentUserAuth?: any
  ): Promise<void> {
    const db = getFirebaseDb();
    if (!db) return;

    const path = `users/${userId}/folders/${folderId}`;
    try {
      await deleteDoc(doc(db, 'users', userId, 'folders', folderId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path, currentUserAuth);
    }
  }

  /**
   * Recents: Sync a recent document record across devices
   */
  static async syncRecentRecord(
    userId: string,
    record: Omit<RecentRecord, 'userId'>,
    currentUserAuth?: any
  ): Promise<void> {
    const db = getFirebaseDb();
    if (!db) return;

    const path = `users/${userId}/recents/${record.id}`;
    try {
      await setDoc(doc(db, 'users', userId, 'recents', record.id), {
        ...record,
        userId,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path, currentUserAuth);
    }
  }

  /**
   * Recents: Get user recent records
   */
  static async getUserRecents(
    userId: string,
    currentUserAuth?: any
  ): Promise<RecentRecord[]> {
    const db = getFirebaseDb();
    if (!db) return [];

    const path = `users/${userId}/recents`;
    try {
      const q = query(
        collection(db, 'users', userId, 'recents'),
        orderBy('lastOpened', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      const recents: RecentRecord[] = [];
      snap.forEach((d) => recents.push(d.data() as RecentRecord));
      return recents;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path, currentUserAuth);
    }
  }
}
