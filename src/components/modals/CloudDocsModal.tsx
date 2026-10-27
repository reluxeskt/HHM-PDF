import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Cloud,
  Folder,
  FolderPlus,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  FileText,
  Clock,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Search,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { usePdf } from '../../context/PdfContext';
import { CloudDocumentRecord, CloudFolder } from '../../../packages/shared/src/types';
import { MAX_UPLOAD_SIZE_BYTES } from '../../../packages/shared/src/constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onOpenAuth: () => void;
}

export const CloudDocsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenAuth,
}) => {
  const {
    activeDoc,
    openPdfBuffer,
    cloudDocuments,
    cloudFolders,
    uploadToCloud,
    deleteFromCloud,
    createCloudFolder,
    refreshCloudDocs,
    isSyncing,
    pendingSyncCount,
  } = usePdf();

  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isUploadingCurrent, setIsUploadingCurrent] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      refreshCloudDocs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredDocs = cloudDocuments.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = activeFolderId ? d.folderId === activeFolderId : true;
    return matchesSearch && matchesFolder;
  });

  const totalBytesUsed = cloudDocuments.reduce((acc, d) => acc + (d.sizeBytes || 0), 0);
  const totalMbUsed = (totalBytesUsed / (1024 * 1024)).toFixed(1);

  const handleUploadActiveDoc = async () => {
    if (!activeDoc) return;
    setIsUploadingCurrent(true);
    setUploadProgress(20);
    try {
      // Simulate progress
      setTimeout(() => setUploadProgress(60), 300);
      await uploadToCloud(activeDoc.data, activeDoc.name, activeFolderId || undefined);
      setUploadProgress(100);
      setTimeout(() => {
        setIsUploadingCurrent(false);
        setUploadProgress(null);
      }, 500);
    } catch (err: any) {
      alert(err.message || 'Failed to upload document.');
      setIsUploadingCurrent(false);
      setUploadProgress(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        alert(`File exceeds the free-tier limit of ${MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)} MB.`);
        return;
      }
      const buffer = new Uint8Array(await file.arrayBuffer());
      await uploadToCloud(buffer, file.name, activeFolderId || undefined);
      e.target.value = '';
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await createCloudFolder(newFolderName.trim());
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleOpenDoc = async (doc: CloudDocumentRecord) => {
    try {
      if ((doc as any).data) {
        await openPdfBuffer((doc as any).data, doc.name);
        onClose();
      } else if (doc.storagePath) {
        const { CloudStorageService } = await import('../../../packages/firebase/src/storage');
        const bytes = await CloudStorageService.downloadPdf(doc.storagePath);
        await openPdfBuffer(bytes, doc.name);
        onClose();
      }
    } catch (err: any) {
      alert('Could not download document: ' + err.message);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl h-[640px] overflow-hidden flex flex-col">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-[#0b2545] dark:bg-slate-950 text-white border-b border-[#081a31] dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Cloud className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold flex items-center space-x-2">
                <span>Firebase Cloud Document Manager</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-200 border border-blue-400/30">
                  Spark Free Tier
                </span>
              </h3>
              <p className="text-[11px] text-blue-200">
                {currentUser
                  ? `Signed in as ${currentUser.email}`
                  : 'Local Offline Mode active (no login required for local editing)'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {!currentUser && (
              <button
                onClick={onOpenAuth}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition-colors"
              >
                Sign In to Cloud
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Folders & Quota */}
          <div className="w-64 bg-slate-50 border-r border-slate-200 p-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Folders
                </span>
                <button
                  onClick={() => setIsCreatingFolder(true)}
                  className="p-1 hover:bg-slate-200 rounded text-slate-600"
                  title="New Folder"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
              </div>

              {isCreatingFolder && (
                <form onSubmit={handleCreateFolder} className="space-y-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-full px-2 py-1 rounded border border-blue-400 text-xs focus:outline-none"
                  />
                  <div className="flex justify-end space-x-1">
                    <button
                      type="button"
                      onClick={() => setIsCreatingFolder(false)}
                      className="px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-200 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-2 py-0.5 text-[11px] bg-blue-600 text-white rounded font-medium"
                    >
                      Create
                    </button>
                  </div>
                </form>
              )}

              {/* Folder list */}
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveFolderId(null)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeFolderId === null
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Folder className="w-3.5 h-3.5" />
                    <span>All Documents</span>
                  </div>
                  <span className={`text-[10px] ${activeFolderId === null ? 'text-white/80' : 'text-slate-400'}`}>
                    {cloudDocuments.length}
                  </span>
                </button>

                {cloudFolders.map((folder) => {
                  const count = cloudDocuments.filter((d) => d.folderId === folder.id).length;
                  const isActive = activeFolderId === folder.id;
                  return (
                    <button
                      key={folder.id}
                      onClick={() => setActiveFolderId(folder.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: isActive ? '#fff' : folder.color }} />
                        <span className="truncate">{folder.name}</span>
                      </div>
                      <span className={`text-[10px] ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Storage Meter & Sync Info */}
            <div className="space-y-3 pt-4 border-t border-slate-200 text-xs">
              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                  <span>Spark Storage Used</span>
                  <span className="font-semibold text-slate-900">{totalMbUsed} MB / 1,000 MB</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(1, (totalBytesUsed / (1000 * 1024 * 1024)) * 100))}%` }}
                  />
                </div>
              </div>

              {pendingSyncCount > 0 && (
                <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center justify-between">
                  <span>{pendingSyncCount} edits pending sync</span>
                  <button
                    onClick={() => refreshCloudDocs()}
                    disabled={isSyncing}
                    className="text-blue-600 hover:underline font-bold"
                  >
                    Sync Now
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Main Panel: Document Grid / List */}
          <div className="flex-1 flex flex-col bg-white">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search cloud documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => refreshCloudDocs()}
                  disabled={isSyncing}
                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded border border-slate-200"
                  title="Refresh Documents"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
                </button>

                {activeDoc && (
                  <button
                    onClick={handleUploadActiveDoc}
                    disabled={isUploadingCurrent}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Active PDF</span>
                  </button>
                )}

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Upload from PC</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="application/pdf"
                  className="hidden"
                />
              </div>
            </div>

            {/* Upload Progress Bar if active */}
            {uploadProgress !== null && (
              <div className="w-full bg-blue-50 px-4 py-2 border-b border-blue-100 flex items-center space-x-3 text-xs text-blue-800">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <div className="flex-1">
                  <div className="flex justify-between text-[11px] mb-1 font-medium">
                    <span>Uploading to Firebase Cloud...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-blue-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Document List */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredDocs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <FileText className="w-12 h-12 text-slate-300 stroke-1" />
                  <p className="text-sm font-medium text-slate-600">No documents in this view</p>
                  <p className="text-xs text-slate-400">
                    Upload your current PDF or open a document from your computer.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all bg-white flex flex-col justify-between group"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4
                            className="text-xs font-bold text-slate-900 truncate hover:text-blue-600 cursor-pointer"
                            onClick={() => handleOpenDoc(doc)}
                            title={doc.name}
                          >
                            {doc.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {(doc.sizeBytes / 1024).toFixed(0)} KB • {doc.pageCount} pages • v{doc.version}
                          </p>
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="inline-flex items-center space-x-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Synced</span>
                            </span>
                            {doc.isEncrypted && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                🔒 Encrypted
                              </span>
                            )}
                            {doc.isSigned && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                ✍️ Signed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs">
                        <span className="text-[11px] text-slate-400">
                          {new Date(doc.updatedAt).toLocaleDateString()}
                        </span>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleOpenDoc(doc)}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-semibold transition-colors"
                          >
                            Open in Editor
                          </button>
                          <button
                            onClick={() => deleteFromCloud(doc.id)}
                            className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-colors"
                            title="Delete Document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
