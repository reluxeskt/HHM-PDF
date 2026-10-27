import React, { useRef, useEffect } from 'react';
import { usePdf } from '../context/PdfContext';
import { PageView } from './PageView';
import { Loader2 } from 'lucide-react';

export const PdfCanvas: React.FC = () => {
  const {
    activeDoc,
    currentPage,
    setCurrentPage,
    pdfJsDoc,
    continuousScroll,
    isProcessing,
    statusMessage,
    openPdfFile,
    zoom,
    setZoom,
  } = usePdf();

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<{ [page: number]: HTMLDivElement | null }>({});

  // Scroll to active page when currentPage changes
  useEffect(() => {
    if (continuousScroll && pageRefs.current[currentPage]) {
      pageRefs.current[currentPage]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentPage, continuousScroll]);

  // Handle Ctrl+Wheel to Zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        setZoom((prev) => Math.min(3.0, Math.max(0.4, Number((prev + delta).toFixed(2)))));
      }
    };

    const el = containerRef.current;
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
      return () => el.removeEventListener('wheel', handleWheel);
    }
  }, [setZoom]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        openPdfFile(file);
      }
    }
  };

  if (!activeDoc || !pdfJsDoc) {
    return (
      <div className="flex-1 bg-[#525659] dark:bg-slate-950 flex items-center justify-center text-white/80">
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <span className="text-sm font-medium">{statusMessage || 'Preparing document...'}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="flex-1 bg-[#525659] dark:bg-[#0f172a] overflow-auto flex flex-col items-center py-6 px-4 select-none relative"
      style={{
        backgroundImage: 'radial-gradient(circle, #5b5f63 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* Processing Banner */}
      {isProcessing && (
        <div className="fixed top-28 right-8 z-50 bg-slate-900/90 text-white px-3 py-2 rounded-lg shadow-xl flex items-center space-x-2 text-xs backdrop-blur-sm border border-slate-700">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Pages Container */}
      {continuousScroll ? (
        // Continuous Scroll: All Pages
        <div className="flex flex-col items-center">
          {Array.from({ length: activeDoc.pageCount }, (_, i) => i + 1).map((pageNum) => (
            <div
              key={pageNum}
              ref={(el) => {
                pageRefs.current[pageNum] = el;
              }}
              className="flex justify-center"
            >
              <PageView pageNumber={pageNum} pdfJsDoc={pdfJsDoc} />
            </div>
          ))}
        </div>
      ) : (
        // Single Page View
        <div className="flex flex-col items-center justify-center min-h-full">
          <PageView pageNumber={currentPage} pdfJsDoc={pdfJsDoc} />
        </div>
      )}
    </div>
  );
};
