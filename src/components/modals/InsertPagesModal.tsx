import React, { useState, useRef } from 'react';
import { X, FolderInput, FileText, Upload, Check } from 'lucide-react';
import { usePdf } from '../../context/PdfContext';
import { PdfEngine } from '../../services/pdfEngine';

export const InsertPagesModal: React.FC = () => {
  const {
    isInsertPagesModalOpen,
    setIsInsertPagesModalOpen,
    activeDoc,
    currentPage,
    insertPagesFromPdf,
  } = usePdf();

  const [sourceDoc, setSourceDoc] = useState<{
    name: string;
    size: number;
    pageCount: number;
    data: Uint8Array;
  } | null>(null);

  const [insertPosition, setInsertPosition] = useState<'after-current' | 'beginning' | 'end'>('after-current');
  const [sourceRange, setSourceRange] = useState<'all' | 'custom'>('all');
  const [customRangeStr, setCustomRangeStr] = useState('1');
  const [isInserting, setIsInserting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isInsertPagesModalOpen || !activeDoc) return null;

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const buffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      try {
        const { pageCount } = await PdfEngine.inspectPdf(uint8, file.name);
        setSourceDoc({
          name: file.name,
          size: file.size,
          pageCount,
          data: uint8,
        });
      } catch (err) {
        alert('Invalid PDF document.');
      }
    }
  };

  const handleInsert = async () => {
    if (!sourceDoc) {
      alert('Please select a PDF document to insert pages from.');
      return;
    }

    let atIndex0Based = currentPage; // After current page
    if (insertPosition === 'beginning') atIndex0Based = 0;
    else if (insertPosition === 'end') atIndex0Based = activeDoc.pageCount;

    let pageIndices0Based: number[] | undefined = undefined;
    if (sourceRange === 'custom') {
      const parts = customRangeStr.split(',').map((s) => s.trim());
      const indices: number[] = [];
      parts.forEach((p) => {
        if (p.includes('-')) {
          const [s, e] = p.split('-').map((n) => parseInt(n.trim(), 10));
          for (let i = s; i <= e; i++) {
            if (i >= 1 && i <= sourceDoc.pageCount) indices.push(i - 1);
          }
        } else {
          const num = parseInt(p, 10);
          if (num >= 1 && num <= sourceDoc.pageCount) indices.push(num - 1);
        }
      });
      pageIndices0Based = indices;
    }

    setIsInserting(true);
    await insertPagesFromPdf(sourceDoc.data, atIndex0Based, pageIndices0Based);
    setIsInserting(false);
    setIsInsertPagesModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FolderInput className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Insert Pages from PDF</h2>
              <p className="text-xs text-slate-500">
                Import pages from an external document into <strong className="text-slate-700">{activeDoc.name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsInsertPagesModalOpen(false)}
            className="p-1.5 hover:bg-slate-200 rounded-md text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* File Picker */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Source PDF File
            </label>
            {sourceDoc ? (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2 truncate">
                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="truncate">
                    <span className="font-semibold text-slate-800 block truncate">{sourceDoc.name}</span>
                    <span className="text-[11px] text-slate-400">
                      {sourceDoc.pageCount} pages • {(sourceDoc.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSourceDoc(null)}
                  className="text-xs text-blue-600 font-semibold hover:underline ml-2"
                >
                  Change
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-lg p-5 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/20 transition"
              >
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <span className="text-xs font-semibold text-slate-700 block">
                  Click to select external PDF
                </span>
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

          {sourceDoc && (
            <>
              {/* Which Pages to Insert */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Pages to Insert
                </label>
                <div className="flex space-x-3 mb-2">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="sourceRange"
                      checked={sourceRange === 'all'}
                      onChange={() => setSourceRange('all')}
                      className="accent-emerald-600"
                    />
                    <span>All Pages ({sourceDoc.pageCount} pages)</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="sourceRange"
                      checked={sourceRange === 'custom'}
                      onChange={() => setSourceRange('custom')}
                      className="accent-emerald-600"
                    />
                    <span>Page Range</span>
                  </label>
                </div>

                {sourceRange === 'custom' && (
                  <input
                    type="text"
                    value={customRangeStr}
                    onChange={(e) => setCustomRangeStr(e.target.value)}
                    placeholder="e.g. 1-2, 3"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white focus:outline-hidden focus:border-emerald-500"
                  />
                )}
              </div>

              {/* Insertion Position */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Insertion Target Location
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-slate-50 border border-slate-200">
                    <input
                      type="radio"
                      name="insertPos"
                      checked={insertPosition === 'after-current'}
                      onChange={() => setInsertPosition('after-current')}
                      className="accent-emerald-600"
                    />
                    <span>
                      After current page (Page {currentPage} of {activeDoc.pageCount})
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-slate-50 border border-slate-200">
                    <input
                      type="radio"
                      name="insertPos"
                      checked={insertPosition === 'beginning'}
                      onChange={() => setInsertPosition('beginning')}
                      className="accent-emerald-600"
                    />
                    <span>At the beginning of the document (Before Page 1)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-slate-50 border border-slate-200">
                    <input
                      type="radio"
                      name="insertPos"
                      checked={insertPosition === 'end'}
                      onChange={() => setInsertPosition('end')}
                      className="accent-emerald-600"
                    />
                    <span>At the end of the document (After Page {activeDoc.pageCount})</span>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2">
          <button
            onClick={() => setIsInsertPagesModalOpen(false)}
            className="px-4 py-2 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleInsert}
            disabled={!sourceDoc || isInserting}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition shadow-xs disabled:opacity-40"
          >
            {isInserting ? 'Inserting...' : 'Insert Pages'}
          </button>
        </div>
      </div>
    </div>
  );
};
