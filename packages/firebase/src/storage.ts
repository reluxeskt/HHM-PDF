import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  getBytes,
} from 'firebase/storage';
import { getFirebaseStorage } from './config';
import { MAX_UPLOAD_SIZE_BYTES } from '../../shared/src/constants';

export class CloudStorageService {
  /**
   * Upload PDF byte buffer to Firebase Storage under users/{userId}/{docId}.pdf
   */
  static async uploadPdf(
    userId: string,
    docId: string,
    pdfBytes: Uint8Array,
    fileName: string
  ): Promise<{ storagePath: string; downloadUrl: string }> {
    if (pdfBytes.length > MAX_UPLOAD_SIZE_BYTES) {
      throw new Error(
        `File size (${(pdfBytes.length / (1024 * 1024)).toFixed(1)} MB) exceeds the free-tier limit of ${
          MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)
        } MB.`
      );
    }

    const storage = getFirebaseStorage();
    if (!storage) {
      throw new Error('Firebase Storage is not configured. Running in Local Mode.');
    }

    const storagePath = `users/${userId}/${docId}.pdf`;
    const storageRef = ref(storage, storagePath);

    const metadata = {
      contentType: 'application/pdf',
      customMetadata: {
        originalName: fileName,
        uploadedAt: new Date().toISOString(),
      },
    };

    // uploadBytes expects ArrayBuffer or Uint8Array
    await uploadBytes(storageRef, pdfBytes, metadata);
    const downloadUrl = await getDownloadURL(storageRef);

    return { storagePath, downloadUrl };
  }

  /**
   * Download PDF document from Firebase Storage as Uint8Array
   */
  static async downloadPdf(storagePath: string): Promise<Uint8Array> {
    const storage = getFirebaseStorage();
    if (!storage) {
      throw new Error('Firebase Storage is not configured.');
    }

    const storageRef = ref(storage, storagePath);
    const arrayBuffer = await getBytes(storageRef, MAX_UPLOAD_SIZE_BYTES);
    return new Uint8Array(arrayBuffer);
  }

  /**
   * Delete PDF from Firebase Storage
   */
  static async deletePdf(storagePath: string): Promise<void> {
    const storage = getFirebaseStorage();
    if (!storage) return;

    try {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
    } catch (e) {
      console.warn('Could not delete storage object at', storagePath, e);
    }
  }
}
