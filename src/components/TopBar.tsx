import React, { useRef } from 'react';
import {
  FileText,
  FolderOpen,
  Save,
  Printer,
  Undo2,
  Redo2,
  Plus,
  X,
  Minus,
  Square,
  Sparkles,
  Cloud,
  CloudOff,
  RefreshCw,
  User,
  Sun,
  Moon,
} from 'lucide-react';
import { usePdf } from '../context/PdfContext';
import { useTheme } from '../context/ThemeContext';

export const TopBar: React.FC = () => {
  const {
    documents,
    activeDocIndex,
    activeDoc,
    setActiveDocIndex,
    closeDocument,
    openPdfFile,
    saveCurrentDocument,
    undo,
    redo,
    canUndo,
    canRedo,
    createBlank,
    isProcessing,
    setIsCloudModalOpen,
    setIsAuthModalOpen,
    currentUser,
    cloudSyncStatus,
    pendingSyncCount,
  } = usePdf();

  const { resolvedTheme, toggleTheme } = useTheme();

  const fileInputRef = useRef<HTMLInputElement>(null);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      openPdfFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <header className="flex flex-col bg-[#0b2545] text-white select-none border-b border-[#081a31] text-xs">
      {/* Top Application Header */}
      <div className="flex items-center justify-between h-9 px-3 border-b border-white/10">
        {/* Left: Branding & Quick Actions */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 mr-2">
            <div className="w-6 h-6 rounded overflow-hidden shadow-sm flex items-center justify-center bg-white/10">
              <img src="/logo.jpg" alt="HHM PDF" className="w-full h-full object-cover" />
            </div>
            <span className="font-semibold text-sm tracking-wide text-white">
              HHM PDF
            </span>
          </div>

          <div className="h-4 w-px bg-white/20" />

          {/* Quick Access Icons */}
          <div className="flex items-center space-x-0.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Open PDF (Ctrl+O)"
              className="p-1.5 hover:bg-white/15 rounded text-white/90 hover:text-white transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="application/pdf"
              className="hidden"
            />

            <button
              onClick={() => saveCurrentDocument(true)}
              disabled={!activeDoc || isProcessing}
              title="Save & Export PDF (Ctrl+S)"
              className={`p-1.5 rounded transition-colors ${
                activeDoc
                  ? 'hover:bg-white/15 text-white/90 hover:text-white'
                  : 'text-white/30 cursor-not-allowed'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handlePrint}
              disabled={!activeDoc}
              title="Print Document (Ctrl+P)"
              className={`p-1.5 rounded transition-colors ${
                activeDoc
                  ? 'hover:bg-white/15 text-white/90 hover:text-white'
                  : 'text-white/30 cursor-not-allowed'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
            </button>

            <div className="h-3.5 w-px bg-white/20 mx-1" />

            <button
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className={`p-1.5 rounded transition-colors ${
                canUndo
                  ? 'hover:bg-white/15 text-white/90 hover:text-white'
                  : 'text-white/30 cursor-not-allowed'
              }`}
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              className={`p-1.5 rounded transition-colors ${
                canRedo
                  ? 'hover:bg-white/15 text-white/90 hover:text-white'
                  : 'text-white/30 cursor-not-allowed'
              }`}
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center: Active Document Title Banner */}
        <div className="hidden md:flex items-center space-x-2 text-white/80 text-xs">
          {activeDoc ? (
            <span className="font-medium truncate max-w-sm">
              {activeDoc.name}
              {activeDoc.isModified && (
                <span className="text-amber-400 font-bold ml-1.5">● Unsaved</span>
              )}
            </span>
          ) : (
            <span className="text-white/60 flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-blue-300" />
              <span>Welcome to HHM PDF</span>
            </span>
          )}
        </div>

        {/* Right: Cloud Sync, User Profile & Windows Controls */}
        <div className="flex items-center space-x-2">
          {/* Cloud Documents Manager Button */}
          <button
            onClick={() => setIsCloudModalOpen(true)}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/40 text-blue-100 hover:text-white transition-colors"
            title="Open Firebase Cloud Document Manager"
          >
            {cloudSyncStatus === 'syncing' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-300" />
            ) : cloudSyncStatus === 'offline' ? (
              <CloudOff className="w-3.5 h-3.5 text-amber-300" />
            ) : (
              <Cloud className="w-3.5 h-3.5 text-blue-300" />
            )}
            <span className="font-medium text-[11px] hidden sm:inline">Cloud Docs</span>
            {pendingSyncCount > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title={`${pendingSyncCount} pending syncs`} />
            )}
          </button>

          {/* User Account / Profile Button */}
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center space-x-1.5 p-1 rounded hover:bg-white/15 transition-colors"
            title={currentUser ? `Account: ${currentUser.email}` : 'Sign In to Cloud Sync'}
          >
            {currentUser ? (
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : currentUser.email[0].toUpperCase()}
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white/80">
                <User className="w-3 h-3" />
              </div>
            )}
            <span className="text-[11px] text-white/80 hidden xl:inline max-w-[120px] truncate">
              {currentUser ? currentUser.displayName || currentUser.email.split('@')[0] : 'Sign In'}
            </span>
          </button>

          {/* Global Light / Dark Theme Switcher Button */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded hover:bg-white/15 text-amber-300 hover:text-white transition-colors"
            title={resolvedTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-300 animate-pulse-subtle" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-200" />
            )}
          </button>

          <div className="h-3.5 w-px bg-white/20 mx-0.5" />

          {/* Window Controls */}
          <div className="flex items-center space-x-0.5">
            <button
              title="Minimize"
              className="w-7 h-6 flex items-center justify-center hover:bg-white/10 rounded text-white/70 hover:text-white"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              title="Maximize"
              className="w-7 h-6 flex items-center justify-center hover:bg-white/10 rounded text-white/70 hover:text-white"
            >
              <Square className="w-2.5 h-2.5" />
            </button>
            <button
              title="Close"
              className="w-7 h-6 flex items-center justify-center hover:bg-red-600 rounded text-white/70 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>


      {/* Document Tabs Bar */}
      <div className="flex items-center h-8 px-2 bg-[#081a31] dark:bg-slate-950 overflow-x-auto no-scrollbar border-b border-white/5">
        {/* Home Tab */}
        <button
          onClick={() => setActiveDocIndex(-1)}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-t text-xs font-medium transition-colors h-7 ${
            activeDocIndex === -1
              ? 'bg-[#f1f3f6] dark:bg-slate-900 text-[#0b2545] dark:text-blue-400 shadow-sm font-semibold'
              : 'text-white/75 hover:bg-white/10 hover:text-white'
          }`}
        >
          <span>Home</span>
        </button>

        {/* Open Documents Tabs */}
        {documents.map((doc, idx) => {
          const isActive = activeDocIndex === idx;
          return (
            <div
              key={doc.id}
              onClick={() => setActiveDocIndex(idx)}
              className={`group flex items-center space-x-2 px-3 py-1 rounded-t text-xs cursor-pointer border-r border-white/5 transition-colors h-7 max-w-[200px] ${
                isActive
                  ? 'bg-[#f1f3f6] dark:bg-slate-900 text-[#0b2545] dark:text-slate-100 shadow-sm font-semibold'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-600' : 'text-white/50'}`} />
              <span className="truncate">{doc.name}</span>
              {doc.isModified && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeDocument(idx);
                }}
                className="opacity-0 group-hover:opacity-100 hover:bg-black/10 rounded p-0.5 text-inherit transition-opacity shrink-0"
                title="Close Tab"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {/* Add Tab Button */}
        <button
          onClick={() => createBlank('a4', 'portrait', 1)}
          title="Create New Blank Document"
          className="flex items-center justify-center w-6 h-6 ml-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
