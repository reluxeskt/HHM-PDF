import React, { useState, useRef } from 'react';
import {
  X,
  Layers,
  Sparkles,
  RotateCw,
  Image as ImageIcon,
  Plus,
  Trash2,
  FileText,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { usePdf } from '../../context/PdfContext';
import { PdfEngine } from '../../services/pdfEngine';
import { WatermarkConfig } from '../../types';

interface QueuedFile {
  id: string;
  name: string;
  size: number;
  data: Uint8Array;
}

export const BatchProcessModal: React.FC = () => {
  const { isBatchModalOpen, setIsBatchModalOpen, openPdfBuffer } = usePdf();

  const [activeTab, setActiveTab] = useState<'watermark' | 'rotate' | 'images'>('watermark');
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [queuedImages, setQueuedImages] = useState<{ name: string; dataUrl: string; type: string }[]>([]);

  // Watermark parameters
  const [wmText, setWmText] = useState('CONFIDENTIAL');
  const [wmColor, setWmColor] = useState('#dc2626');
  const [wmOpacity, setWmOpacity] = useState(0.25);

  // Rotate parameters
  const [rotationAngle, setRotationAngle] = useState(90);

  // Status & Progress
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  if (!isBatchModalOpen) return null;

  const handlePdfsSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = e.target.files;
      const newItems: QueuedFile[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
          const buffer = await file.arrayBuffer();
          newItems.push({
            id: `batch_${Date.now()}_${i}`,
            name: file.name,
            size: file.size,
            data: new Uint8Array(buffer),
          });
        }
      }
      setQueuedFiles((prev) => [...prev, ...newItems]);
    }
  };

  const handleImagesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = e.target.files;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            setQueuedImages((prev) => [
              ...prev,
              { name: file.name, dataUrl: ev.target?.result as string, type: file.type },
            ]);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleExecuteBatchWatermark = async () => {
    if (queuedFiles.length === 0) return;
    setIsProcessing(true);
    setProcessedCount(0);

    const config: WatermarkConfig = {
      text: wmText,
      fontSize: 48,
      fontFamily: 'Helvetica',
      color: wmColor,
      opacity: wmOpacity,
      rotation: 45,
      position: 'diagonal',
    };

    try {
      const results = await PdfEngine.batchWatermark(queuedFiles, config);
      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        const blob = new Blob([res.data.buffer as ArrayBuffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setProcessedCount(i + 1);
      }
      alert(`Successfully watermarked and exported ${results.length} files.`);
      setIsBatchModalOpen(false);
      setQueuedFiles([]);
    } catch (e) {
      console.error(e);
      alert('Error during batch watermarking.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteBatchRotate = async () => {
    if (queuedFiles.length === 0) return;
    setIsProcessing(true);
    setProcessedCount(0);

    try {
      const results = await PdfEngine.batchRotate(queuedFiles, rotationAngle);
      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        const blob = new Blob([res.data.buffer as ArrayBuffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setProcessedCount(i + 1);
      }
      alert(`Successfully rotated and exported ${results.length} files.`);
      setIsBatchModalOpen(false);
      setQueuedFiles([]);
    } catch (e) {
      console.error(e);
      alert('Error during batch rotation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteBatchImages = async () => {
    if (queuedImages.length === 0) return;
    setIsProcessing(true);

    try {
      const pdfBytes = await PdfEngine.createPdfFromImages(queuedImages);
      await openPdfBuffer(pdfBytes, `Batch_Converted_Images_${Date.now().toString().slice(-4)}.pdf`);
      alert(`Successfully converted ${queuedImages.length} images into a master PDF.`);
      setIsBatchModalOpen(false);
      setQueuedImages([]);
    } catch (e) {
      console.error(e);
      alert('Error converting images to PDF.');
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
            <div className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Batch Processing Studio</h2>
              <p className="text-xs text-slate-500">
                Process multiple documents simultaneously (Watermarks, Rotations, Image conversion).
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsBatchModalOpen(false)}
            className="p-1.5 hover:bg-slate-200 rounded-md text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="px-6 border-b border-slate-200 flex space-x-4 bg-white text-xs font-semibold">
          <button
            onClick={() => setActiveTab('watermark')}
            className={`py-2.5 border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'watermark' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Batch Watermark</span>
          </button>
          <button
            onClick={() => setActiveTab('rotate')}
            className={`py-2.5 border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'rotate' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Batch Rotate</span>
          </button>
          <button
            onClick={() => setActiveTab('images')}
            className={`py-2.5 border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'images' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Images to PDF</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-4 text-xs flex-1 overflow-y-auto max-h-[50vh]">
          {/* TAB 1: BATCH WATERMARK */}
          {activeTab === 'watermark' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Watermark Text</label>
                  <input
                    type="text"
                    value={wmText}
                    onChange={(e) => setWmText(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Color & Opacity</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={wmColor}
                      onChange={(e) => setWmColor(e.target.value)}
                      className="w-7 h-7 p-0 border border-slate-300 rounded cursor-pointer"
                    />
                    <select
                      value={wmOpacity}
                      onChange={(e) => setWmOpacity(Number(e.target.value))}
                      className="border border-slate-300 rounded px-2 py-1 text-xs bg-white flex-1"
                    >
                      <option value={0.15}>15% Opacity</option>
                      <option value={0.25}>25% Opacity</option>
                      <option value={0.4}>40% Opacity</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* PDF Queue */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-slate-700">
                    PDF Documents in Batch Queue ({queuedFiles.length})
                  </span>
                  <button
                    onClick={() => pdfInputRef.current?.click()}
                    className="text-xs text-blue-600 font-semibold hover:underline flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add PDF Files</span>
                  </button>
                  <input
                    type="file"
                    ref={pdfInputRef}
                    multiple
                    accept="application/pdf"
                    onChange={handlePdfsSelected}
                    className="hidden"
                  />
                </div>

                <div className="border border-slate-200 rounded-lg max-h-36 overflow-y-auto divide-y divide-slate-100 bg-slate-50">
                  {queuedFiles.map((f, idx) => (
                    <div key={f.id} className="p-2 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2 truncate">
                        <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate text-slate-800">{f.name}</span>
                        <span className="text-[10px] text-slate-400">({(f.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <button
                        onClick={() => setQueuedFiles((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {queuedFiles.length === 0 && (
                    <div className="p-6 text-center text-slate-400">
                      No PDFs in queue. Click 'Add PDF Files' to select multiple documents.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BATCH ROTATE */}
          {activeTab === 'rotate' && (
            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Rotation Angle</label>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setRotationAngle(90)}
                    className={`px-3 py-1.5 rounded border text-xs font-semibold ${
                      rotationAngle === 90 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300'
                    }`}
                  >
                    90° Clockwise
                  </button>
                  <button
                    onClick={() => setRotationAngle(-90)}
                    className={`px-3 py-1.5 rounded border text-xs font-semibold ${
                      rotationAngle === -90 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300'
                    }`}
                  >
                    90° Counter-Clockwise
                  </button>
                  <button
                    onClick={() => setRotationAngle(180)}
                    className={`px-3 py-1.5 rounded border text-xs font-semibold ${
                      rotationAngle === 180 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300'
                    }`}
                  >
                    180° Flip
                  </button>
                </div>
              </div>

              {/* PDF Queue */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-slate-700">
                    PDF Documents to Rotate ({queuedFiles.length})
                  </span>
                  <button
                    onClick={() => pdfInputRef.current?.click()}
                    className="text-xs text-blue-600 font-semibold hover:underline flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add PDF Files</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-lg max-h-36 overflow-y-auto divide-y divide-slate-100 bg-slate-50">
                  {queuedFiles.map((f, idx) => (
                    <div key={f.id} className="p-2 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2 truncate">
                        <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate text-slate-800">{f.name}</span>
                      </div>
                      <button
                        onClick={() => setQueuedFiles((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {queuedFiles.length === 0 && (
                    <div className="p-6 text-center text-slate-400">
                      No PDFs in queue. Click 'Add PDF Files' above.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BATCH IMAGES TO PDF */}
          {activeTab === 'images' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">
                  Images to Convert into PDF ({queuedImages.length})
                </span>
                <button
                  onClick={() => imgInputRef.current?.click()}
                  className="text-xs text-blue-600 font-semibold hover:underline flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Images (PNG/JPG)</span>
                </button>
                <input
                  type="file"
                  ref={imgInputRef}
                  multiple
                  accept="image/png,image/jpeg"
                  onChange={handleImagesSelected}
                  className="hidden"
                />
              </div>

              <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-100 bg-slate-50">
                {queuedImages.map((img, idx) => (
                  <div key={idx} className="p-2 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 truncate">
                      <img src={img.dataUrl} alt={img.name} className="w-7 h-7 object-cover rounded border" />
                      <span className="truncate text-slate-800">{img.name}</span>
                    </div>
                    <button
                      onClick={() => setQueuedImages((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {queuedImages.length === 0 && (
                  <div className="p-6 text-center text-slate-400">
                    No images selected. Click 'Add Images' to batch convert.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {isProcessing ? `Processing ${processedCount}...` : 'Files are exported locally.'}
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsBatchModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>

            {activeTab === 'watermark' && (
              <button
                onClick={handleExecuteBatchWatermark}
                disabled={queuedFiles.length === 0 || isProcessing}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition shadow-xs disabled:opacity-40"
              >
                {isProcessing ? 'Processing...' : `Watermark ${queuedFiles.length} PDFs`}
              </button>
            )}

            {activeTab === 'rotate' && (
              <button
                onClick={handleExecuteBatchRotate}
                disabled={queuedFiles.length === 0 || isProcessing}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition shadow-xs disabled:opacity-40"
              >
                {isProcessing ? 'Processing...' : `Rotate ${queuedFiles.length} PDFs`}
              </button>
            )}

            {activeTab === 'images' && (
              <button
                onClick={handleExecuteBatchImages}
                disabled={queuedImages.length === 0 || isProcessing}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition shadow-xs disabled:opacity-40"
              >
                {isProcessing ? 'Converting...' : `Convert ${queuedImages.length} Images to PDF`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
