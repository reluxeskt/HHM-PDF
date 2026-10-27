import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Unlock,
  ShieldCheck,
  AlertTriangle,
  Eye,
  EyeOff,
  CheckCircle2,
  FileCheck,
  Download,
  Info,
} from 'lucide-react';
import { usePdf } from '../../context/PdfContext';
import { SecurityEngine, PdfSecurityReport } from '../../services/securityEngine';

export const UnlockSecurityModal: React.FC = () => {
  const {
    isUnlockModalOpen,
    setIsUnlockModalOpen,
    activeDoc,
    openPdfBuffer,
  } = usePdf();

  const [isLoading, setIsLoading] = useState(true);
  const [report, setReport] = useState<PdfSecurityReport | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    cleanBytes: Uint8Array;
    message: string;
    filename: string;
  } | null>(null);

  // Inspect document security whenever modal opens
  useEffect(() => {
    if (isUnlockModalOpen && activeDoc) {
      setIsLoading(true);
      setErrorMsg(null);
      setPassword('');
      setSuccessResult(null);

      SecurityEngine.inspectSecurity(activeDoc.data)
        .then((rep) => {
          setReport(rep);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('Security inspection failed:', err);
          setErrorMsg('Failed to inspect document encryption structure.');
          setIsLoading(false);
        });
    }
  }, [isUnlockModalOpen, activeDoc]);

  if (!isUnlockModalOpen || !activeDoc) return null;

  const handleUnlock = async () => {
    setErrorMsg(null);
    setIsProcessing(true);

    try {
      const res = await SecurityEngine.unlockSecurity(activeDoc.data, password);

      const cleanDocName = activeDoc.name.replace(/\.[^/.]+$/, '');
      const newFilename = `${cleanDocName}_Unlocked.pdf`;

      // Download unlocked copy immediately
      downloadFile(res.cleanBytes, newFilename);

      setSuccessResult({
        cleanBytes: res.cleanBytes,
        message: res.message,
        filename: newFilename,
      });

      // Clear password from memory immediately
      setPassword('');
    } catch (err: any) {
      const msg = err.message || 'Decryption failed.';
      if (msg.includes('INCORRECT_PASSWORD')) {
        setErrorMsg('The password entered is incorrect. Please verify and try again.');
      } else if (msg.includes('PASSWORD_REQUIRED')) {
        setErrorMsg('Please enter the document open password to proceed.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenUnlockedInEditor = async () => {
    if (successResult) {
      await openPdfBuffer(successResult.cleanBytes, successResult.filename);
      setIsUnlockModalOpen(false);
    }
  };

  const downloadFile = (bytes: Uint8Array, filename: string) => {
    const blob = new Blob([bytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
              <Unlock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Unlock PDF / Remove Security</h2>
              <p className="text-[11px] text-slate-500">
                Safely remove permission restrictions or open passwords
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setPassword('');
              setIsUnlockModalOpen(false);
            }}
            className="p-1.5 hover:bg-slate-200 rounded-md text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-2 text-slate-500">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Inspecting PDF encryption structure...</span>
            </div>
          ) : successResult ? (
            <div className="py-4 space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start space-x-3 text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Security Successfully Removed</h4>
                  <p className="text-xs text-emerald-800 mt-1">{successResult.message}</p>
                  <p className="text-[11px] text-emerald-700 mt-2 font-mono">
                    Downloaded: {successResult.filename}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={handleOpenUnlockedInEditor}
                  className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition shadow-xs flex items-center justify-center space-x-1.5"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Open Unlocked PDF in Editor</span>
                </button>
                <button
                  onClick={() => setIsUnlockModalOpen(false)}
                  className="py-2 px-4 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition"
                >
                  Done
                </button>
              </div>
            </div>
          ) : report && !report.isEncrypted ? (
            <div className="py-4 space-y-3">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start space-x-3 text-blue-900">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">No Security Restrictions</h4>
                  <p className="text-xs text-blue-800 mt-1">
                    "{activeDoc.name}" is completely unencrypted. Printing, content copying, page modification, and form filling are already unrestricted.
                  </p>
                </div>
              </div>
            </div>
          ) : report?.isPermissionRestrictedOnly ? (
            // CASE A: Permission-restricted only
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-3 text-amber-900">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <h4 className="font-bold text-slate-800">Permission Restrictions Enforced</h4>
                  <p className="text-slate-600">
                    This document opens freely for viewing, but an owner password restricts permissions.
                  </p>
                </div>
              </div>

              {/* Detected Permissions Grid */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                <div className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
                  Current Document Permissions:
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center space-x-1.5">
                    <span className={report.permissions.canPrint ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                      {report.permissions.canPrint ? '✓' : '✗'}
                    </span>
                    <span className="text-slate-700">Printing:</span>
                    <span className="font-medium text-slate-500">
                      {report.permissions.canPrint ? 'Allowed' : 'Restricted'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className={report.permissions.canModify ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                      {report.permissions.canModify ? '✓' : '✗'}
                    </span>
                    <span className="text-slate-700">Editing/Pages:</span>
                    <span className="font-medium text-slate-500">
                      {report.permissions.canModify ? 'Allowed' : 'Restricted'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className={report.permissions.canCopy ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                      {report.permissions.canCopy ? '✓' : '✗'}
                    </span>
                    <span className="text-slate-700">Content Copying:</span>
                    <span className="font-medium text-slate-500">
                      {report.permissions.canCopy ? 'Allowed' : 'Restricted'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className={report.permissions.canAnnotate ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                      {report.permissions.canAnnotate ? '✓' : '✗'}
                    </span>
                    <span className="text-slate-700">Annotations:</span>
                    <span className="font-medium text-slate-500">
                      {report.permissions.canAnnotate ? 'Allowed' : 'Restricted'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg flex items-start space-x-2 text-[11px] text-blue-900">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  HHM PDF can unlock these permissions and remove the restriction dictionary without needing a password. The original file remains untouched.
                </span>
              </div>
            </div>
          ) : (
            // CASE B: Password-Protected (Open Password Required)
            <div className="space-y-4">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start space-x-3 text-rose-900">
                <Lock className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <h4 className="font-bold text-slate-800">Document Open Password Required</h4>
                  <p className="text-slate-600">
                    This PDF is encrypted with {report?.encryptionAlgorithm}. Enter the document password to decrypt and save an unlocked copy.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Document Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter document open password..."
                    className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-500 space-y-0.5">
                <div className="font-semibold text-slate-600">Privacy & Local Processing:</div>
                <p>
                  Passwords are processed locally in your browser memory and never sent to external servers or logged.
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        {!successResult && (
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              {report?.isEncrypted ? `Algorithm: ${report.encryptionAlgorithm}` : 'Unprotected'}
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setPassword('');
                  setIsUnlockModalOpen(false);
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              {report?.isEncrypted && (
                <button
                  onClick={handleUnlock}
                  disabled={isProcessing || (report.requiresOpenPassword && !password)}
                  className={`px-5 py-2 font-bold text-xs rounded-lg transition shadow-xs flex items-center space-x-1.5 ${
                    isProcessing || (report.requiresOpenPassword && !password)
                      ? 'bg-blue-400 text-white cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>
                    {isProcessing
                      ? 'Decrypting...'
                      : report.isPermissionRestrictedOnly
                      ? 'Remove Restrictions'
                      : 'Unlock & Save'}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
