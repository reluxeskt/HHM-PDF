import React, { useRef } from 'react';
import {
  FilePlus,
  Files,
  LayoutGrid,
  Edit3,
  PenTool,
  ScanText,
  ShieldAlert,
  Lock,
  Unlock,
  Download,
  MousePointer,
  Hand,
  Type,
  Image as ImageIcon,
  Ruler,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Trash2,
  ExternalLink,
  Highlighter,
  Underline,
  Strikethrough,
  MessageSquare,
  Square,
  Circle,
  Minus,
  CheckSquare,
  HelpCircle,
  FileCheck,
  Split,
  Eye,
  Sliders,
  Layers,
  Sparkles,
  Link as LinkIcon,
  FolderInput,
  Copy,
  Cloud,
  Search,
  Activity,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { usePdf } from '../context/PdfContext';
import { RibbonTab, ToolMode } from '../types';
import { fontRegistry, WINDOWS_11_FONTS } from '../services/fontRegistry';

export const Ribbon: React.FC = () => {
  const {
    activeRibbonTab,
    setActiveRibbonTab,
    activeTool,
    setActiveTool,
    activeDoc,
    toolSettings,
    setToolSettings,
    zoom,
    setZoom,
    continuousScroll,
    setContinuousScroll,
    rotateCurrentPage,
    rotateAllPages,
    insertBlankPageAt,
    duplicatePages,
    currentPage,
    applyBurnedRedactions,
    exportToTxt,
    addImageAnnotation,
    activeEditingFont,
    updateActiveEditingFont,
    setIsOrganizeModalOpen,
    setIsCombineModalOpen,
    setIsSignatureModalOpen,
    setIsWatermarkModalOpen,
    setIsRedactionModalOpen,
    setIsPropertiesModalOpen,
    setIsProtectModalOpen,
    setIsUnlockModalOpen,
    setIsExportModalOpen,
    setIsOcrModalOpen,
    setIsCompareModalOpen,
    setIsHelpModalOpen,
    setIsNewBlankModalOpen,
    setIsSplitModalOpen,
    setIsInsertPagesModalOpen,
    setIsBatchModalOpen,
    setIsExistingTextEditModalOpen,
    setIsQaModalOpen,
    setIsCloudModalOpen,
    createFromImages,
  } = usePdf();


  const imageUploadRef = useRef<HTMLInputElement>(null);

  const tabs: { id: RibbonTab; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'edit', label: 'Edit PDF' },
    { id: 'comment', label: 'Comment & Markup' },
    { id: 'organize', label: 'Organize Pages' },
    { id: 'form', label: 'Forms & Sign' },
    { id: 'protect', label: 'Protect & Redact' },
    { id: 'share', label: 'Convert & Export' },
    { id: 'view', label: 'View' },
    { id: 'help', label: 'Help' },
  ];

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          const dataUrl = ev.target.result as string;
          if (activeDoc) {
            // Add image directly onto the active document's current page
            addImageAnnotation({
              page: currentPage,
              x: 100,
              y: 200,
              width: 160,
              height: 120,
              dataUrl,
              name: file.name,
              opacity: 1,
            });
            setActiveTool('select');
          } else {
            createFromImages([
              {
                name: file.name,
                dataUrl,
                type: file.type,
              },
            ]);
          }
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-[#f8fafc] dark:bg-slate-900 border-b border-[#cbd5e1] dark:border-slate-800 select-none text-slate-700 dark:text-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      {/* Ribbon Tab Strip */}
      <div className="flex items-center space-x-1 px-3 pt-1 border-b border-[#e2e8f0] dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-medium">
        {tabs.map((tab) => {
          const isActive = activeRibbonTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveRibbonTab(tab.id)}
              className={`px-3 py-1.5 border-b-2 transition-all font-semibold ${
                isActive
                  ? 'border-[#1271D6] text-[#1271D6] dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Ribbon Tools Panel */}
      <div className="h-20 px-3 py-1.5 flex items-center space-x-3 overflow-x-auto no-scrollbar">
        {/* HOME TAB CONTENT */}
        {activeRibbonTab === 'home' && (
          <div className="flex items-center space-x-4">
            {/* Create Group */}
            <div className="flex flex-col items-center border-r border-slate-200 pr-3">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setIsNewBlankModalOpen(true)}
                  className="flex flex-col items-center justify-center p-1.5 hover:bg-white rounded hover:shadow-xs text-xs text-slate-700 transition"
                  title="Create new blank document"
                >
                  <FilePlus className="w-5 h-5 text-blue-600 mb-0.5" />
                  <span>Create PDF</span>
                </button>
                <button
                  onClick={() => setIsCombineModalOpen(true)}
                  className="flex flex-col items-center justify-center p-1.5 hover:bg-white rounded hover:shadow-xs text-xs text-slate-700 transition"
                  title="Combine multiple PDFs into one"
                >
                  <Files className="w-5 h-5 text-indigo-600 mb-0.5" />
                  <span>Combine</span>
                </button>
                <button
                  onClick={() => setIsBatchModalOpen(true)}
                  className="flex flex-col items-center justify-center p-1.5 hover:bg-white rounded hover:shadow-xs text-xs text-slate-700 transition"
                  title="Batch process documents"
                >
                  <Layers className="w-5 h-5 text-teal-600 mb-0.5" />
                  <span>Batch Process</span>
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">Create & Batch</span>
            </div>

            {/* Core Tools */}
            <div className="flex flex-col items-center border-r border-slate-200 pr-3">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setIsOrganizeModalOpen(true)}
                  disabled={!activeDoc}
                  className={`flex flex-col items-center justify-center p-1.5 rounded text-xs transition ${
                    activeDoc
                      ? 'hover:bg-white text-slate-700 hover:shadow-xs cursor-pointer'
                      : 'opacity-30 cursor-not-allowed text-slate-400 select-none grayscale bg-transparent'
                  }`}
                  title={activeDoc ? "Organize, reorder, and rotate pages" : "Open a PDF document to organize pages"}
                >
                  <LayoutGrid className="w-5 h-5 text-amber-600 mb-0.5" />
                  <span>Organize</span>
                </button>

                <button
                  onClick={() => {
                    setActiveRibbonTab('edit');
                    setActiveTool('text');
                  }}
                  disabled={!activeDoc}
                  className={`flex flex-col items-center justify-center p-1.5 rounded text-xs transition ${
                    activeDoc
                      ? 'hover:bg-white text-slate-700 hover:shadow-xs cursor-pointer'
                      : 'opacity-30 cursor-not-allowed text-slate-400 select-none grayscale bg-transparent'
                  }`}
                  title={activeDoc ? "Edit PDF text and elements" : "Open a PDF document to edit text"}
                >
                  <Edit3 className="w-5 h-5 text-emerald-600 mb-0.5" />
                  <span>Edit PDF</span>
                </button>

                <button
                  onClick={() => setIsSignatureModalOpen(true)}
                  disabled={!activeDoc}
                  className={`flex flex-col items-center justify-center p-1.5 rounded text-xs transition ${
                    activeDoc
                      ? 'hover:bg-white text-slate-700 hover:shadow-xs cursor-pointer'
                      : 'opacity-30 cursor-not-allowed text-slate-400 select-none grayscale bg-transparent'
                  }`}
                  title={activeDoc ? "Fill & Sign documents" : "Open a PDF document to add signatures"}
                >
                  <PenTool className="w-5 h-5 text-purple-600 mb-0.5" />
                  <span>Fill & Sign</span>
                </button>

                <button
                  onClick={() => setIsOcrModalOpen(true)}
                  disabled={!activeDoc}
                  className={`flex flex-col items-center justify-center p-1.5 rounded text-xs transition ${
                    activeDoc
                      ? 'hover:bg-white text-slate-700 hover:shadow-xs cursor-pointer'
                      : 'opacity-30 cursor-not-allowed text-slate-400 select-none grayscale bg-transparent'
                  }`}
                  title={activeDoc ? "Tesseract.js OCR & Searchable text recognition" : "Open a PDF document to run OCR"}
                >
                  <ScanText className="w-5 h-5 text-cyan-600 mb-0.5" />
                  <span>Scan & OCR</span>
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">Core Tools</span>
            </div>

            {/* Security & Export Group */}
            <div className="flex flex-col items-center border-r border-slate-200 pr-3">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setIsRedactionModalOpen(true)}
                  disabled={!activeDoc}
                  className={`flex flex-col items-center justify-center p-1.5 rounded text-xs transition ${
                    activeDoc
                      ? 'hover:bg-white text-slate-700 hover:shadow-xs cursor-pointer'
                      : 'opacity-30 cursor-not-allowed text-slate-400 select-none grayscale bg-transparent'
                  }`}
                  title={activeDoc ? "Permanently redact sensitive text" : "Open a PDF document to apply redactions"}
                >
                  <ShieldAlert className="w-5 h-5 text-rose-600 mb-0.5" />
                  <span>Redact</span>
                </button>

                <button
                  onClick={() => setIsProtectModalOpen(true)}
                  disabled={!activeDoc}
                  className={`flex flex-col items-center justify-center p-1.5 rounded text-xs transition ${
                    activeDoc
                      ? 'hover:bg-white text-slate-700 hover:shadow-xs cursor-pointer'
                      : 'opacity-30 cursor-not-allowed text-slate-400 select-none grayscale bg-transparent'
                  }`}
                  title={activeDoc ? "Password protection and permissions" : "Open a PDF document to set passwords or encryption"}
                >
                  <Lock className="w-5 h-5 text-yellow-600 mb-0.5" />
                  <span>Protect</span>
                </button>

                <button
                  onClick={() => setIsExportModalOpen(true)}
                  disabled={!activeDoc}
                  className={`flex flex-col items-center justify-center p-1.5 rounded text-xs transition ${
                    activeDoc
                      ? 'hover:bg-white text-slate-700 hover:shadow-xs cursor-pointer'
                      : 'opacity-30 cursor-not-allowed text-slate-400 select-none grayscale bg-transparent'
                  }`}
                  title={activeDoc ? "Export to multiple formats" : "Open a PDF document to export"}
                >
                  <Download className="w-5 h-5 text-blue-700 mb-0.5" />
                  <span>Export</span>
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">Protect & Export</span>
            </div>
          </div>
        )}

        {/* EDIT TAB CONTENT */}
        {activeRibbonTab === 'edit' && (
          <div className="flex items-center space-x-4">
            {/* Selection modes */}
            <div className="flex flex-col items-center border-r border-slate-200 pr-3">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setActiveTool('select')}
                  className={`p-2 rounded text-xs flex flex-col items-center transition ${
                    activeTool === 'select'
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'hover:bg-white text-slate-700'
                  }`}
                >
                  <MousePointer className="w-4 h-4 mb-0.5" />
                  <span>Select</span>
                </button>
                <button
                  onClick={() => setActiveTool('hand')}
                  className={`p-2 rounded text-xs flex flex-col items-center transition ${
                    activeTool === 'hand'
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'hover:bg-white text-slate-700'
                  }`}
                >
                  <Hand className="w-4 h-4 mb-0.5" />
                  <span>Hand</span>
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">Pointer</span>
            </div>

            {/* Objects & Text */}
            <div className="flex flex-col items-center border-r border-slate-200 pr-3">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setActiveTool('edit-text')}
                  className={`p-2 rounded text-xs flex flex-col items-center transition ${
                    activeTool === 'edit-text'
                      ? 'bg-emerald-100 text-emerald-800 font-medium'
                      : 'hover:bg-white text-slate-700'
                  }`}
                  title="Click or select any existing text on the PDF to edit directly"
                >
                  <Edit3 className="w-4 h-4 mb-0.5 text-emerald-600" />
                  <span>Edit Text</span>
                </button>

                <button
                  onClick={() => setActiveTool('text')}
                  className={`p-2 rounded text-xs flex flex-col items-center transition ${
                    activeTool === 'text'
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'hover:bg-white text-slate-700'
                  }`}
                  title="Insert new text annotation"
                >
                  <Type className="w-4 h-4 mb-0.5" />
                  <span>Add Text</span>
                </button>

                <button
                  onClick={() => imageUploadRef.current?.click()}
                  className="p-2 rounded text-xs flex flex-col items-center hover:bg-white text-slate-700 transition"
                  title="Insert Image (JPG/PNG)"
                >
                  <ImageIcon className="w-4 h-4 mb-0.5 text-blue-600" />
                  <span>Add Image</span>
                </button>
                <input
                  type="file"
                  ref={imageUploadRef}
                  onChange={handleImageSelect}
                  accept="image/png,image/jpeg"
                  className="hidden"
                />

                <button
                  onClick={() => setActiveTool('hyperlink')}
                  className={`p-2 rounded text-xs flex flex-col items-center transition ${
                    activeTool === 'hyperlink'
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'hover:bg-white text-slate-700'
                  }`}
                  title="Draw Hyperlink Box"
                >
                  <LinkIcon className="w-4 h-4 mb-0.5 text-indigo-600" />
                  <span>Link</span>
                </button>

                <button
                  onClick={() => setIsExistingTextEditModalOpen(true)}
                  className="p-2 rounded text-xs flex flex-col items-center hover:bg-white text-slate-700 transition"
                  title="Find & replace text or browse detected page text elements"
                >
                  <Search className="w-4 h-4 mb-0.5 text-emerald-600" />
                  <span>Replace Text</span>
                </button>

                <button
                  onClick={() => setActiveTool('measure')}
                  className={`p-2 rounded text-xs flex flex-col items-center transition ${
                    activeTool === 'measure'
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'hover:bg-white text-slate-700'
                  }`}
                  title="Calibrated distance measurement"
                >
                  <Ruler className="w-4 h-4 mb-0.5 text-amber-600" />
                  <span>Measure</span>
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">Objects & Links</span>
            </div>

            {/* Typography & Font Detection Controls */}
            <div className="flex flex-col justify-center space-y-1.5 bg-white p-2 rounded-md border border-slate-200 shadow-2xs">
              <div className="flex items-center space-x-2 text-xs">
                {/* Font Family Selector */}
                <select
                  value={activeEditingFont ? activeEditingFont.fontFamily : (toolSettings.textFont || 'Helvetica')}
                  onChange={(e) => {
                    const fam = e.target.value;
                    if (activeEditingFont) {
                      updateActiveEditingFont({ fontFamily: fam });
                    } else {
                      setToolSettings((prev) => ({ ...prev, textFont: fam }));
                    }
                  }}
                  className={`border rounded px-2 py-1 text-xs max-w-[140px] truncate outline-none font-medium ${
                    activeEditingFont
                      ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 ring-1 ring-emerald-400'
                      : 'border-slate-300 bg-white text-slate-800'
                  }`}
                  title={
                    activeEditingFont
                      ? `Detected original font: ${activeEditingFont.fontFamily}`
                      : 'Choose font for new text additions'
                  }
                >
                  {activeEditingFont && (
                    <optgroup label="Detected Original Font">
                      <option value={activeEditingFont.fontFamily}>
                        {activeEditingFont.fontFamily} (Detected)
                      </option>
                    </optgroup>
                  )}
                  <optgroup label="Windows 11 Fonts">
                    {WINDOWS_11_FONTS.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Standard PDF & Global Fonts">
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Open Sans">Open Sans</option>
                    <option value="Inter">Inter</option>
                    <option value="Garamond">Garamond</option>
                  </optgroup>
                </select>

                {/* Font Size Selector */}
                <select
                  value={activeEditingFont ? activeEditingFont.fontSize : toolSettings.textSize}
                  onChange={(e) => {
                    const sz = Number(e.target.value);
                    if (activeEditingFont) {
                      updateActiveEditingFont({ fontSize: sz });
                    } else {
                      setToolSettings((prev) => ({ ...prev, textSize: sz }));
                    }
                  }}
                  className="border border-slate-300 rounded px-1.5 py-1 text-xs bg-white text-slate-800"
                >
                  <option value={8}>8 pt</option>
                  <option value={9}>9 pt</option>
                  <option value={10}>10 pt</option>
                  <option value={11}>11 pt</option>
                  <option value={12}>12 pt</option>
                  <option value={14}>14 pt</option>
                  <option value={16}>16 pt</option>
                  <option value={18}>18 pt</option>
                  <option value={20}>20 pt</option>
                  <option value={24}>24 pt</option>
                  <option value={32}>32 pt</option>
                  <option value={48}>48 pt</option>
                </select>

                {/* Color Picker */}
                <input
                  type="color"
                  value={activeEditingFont ? activeEditingFont.color : toolSettings.textColor}
                  onChange={(e) => {
                    const col = e.target.value;
                    if (activeEditingFont) {
                      updateActiveEditingFont({ color: col });
                    } else {
                      setToolSettings((prev) => ({ ...prev, textColor: col }));
                    }
                  }}
                  className="w-6 h-6 p-0 border border-slate-300 rounded cursor-pointer"
                  title="Text Color"
                />

                {/* Bold Button */}
                <button
                  onClick={() => {
                    if (activeEditingFont) {
                      updateActiveEditingFont({ isBold: !activeEditingFont.isBold });
                    } else {
                      setToolSettings((prev) => ({ ...prev, isBold: !prev.isBold }));
                    }
                  }}
                  className={`px-2 py-0.5 rounded font-bold text-xs border transition ${
                    (activeEditingFont ? activeEditingFont.isBold : toolSettings.isBold)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                  title="Bold"
                >
                  B
                </button>

                {/* Italic Button */}
                <button
                  onClick={() => {
                    if (activeEditingFont) {
                      updateActiveEditingFont({ isItalic: !activeEditingFont.isItalic });
                    } else {
                      setToolSettings((prev) => ({ ...prev, isItalic: !prev.isItalic }));
                    }
                  }}
                  className={`px-2 py-0.5 rounded italic text-xs border transition ${
                    (activeEditingFont ? activeEditingFont.isItalic : toolSettings.isItalic)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                  title="Italic"
                >
                  I
                </button>
              </div>

              {/* Automatic Font Detection Status Pill (Acrobat-style) */}
              <div className="flex items-center justify-between pt-0.5 text-[10px]">
                {activeEditingFont ? (
                  <div
                    className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium w-full"
                    title={activeEditingFont.warningMessage || `Detected font: ${activeEditingFont.fontName}`}
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      Detected: <strong>{activeEditingFont.fontFamily}</strong>
                    </span>
                    <span className="shrink-0 px-1 py-0.2 rounded text-[9px] bg-emerald-200/70 text-emerald-950 font-bold uppercase">
                      {activeEditingFont.isEmbedded
                        ? 'Embedded'
                        : activeEditingFont.source === 'system'
                        ? 'Win11'
                        : activeEditingFont.source === 'standard'
                        ? 'Standard'
                        : 'Visual Match'}
                    </span>
                    {activeEditingFont.isSubset && (
                      <span
                        className="shrink-0 flex items-center space-x-0.5 text-amber-800 bg-amber-100 px-1 py-0.2 rounded text-[9px] font-semibold"
                        title={activeEditingFont.warningMessage}
                      >
                        <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                        <span>Subset</span>
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 text-slate-400 px-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                    <span>New Text: Application Default Font</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* COMMENT & MARKUP TAB */}
        {activeRibbonTab === 'comment' && (
          <div className="flex items-center space-x-4">
            {/* Highlights & Text Marks */}
            <div className="flex flex-col items-center border-r border-slate-200 pr-3">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setActiveTool('highlight')}
                  className={`p-2 rounded text-xs flex flex-col items-center transition ${
                    activeTool === 'highlight'
                      ? 'bg-amber-100 text-amber-800 font-medium'
                      : 'hover:bg-white text-slate-700'
                  }`}
                >
                  <Highlighter className="w-4 h-4 mb-0.5 text-amber-500" />
                  <span>Highlight</span>
                </button>

                <button
                  onClick={() => setActiveTool('underline')}
                  className={`p-2 rounded text-xs flex flex-col items-center transition ${
                    activeTool === 'underline'
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'hover:bg-white text-slate-700'
                  }`}
                >
                  <Underline className="w-4 h-4 mb-0.5 text-blue-600" />
                  <span>Underline</span>
                </button>

                <button
                  onClick={() => setActiveTool('strikethrough')}
                  className={`p-2 rounded text-xs flex flex-col items-center transition ${
                    activeTool === 'strikethrough'
                      ? 'bg-rose-100 text-rose-700 font-medium'
                      : 'hover:bg-white text-slate-700'
                  }`}
                >
                  <Strikethrough className="w-4 h-4 mb-0.5 text-rose-600" />
                  <span>Strikethrough</span>
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">Text Markup</span>
            </div>

            {/* Drawing & Notes */}
            <div className="flex flex-col items-center border-r border-slate-200 pr-3">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setActiveTool('draw')}
                  className={`p-2 rounded text-xs flex flex-col items-center transition ${
                    activeTool === 'draw'
                      ? 'bg-rose-100 text-rose-700 font-medium'
                      : 'hover:bg-white text-slate-700'
                  }`}
                >
                  <PenTool className="w-4 h-4 mb-0.5 text-rose-600" />
                  <span>Freehand Pen</span>
                </button>

                <button
                  onClick={() => setActiveTool('sticky')}
                  className={`p-2 rounded text-xs flex flex-col items-center transition ${
                    activeTool === 'sticky'
                      ? 'bg-amber-100 text-amber-800 font-medium'
                      : 'hover:bg-white text-slate-700'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 mb-0.5 text-amber-500" />
                  <span>Sticky Note</span>
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">Draw & Notes</span>
            </div>

            {/* Shapes */}
            <div className="flex flex-col items-center border-r border-slate-200 pr-3">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setActiveTool('shape-rect')}
                  className={`p-1.5 rounded text-xs hover:bg-white text-slate-700 ${
                    activeTool === 'shape-rect' ? 'bg-blue-100 text-blue-700' : ''
                  }`}
                  title="Rectangle"
                >
                  <Square className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveTool('shape-circle')}
                  className={`p-1.5 rounded text-xs hover:bg-white text-slate-700 ${
                    activeTool === 'shape-circle' ? 'bg-blue-100 text-blue-700' : ''
                  }`}
                  title="Circle"
                >
                  <Circle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveTool('shape-line')}
                  className={`p-1.5 rounded text-xs hover:bg-white text-slate-700 ${
                    activeTool === 'shape-line' ? 'bg-blue-100 text-blue-700' : ''
                  }`}
                  title="Line"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">Shapes</span>
            </div>

            {/* Color Selector */}
            <div className="flex flex-col items-center">
              <div className="flex items-center space-x-1">
                <input
                  type="color"
                  value={toolSettings.drawColor}
                  onChange={(e) =>
                    setToolSettings((prev) => ({ ...prev, drawColor: e.target.value }))
                  }
                  className="w-6 h-6 p-0 border border-slate-300 rounded cursor-pointer"
                  title="Stroke Color"
                />
                <select
                  value={toolSettings.drawStrokeWidth}
                  onChange={(e) =>
                    setToolSettings((prev) => ({ ...prev, drawStrokeWidth: Number(e.target.value) }))
                  }
                  className="border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white"
                >
                  <option value={1}>1px</option>
                  <option value={3}>3px</option>
                  <option value={5}>5px</option>
                  <option value={8}>8px</option>
                </select>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">Color & Width</span>
            </div>
          </div>
        )}

        {/* ORGANIZE PAGES TAB */}
        {activeRibbonTab === 'organize' && (
          <div className="flex items-center space-x-4">
            <div className="flex flex-col items-center border-r border-slate-200 pr-3">
              <button
                onClick={() => setIsOrganizeModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-xs shadow-xs transition"
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Visual Page Grid</span>
              </button>
              <span className="text-[10px] text-slate-400 mt-0.5">Overview</span>
            </div>

            <div className="flex flex-col items-center border-r border-slate-200 pr-3">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => rotateCurrentPage(-90)}
                  className="p-2 rounded text-xs flex flex-col items-center hover:bg-white text-slate-700 transition"
                  title="Rotate Current Page Left"
                >
                  <RotateCcw className="w-4 h-4 mb-0.5 text-slate-600" />
                  <span>Rotate Left</span>
                </button>
                <button
                  onClick={() => rotateCurrentPage(90)}
                  className="p-2 rounded text-xs flex flex-col items-center hover:bg-white text-slate-700 transition"
                  title="Rotate Current Page Right"
                >
                  <RotateCw className="w-4 h-4 mb-0.5 text-slate-600" />
                  <span>Rotate Right</span>
                </button>
                <button
                  onClick={() => rotateAllPages(90)}
                  className="p-2 rounded text-xs flex flex-col items-center hover:bg-white text-slate-700 transition"
                  title="Rotate All Pages 90°"
                >
                  <RotateCw className="w-4 h-4 mb-0.5 text-blue-600" />
                  <span>Rotate All</span>
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">Orientation</span>
            </div>

            <div className="flex flex-col items-center border-r border-slate-200 pr-3">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setIsInsertPagesModalOpen(true)}
                  className="p-2 rounded text-xs flex flex-col items-center hover:bg-white text-slate-700 transition"
                  title="Insert Pages from another PDF"
                >
                  <FolderInput className="w-4 h-4 mb-0.5 text-emerald-600" />
                  <span>Insert PDF</span>
                </button>
                <button
                  onClick={() => duplicatePages([currentPage - 1])}
                  className="p-2 rounded text-xs flex flex-col items-center hover:bg-white text-slate-700 transition"
                  title="Duplicate current page"
                >
                  <Copy className="w-4 h-4 mb-0.5 text-blue-600" />
                  <span>Duplicate</span>
                </button>
                <button
                  onClick={() => setIsSplitModalOpen(true)}
                  className="p-2 rounded text-xs flex flex-col items-center hover:bg-white text-slate-700 transition"
                  title="Split PDF by ranges"
                >
                  <Split className="w-4 h-4 mb-0.5 text-amber-600" />
                  <span>Split PDF</span>
                </button>
                <button
                  onClick={() => insertBlankPageAt(currentPage)}
                  className="p-2 rounded text-xs flex flex-col items-center hover:bg-white text-slate-700 transition"
                >
                  <FilePlus className="w-4 h-4 mb-0.5 text-slate-600" />
                  <span>Blank Page</span>
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">Page Operations</span>
            </div>
          </div>
        )}

        {/* FORMS & SIGN TAB */}
        {activeRibbonTab === 'form' && (
          <div className="flex items-center space-x-4">
            <div className="flex flex-col items-center border-r border-slate-200 pr-3">
              <button
                onClick={() => setIsSignatureModalOpen(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium text-xs shadow-xs transition"
              >
                <PenTool className="w-4 h-4" />
                <span>Sign Document</span>
              </button>
              <span className="text-[10px] text-slate-400 mt-0.5">Signatures</span>
            </div>

            {/* Form Field Creators */}
            <div className="flex flex-col items-center border-r border-slate-200 pr-3">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setActiveTool('form-text')}
                  className={`p-2 rounded text-xs flex flex-col items-center transition ${
                    activeTool === 'form-text'
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'hover:bg-white text-slate-700'
                  }`}
                >
                  <Type className="w-4 h-4 mb-0.5 text-blue-600" />
                  <span>Text Field</span>
                </button>

                <button
                  onClick={() => setActiveTool('form-check')}
                  className={`p-2 rounded text-xs flex flex-col items-center transition ${
                    activeTool === 'form-check'
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'hover:bg-white text-slate-700'
                  }`}
                >
                  <CheckSquare className="w-4 h-4 mb-0.5 text-indigo-600" />
                  <span>Checkbox</span>
                </button>

                <button
                  onClick={() => setActiveTool('stamp')}
                  className={`p-2 rounded text-xs flex flex-col items-center transition ${
                    activeTool === 'stamp'
                      ? 'bg-emerald-100 text-emerald-800 font-medium'
                      : 'hover:bg-white text-slate-700'
                  }`}
                >
                  <FileCheck className="w-4 h-4 mb-0.5 text-emerald-600" />
                  <span>Official Stamp</span>
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">Form Elements</span>
            </div>

            {/* Stamp selector */}
            <div className="flex flex-col justify-center space-y-1 bg-white p-1.5 rounded border border-slate-200 text-xs">
              <div className="flex items-center space-x-1">
                <select
                  value={toolSettings.stampType}
                  onChange={(e) =>
                    setToolSettings((prev) => ({
                      ...prev,
                      stampType: e.target.value as any,
                      stampColor:
                        e.target.value === 'APPROVED'
                          ? '#16a34a'
                          : e.target.value === 'CONFIDENTIAL'
                          ? '#dc2626'
                          : '#4f46e5',
                    }))
                  }
                  className="border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white"
                >
                  <option value="APPROVED">APPROVED</option>
                  <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="FINAL">FINAL</option>
                  <option value="VOID">VOID</option>
                  <option value="RECEIVED">RECEIVED</option>
                </select>
                <input
                  type="color"
                  value={toolSettings.stampColor}
                  onChange={(e) =>
                    setToolSettings((prev) => ({ ...prev, stampColor: e.target.value }))
                  }
                  className="w-5 h-5 p-0 border border-slate-300 rounded cursor-pointer"
                />
              </div>
              <span className="text-[10px] text-slate-400 text-center">Stamp Preset</span>
            </div>
          </div>
        )}

        {/* PROTECT & REDACT TAB */}
        {activeRibbonTab === 'protect' && (
          <div className="flex items-center space-x-4">
            <div className="flex flex-col items-center border-r border-slate-200 pr-3">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setActiveTool('redact')}
                  className={`p-2 rounded text-xs flex flex-col items-center transition ${
                    activeTool === 'redact'
                      ? 'bg-rose-100 text-rose-700 font-medium'
                      : 'hover:bg-white text-slate-700'
                  }`}
                  title="Draw black redaction boxes"
                >
                  <ShieldAlert className="w-4 h-4 mb-0.5 text-rose-600" />
                  <span>Mark Redaction</span>
                </button>

                <button
                  onClick={applyBurnedRedactions}
                  className="p-2 rounded text-xs flex flex-col items-center hover:bg-white text-rose-700 transition"
                  title="Permanently remove underlying content"
                >
                  <FileCheck className="w-4 h-4 mb-0.5 text-rose-600" />
                  <span>Apply Redactions</span>
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">True Redaction</span>
            </div>

            <div className="flex flex-col items-center border-r border-slate-200 pr-3">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setIsWatermarkModalOpen(true)}
                  className="p-2 rounded text-xs flex flex-col items-center hover:bg-white text-slate-700 transition"
                >
                  <Sparkles className="w-4 h-4 mb-0.5 text-blue-600" />
                  <span>Watermark</span>
                </button>
                <button
                  onClick={() => setIsProtectModalOpen(true)}
                  className="p-2 rounded text-xs flex flex-col items-center hover:bg-white text-slate-700 transition"
                  title="Protect PDF with passwords and permissions"
                >
                  <Lock className="w-4 h-4 mb-0.5 text-amber-600" />
                  <span>Password Security</span>
                </button>
                <button
                  onClick={() => setIsUnlockModalOpen(true)}
                  disabled={!activeDoc}
                  className={`p-2 rounded text-xs flex flex-col items-center transition ${
                    activeDoc ? 'hover:bg-white text-slate-700' : 'opacity-40 cursor-not-allowed text-slate-400'
                  }`}
                  title="Unlock PDF / Remove Security & Restrictions"
                >
                  <Unlock className="w-4 h-4 mb-0.5 text-emerald-600" />
                  <span>Unlock PDF</span>
                </button>
                <button
                  onClick={() => setIsPropertiesModalOpen(true)}
                  className="p-2 rounded text-xs flex flex-col items-center hover:bg-white text-slate-700 transition"
                >
                  <Sliders className="w-4 h-4 mb-0.5 text-slate-600" />
                  <span>Sanitize Metadata</span>
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">Security</span>
            </div>
          </div>
        )}

        {/* CONVERT & EXPORT TAB */}
        {activeRibbonTab === 'share' && (
          <div className="flex items-center space-x-4">
            <div className="flex flex-col items-center border-r border-slate-200 pr-3">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setIsExportModalOpen(true)}
                  className="p-2 rounded text-xs flex flex-col items-center hover:bg-white text-slate-700 transition"
                >
                  <Download className="w-4 h-4 mb-0.5 text-blue-600" />
                  <span>Export Images</span>
                </button>
                <button
                  onClick={exportToTxt}
                  className="p-2 rounded text-xs flex flex-col items-center hover:bg-white text-slate-700 transition"
                >
                  <Download className="w-4 h-4 mb-0.5 text-emerald-600" />
                  <span>Extract to TXT</span>
                </button>
                <button
                  onClick={() => setIsBatchModalOpen(true)}
                  className="p-2 rounded text-xs flex flex-col items-center hover:bg-white text-slate-700 transition"
                >
                  <Layers className="w-4 h-4 mb-0.5 text-teal-600" />
                  <span>Batch Studio</span>
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">Export & Batch</span>
            </div>

            <div className="flex flex-col items-center border-r border-slate-200 pr-3">
              <button
                onClick={() => setIsCompareModalOpen(true)}
                className="p-2 rounded text-xs flex flex-col items-center hover:bg-white text-slate-700 transition"
              >
                <Layers className="w-4 h-4 mb-0.5 text-indigo-600" />
                <span>Compare Two PDFs</span>
              </button>
              <span className="text-[10px] text-slate-400 mt-0.5">Difference</span>
            </div>

            <div className="flex flex-col items-center border-r border-slate-200 pr-3">
              <button
                onClick={() => setIsCloudModalOpen(true)}
                className="p-2 rounded text-xs flex flex-col items-center hover:bg-white text-blue-700 transition"
              >
                <Cloud className="w-4 h-4 mb-0.5 text-blue-600" />
                <span>Cloud Manager</span>
              </button>
              <span className="text-[10px] text-slate-400 mt-0.5">Firebase</span>
            </div>
          </div>
        )}

        {/* VIEW TAB */}
        {activeRibbonTab === 'view' && (
          <div className="flex items-center space-x-4">
            <div className="flex flex-col items-center border-r border-slate-200 pr-3">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
                  className="p-2 rounded text-xs flex flex-col items-center hover:bg-white text-slate-700 transition"
                >
                  <ZoomOut className="w-4 h-4 mb-0.5" />
                  <span>Zoom Out</span>
                </button>
                <button
                  onClick={() => setZoom(1.0)}
                  className="p-2 rounded text-xs flex flex-col items-center hover:bg-white text-slate-700 transition"
                >
                  <span className="font-semibold text-xs py-0.5">100%</span>
                  <span>Actual Size</span>
                </button>
                <button
                  onClick={() => setZoom((z) => Math.min(3.0, Number((z + 0.15).toFixed(2))))}
                  className="p-2 rounded text-xs flex flex-col items-center hover:bg-white text-slate-700 transition"
                >
                  <ZoomIn className="w-4 h-4 mb-0.5" />
                  <span>Zoom In</span>
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">Magnification</span>
            </div>

            <div className="flex flex-col items-center border-r border-slate-200 pr-3">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setContinuousScroll(!continuousScroll)}
                  className={`p-2 rounded text-xs flex flex-col items-center transition ${
                    continuousScroll ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-white text-slate-700'
                  }`}
                >
                  <Eye className="w-4 h-4 mb-0.5" />
                  <span>{continuousScroll ? 'Continuous' : 'Single Page'}</span>
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">Page Display</span>
            </div>
          </div>
        )}

        {/* HELP TAB */}
        {activeRibbonTab === 'help' && (
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsQaModalOpen(true)}
              className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded font-medium text-xs shadow-xs transition"
              title="Launch client-side automated QA diagnostic and self-testing runner"
            >
              <Activity className="w-4 h-4 text-blue-200 animate-pulse" />
              <span>Automated QA Self-Test</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-bold tracking-wider">
                DIAGNOSTIC
              </span>
            </button>
            <button
              onClick={() => setIsHelpModalOpen(true)}
              className="flex items-center space-x-2 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded font-medium text-xs shadow-xs transition"
            >
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>Keyboard Shortcuts & Guide</span>
            </button>
            <button
              onClick={() => setIsPropertiesModalOpen(true)}
              disabled={!activeDoc}
              className="flex items-center space-x-2 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded font-medium text-xs shadow-xs transition"
            >
              <Sliders className="w-4 h-4 text-slate-600" />
              <span>Document Properties</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
