import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Bookmark,
  MessageSquare,
  Search,
  RotateCw,
  RotateCcw,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Split,
  Plus,
  Copy,
  FolderInput,
  MoreVertical,
  CheckSquare,
} from 'lucide-react';
import { usePdf } from '../context/PdfContext';
import { PdfEngine } from '../services/pdfEngine';
import { SidebarTab } from '../types';

export const Sidebar: React.FC = () => {
  const {
    activeDoc,
    currentPage,
    setCurrentPage,
    sidebarTab,
    setSidebarTab,
    pdfJsDoc,
    rotateCurrentPage,
    deletePages,
    reorderPages,
    extractPages,
    duplicatePages,
    insertBlankPageAt,
    setIsSplitModalOpen,
    setIsInsertPagesModalOpen,
    documents,
    movePageBetweenDocuments,
  } = usePdf();

  const [thumbnails, setThumbnails] = useState<{ [pageNum: number]: string }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ pageNumber: number; snippet: string; count: number }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Multi-select for thumbnails
  const [selectedThumbnails, setSelectedThumbnails] = useState<number[]>([]);

  // Drag and drop state for thumbnail reordering
  const [draggedPageIndex, setDraggedPageIndex] = useState<number | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    pageNumber: number;
  } | null>(null);

  // Generate thumbnails when pdfJsDoc changes
  useEffect(() => {
    let isCancelled = false;
    if (pdfJsDoc && activeDoc) {
      const loadThumbs = async () => {
        for (let i = 1; i <= Math.min(activeDoc.pageCount, 40); i++) {
          if (isCancelled) break;
          try {
            const thumbUrl = await PdfEngine.generatePageThumbnail(pdfJsDoc, i, 160);
            setThumbnails((prev) => ({ ...prev, [i]: thumbUrl }));
          } catch (e) {
            console.warn(`Failed thumb for page ${i}`, e);
          }
        }
      };
      loadThumbs();
    } else {
      setThumbnails({});
    }
    return () => {
      isCancelled = true;
    };
  }, [pdfJsDoc, activeDoc?.id, activeDoc?.pageCount]);

  // Close context menu on window click
  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfJsDoc || !searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await PdfEngine.searchPdf(pdfJsDoc, searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDragStart = (pageIndex: number) => {
    setDraggedPageIndex(pageIndex);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetIndex: number) => {
    if (draggedPageIndex === null || draggedPageIndex === targetIndex || !activeDoc) return;
    const order = Array.from({ length: activeDoc.pageCount }, (_, i) => i);
    const [moved] = order.splice(draggedPageIndex, 1);
    order.splice(targetIndex, 0, moved);
    setDraggedPageIndex(null);
    await reorderPages(order);
  };

  const handleThumbnailClick = (e: React.MouseEvent, pageNum: number) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      // Toggle selection
      setSelectedThumbnails((prev) =>
        prev.includes(pageNum) ? prev.filter((p) => p !== pageNum) : [...prev, pageNum]
      );
    } else {
      setSelectedThumbnails([]);
      setCurrentPage(pageNum);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, pageNum: number) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      pageNumber: pageNum,
    });
  };

  const handleBatchDelete = async () => {
    if (selectedThumbnails.length === 0 || !activeDoc) return;
    if (selectedThumbnails.length >= activeDoc.pageCount) {
      alert('Cannot delete all pages.');
      return;
    }
    if (confirm(`Delete ${selectedThumbnails.length} selected pages?`)) {
      const indices0Based = selectedThumbnails.map((p) => p - 1);
      await deletePages(indices0Based);
      setSelectedThumbnails([]);
    }
  };

  const handleBatchExtract = async () => {
    if (selectedThumbnails.length === 0 || !activeDoc) return;
    const indices0Based = selectedThumbnails.map((p) => p - 1);
    await extractPages(indices0Based);
    setSelectedThumbnails([]);
  };

  if (!activeDoc) return null;

  return (
    <div className="flex h-full select-none bg-white dark:bg-slate-900 border-r border-[#cbd5e1] dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs">
      {/* Icon Rail */}
      <div className="w-10 bg-[#f1f5f9] dark:bg-slate-950 border-r border-[#e2e8f0] dark:border-slate-800 flex flex-col items-center py-2 space-y-2">
        <button
          onClick={() => setSidebarTab(sidebarTab === 'thumbnails' ? null : 'thumbnails')}
          className={`p-2 rounded transition ${
            sidebarTab === 'thumbnails'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100'
          }`}
          title="Page Thumbnails"
        >
          <FileText className="w-4 h-4" />
        </button>

        <button
          onClick={() => setSidebarTab(sidebarTab === 'search' ? null : 'search')}
          className={`p-2 rounded transition ${
            sidebarTab === 'search'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'
          }`}
          title="Search in Document"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          onClick={() => setSidebarTab(sidebarTab === 'comments' ? null : 'comments')}
          className={`p-2 rounded transition ${
            sidebarTab === 'comments'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'
          }`}
          title="Comments & Annotations"
        >
          <MessageSquare className="w-4 h-4" />
        </button>

        <button
          onClick={() => setSidebarTab(sidebarTab === 'bookmarks' ? null : 'bookmarks')}
          className={`p-2 rounded transition ${
            sidebarTab === 'bookmarks'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'
          }`}
          title="Bookmarks Outline"
        >
          <Bookmark className="w-4 h-4" />
        </button>
      </div>

      {/* Expandable Sidebar Drawer */}
      {sidebarTab && (
        <div className="w-68 bg-slate-50 flex flex-col h-full border-r border-slate-200">
          {/* Header */}
          <div className="h-9 px-3 border-b border-slate-200 bg-white flex items-center justify-between font-semibold text-slate-800 text-xs">
            <span>
              {sidebarTab === 'thumbnails' && 'Page Thumbnails'}
              {sidebarTab === 'search' && 'Search Document'}
              {sidebarTab === 'comments' && 'Comments & Notes'}
              {sidebarTab === 'bookmarks' && 'Bookmarks'}
            </span>
            <button
              onClick={() => setSidebarTab(null)}
              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700"
              title="Collapse Sidebar"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-3">
            {/* THUMBNAILS TAB */}
            {sidebarTab === 'thumbnails' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>{activeDoc.pageCount} Pages</span>
                  <span>Right-click for options</span>
                </div>

                {/* Batch toolbar if multiple selected */}
                {selectedThumbnails.length > 0 && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs">
                    <span className="font-semibold text-blue-800">
                      {selectedThumbnails.length} selected
                    </span>
                    <div className="flex space-x-1">
                      <button
                        onClick={handleBatchExtract}
                        className="px-2 py-1 bg-white border border-blue-300 rounded text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                        title="Extract selected"
                      >
                        Extract
                      </button>
                      <button
                        onClick={handleBatchDelete}
                        className="px-2 py-1 bg-white border border-red-300 rounded text-[11px] font-medium text-red-600 hover:bg-red-50"
                        title="Delete selected"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {Array.from({ length: activeDoc.pageCount }, (_, i) => i + 1).map((pageNum, idx) => {
                    const isSelected = currentPage === pageNum || selectedThumbnails.includes(pageNum);
                    return (
                      <div
                        key={pageNum}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(idx)}
                        onClick={(e) => handleThumbnailClick(e, pageNum)}
                        onContextMenu={(e) => handleContextMenu(e, pageNum)}
                        className={`group relative flex flex-col items-center p-2 rounded-lg border cursor-pointer transition ${
                          isSelected
                            ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/30'
                            : 'bg-white border-slate-200 hover:border-slate-400 hover:shadow-xs'
                        }`}
                      >
                        {/* Page preview thumbnail */}
                        <div className="w-full h-32 bg-slate-100 rounded border border-slate-200 flex items-center justify-center overflow-hidden">
                          {thumbnails[pageNum] ? (
                            <img
                              src={thumbnails[pageNum]}
                              alt={`Page ${pageNum}`}
                              className="max-h-full max-w-full object-contain"
                            />
                          ) : (
                            <span className="text-slate-300 font-mono text-xs">Page {pageNum}</span>
                          )}
                        </div>

                        {/* Thumbnail footer with actions on hover */}
                        <div className="w-full flex items-center justify-between mt-1.5 px-1">
                          <span className={`font-semibold text-xs ${isSelected ? 'text-blue-600' : 'text-slate-600'}`}>
                            {pageNum}
                          </span>

                          <div className="flex items-center space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                rotateCurrentPage(90);
                              }}
                              title="Rotate 90° Clockwise"
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded text-slate-600 transition-opacity"
                            >
                              <RotateCw className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleContextMenu(e, pageNum);
                              }}
                              title="Page Options"
                              className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700"
                            >
                              <MoreVertical className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex space-x-2 pt-1">
                  <button
                    onClick={() => insertBlankPageAt(activeDoc.pageCount)}
                    className="flex-1 py-1.5 bg-white border border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded text-xs font-medium flex items-center justify-center space-x-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Blank</span>
                  </button>
                  <button
                    onClick={() => setIsInsertPagesModalOpen(true)}
                    className="flex-1 py-1.5 bg-white border border-slate-300 hover:border-blue-500 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded text-xs font-medium flex items-center justify-center space-x-1 transition"
                  >
                    <FolderInput className="w-3.5 h-3.5 text-blue-600" />
                    <span>Insert PDF</span>
                  </button>
                </div>
              </div>
            )}

            {/* SEARCH TAB */}
            {sidebarTab === 'search' && (
              <div className="space-y-3">
                <form onSubmit={handleSearch} className="flex space-x-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Find in document..."
                    className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-xs bg-white focus:outline-hidden focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
                  >
                    Go
                  </button>
                </form>

                {isSearching && (
                  <p className="text-center text-xs text-slate-400 py-3">Searching document...</p>
                )}

                {searchResults.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    <span className="text-[11px] text-slate-400 font-medium">
                      Found in {searchResults.length} pages:
                    </span>
                    {searchResults.map((res, i) => (
                      <div
                        key={i}
                        onClick={() => setCurrentPage(res.pageNumber)}
                        className="p-2 bg-white rounded border border-slate-200 hover:border-blue-400 cursor-pointer transition text-left"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-blue-600">Page {res.pageNumber}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700">
                            {res.count} {res.count === 1 ? 'match' : 'matches'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-2 italic font-serif">
                          {res.snippet}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  searchQuery && !isSearching && (
                    <p className="text-xs text-slate-400 text-center py-4">No matches found.</p>
                  )
                )}
              </div>
            )}

            {/* COMMENTS TAB */}
            {sidebarTab === 'comments' && (
              <div className="space-y-3">
                <div className="text-[11px] text-slate-400">
                  {activeDoc.stickyNotes.length + activeDoc.highlightAnnotations.length} annotations on document
                </div>

                {activeDoc.stickyNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => setCurrentPage(note.page)}
                    className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg cursor-pointer hover:shadow-xs transition"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-amber-900 text-[11px]">{note.author}</span>
                      <span className="text-[10px] text-amber-600">Page {note.page}</span>
                    </div>
                    <p className="text-xs text-slate-700">{note.text}</p>
                    <span className="text-[9px] text-slate-400 mt-1 block">{note.createdAt}</span>
                  </div>
                ))}

                {activeDoc.stickyNotes.length === 0 && (
                  <div className="text-center py-6 text-slate-400">
                    <MessageSquare className="w-6 h-6 mx-auto mb-1 opacity-40" />
                    <span>No sticky notes or comments added yet.</span>
                  </div>
                )}
              </div>
            )}

            {/* BOOKMARKS TAB */}
            {sidebarTab === 'bookmarks' && (
              <div className="space-y-2">
                <div className="p-2 bg-white rounded border border-slate-200">
                  <div className="font-medium text-slate-800 flex items-center space-x-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-blue-600" />
                    <span>{activeDoc.metadata.title || activeDoc.name}</span>
                  </div>
                  <div className="ml-4 mt-2 space-y-1.5 border-l-2 border-slate-100 pl-2">
                    {Array.from({ length: activeDoc.pageCount }, (_, i) => i + 1).map((p) => (
                      <div
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`cursor-pointer hover:text-blue-600 py-0.5 ${
                          currentPage === p ? 'text-blue-600 font-semibold' : 'text-slate-600'
                        }`}
                      >
                        Section {p}: Page {p}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Context Menu for Page Thumbnails */}
      {contextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 bg-white border border-slate-300 rounded-lg shadow-2xl py-1 text-xs w-52 text-slate-700 divide-y divide-slate-100"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
        >
          <div className="px-3 py-1.5 font-bold text-slate-800 bg-slate-50 text-[11px]">
            Page {contextMenu.pageNumber} Actions
          </div>
          <div className="py-1">
            <button
              onClick={() => {
                rotateCurrentPage(90);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-50 hover:text-blue-600 flex items-center space-x-2"
            >
              <RotateCw className="w-3.5 h-3.5 text-blue-500" />
              <span>Rotate Right 90°</span>
            </button>
            <button
              onClick={() => {
                rotateCurrentPage(-90);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-50 hover:text-blue-600 flex items-center space-x-2"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Rotate Left 90°</span>
            </button>
          </div>
          <div className="py-1">
            <button
              onClick={() => {
                duplicatePages([contextMenu.pageNumber - 1]);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-50 hover:text-blue-600 flex items-center space-x-2"
            >
              <Copy className="w-3.5 h-3.5 text-indigo-500" />
              <span>Duplicate Page</span>
            </button>
            <button
              onClick={() => {
                extractPages([contextMenu.pageNumber - 1]);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-50 hover:text-blue-600 flex items-center space-x-2"
            >
              <Split className="w-3.5 h-3.5 text-purple-500" />
              <span>Extract Page</span>
            </button>
            <button
              onClick={() => {
                setIsSplitModalOpen(true);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-50 hover:text-blue-600 flex items-center space-x-2"
            >
              <Split className="w-3.5 h-3.5 text-amber-500" />
              <span>Split Document...</span>
            </button>
            <button
              onClick={() => {
                setIsInsertPagesModalOpen(true);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-50 hover:text-blue-600 flex items-center space-x-2"
            >
              <FolderInput className="w-3.5 h-3.5 text-emerald-500" />
              <span>Insert Pages from PDF...</span>
            </button>
          </div>

          {/* Move to another open tab */}
          {documents.length > 1 && (
            <div className="py-1">
              <span className="px-3 py-1 text-[10px] text-slate-400 block font-semibold">
                Move to open tab:
              </span>
              {documents.map((d, docIdx) => {
                if (d.id === activeDoc.id) return null;
                return (
                  <button
                    key={d.id}
                    onClick={() => {
                      movePageBetweenDocuments(docIdx, contextMenu.pageNumber - 1);
                      setContextMenu(null);
                    }}
                    className="w-full text-left px-3 py-1 hover:bg-blue-50 hover:text-blue-600 truncate text-[11px]"
                  >
                    → {d.name}
                  </button>
                );
              })}
            </div>
          )}

          <div className="py-1">
            <button
              onClick={() => {
                if (activeDoc.pageCount <= 1) {
                  alert('A document must have at least one page.');
                } else if (confirm(`Delete page ${contextMenu.pageNumber}?`)) {
                  deletePages([contextMenu.pageNumber - 1]);
                }
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 flex items-center space-x-2 font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Page</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
