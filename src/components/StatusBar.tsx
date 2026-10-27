import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Layers,
  ScrollText,
} from 'lucide-react';
import { usePdf } from '../context/PdfContext';

export const StatusBar: React.FC = () => {
  const {
    activeDoc,
    currentPage,
    setCurrentPage,
    zoom,
    setZoom,
    continuousScroll,
    setContinuousScroll,
    statusMessage,
  } = usePdf();

  if (!activeDoc) {
    return (
      <footer className="h-6 bg-[#0b2545] dark:bg-slate-900 border-t border-[#081a31] dark:border-slate-800 text-white/70 px-3 flex items-center justify-between text-[11px] select-none">
        <span>HHM PDF • Offline Local-First Engine</span>
        <span>ISO 32000-1 PDF Standard</span>
      </footer>
    );
  }

  const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const p = parseInt(e.target.value, 10);
    if (!isNaN(p) && p >= 1 && p <= activeDoc.pageCount) {
      setCurrentPage(p);
    }
  };

  const handleZoomPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'fit-width') {
      setZoom(1.2);
    } else if (val === 'fit-page') {
      setZoom(0.85);
    } else {
      setZoom(parseFloat(val));
    }
  };

  return (
    <footer className="h-7 bg-[#f1f5f9] dark:bg-slate-900 border-t border-[#cbd5e1] dark:border-slate-800 text-slate-700 dark:text-slate-200 px-3 flex items-center justify-between text-xs select-none">
      {/* Left: Page Navigation Controls */}
      <div className="flex items-center space-x-1">
        <button
          onClick={() => setCurrentPage(1)}
          disabled={currentPage <= 1}
          title="First Page"
          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          title="Previous Page"
          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center space-x-1 px-1">
          <input
            type="number"
            min={1}
            max={activeDoc.pageCount}
            value={currentPage}
            onChange={handlePageInput}
            className="w-10 h-5 border border-slate-300 dark:border-slate-700 rounded text-center text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 font-medium"
          />
          <span className="text-slate-500 dark:text-slate-400 text-[11px]">/ {activeDoc.pageCount}</span>
        </div>

        <button
          onClick={() => setCurrentPage(Math.min(activeDoc.pageCount, currentPage + 1))}
          disabled={currentPage >= activeDoc.pageCount}
          title="Next Page"
          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setCurrentPage(activeDoc.pageCount)}
          disabled={currentPage >= activeDoc.pageCount}
          title="Last Page"
          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>

        <div className="h-3.5 w-px bg-slate-300 dark:bg-slate-700 mx-2" />

        {/* Document Stats */}
        <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
          {(activeDoc.fileSize / 1024).toFixed(1)} KB • A4 Standard (595 × 842 pt)
        </span>
      </div>

      {/* Center: Status Message */}
      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs text-center hidden md:block">
        {statusMessage}
      </div>

      {/* Right: Zoom & View Layout Controls */}
      <div className="flex items-center space-x-1.5">
        <button
          onClick={() => setContinuousScroll(!continuousScroll)}
          title={continuousScroll ? 'Switch to Single Page' : 'Switch to Continuous Scroll'}
          className={`p-1 rounded transition text-xs flex items-center space-x-1 ${
            continuousScroll ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-medium' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          <ScrollText className="w-3.5 h-3.5" />
          <span className="text-[10px] hidden lg:inline">{continuousScroll ? 'Continuous' : 'Single'}</span>
        </button>

        <div className="h-3.5 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

        <button
          onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
          title="Zoom Out (Ctrl+-)"
          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <select
          value={zoom}
          onChange={handleZoomPreset}
          className="h-5 text-[11px] border border-slate-300 dark:border-slate-700 rounded px-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
        >
          <option value={0.5}>50%</option>
          <option value={0.75}>75%</option>
          <option value={1.0}>100%</option>
          <option value={1.25}>125%</option>
          <option value={1.5}>150%</option>
          <option value={2.0}>200%</option>
          <option value="fit-width">Fit Width</option>
          <option value="fit-page">Fit Page</option>
        </select>

        <button
          onClick={() => setZoom((z) => Math.min(3.0, Number((z + 0.1).toFixed(2))))}
          title="Zoom In (Ctrl++)"
          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>
    </footer>
  );
};
