import React, { useState } from 'react';
import { X, FilePlus, Sparkles } from 'lucide-react';
import { usePdf } from '../../context/PdfContext';

export const NewBlankModal: React.FC = () => {
  const { isNewBlankModalOpen, setIsNewBlankModalOpen, createBlank } = usePdf();

  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'legal'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [pageCount, setPageCount] = useState<number>(1);

  if (!isNewBlankModalOpen) return null;

  const handleCreate = async () => {
    await createBlank(pageSize, orientation, pageCount);
    setIsNewBlankModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center">
              <FilePlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Create Blank PDF</h2>
              <p className="text-xs text-slate-500">Configure page dimensions and layout</p>
            </div>
          </div>
          <button
            onClick={() => setIsNewBlankModalOpen(false)}
            className="p-1.5 hover:bg-slate-200 rounded-md text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* Page Standard */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Page Size</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPageSize('a4')}
                className={`py-2 px-3 rounded-lg border text-center transition ${
                  pageSize === 'a4'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>A4</span>
                <span className="block text-[10px] text-slate-400 font-normal">210 × 297 mm</span>
              </button>

              <button
                type="button"
                onClick={() => setPageSize('letter')}
                className={`py-2 px-3 rounded-lg border text-center transition ${
                  pageSize === 'letter'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>US Letter</span>
                <span className="block text-[10px] text-slate-400 font-normal">8.5 × 11 in</span>
              </button>

              <button
                type="button"
                onClick={() => setPageSize('legal')}
                className={`py-2 px-3 rounded-lg border text-center transition ${
                  pageSize === 'legal'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>US Legal</span>
                <span className="block text-[10px] text-slate-400 font-normal">8.5 × 14 in</span>
              </button>
            </div>
          </div>

          {/* Orientation */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Orientation</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`py-2 px-3 rounded-lg border text-center transition ${
                  orientation === 'portrait'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Portrait
              </button>

              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`py-2 px-3 rounded-lg border text-center transition ${
                  orientation === 'landscape'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Landscape
              </button>
            </div>
          </div>

          {/* Initial Page Count */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Number of Blank Pages</label>
            <input
              type="number"
              min={1}
              max={50}
              value={pageCount}
              onChange={(e) => setPageCount(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))}
              className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-xs bg-white focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2">
          <button
            onClick={() => setIsNewBlankModalOpen(false)}
            className="px-4 py-2 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition shadow-xs"
          >
            Create Document
          </button>
        </div>
      </div>
    </div>
  );
};
