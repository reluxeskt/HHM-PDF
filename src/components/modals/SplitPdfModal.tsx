import React, { useState } from 'react';
import { X, Split, FileText, Check, AlertCircle } from 'lucide-react';
import { usePdf } from '../../context/PdfContext';

export const SplitPdfModal: React.FC = () => {
  const { isSplitModalOpen, setIsSplitModalOpen, activeDoc, splitPdfByRanges } = usePdf();

  const [splitMode, setSplitMode] = useState<'ranges' | 'fixed' | 'odd-even'>('ranges');
  const [rangeInput, setRangeInput] = useState('1, 2-3');
  const [everyNPages, setEveryNPages] = useState<number>(1);
  const [isSplitting, setIsSplitting] = useState(false);

  if (!isSplitModalOpen || !activeDoc) return null;

  // Helper to parse "1-2, 3-5" into 0-based page arrays
  const parseRanges = (): { name: string; pageIndices0Based: number[] }[] => {
    const total = activeDoc.pageCount;
    const baseName = activeDoc.name.replace(/\.[^/.]+$/, '');

    if (splitMode === 'fixed') {
      const results: { name: string; pageIndices0Based: number[] }[] = [];
      let part = 1;
      for (let i = 0; i < total; i += everyNPages) {
        const pageIndices: number[] = [];
        for (let j = i; j < Math.min(total, i + everyNPages); j++) {
          pageIndices.push(j);
        }
        results.push({
          name: `${baseName}_Part_${part}_(Pages_${i + 1}-${Math.min(total, i + everyNPages)}).pdf`,
          pageIndices0Based: pageIndices,
        });
        part++;
      }
      return results;
    }

    if (splitMode === 'odd-even') {
      const oddIndices = Array.from({ length: total }, (_, i) => i).filter((i) => (i + 1) % 2 !== 0);
      const evenIndices = Array.from({ length: total }, (_, i) => i).filter((i) => (i + 1) % 2 === 0);
      const results = [];
      if (oddIndices.length > 0) {
        results.push({ name: `${baseName}_Odd_Pages.pdf`, pageIndices0Based: oddIndices });
      }
      if (evenIndices.length > 0) {
        results.push({ name: `${baseName}_Even_Pages.pdf`, pageIndices0Based: evenIndices });
      }
      return results;
    }

    // Custom ranges mode
    const parts = rangeInput.split(',').map((s) => s.trim()).filter(Boolean);
    const results: { name: string; pageIndices0Based: number[] }[] = [];

    parts.forEach((partStr, idx) => {
      const pageIndices: number[] = [];
      if (partStr.includes('-')) {
        const [startStr, endStr] = partStr.split('-').map((s) => parseInt(s.trim(), 10));
        const start = Math.max(1, startStr || 1);
        const end = Math.min(total, endStr || total);
        for (let p = start; p <= end; p++) {
          pageIndices.push(p - 1);
        }
      } else {
        const p = parseInt(partStr, 10);
        if (!isNaN(p) && p >= 1 && p <= total) {
          pageIndices.push(p - 1);
        }
      }

      if (pageIndices.length > 0) {
        results.push({
          name: `${baseName}_Range_${partStr.replace(/\s+/g, '')}.pdf`,
          pageIndices0Based: pageIndices,
        });
      }
    });

    return results;
  };

  const parsedResults = parseRanges();

  const handleExecuteSplit = async () => {
    if (parsedResults.length === 0) {
      alert('Please enter valid page ranges.');
      return;
    }
    setIsSplitting(true);
    await splitPdfByRanges(parsedResults);
    setIsSplitting(false);
    setIsSplitModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-amber-100 text-amber-700 flex items-center justify-center">
              <Split className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Split PDF Document</h2>
              <p className="text-xs text-slate-500">
                Split <strong className="text-slate-700">{activeDoc.name}</strong> ({activeDoc.pageCount} pages) into multiple files.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSplitModalOpen(false)}
            className="p-1.5 hover:bg-slate-200 rounded-md text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* Split Mode Selector */}
          <div>
            <label className="block font-semibold text-slate-700 mb-2">Split Method</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSplitMode('ranges')}
                className={`py-2 px-3 rounded-lg border text-center transition ${
                  splitMode === 'ranges'
                    ? 'border-amber-600 bg-amber-50/50 text-amber-800 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Custom Ranges
              </button>
              <button
                type="button"
                onClick={() => setSplitMode('fixed')}
                className={`py-2 px-3 rounded-lg border text-center transition ${
                  splitMode === 'fixed'
                    ? 'border-amber-600 bg-amber-50/50 text-amber-800 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Every N Pages
              </button>
              <button
                type="button"
                onClick={() => setSplitMode('odd-even')}
                className={`py-2 px-3 rounded-lg border text-center transition ${
                  splitMode === 'odd-even'
                    ? 'border-amber-600 bg-amber-50/50 text-amber-800 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Odd & Even Pages
              </button>
            </div>
          </div>

          {/* Mode Inputs */}
          {splitMode === 'ranges' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Page Ranges (Comma separated)
              </label>
              <input
                type="text"
                value={rangeInput}
                onChange={(e) => setRangeInput(e.target.value)}
                placeholder="e.g. 1-2, 3, 4-5"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-xs bg-white focus:outline-hidden focus:border-amber-500 font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Example: '1-2, 3' splits a 3-page document into two files (Pages 1 to 2, and Page 3).
              </span>
            </div>
          )}

          {splitMode === 'fixed' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Number of Pages per Split File
              </label>
              <input
                type="number"
                min={1}
                max={activeDoc.pageCount}
                value={everyNPages}
                onChange={(e) => setEveryNPages(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-xs bg-white focus:outline-hidden focus:border-amber-500"
              />
            </div>
          )}

          {/* Generated File Output Preview */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
            <span className="font-semibold text-slate-700 block text-[11px]">
              Output Files to Generate ({parsedResults.length}):
            </span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {parsedResults.map((res, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 bg-white rounded border border-slate-200 text-[11px]"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate font-medium text-slate-700">{res.name}</span>
                  </div>
                  <span className="text-slate-400 shrink-0 ml-2">
                    {res.pageIndices0Based.length} {res.pageIndices0Based.length === 1 ? 'page' : 'pages'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2">
          <button
            onClick={() => setIsSplitModalOpen(false)}
            className="px-4 py-2 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleExecuteSplit}
            disabled={parsedResults.length === 0 || isSplitting}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-bold transition shadow-xs disabled:opacity-40"
          >
            {isSplitting ? 'Splitting...' : `Generate ${parsedResults.length} Files`}
          </button>
        </div>
      </div>
    </div>
  );
};
