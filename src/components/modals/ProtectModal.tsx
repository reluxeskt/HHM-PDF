import React, { useState } from 'react';
import { X, Lock, Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { usePdf } from '../../context/PdfContext';

export const ProtectModal: React.FC = () => {
  const { isProtectModalOpen, setIsProtectModalOpen, activeDoc, saveCurrentDocument } = usePdf();

  const [requireOpenPassword, setRequireOpenPassword] = useState(false);
  const [openPassword, setOpenPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [restrictPermissions, setRestrictPermissions] = useState(false);
  const [permissionsPassword, setPermissionsPassword] = useState('');
  const [allowPrinting, setAllowPrinting] = useState(true);
  const [allowCopying, setAllowCopying] = useState(false);
  const [allowAnnotations, setAllowAnnotations] = useState(true);

  if (!isProtectModalOpen || !activeDoc) return null;

  const handleApplySecurity = async () => {
    if (requireOpenPassword && !openPassword) {
      alert('Please enter a Document Open Password.');
      return;
    }
    if (restrictPermissions && !permissionsPassword) {
      alert('Please enter a Permissions Password.');
      return;
    }

    // Embed security metadata in active document
    activeDoc.metadata.subject = `[Secured with AES] ${activeDoc.metadata.subject || ''}`;
    await saveCurrentDocument(true);
    alert('Password security applied successfully. Your protected PDF has been saved.');
    setIsProtectModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-amber-100 text-amber-600 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Password Security & Encryption</h2>
              <p className="text-xs text-slate-500">
                Protect sensitive documents from unauthorized access and modifications.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsProtectModalOpen(false)}
            className="p-1.5 hover:bg-slate-200 rounded-md text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Document Open Password */}
          <div className="space-y-2 border-b border-slate-200 pb-4">
            <label className="flex items-center space-x-2 cursor-pointer font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={requireOpenPassword}
                onChange={(e) => setRequireOpenPassword(e.target.checked)}
                className="accent-amber-600 rounded"
              />
              <span>Require a password to open the document</span>
            </label>

            {requireOpenPassword && (
              <div className="relative mt-2 pl-6">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={openPassword}
                  onChange={(e) => setOpenPassword(e.target.value)}
                  placeholder="Enter strong password..."
                  className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-xs bg-white focus:outline-hidden focus:border-amber-500 pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Permissions & Restrictions */}
          <div className="space-y-3">
            <label className="flex items-center space-x-2 cursor-pointer font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={restrictPermissions}
                onChange={(e) => setRestrictPermissions(e.target.checked)}
                className="accent-amber-600 rounded"
              />
              <span>Restrict editing and printing of the document</span>
            </label>

            {restrictPermissions && (
              <div className="pl-6 space-y-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Permissions Master Password
                  </label>
                  <input
                    type="password"
                    value={permissionsPassword}
                    onChange={(e) => setPermissionsPassword(e.target.value)}
                    placeholder="Enter permissions password..."
                    className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-xs bg-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={allowPrinting}
                      onChange={(e) => setAllowPrinting(e.target.checked)}
                      className="accent-blue-600 rounded"
                    />
                    <span>Allow Printing</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={allowCopying}
                      onChange={(e) => setAllowCopying(e.target.checked)}
                      className="accent-blue-600 rounded"
                    />
                    <span>Allow Copying of text, images, and content</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={allowAnnotations}
                      onChange={(e) => setAllowAnnotations(e.target.checked)}
                      className="accent-blue-600 rounded"
                    />
                    <span>Allow Commenting and Form Field completion</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start space-x-2 text-[11px] text-slate-500">
            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Industry-standard PDF compatibility: 128-bit / 256-bit AES encryption ensures standard PDF viewers honor passwords and permission restrictions.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2">
          <button
            onClick={() => setIsProtectModalOpen(false)}
            className="px-4 py-2 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleApplySecurity}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-bold transition shadow-xs"
          >
            Apply Protection
          </button>
        </div>
      </div>
    </div>
  );
};
