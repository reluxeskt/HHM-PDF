import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCw,
  RotateCcw,
  Trash2,
  Split,
  Plus,
  Copy,
  CheckSquare,
  Square,
  Check,
} from 'lucide-react';
import { usePdf } from '../../context/PdfContext';
import { PdfEngine } from '../../services/pdfEngine';

export const OrganizePagesModal: React.FC = () => {
  const {
    activeDoc,
    isOrganizeModalOpen,
    setIsOrganizeModalOpen,
    pdfJsDoc,
    reorderPages,
    deletePages,
    extractPages,
    insertBlankPageAt,
  } = usePdf();

  const [pageThumbnails, setPageThumbnails] = useState<{ [pageNum: number]: string }>({});
  // Page order: array of original page numbers (1-indexed)
  const [pagesList, setPagesList] = useState<number[]>([]);
  const [rotations, setRotations] = useState<{ [pageNumber: number]: number }>({});
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (activeDoc && isOrganizeModalOpen) {
      setPagesList(Array.from({ length: activeDoc.pageCount }, (_, i) => i + 1));
      setSelectedPages([]);
      setRotations({});

      if (pdfJsDoc) {
        const loadAllThumbs = async () => {
          for (let i = 1; i <= activeDoc.pageCount; i++) {
            try {
              const url = await PdfEngine.generatePageThumbnail(pdfJsDoc, i, 160);
              setPageThumbnails((prev) => ({ ...prev, [i]: url }));
            } catch (e) {
              console.warn(e);
            }
          }
        };
        loadAllThumbs();
      }
    }
  }, [activeDoc, isOrganizeModalOpen, pdfJsDoc]);

  if (!isOrganizeModalOpen || !activeDoc) return null;

  const toggleSelectPage = (pageNum: number) => {
    setSelectedPages((prev) =>
      prev.includes(pageNum) ? prev.filter((p) => p !== pageNum) : [...prev, pageNum]
    );
  };

  const selectAll = () => {
    if (selectedPages.length === pagesList.length) {
      setSelectedPages([]);
    } else {
      setSelectedPages([...pagesList]);
    }
  };

  const handleRotateSelected = (delta: number) => {
    const targets = selectedPages.length > 0 ? selectedPages : pagesList;
    setRotations((prev) => {
      const updated = { ...prev };
      targets.forEach((p) => {
        updated[p] = ((updated[p] || 0) + delta) % 360;
      });
      return updated;
    });
  };

  const handleDeleteSelected = () => {
    if (selectedPages.length === 0) {
      alert('Please select at least one page to delete.');
      return;
    }
    if (selectedPages.length >= pagesList.length) {
      alert('Cannot delete all pages. The document must have at least one page.');
      return;
    }
    setPagesList((prev) => prev.filter((p) => !selectedPages.includes(p)));
    setSelectedPages([]);
  };

  const handleDuplicateSelected = () => {
    if (selectedPages.length === 0) {
      alert('Select pages to duplicate.');
      return;
    }
    const newList = [...pagesList];
    selectedPages.forEach((p) => {
      const idx = newList.indexOf(p);
      newList.splice(idx + 1, 0, p);
    });
    setPagesList(newList);
  };

  const handleDragStart = (idx: number) => {
    setDraggedIndex(idx);
  };

  const handleDrop = (targetIdx: number) => {
    if (draggedIndex === null || draggedIndex === targetIdx) return;
    const updated = [...pagesList];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(targetIdx, 0, moved);
    setPagesList(updated);
    setDraggedIndex(null);
  };

  const handleApplyChanges = async () => {
    // Convert 1-indexed original pages to 0-indexed indices
    const pageOrder0Based = pagesList.map((p) => p - 1);
    const rotations0Based: { [pageIndex: number]: number } = {};
    Object.entries(rotations).forEach(([pageNumStr, rot]) => {
      rotations0Based[parseInt(pageNumStr, 10) - 1] = rot;
    });

    await reorderPages(pageOrder0Based, rotations0Based);
    setIsOrganizeModalOpen(false);
  };

  const handleExtractSelected = async () => {
    if (selectedPages.length === 0) {
      alert('Please select pages to extract.');
      return;
    }
    const indices0Based = selectedPages.map((p) => p - 1);
    await extractPages(indices0Based);
    setIsOrganizeModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Organize Pages</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Drag thumbnails to reorder. Rotate, delete, extract, or duplicate pages.
            </p>
          </div>
          <button
            onClick={() => setIsOrganizeModalOpen(false)}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <button
              onClick={selectAll}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium"
            >
              {selectedPages.length === pagesList.length ? (
                <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>Select All ({selectedPages.length})</span>
            </button>

            <button
              onClick={() => handleRotateSelected(-90)}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded border border-slate-300 hover:bg-slate-50 text-slate-700"
              title="Rotate Left"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Rotate Left</span>
            </button>

            <button
              onClick={() => handleRotateSelected(90)}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded border border-slate-300 hover:bg-slate-50 text-slate-700"
              title="Rotate Right"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Rotate Right</span>
            </button>

            <button
              onClick={handleDuplicateSelected}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded border border-slate-300 hover:bg-slate-50 text-slate-700"
              title="Duplicate Selected"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate</span>
            </button>

            <button
              onClick={handleExtractSelected}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded border border-slate-300 hover:bg-slate-50 text-indigo-700"
              title="Extract Selected to New Document"
            >
              <Split className="w-3.5 h-3.5 text-indigo-600" />
              <span>Extract</span>
            </button>

            <button
              onClick={handleDeleteSelected}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded border border-red-200 hover:bg-red-50 text-red-600 font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>

          <div className="text-slate-400 text-xs">
            {pagesList.length} pages in document
          </div>
        </div>

        {/* Thumbnail Grid Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/70">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {pagesList.map((originalPageNum, idx) => {
              const isSelected = selectedPages.includes(originalPageNum);
              const rotation = rotations[originalPageNum] || 0;

              return (
                <div
                  key={`${originalPageNum}_${idx}`}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(idx)}
                  onClick={() => toggleSelectPage(originalPageNum)}
                  className={`relative group bg-white rounded-lg p-2 border-2 cursor-pointer transition shadow-xs flex flex-col items-center ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/30'
                      : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {/* Select Checkbox badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center text-white transition ${
                        isSelected ? 'bg-blue-600' : 'bg-black/20 group-hover:bg-black/40'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  {/* Thumbnail Image */}
                  <div className="w-full h-44 bg-slate-50 rounded border border-slate-100 flex items-center justify-center overflow-hidden">
                    {pageThumbnails[originalPageNum] ? (
                      <img
                        src={pageThumbnails[originalPageNum]}
                        alt={`Page ${originalPageNum}`}
                        className="max-h-full max-w-full object-contain transition-transform duration-200"
                        style={{ transform: `rotate(${rotation}deg)` }}
                      />
                    ) : (
                      <span className="text-slate-300 font-mono text-xs">Page {originalPageNum}</span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="w-full flex items-center justify-between mt-2 px-1 text-xs">
                    <span className="font-semibold text-slate-700">Page {idx + 1}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (Orig: #{originalPageNum})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Click 'Apply Changes' to rebuild the document with your new layout.
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsOrganizeModalOpen(false)}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyChanges}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold shadow-xs transition"
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
