import { decryptPDF } from '@pdfsmaller/pdf-decrypt';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

export interface PdfSecurityReport {
  isEncrypted: boolean;
  requiresOpenPassword: boolean;
  isPermissionRestrictedOnly: boolean;
  encryptionAlgorithm: 'AES-256' | 'AES-128' | 'RC4-128' | 'RC4-40' | 'Standard' | 'None';
  permissions: {
    canPrint: boolean;
    canModify: boolean;
    canCopy: boolean;
    canAnnotate: boolean;
    canFillForms: boolean;
    rawPValue?: number;
  };
  securityHandler: string;
}

export interface UnlockSecurityResult {
  cleanBytes: Uint8Array;
  securityReport: PdfSecurityReport;
  unlockedType: 'permission_removed' | 'password_unlocked' | 'already_unencrypted';
  message: string;
}

export class SecurityEngine {
  /**
   * Inspect the encryption dictionary, open password requirements, and granular permissions of a PDF
   */
  static async inspectSecurity(pdfBytes: Uint8Array): Promise<PdfSecurityReport> {
    const rawPdfStr = Buffer.from(pdfBytes).toString('latin1');
    const isEncrypted = rawPdfStr.includes('/Encrypt');

    if (!isEncrypted) {
      return {
        isEncrypted: false,
        requiresOpenPassword: false,
        isPermissionRestrictedOnly: false,
        encryptionAlgorithm: 'None',
        permissions: {
          canPrint: true,
          canModify: true,
          canCopy: true,
          canAnnotate: true,
          canFillForms: true,
        },
        securityHandler: 'None',
      };
    }

    // Parse /Encrypt dictionary parameters
    let algorithm: 'AES-256' | 'AES-128' | 'RC4-128' | 'RC4-40' | 'Standard' = 'Standard';
    let rawPValue: number | undefined;

    const pMatch = rawPdfStr.match(/\/P\s+(-?\d+)/);
    if (pMatch) {
      rawPValue = parseInt(pMatch[1], 10);
    }

    const vMatch = rawPdfStr.match(/\/V\s+(\d+)/);
    const lengthMatch = rawPdfStr.match(/\/Length\s+(\d+)/);
    const v = vMatch ? parseInt(vMatch[1], 10) : 1;
    const length = lengthMatch ? parseInt(lengthMatch[1], 10) : 40;

    if (v === 5 || rawPdfStr.includes('/AESV3') || rawPdfStr.includes('AES-256')) {
      algorithm = 'AES-256';
    } else if (v === 4 && (rawPdfStr.includes('/AESV2') || length === 128)) {
      algorithm = 'AES-128';
    } else if (length === 128) {
      algorithm = 'RC4-128';
    } else if (length === 40) {
      algorithm = 'RC4-40';
    }

    // Test whether an open password is required or if it opens with empty string (permissions only)
    let requiresOpenPassword = true;
    let permissionsFlags = {
      canPrint: true,
      canModify: true,
      canCopy: true,
      canAnnotate: true,
      canFillForms: true,
      rawPValue,
    };

    try {
      const task = pdfjsLib.getDocument({
        data: new Uint8Array(pdfBytes),
        password: '',
      });
      const doc = await task.promise;
      // If we reach here, the document does NOT require a password to view!
      requiresOpenPassword = false;

      // Extract granular permissions if available
      try {
        const perms = (await doc.getPermissions()) as Set<number> | null;
        if (perms && perms.size > 0) {
          // PDF permission flags bitmask:
          // 4 = PRINT, 8 = MODIFY, 16 = COPY, 32 = ANNOTATE, 256 = FILL_FORMS
          permissionsFlags = {
            canPrint: perms.has(4),
            canModify: perms.has(8) || perms.has(1024),
            canCopy: perms.has(16),
            canAnnotate: perms.has(32),
            canFillForms: perms.has(256) || perms.has(512),
            rawPValue,
          };
        }
      } catch {
        // Fallback to P value calculation if getPermissions fails
      }
    } catch (err: any) {
      if (err?.name === 'PasswordException' || err?.message?.toLowerCase().includes('password')) {
        requiresOpenPassword = true;
      }
    }

    // If P value is present and restricts permissions:
    if (rawPValue !== undefined && rawPValue < 0) {
      // Bit 3 (4): print, Bit 4 (8): modify, Bit 5 (16): copy, Bit 6 (32): annotate
      permissionsFlags.canPrint = (rawPValue & 4) !== 0;
      permissionsFlags.canModify = (rawPValue & 8) !== 0;
      permissionsFlags.canCopy = (rawPValue & 16) !== 0;
      permissionsFlags.canAnnotate = (rawPValue & 32) !== 0;
    }

    return {
      isEncrypted: true,
      requiresOpenPassword,
      isPermissionRestrictedOnly: !requiresOpenPassword,
      encryptionAlgorithm: algorithm,
      permissions: permissionsFlags,
      securityHandler: rawPdfStr.includes('/Filter /Standard') ? 'Standard Security Handler' : 'Custom Handler',
    };
  }

  /**
   * Unlock a PDF document by removing permission restrictions or open password security,
   * producing a clean, standard unencrypted PDF while preserving document structure.
   */
  static async unlockSecurity(
    pdfBytes: Uint8Array,
    password?: string
  ): Promise<UnlockSecurityResult> {
    const report = await this.inspectSecurity(pdfBytes);

    if (!report.isEncrypted) {
      return {
        cleanBytes: pdfBytes,
        securityReport: report,
        unlockedType: 'already_unencrypted',
        message: 'This document is already unencrypted and has no security restrictions.',
      };
    }

    let decryptedRaw: Uint8Array;

    if (report.isPermissionRestrictedOnly) {
      // CASE A: Permission-restricted only (No Open Password required)
      try {
        decryptedRaw = await decryptPDF(new Uint8Array(pdfBytes), '');
      } catch (err: any) {
        // If empty password fails, try owner password if user provided one
        if (password) {
          decryptedRaw = await decryptPDF(new Uint8Array(pdfBytes), password);
        } else {
          throw new Error(`Failed to remove permission restrictions: ${err.message}`);
        }
      }
    } else {
      // CASE B: Password-protected (Document Open Password required)
      if (!password || password.trim().length === 0) {
        throw new Error('PASSWORD_REQUIRED: Document is password-protected. Please enter the document open password.');
      }

      try {
        decryptedRaw = await decryptPDF(new Uint8Array(pdfBytes), password);
      } catch (err: any) {
        const msg = (err.message || '').toLowerCase();
        if (msg.includes('password') || msg.includes('incorrect') || msg.includes('decrypt')) {
          throw new Error('INCORRECT_PASSWORD: The password entered is incorrect. Please verify and try again.');
        }
        throw new Error(`Decryption error: ${err.message}`);
      }
    }

    // Reconstruct clean, completely unencrypted PDF without /Encrypt dictionary in trailer
    const cleanDoc = await PDFDocument.load(Buffer.from(decryptedRaw), {
      ignoreEncryption: true,
      updateMetadata: false,
    });

    // Remove encryption object and reference
    delete (cleanDoc.context as any).trailerInfo?.Encrypt;

    const cleanBytes = await cleanDoc.save();

    // Verify output is genuinely unencrypted
    const checkReport = await this.inspectSecurity(cleanBytes);
    if (checkReport.isEncrypted) {
      throw new Error('Security removal failed: /Encrypt dictionary still present in output.');
    }

    return {
      cleanBytes,
      securityReport: report,
      unlockedType: report.isPermissionRestrictedOnly
        ? 'permission_removed'
        : 'password_unlocked',
      message: report.isPermissionRestrictedOnly
        ? 'Permission restrictions successfully removed! Full printing, editing, and copying are now unlocked.'
        : 'Password protection removed! Unlocked document saved without encryption.',
    };
  }
}
