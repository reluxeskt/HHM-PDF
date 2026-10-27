import React, { useState } from 'react';
import { X, ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { usePdf } from '../../context/PdfContext';

export const RedactionModal: React.FC = () => {
  const {
    isRedactionModalOpen,
    setIsRedactionModalOpen,
    activeDoc,
    applyBurnedRedactions,
    setActiveTool,
    toolSettings,
    setToolSettings,
  } = usePdf();

  const [overlayText, setOverlayText] = useState(toolSettings.redactionOverlayText || 'REDACTED');
  const [isScrubbing, setIsScrubbing] = useState(false);

  if (!isRedactionModalOpen || !activeDoc) return null;

  const redactionsCount = activeDoc.redactions.length;

  const handleApplyRedactions = async () => {
    setIsScrubbing(true);
    await applyBurnedRedactions();
    setIsScrubbing(false);
    setIsRedactionModalOpen(false);
  };

  const handleStartMarking = () => {
    setActiveTool('redact');
    setIsRedactionModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-rose-100 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Permanent Redaction Tool</h2>
              <p className="text-xs text-rose-700 font-medium">
                Cryptographically safe content removal
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsRedactionModalOpen(false)}
            className="p-1.5 hover:bg-slate-200 rounded-md text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* Permanent Redaction Guarantee Notice */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-2.5 text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-xs">Permanent Deletion Warning</h4>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Unlike simple black highlight rectangles, applying permanent redaction burns opaque solid blocks directly into the PDF content stream, obliterating all underlying text, glyphs, and images. Redacted data cannot be recovered by any software.
              </p>
            </div>
          </div>

          {/* Status of marked boxes */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Currently Marked Redactions:</span>
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-xs">
                {redactionsCount} {redactionsCount === 1 ? 'box' : 'boxes'}
              </span>
            </div>
            {redactionsCount === 0 && (
              <p className="text-slate-400 mt-2 text-[11px]">
                No redaction boxes currently drawn on the document. Click "Mark Redaction Box" below to drag redaction boxes over sensitive text.
              </p>
            )}
          </div>

          {/* Redaction Options */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Overlay Label Text (Optional)
            </label>
            <input
              type="text"
              value={overlayText}
              onChange={(e) => {
                setOverlayText(e.target.value);
                setToolSettings((prev) => ({ ...prev, redactionOverlayText: e.target.value }));
              }}
              placeholder="e.g. REDACTED, CONFIDENTIAL, or leave empty for solid black"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-xs bg-white focus:outline-hidden focus:border-rose-500 font-mono"
            />
            <div className="flex space-x-2 mt-2">
              <button
                type="button"
                onClick={() => setOverlayText('REDACTED')}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-mono"
              >
                REDACTED
              </button>
              <button
                type="button"
                onClick={() => setOverlayText('RESTRICTED')}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-mono"
              >
                RESTRICTED
              </button>
              <button
                type="button"
                onClick={() => setOverlayText('')}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-mono"
              >
                (Solid Black)
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleStartMarking}
            className="text-xs text-blue-600 font-semibold hover:underline"
          >
            Mark Redaction Box on Page →
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsRedactionModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Close
            </button>
            <button
              onClick={handleApplyRedactions}
              disabled={redactionsCount === 0 || isScrubbing}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-bold disabled:opacity-40 transition shadow-xs flex items-center space-x-1.5"
            >
              <span>{isScrubbing ? 'Applying Redaction...' : 'Burn & Permanently Redact'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
