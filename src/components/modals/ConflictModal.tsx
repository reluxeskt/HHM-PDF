import React from 'react';
import { AlertTriangle, Clock, RefreshCw, FileText, CheckCircle2 } from 'lucide-react';
import { SyncConflictInfo } from '../../../packages/shared/src/types';

interface Props {
  isOpen: boolean;
  conflict: SyncConflictInfo | null;
  onResolve: (choice: 'keep_local' | 'keep_remote' | 'save_copy') => void;
  onClose: () => void;
}

export const ConflictModal: React.FC<Props> = ({
  isOpen,
  conflict,
  onResolve,
  onClose,
}) => {
  if (!isOpen || !conflict) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center space-x-3 px-6 py-4 bg-amber-50 border-b border-amber-200">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-amber-900">
              Document Synchronization Conflict
            </h3>
            <p className="text-xs text-amber-700">
              A newer version of this document was found in Firebase Cloud.
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="p-6 space-y-4 text-xs text-slate-700">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="font-semibold text-slate-900 truncate max-w-xs flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                {conflict.documentName}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-200 text-slate-800">
                ID: {conflict.documentId.substring(0, 8)}...
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="p-2.5 rounded bg-white border border-slate-200">
                <div className="font-semibold text-slate-900 mb-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Your Local Copy
                </div>
                <p className="text-slate-600">Version: <span className="font-bold">v{conflict.localVersion}</span></p>
                <p className="text-slate-500 text-[11px]">Edited on this device</p>
              </div>

              <div className="p-2.5 rounded bg-white border border-amber-300 bg-amber-50/30">
                <div className="font-semibold text-amber-900 mb-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Cloud Version
                </div>
                <p className="text-slate-600">Version: <span className="font-bold">v{conflict.remoteVersion}</span></p>
                <p className="text-slate-500 text-[11px] truncate">
                  Updated: {new Date(conflict.remoteUpdatedAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>

          <p className="text-slate-600 leading-relaxed">
            Another device modified this document while you were working offline or in another session. How would you like to resolve this conflict?
          </p>

          {/* Action Choices */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => onResolve('save_copy')}
              className="w-full flex items-center justify-between p-3 rounded-lg border-2 border-blue-600 hover:bg-blue-50/50 transition-colors text-left"
            >
              <div>
                <p className="font-bold text-blue-900 text-xs">
                  Save as Copy (Recommended)
                </p>
                <p className="text-[11px] text-blue-700">
                  Keep both: your local edits will be saved as "{conflict.documentName.replace(/\.pdf$/i, '')}_copy.pdf"
                </p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 ml-2" />
            </button>

            <button
              onClick={() => onResolve('keep_local')}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-left"
            >
              <div>
                <p className="font-bold text-slate-800 text-xs">
                  Overwrite Cloud with Local Version
                </p>
                <p className="text-[11px] text-slate-500">
                  Replace the remote version with your current local edits.
                </p>
              </div>
            </button>

            <button
              onClick={() => onResolve('keep_remote')}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-left"
            >
              <div>
                <p className="font-bold text-slate-800 text-xs">
                  Discard Local Edits & Load Cloud Version
                </p>
                <p className="text-[11px] text-slate-500">
                  Replace current local buffer with the latest version from Firebase Cloud.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-white text-xs font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
