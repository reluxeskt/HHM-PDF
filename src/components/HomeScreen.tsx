import React, { useEffect, useState, useRef } from 'react';
import {
  FileText,
  FolderOpen,
  FilePlus,
  Files,
  LayoutGrid,
  PenTool,
  ScanText,
  ShieldAlert,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  HardDrive,
  Download,
  Trash2,
  Split,
  Layers,
  FolderInput,
  Cloud,
} from 'lucide-react';
import { usePdf } from '../context/PdfContext';
import { StorageService } from '../services/storage';
import { SAMPLE_DOCS } from '../services/samplePdfs';
import { RecentDocument } from '../types';

export const HomeScreen: React.FC = () => {
  const {
    activeDoc,
    openPdfFile,
    openSample,
    openPdfBuffer,
    createBlank,
    setIsCombineModalOpen,
    setIsOrganizeModalOpen,
    setIsSignatureModalOpen,
    setIsOcrModalOpen,
    setIsRedactionModalOpen,
    setIsNewBlankModalOpen,
    setIsSplitModalOpen,
    setIsBatchModalOpen,
    setIsCloudModalOpen,
  } = usePdf();


  const [recentDocs, setRecentDocs] = useState<RecentDocument[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadRecents = async () => {
    const list = await StorageService.getRecentDocuments();
    setRecentDocs(list);
  };

  useEffect(() => {
    loadRecents();
  }, []);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        openPdfFile(file);
      } else {
        alert('Please drop a valid PDF document.');
      }
    }
  };

  const handleOpenRecent = async (rec: RecentDocument) => {
    const data = await StorageService.getCachedDocumentData(rec.id);
    if (data) {
      await openPdfBuffer(data, rec.name);
    } else {
      alert(`The document "${rec.name}" is no longer cached in local storage.`);
    }
  };

  const handleClearRecents = async () => {
    if (confirm('Clear all recent document history?')) {
      await StorageService.clearRecents();
      setRecentDocs([]);
    }
  };

  const handleToolAction = (modalTrigger: () => void) => {
    if (activeDoc) {
      modalTrigger();
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleFileDrop}
      className={`flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors ${
        isDragging ? 'bg-blue-50/80 dark:bg-blue-950/80 ring-4 ring-blue-500/30' : ''
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg overflow-hidden shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center bg-white dark:bg-slate-800">
                <img src="/logo.jpg" alt="HHM PDF Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    HHM PDF
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold text-xs border border-blue-200 dark:border-blue-800">
                    Professional Edition
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Professional, local-first PDF manipulation, creation, form filling, OCR, and permanent redaction.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold text-sm shadow-xs transition"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Open Document</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  openPdfFile(e.target.files[0]);
                }
              }}
              accept="application/pdf"
              className="hidden"
            />

            <button
              onClick={() => setIsNewBlankModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-md font-medium text-sm transition shadow-2xs"
            >
              <FilePlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>New PDF</span>
            </button>
          </div>
        </div>

        {/* Quick Tools Grid */}
        <div className="mt-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Quick Action Tools
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-start p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xs transition text-left group"
            >
              <div className="w-9 h-9 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <FolderOpen className="w-5 h-5" />
              </div>
              <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">Open File</span>
              <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Drag & drop or browse local storage</span>
            </button>

            <button
              onClick={() => setIsNewBlankModalOpen(true)}
              className="flex flex-col items-start p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xs transition text-left group"
            >
              <div className="w-9 h-9 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <FilePlus className="w-5 h-5" />
              </div>
              <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">Create Blank PDF</span>
              <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Custom size, orientation & pages</span>
            </button>

            <button
              onClick={() => setIsCombineModalOpen(true)}
              className="flex flex-col items-start p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-xs transition text-left group"
            >
              <div className="w-9 h-9 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <Files className="w-5 h-5" />
              </div>
              <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">Combine Files</span>
              <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Merge multiple PDFs with ordering</span>
            </button>

            <button
              onClick={() => handleToolAction(() => setIsOrganizeModalOpen(true))}
              className="flex flex-col items-start p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-xs transition text-left group"
            >
              <div className="w-9 h-9 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">Organize Pages</span>
              <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Reorder, rotate, delete & extract</span>
            </button>

            <button
              onClick={() => handleToolAction(() => setIsSignatureModalOpen(true))}
              className="flex flex-col items-start p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-xs transition text-left group"
            >
              <div className="w-9 h-9 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <PenTool className="w-5 h-5" />
              </div>
              <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">Fill & Sign</span>
              <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Draw, type, or upload signatures</span>
            </button>

            <button
              onClick={() => handleToolAction(() => setIsOcrModalOpen(true))}
              className="flex flex-col items-start p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-cyan-400 dark:hover:border-cyan-500 hover:shadow-xs transition text-left group"
            >
              <div className="w-9 h-9 rounded-md bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <ScanText className="w-5 h-5" />
              </div>
              <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">Scan & OCR</span>
              <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Recognize text in scanned documents</span>
            </button>

            <button
              onClick={() => handleToolAction(() => setIsRedactionModalOpen(true))}
              className="flex flex-col items-start p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-500 hover:shadow-xs transition text-left group"
            >
              <div className="w-9 h-9 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">Permanent Redact</span>
              <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Wipe sensitive data permanently</span>
            </button>

            <button
              onClick={() => setIsBatchModalOpen(true)}
              className="flex flex-col items-start p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-teal-400 dark:hover:border-teal-500 hover:shadow-xs transition text-left group"
            >
              <div className="w-9 h-9 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">Batch Studio</span>
              <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Watermark & rotate multiple PDFs</span>
            </button>

            <button
              onClick={() => setIsSplitModalOpen(true)}
              className="flex flex-col items-start p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-xs transition text-left group"
            >
              <div className="w-9 h-9 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <Split className="w-5 h-5" />
              </div>
              <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">Split Document</span>
              <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Split by ranges or fixed intervals</span>
            </button>

            <button
              onClick={() => setIsCloudModalOpen(true)}
              className="flex flex-col items-start p-4 bg-gradient-to-br from-sky-50 to-blue-50/70 dark:from-sky-950/40 dark:to-blue-950/30 rounded-lg border border-sky-200 dark:border-sky-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xs transition text-left group"
            >
              <div className="w-9 h-9 rounded-md bg-blue-600 text-white flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <Cloud className="w-5 h-5" />
              </div>
              <span className="font-semibold text-sm text-blue-900 dark:text-blue-200">Cloud Storage</span>
              <span className="text-xs text-blue-600/80 dark:text-blue-400 mt-0.5">Firebase multi-device sync & folders</span>
            </button>

            <button
              onClick={() => openSample('contract-nda')}
              className="flex flex-col items-start p-4 bg-gradient-to-br from-indigo-50 to-blue-50/70 dark:from-indigo-950/40 dark:to-blue-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-xs transition text-left group"
            >
              <div className="w-9 h-9 rounded-md bg-indigo-600 text-white flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="font-semibold text-sm text-indigo-900 dark:text-indigo-200">Try Sample NDA</span>
              <span className="text-xs text-indigo-600/80 dark:text-indigo-400 mt-0.5">Instant test document with form fields</span>
            </button>
          </div>
        </div>

        {/* Ready-to-Use Sample Documents */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Interactive Test Documents
            </h2>
            <span className="text-xs text-slate-400 dark:text-slate-500">Pre-built multi-page sample PDFs</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SAMPLE_DOCS.map((doc) => (
              <div
                key={doc.id}
                onClick={() => openSample(doc.id)}
                className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="w-8 h-8 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs mb-3">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                      {doc.pages} {doc.pages === 1 ? 'page' : 'pages'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                    {doc.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {doc.description}
                  </p>
                </div>

                <div className="flex items-center space-x-1.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {doc.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    >
                      {tag}
                    </span>
                  ))}
                  <span className="ml-auto text-xs font-medium text-blue-600 dark:text-blue-400 group-hover:underline">
                    Load & Edit →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Documents Table */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Recent Documents
              </h2>
            </div>
            {recentDocs.length > 0 && (
              <button
                onClick={handleClearRecents}
                className="text-xs text-slate-400 hover:text-red-600 dark:hover:text-red-400 flex items-center space-x-1 transition"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear History</span>
              </button>
            )}
          </div>

          {recentDocs.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center">
              <FolderOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No recent documents yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Drag and drop any PDF here or open one of the sample documents above.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentDocs.map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => handleOpenRecent(rec)}
                    className="flex items-center justify-between p-3.5 hover:bg-blue-50/50 dark:hover:bg-slate-800/60 cursor-pointer transition"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition">
                          {rec.name}
                        </h4>
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {rec.pageCount} {rec.pageCount === 1 ? 'page' : 'pages'} •{' '}
                          {(rec.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {new Date(rec.lastOpened).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Security & Architecture Guarantees */}
        <div className="mt-10 p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                100% Local-First & Confidential
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                All document parsing, rendering, signatures, and permanent redaction run entirely inside your browser and Electron sandbox. No cloud servers, no trackers, zero data leakage.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0 text-xs font-mono text-slate-400 dark:text-slate-500">
            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">pdf-lib</span>
            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">PDF.js</span>
            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Electron Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};
