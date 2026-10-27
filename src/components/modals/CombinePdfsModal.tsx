import React, { useState, useRef } from 'react';
import {
  X,
  Files,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  FileText,
  Sparkles,
} from 'lucide-react';
import { usePdf } from '../../context/PdfContext';
import { PdfEngine } from '../../services/pdfEngine';
import { generateSamplePdf } from '../../services/samplePdfs';

interface FileEntry {
  id: string;
  name: string;
  size: number;
  data: Uint8Array;
  pageCount: number;
}

export const CombinePdfsModal: React.FC = () => {
  const { isCombineModalOpen, setIsCombineModalOpen, openPdfBuffer } = usePdf();
  const [filesList, setFilesList] = useState<FileEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isCombineModalOpen) return null;

  const handleFilesChosen = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    const newEntries: FileEntry[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
        const buffer = await file.arrayBuffer();
        const uint8 = new Uint8Array(buffer);
        try {
          const { pageCount } = await PdfEngine.inspectPdf(uint8, file.name);
          newEntries.push({
            id: `f_${Date.now()}_${i}`,
            name: file.name,
            size: file.size,
            data: uint8,
            pageCount,
          });
        } catch (e) {
          console.warn(`Failed reading ${file.name}`, e);
        }
      }
    }

    setFilesList((prev) => [...prev, ...newEntries]);
    setIsProcessing(false);
  };

  const handleAddSample = async (sampleId: string) => {
    setIsProcessing(true);
    const { data, name } = await generateSamplePdf(sampleId);
    const { pageCount } = await PdfEngine.inspectPdf(data, name);
    setFilesList((prev) => [
      ...prev,
      {
        id: `sample_${Date.now()}`,
        name,
        size: data.byteLength,
        data,
        pageCount,
      },
    ]);
    setIsProcessing(false);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const list = [...filesList];
    const item = list.splice(index, 1)[0];
    list.splice(index - 1, 0, item);
    setFilesList(list);
  };

  const moveDown = (index: number) => {
    if (index === filesList.length - 1) return;
    const list = [...filesList];
    const item = list.splice(index, 1)[0];
    list.splice(index + 1, 0, item);
    setFilesList(list);
  };

  const removeFile = (index: number) => {
    setFilesList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCombine = async () => {
    if (filesList.length < 2) {
      alert('Please add at least 2 PDF documents to combine.');
      return;
    }
    setIsProcessing(true);
    try {
      const buffers = filesList.map((f) => f.data);
      const combined = await PdfEngine.combinePdfs(buffers);
      await openPdfBuffer(combined, `Combined_Document_${Date.now().toString().slice(-4)}.pdf`);
      setIsCombineModalOpen(false);
      setFilesList([]);
    } catch (e) {
      console.error('Error combining PDFs:', e);
      alert('Failed to combine PDF documents.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Files className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Combine PDF Files</h2>
              <p className="text-xs text-slate-500">
                Merge multiple documents into a single master PDF with custom ordering.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCombineModalOpen(false)}
            className="p-1.5 hover:bg-slate-200 rounded-md text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File Queue List */}
        <div className="p-6 flex-1 overflow-y-auto max-h-[50vh] space-y-3">
          {filesList.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/20 cursor-pointer transition"
            >
              <Files className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Click to add PDF documents</p>
              <p className="text-xs text-slate-400 mt-1">Or drag and drop multiple files here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filesList.map((file, idx) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="truncate">
                      <h4 className="text-xs font-semibold text-slate-800 truncate">{file.name}</h4>
                      <span className="text-[10px] text-slate-400">
                        {file.pageCount} pages • {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      className="p-1 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-20"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveDown(idx)}
                      disabled={idx === filesList.length - 1}
                      className="p-1 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-20"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeFile(idx)}
                      className="p-1 hover:bg-red-50 text-red-600 rounded"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick sample add buttons */}
          <div className="pt-2 flex items-center space-x-2 text-xs">
            <span className="text-slate-400 font-medium">Quick Test:</span>
            <button
              onClick={() => handleAddSample('contract-nda')}
              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px]"
            >
              + Add NDA
            </button>
            <button
              onClick={() => handleAddSample('financial-report')}
              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px]"
            >
              + Add Financial Report
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add More Files</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="application/pdf"
              onChange={(e) => handleFilesChosen(e.target.files)}
              className="hidden"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsCombineModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleCombine}
              disabled={filesList.length < 2 || isProcessing}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold disabled:opacity-40 transition shadow-xs"
            >
              {isProcessing ? 'Combining...' : `Combine ${filesList.length} Files`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
