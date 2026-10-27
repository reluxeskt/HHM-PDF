import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Download,
  X,
  FileCheck,
} from 'lucide-react';
import { usePdf } from '../../context/PdfContext';
import { PdfEngine } from '../../services/pdfEngine';
import { EncryptPdfConfig } from '../../types';

export const PasswordProtectModal: React.FC = () => {
  const {
    activeDoc,
    isProtectModalOpen,
    setIsProtectModalOpen,
    setStatusMessage,
  } = usePdf();

  const [userPassword, setUserPassword] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);
  const [algorithm, setAlgorithm] = useState<'AES-256' | 'RC4'>('AES-256');

  // Permission controls
  const [allowPrinting, setAllowPrinting] = useState(true);
  const [allowCopying, setAllowCopying] = useState(false);
  const [allowModifying, setAllowModifying] = useState(false);
  const [allowAnnotating, setAllowAnnotating] = useState(true);
  const [allowFillingForms, setAllowFillingForms] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ fileName: string; size: number } | null>(null);

  if (!isProtectModalOpen || !activeDoc) return null;

  // Password strength calculation
  const getPasswordStrength = (pw: string) => {
    if (!pw) return { score: 0, label: 'None', color: 'bg-slate-200' };
    let score = 0;
    if (pw.length >= 8) score += 1;
    if (pw.length >= 12) score += 1;
    if (/[A-Z]/.test(pw)) score += 1;
    if (/[0-9]/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;

    if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score <= 4) return { score: 2, label: 'Moderate', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(userPassword);

  const handleApplyEncryption = async () => {
    if (!userPassword.trim() && !ownerPassword.trim()) {
      setError('Please provide at least a Document Open password or Permissions password.');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setStatusMessage('Encrypting PDF document...');

      const config: EncryptPdfConfig = {
        userPassword: userPassword.trim(),
        ownerPassword: ownerPassword.trim() || undefined,
        algorithm,
        allowPrinting,
        allowCopying,
        allowModifying,
        allowAnnotating,
        allowFillingForms,
      };

      const encryptedBytes = await PdfEngine.encryptPdf(activeDoc.data, config);

      // Verify that the output PDF actually requires encryption
      const isEnc = PdfEngine.isPdfEncrypted(encryptedBytes);
      if (!isEnc) {
        throw new Error('Encryption verification failed: /Encrypt dictionary was not properly written.');
      }

      // Non-destructive export
      const safeBaseName = activeDoc.name.replace(/\.pdf$/i, '');
      const outName = `${safeBaseName}_protected.pdf`;

      const blob = new Blob([encryptedBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccessResult({ fileName: outName, size: encryptedBytes.length });
      setStatusMessage(`Successfully encrypted and saved "${outName}"`);
    } catch (err: any) {
      console.error('Failed to encrypt PDF:', err);
      setError(err?.message || 'Failed to encrypt document with the specified parameters.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    // Clear passwords from memory
    setUserPassword('');
    setOwnerPassword('');
    setError(null);
    setSuccessResult(null);
    setIsProtectModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold leading-tight">Encrypt & Protect PDF</h2>
              <p className="text-xs text-slate-300">
                Configure standard ISO 32000 password protection and document permission restrictions
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-sm">
          {successResult ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-emerald-900">Document Protected Successfully</h3>
              <p className="text-xs text-emerald-700 max-w-md mx-auto">
                <strong>{successResult.fileName}</strong> ({(successResult.size / 1024).toFixed(1)} KB) has been downloaded.
                Opening this file now requires the configured password.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-xs"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-700">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Distinction Banner */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-start gap-2">
                <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Security Note:</strong> Password protection encrypts document streams using standard cryptographic keys.
                  For proving author identity and non-repudiation, use <em>Digital Certificates</em> under the Form ribbon.
                </div>
              </div>

              {/* Password Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Document Open Password (User Password)
                  </label>
                  <div className="relative">
                    <input
                      type={showUserPassword ? 'text' : 'password'}
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      placeholder="Required to open and view the PDF"
                      className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUserPassword(!showUserPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Strength Bar */}
                  {userPassword && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-1">
                        <div
                          className={`h-full flex-1 rounded-full ${
                            strength.score >= 1 ? strength.color : 'bg-slate-200'
                          }`}
                        />
                        <div
                          className={`h-full flex-1 rounded-full ${
                            strength.score >= 2 ? strength.color : 'bg-slate-200'
                          }`}
                        />
                        <div
                          className={`h-full flex-1 rounded-full ${
                            strength.score >= 3 ? strength.color : 'bg-slate-200'
                          }`}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-slate-500">{strength.label}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Permissions Password (Owner Password — Optional)
                  </label>
                  <div className="relative">
                    <input
                      type={showOwnerPassword ? 'text' : 'password'}
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      placeholder="Required to change permissions or decrypt"
                      className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showOwnerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    If set, users cannot alter security permissions without this owner password.
                  </p>
                </div>
              </div>

              {/* Encryption Algorithm */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Encryption Standard
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                      algorithm === 'AES-256'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-1 ring-blue-600'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="algorithm"
                      checked={algorithm === 'AES-256'}
                      onChange={() => setAlgorithm('AES-256')}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <div className="font-semibold text-xs">AES 256-bit (Recommended)</div>
                      <div className="text-[11px] text-slate-500">
                        Modern industry standard (ISO 32000-1 compatible)
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                      algorithm === 'RC4'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-1 ring-blue-600'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="algorithm"
                      checked={algorithm === 'RC4'}
                      onChange={() => setAlgorithm('RC4')}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <div className="font-semibold text-xs">RC4 128-bit (Legacy)</div>
                      <div className="text-[11px] text-slate-500">
                        Compatibility with legacy PDF 1.4 viewers
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Granular Permission Controls */}
              <div className="border-t border-slate-100 pt-4">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Document Permissions
                </label>
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowPrinting}
                      onChange={(e) => setAllowPrinting(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span className="font-medium text-slate-800">Allow Printing</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowCopying}
                      onChange={(e) => setAllowCopying(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span className="font-medium text-slate-800">Allow Copying text, images, and content</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowModifying}
                      onChange={(e) => setAllowModifying(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span className="font-medium text-slate-800">Allow Modifying the document structure & pages</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowAnnotating}
                      onChange={(e) => setAllowAnnotating(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span className="font-medium text-slate-800">Allow Annotating, markup, and comments</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowFillingForms}
                      onChange={(e) => setAllowFillingForms(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span className="font-medium text-slate-800">Allow Filling existing interactive form fields</span>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!successResult && (
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-blue-600" />
              Saves a separate protected copy ({activeDoc.name.replace(/\.pdf$/i, '')}_protected.pdf)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-medium text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing || (!userPassword && !ownerPassword)}
                onClick={handleApplyEncryption}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg text-xs shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                {isProcessing ? 'Encrypting...' : 'Apply & Save Protected PDF'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
