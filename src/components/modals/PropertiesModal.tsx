import React, { useState } from 'react';
import { X, Sliders, Info, ShieldCheck, FileText } from 'lucide-react';
import { usePdf } from '../../context/PdfContext';

export const PropertiesModal: React.FC = () => {
  const { isPropertiesModalOpen, setIsPropertiesModalOpen, activeDoc, saveCurrentDocument } = usePdf();

  const [activeTab, setActiveTab] = useState<'desc' | 'security'>('desc');
  const [title, setTitle] = useState(activeDoc?.metadata.title || '');
  const [author, setAuthor] = useState(activeDoc?.metadata.author || '');
  const [subject, setSubject] = useState(activeDoc?.metadata.subject || '');
  const [keywords, setKeywords] = useState(activeDoc?.metadata.keywords || '');

  if (!isPropertiesModalOpen || !activeDoc) return null;

  const handleSaveMetadata = async () => {
    activeDoc.metadata.title = title;
    activeDoc.metadata.author = author;
    activeDoc.metadata.subject = subject;
    activeDoc.metadata.keywords = keywords;
    await saveCurrentDocument(false);
    setIsPropertiesModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-slate-100 text-slate-700 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Document Properties</h2>
              <p className="text-xs text-slate-500">{activeDoc.name}</p>
            </div>
          </div>
          <button
            onClick={() => setIsPropertiesModalOpen(false)}
            className="p-1.5 hover:bg-slate-200 rounded-md text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab strip */}
        <div className="px-6 border-b border-slate-200 flex space-x-4 bg-white text-xs font-semibold">
          <button
            onClick={() => setActiveTab('desc')}
            className={`py-2.5 border-b-2 transition ${
              activeTab === 'desc'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Description & Metadata
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-2.5 border-b-2 transition ${
              activeTab === 'security'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Security & Permissions
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-3.5 text-xs flex-1 overflow-y-auto max-h-[55vh]">
          {activeTab === 'desc' ? (
            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Document Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-xs bg-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Author</label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-xs bg-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-xs bg-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Keywords</label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="Comma-separated keywords"
                  className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-xs bg-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-slate-500 text-[11px]">
                <div>
                  <span className="font-semibold text-slate-700">Created:</span>{' '}
                  {activeDoc.metadata.creationDate ? new Date(activeDoc.metadata.creationDate).toLocaleString() : 'N/A'}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Modified:</span>{' '}
                  {activeDoc.metadata.modificationDate ? new Date(activeDoc.metadata.modificationDate).toLocaleString() : 'N/A'}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Page Count:</span> {activeDoc.pageCount} pages
                </div>
                <div>
                  <span className="font-semibold text-slate-700">File Size:</span> {(activeDoc.fileSize / 1024).toFixed(1)} KB
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Application:</span> HHM PDF Engine
                </div>
                <div>
                  <span className="font-semibold text-slate-700">PDF Version:</span> 1.7 (ISO 32000-1 Standard)
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center space-x-2.5 text-emerald-800">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-medium text-xs">
                  Document Security Method: No Password Encryption Currently Enforced
                </span>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2">Document Permissions Summary:</h4>
                <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-100 text-xs">
                  <div className="flex justify-between p-2.5">
                    <span className="text-slate-600">Printing:</span>
                    <span className="font-semibold text-emerald-600">Allowed (High Resolution)</span>
                  </div>
                  <div className="flex justify-between p-2.5">
                    <span className="text-slate-600">Document Assembly / Reordering:</span>
                    <span className="font-semibold text-emerald-600">Allowed</span>
                  </div>
                  <div className="flex justify-between p-2.5">
                    <span className="text-slate-600">Content Copying & Extraction:</span>
                    <span className="font-semibold text-emerald-600">Allowed</span>
                  </div>
                  <div className="flex justify-between p-2.5">
                    <span className="text-slate-600">Form Field Filling & Signing:</span>
                    <span className="font-semibold text-emerald-600">Allowed</span>
                  </div>
                  <div className="flex justify-between p-2.5">
                    <span className="text-slate-600">Commenting & Annotations:</span>
                    <span className="font-semibold text-emerald-600">Allowed</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2">
          <button
            onClick={() => setIsPropertiesModalOpen(false)}
            className="px-4 py-2 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveMetadata}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition shadow-xs"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
