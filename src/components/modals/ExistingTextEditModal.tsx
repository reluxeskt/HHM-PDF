import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Edit3,
  Search,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ScanText,
  Type,
  Sliders,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { usePdf } from '../../context/PdfContext';
import { PageTextItem, PageTextDetectionResult } from '../../types';
import { PdfEngine } from '../../services/pdfEngine';

export const ExistingTextEditModal: React.FC = () => {
  const {
    isExistingTextEditModalOpen,
    setIsExistingTextEditModalOpen,
    activeDoc,
    currentPage,
    pdfJsDoc,
    replaceExistingText,
    replaceAllMatchingText,
    setStatusMessage,
  } = usePdf();

  const [activeTab, setActiveTab] = useState<'browse' | 'find_replace'>('browse');
  const [detectionResult, setDetectionResult] = useState<PageTextDetectionResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOcrRunning, setIsOcrRunning] = useState<boolean>(false);

  // Selected item for replacement
  const [selectedItem, setSelectedItem] = useState<PageTextItem | null>(null);
  const [replacementWording, setReplacementWording] = useState<string>('');
  const [selectedFont, setSelectedFont] = useState<string>('Helvetica');
  const [selectedFontSize, setSelectedFontSize] = useState<number>(12);
  const [selectedColor, setSelectedColor] = useState<string>('#000000');
  const [selectedAlign, setSelectedAlign] = useState<'left' | 'center' | 'right'>('left');

  // Find & Replace state
  const [findQuery, setFindQuery] = useState<string>('');
  const [findReplaceText, setFindReplaceText] = useState<string>('');
  const [matchCase, setMatchCase] = useState<boolean>(false);

  // Load page text items whenever modal opens or page changes
  useEffect(() => {
    let isCancelled = false;
    if (isExistingTextEditModalOpen && pdfJsDoc) {
      setIsLoading(true);
      PdfEngine.extractPageTextItems(pdfJsDoc, currentPage)
        .then((result) => {
          if (!isCancelled) {
            setDetectionResult(result);
            setIsLoading(false);
            if (result.items.length > 0) {
              setSelectedItem(result.items[0]);
              setReplacementWording(result.items[0].str);
              setSelectedFont(result.items[0].fontFamily);
              setSelectedFontSize(result.items[0].fontSize);
            } else {
              setSelectedItem(null);
              setReplacementWording('');
            }
          }
        })
        .catch((err) => {
          if (!isCancelled) {
            console.error('Error extracting text items in modal:', err);
            setIsLoading(false);
          }
        });
    }
    return () => {
      isCancelled = true;
    };
  }, [isExistingTextEditModalOpen, pdfJsDoc, currentPage]);

  // When a text item is clicked from the list
  const handleSelectItem = (item: PageTextItem) => {
    setSelectedItem(item);
    setReplacementWording(item.str);
    setSelectedFont(item.fontFamily);
    setSelectedFontSize(item.fontSize);
  };

  // Run OCR on scanned page
  const handleRunOcrOnPage = async () => {
    if (!pdfJsDoc || !activeDoc) return;
    setIsOcrRunning(true);
    setStatusMessage(`Running Tesseract OCR on page ${currentPage}...`);
    try {
      const pageInfo = activeDoc.pages[currentPage - 1];
      const pw = pageInfo?.width || 595.28;
      const ph = pageInfo?.height || 841.89;

      // Render page to offscreen canvas
      const canvas = document.createElement('canvas');
      await PdfEngine.renderPageToCanvas(pdfJsDoc, currentPage, canvas, 1.5);
      const ocrItems = await PdfEngine.recognizeScannedPageItems(canvas, currentPage, pw, ph);

      setDetectionResult({
        isScanned: true,
        itemCount: ocrItems.length,
        totalChars: ocrItems.reduce((acc, it) => acc + it.str.length, 0),
        items: ocrItems,
      });

      if (ocrItems.length > 0) {
        handleSelectItem(ocrItems[0]);
      }
      setStatusMessage(`OCR detected ${ocrItems.length} text line(s) on Page ${currentPage}.`);
    } catch (err: any) {
      console.error('OCR error in modal:', err);
      alert(`OCR failed: ${err.message}`);
    } finally {
      setIsOcrRunning(false);
    }
  };

  // Apply single replacement
  const handleApplySingleReplacement = async () => {
    if (!selectedItem) {
      alert('Please select a text item from the list.');
      return;
    }
    if (!replacementWording.trim()) {
      alert('Replacement text cannot be empty.');
      return;
    }

    await replaceExistingText(currentPage, selectedItem, replacementWording, {
      fontFamily: selectedFont,
      fontSize: selectedFontSize,
      color: selectedColor,
      align: selectedAlign,
    });

    setIsExistingTextEditModalOpen(false);
  };

  // Find matches
  const matchingItems = useMemo(() => {
    if (!findQuery.trim() || !detectionResult) return [];
    const q = matchCase ? findQuery : findQuery.toLowerCase();
    return detectionResult.items.filter((item) => {
      const s = matchCase ? item.str : item.str.toLowerCase();
      return s.includes(q);
    });
  }, [findQuery, matchCase, detectionResult]);

  // Apply Replace All
  const handleApplyReplaceAll = async () => {
    if (!findQuery.trim()) {
      alert('Please enter text to find.');
      return;
    }
    if (!detectionResult || detectionResult.items.length === 0) {
      alert('No text detected on this page.');
      return;
    }

    const count = await replaceAllMatchingText(
      currentPage,
      detectionResult.items,
      findQuery,
      findReplaceText,
      {
        matchCase,
        fontFamily: selectedFont,
        fontSize: selectedFontSize,
        color: selectedColor,
      }
    );

    if (count > 0) {
      setIsExistingTextEditModalOpen(false);
    }
  };

  if (!isExistingTextEditModalOpen || !activeDoc) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden border border-slate-200 max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-800">Edit Existing PDF Text</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Page {currentPage} of {activeDoc.pageCount}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Select, inspect, and replace text with preserved font metrics
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsExistingTextEditModalOpen(false)}
            className="p-1.5 hover:bg-slate-200/80 rounded-md text-slate-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Page Type Detection Banner */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            {isLoading ? (
              <span className="text-slate-500 flex items-center space-x-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Scanning page for text objects...</span>
              </span>
            ) : detectionResult?.isScanned ? (
              <div className="flex items-center space-x-1.5 text-amber-700 font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Scanned / Image-Based Page (No native selectable vector text found)</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Selectable Vector PDF Text: {detectionResult?.itemCount || 0} text elements detected
                </span>
              </div>
            )}
          </div>

          {detectionResult?.isScanned && (
            <button
              onClick={handleRunOcrOnPage}
              disabled={isOcrRunning}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs flex items-center space-x-1 shadow-xs transition"
            >
              <ScanText className="w-3.5 h-3.5" />
              <span>{isOcrRunning ? 'Recognizing...' : 'Run OCR Recognition'}</span>
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-white px-6 pt-2">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'browse'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Select & Replace Word/Line</span>
          </button>
          <button
            onClick={() => setActiveTab('find_replace')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'find_replace'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Find & Replace on Page</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {activeTab === 'browse' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Detected Text Items */}
              <div className="flex flex-col border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
                <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 font-bold text-slate-700 flex justify-between items-center text-xs">
                  <span>Detected Text on Page {currentPage}</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {detectionResult?.items.length || 0} items
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-200 p-1">
                  {detectionResult?.items && detectionResult.items.length > 0 ? (
                    detectionResult.items.map((item) => {
                      const isSelected = selectedItem?.id === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelectItem(item)}
                          className={`p-2 rounded cursor-pointer transition text-xs flex flex-col space-y-0.5 ${
                            isSelected
                              ? 'bg-emerald-100/80 border border-emerald-400 font-semibold text-emerald-950'
                              : 'hover:bg-white text-slate-800'
                          }`}
                        >
                          <div className="truncate text-xs">{item.str}</div>
                          <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                            <span>Font: {item.fontFamily}</span>
                            <span>•</span>
                            <span>{item.fontSize} pt</span>
                            <span>•</span>
                            <span>({Math.round(item.x)}, {Math.round(item.y)})</span>
                            {item.isOcr && (
                              <span className="ml-auto px-1 bg-amber-200 text-amber-800 font-bold rounded">
                                OCR
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      {isLoading ? 'Scanning...' : 'No text items found on this page.'}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Edit & Formatting */}
              <div className="flex flex-col space-y-3 p-4 border border-slate-200 rounded-lg bg-white">
                <h4 className="font-bold text-slate-800 text-xs border-b pb-1 flex items-center justify-between">
                  <span>Text Replacement Editor</span>
                  {selectedItem && (
                    <span className="text-[10px] font-mono text-slate-400">
                      ID: {selectedItem.id}
                    </span>
                  )}
                </h4>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Original Text</label>
                  <div className="p-2 bg-slate-100 rounded border border-slate-200 text-slate-700 font-medium text-xs truncate">
                    {selectedItem ? selectedItem.str : '(Select an item from the left)'}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    New Replacement Text <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={replacementWording}
                    onChange={(e) => setReplacementWording(e.target.value)}
                    placeholder="Enter new text..."
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white font-medium focus:outline-hidden focus:border-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1 text-[11px]">
                      Font Family
                    </label>
                    <select
                      value={selectedFont}
                      onChange={(e) => setSelectedFont(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                    >
                      <option value="Helvetica">Helvetica (Standard Sans)</option>
                      <option value="Times-Roman">Times-Roman (Standard Serif)</option>
                      <option value="Courier">Courier (Monospace)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1 text-[11px]">
                      Font Size (pt)
                    </label>
                    <input
                      type="number"
                      min={6}
                      max={72}
                      value={selectedFontSize}
                      onChange={(e) => setSelectedFontSize(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1 text-[11px]">
                      Text Color
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={selectedColor}
                        onChange={(e) => setSelectedColor(e.target.value)}
                        className="w-6 h-6 p-0 border border-slate-300 rounded cursor-pointer"
                      />
                      <span className="font-mono text-[10px] text-slate-500">{selectedColor}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1 text-[11px]">
                      Alignment
                    </label>
                    <select
                      value={selectedAlign}
                      onChange={(e) => setSelectedAlign(e.target.value as any)}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>

                {selectedItem?.isOcr && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800">
                    <strong>Note:</strong> Scanned image text will be sanitized and replaced with
                    standard vector typography.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Tab 2: Find & Replace */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Find Text in Page</label>
                  <input
                    type="text"
                    value={findQuery}
                    onChange={(e) => setFindQuery(e.target.value)}
                    placeholder="e.g. Surgical Instruments"
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs bg-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Replace With</label>
                  <input
                    type="text"
                    value={findReplaceText}
                    onChange={(e) => setFindReplaceText(e.target.value)}
                    placeholder="e.g. Diagnostic Laparoscopes"
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs bg-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <label className="flex items-center space-x-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={matchCase}
                    onChange={(e) => setMatchCase(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-0"
                  />
                  <span>Match Case Exactly</span>
                </label>

                <span className="font-bold text-slate-700">
                  {findQuery.trim()
                    ? `${matchingItems.length} match(es) found on page`
                    : 'Enter search text'}
                </span>
              </div>

              {matchingItems.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto divide-y divide-slate-100 bg-white">
                  <div className="px-3 py-1.5 bg-slate-100 text-[11px] font-bold text-slate-600">
                    Matched Items on Page {currentPage}
                  </div>
                  {matchingItems.map((m) => (
                    <div key={m.id} className="p-2 text-xs flex justify-between items-center">
                      <span className="font-medium text-slate-800">{m.str}</span>
                      <span className="text-[10px] text-slate-400">
                        {m.fontFamily} • {m.fontSize}pt
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Technical Architecture Standards & Limitations Explanation */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-1 text-blue-900">
            <h5 className="font-bold flex items-center space-x-1.5 text-xs">
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Standard ISO 32000 PDF Typography & Limitations Architecture</span>
            </h5>
            <p className="text-[11px] text-blue-800/90 leading-relaxed">
              PDF files are fixed-coordinate 2D graphics streams with embedded font subsets (often containing only glyphs already in the file). HHM PDF's text editor cleanly sanitizes the original bounding box area and synthesizes matching vector typography (Helvetica, Times, Courier) at identical baseline coordinates, preserving all native document vectors, links, and forms without full-page rasterization.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2.5">
          <button
            onClick={() => setIsExistingTextEditModalOpen(false)}
            className="px-4 py-2 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            Cancel
          </button>

          {activeTab === 'browse' ? (
            <button
              onClick={handleApplySingleReplacement}
              disabled={!selectedItem || !replacementWording.trim()}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition shadow-xs disabled:opacity-50 flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Replace Selected Text</span>
            </button>
          ) : (
            <button
              onClick={handleApplyReplaceAll}
              disabled={!findQuery.trim() || matchingItems.length === 0}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition shadow-xs disabled:opacity-50 flex items-center space-x-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Replace All ({matchingItems.length})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
