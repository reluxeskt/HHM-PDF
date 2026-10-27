import React, { useState, useRef } from 'react';
import { X, Layers, Upload, ArrowRight, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { usePdf } from '../../context/PdfContext';
import { PdfEngine } from '../../services/pdfEngine';

export const CompareModal: React.FC = () => {
  const { isCompareModalOpen, setIsCompareModalOpen, activeDoc } = usePdf();

  const [compareDoc, setCompareDoc] = useState<{ name: string; size: number; pageCount: number; data: Uint8Array } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isCompareModalOpen || !activeDoc) return null;

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const buffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      try {
        const { pageCount } = await PdfEngine.inspectPdf(uint8, file.name);
        setCompareDoc({
          name: file.name,
          size: file.size,
          pageCount,
          data: uint8,
        });
      } catch (err) {
        alert('Invalid PDF file selected for comparison.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-indigo-50/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Compare Two PDF Documents</h2>
              <p className="text-xs text-slate-500">
                Identify differences, revisions, and page additions between two versions.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCompareModalOpen(false)}
            className="p-1.5 hover:bg-slate-200 rounded-md text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* Compare Documents Selector */}
          <div className="grid grid-cols-2 gap-4">
            {/* Doc 1: Active Document */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Original Document (Current)
              </span>
              <div className="flex items-center space-x-2 mt-2">
                <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                <div className="truncate">
                  <h4 className="font-semibold text-slate-800 truncate">{activeDoc.name}</h4>
                  <span className="text-slate-400 text-[11px]">
                    {activeDoc.pageCount} pages • {(activeDoc.fileSize / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>
            </div>

            {/* Doc 2: Target File */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Revised Document (To Compare)
              </span>
              {compareDoc ? (
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-2 truncate">
                    <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                    <div className="truncate">
                      <h4 className="font-semibold text-slate-800 truncate">{compareDoc.name}</h4>
                      <span className="text-slate-400 text-[11px]">
                        {compareDoc.pageCount} pages • {(compareDoc.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setCompareDoc(null)}
                    className="text-slate-400 hover:text-red-600 text-xs ml-2"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 border border-dashed border-slate-300 rounded-md p-3 text-center cursor-pointer hover:border-indigo-400 hover:bg-white transition"
                >
                  <Upload className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                  <span className="text-indigo-600 font-semibold block">Select Revised PDF</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="application/pdf"
                    onChange={handleFileChosen}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Comparison Findings */}
          {compareDoc && (
            <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-3">
              <h3 className="font-bold text-slate-800 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Difference Analysis Report</span>
              </h3>

              <div className="divide-y divide-slate-100 text-xs">
                <div className="flex justify-between py-2">
                  <span className="text-slate-600">Page Count:</span>
                  <span className="font-medium">
                    {activeDoc.pageCount === compareDoc.pageCount ? (
                      <span className="text-emerald-600">Identical ({activeDoc.pageCount} pages)</span>
                    ) : (
                      <span className="text-amber-600">
                        Differs ({activeDoc.pageCount} vs {compareDoc.pageCount} pages)
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-600">File Size Difference:</span>
                  <span className="font-medium text-slate-800">
                    {Math.abs((activeDoc.fileSize - compareDoc.size) / 1024).toFixed(1)} KB delta
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-600">Annotations & Signatures:</span>
                  <span className="font-medium text-slate-800">
                    {activeDoc.signatures.length} signatures, {activeDoc.redactions.length} redactions in active copy
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={() => setIsCompareModalOpen(false)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold shadow-xs transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
