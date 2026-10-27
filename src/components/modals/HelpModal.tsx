import React from 'react';
import { X, HelpCircle, Keyboard, Terminal, ShieldCheck, Heart } from 'lucide-react';
import { usePdf } from '../../context/PdfContext';

export const HelpModal: React.FC = () => {
  const { isHelpModalOpen, setIsHelpModalOpen } = usePdf();

  if (!isHelpModalOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + O', action: 'Open PDF Document from local disk' },
    { key: 'Ctrl + S', action: 'Save, burn modifications & download PDF' },
    { key: 'Ctrl + P', action: 'Print document' },
    { key: 'Ctrl + Z', action: 'Undo last annotation, drawing or page change' },
    { key: 'Ctrl + Y', action: 'Redo previously reverted action' },
    { key: 'Ctrl + Mouse Wheel', action: 'Zoom in / Zoom out canvas smoothly' },
    { key: 'Esc', action: 'Cancel active tool or close open dialog' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Help & Documentation</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                HHM PDF • Professional Edition v1.0.0
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsHelpModalOpen(false)}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md text-slate-500 dark:text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-xs flex-1 overflow-y-auto max-h-[60vh]">
          {/* Shortcuts Section */}
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-2 mb-3">
              <Keyboard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Keyboard Shortcuts</span>
            </h3>
            <div className="bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {shortcuts.map((sc, i) => (
                <div key={i} className="flex items-center justify-between p-2.5">
                  <span className="text-slate-600 dark:text-slate-300">{sc.action}</span>
                  <kbd className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-100 shadow-2xs">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop App Information */}
          <div>
            <h3 className="font-bold text-sm text-slate-800 flex items-center space-x-2 mb-2">
              <Terminal className="w-4 h-4 text-indigo-600" />
              <span>Windows Desktop & Electron Build</span>
            </h3>
            <div className="bg-slate-900 text-slate-200 rounded-lg p-3.5 font-mono text-[11px] space-y-1">
              <p className="text-emerald-400"># Run in Web browser:</p>
              <p>npm run dev</p>
              <p className="text-emerald-400 mt-2"># Package Windows NSIS Desktop Installer:</p>
              <p>npm run build && npx electron-builder --win</p>
            </div>
          </div>

          {/* Architecture Guarantees */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg flex items-start space-x-3 text-blue-900">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-xs">100% Client-Side Local Architecture</h4>
              <p className="text-[11px] text-blue-800/80 mt-0.5">
                Powered by Mozilla PDF.js and pdf-lib. All operations run directly inside the browser / Electron environment. Zero external network telemetry, zero document uploads, full offline capability.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
          <span>HHM PDF Pro DC</span>
          <button
            onClick={() => setIsHelpModalOpen(false)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold shadow-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
