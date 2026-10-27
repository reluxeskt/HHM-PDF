export type PlatformType = 'web' | 'desktop' | 'mobile';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface CloudFolder {
  id: string;
  userId: string;
  name: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CloudDocumentRecord {
  id: string;
  userId: string;
  folderId?: string;
  name: string;
  sizeBytes: number;
  pageCount: number;
  storagePath: string;
  downloadUrl?: string;
  version: number;
  isEncrypted?: boolean;
  isSigned?: boolean;
  tags?: string;
  lastModifiedBy?: string;
  createdAt: string;
  updatedAt: string;
  // Local client status (transient)
  syncStatus?: 'synced' | 'modified_offline' | 'uploading' | 'conflict' | 'error';
  localCached?: boolean;
}

export interface RecentRecord {
  id: string;
  userId: string;
  documentId?: string;
  name: string;
  pageCount?: number;
  sizeBytes?: number;
  lastOpened: number;
  platform: PlatformType;
}

export interface SyncConflictInfo {
  documentId: string;
  documentName: string;
  localVersion: number;
  remoteVersion: number;
  remoteUpdatedAt: string;
  remoteModifiedBy?: string;
}

export interface OfflineQueueItem {
  id: string;
  documentId: string;
  userId: string;
  name: string;
  data: Uint8Array;
  folderId?: string;
  version: number;
  action: 'upload' | 'update' | 'delete';
  timestamp: number;
  retryCount: number;
  error?: string;
}
