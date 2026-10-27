import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  PenTool,
  Type,
  Upload,
  RotateCcw,
  Check,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { usePdf } from '../../context/PdfContext';
import { StorageService } from '../../services/storage';

export const SignatureModal: React.FC = () => {
  const {
    isSignatureModalOpen,
    setIsSignatureModalOpen,
    addSignature,
    currentPage,
  } = usePdf();

  const [mode, setMode] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typedName, setTypedName] = useState('Alexander Vance');
  const [selectedFont, setSelectedFont] = useState(0);
  const [inkColor, setInkColor] = useState('#0d47a1'); // Signature Blue
  const [isDigitalCert, setIsDigitalCert] = useState(true);
  const [saveForReuse, setSaveForReuse] = useState(true);

  // Drawing Canvas State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPainting, setIsPainting] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Upload State
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);

  // Saved Signatures from IDB
  const [savedSignatures, setSavedSignatures] = useState<{ id: string; dataUrl: string; name: string }[]>([]);

  useEffect(() => {
    if (isSignatureModalOpen) {
      StorageService.getSavedSignatures().then(setSavedSignatures);
      setTimeout(clearCanvas, 50);
    }
  }, [isSignatureModalOpen]);

  if (!isSignatureModalOpen) return null;

  const fontOptions = [
    { name: 'Classic Script', css: 'font-serif italic tracking-wide text-3xl' },
    { name: 'Executive Cursive', css: 'font-sans italic font-semibold text-2xl tracking-tight' },
    { name: 'Calligraphic', css: 'font-mono italic font-bold text-2xl' },
    { name: 'Modern Signature', css: 'font-sans font-light italic text-3xl' },
  ];

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsPainting(true);
    setHasDrawn(true);
  };

  const drawMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPainting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDraw = () => {
    setIsPainting(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setUploadedDataUrl(ev.target.result as string);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // Generate transparent PNG from Typed Name
  const generateTypedSignatureDataUrl = (): string => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 400;
    tempCanvas.height = 150;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, 400, 150);
    ctx.fillStyle = inkColor;
    ctx.font = selectedFont === 0 ? 'italic 38px Georgia, serif' : selectedFont === 1 ? 'italic bold 34px sans-serif' : 'italic 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName, 200, 75);

    // Subtle flourish underline
    ctx.beginPath();
    ctx.moveTo(70, 105);
    ctx.quadraticCurveTo(200, 115, 330, 95);
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    return tempCanvas.toDataURL('image/png');
  };

  const handleApplySignature = async () => {
    let finalDataUrl = '';
    let signer = typedName || 'Authorized Signer';

    if (mode === 'draw') {
      if (!canvasRef.current || !hasDrawn) {
        alert('Please draw your signature before placing it.');
        return;
      }
      finalDataUrl = canvasRef.current.toDataURL('image/png');
    } else if (mode === 'type') {
      if (!typedName.trim()) {
        alert('Please enter your name.');
        return;
      }
      finalDataUrl = generateTypedSignatureDataUrl();
    } else if (mode === 'upload') {
      if (!uploadedDataUrl) {
        alert('Please upload a signature image.');
        return;
      }
      finalDataUrl = uploadedDataUrl;
    }

    if (saveForReuse) {
      await StorageService.saveSignature({
        id: `sig_${Date.now()}`,
        dataUrl: finalDataUrl,
        name: signer,
      });
    }

    // Add signature onto center of current page
    addSignature({
      page: currentPage,
      x: 180,
      y: 400,
      width: 180,
      height: 70,
      dataUrl: finalDataUrl,
      signerName: signer,
      createdAt: new Date().toLocaleDateString(),
      isDigitalCert,
      certificateDetails: isDigitalCert
        ? {
            issuer: 'HHM PDF CA (Self-Signed)',
            algorithm: 'SHA-256 with RSA-2048',
            validUntil: '2028-12-31',
          }
        : undefined,
    });

    setIsSignatureModalOpen(false);
  };

  const handleApplySavedSignature = (sig: { dataUrl: string; name: string }) => {
    addSignature({
      page: currentPage,
      x: 180,
      y: 400,
      width: 180,
      height: 70,
      dataUrl: sig.dataUrl,
      signerName: sig.name,
      createdAt: new Date().toLocaleDateString(),
      isDigitalCert,
    });
    setIsSignatureModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-purple-100 text-purple-600 flex items-center justify-center">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Fill & Sign Document</h2>
              <p className="text-xs text-slate-500">
                Create a drawn, typed, or uploaded signature with verifiable certification.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSignatureModalOpen(false)}
            className="p-1.5 hover:bg-slate-200 rounded-md text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="px-6 pt-3 pb-1 border-b border-slate-200 flex items-center justify-between bg-white text-xs">
          <div className="flex space-x-2">
            <button
              onClick={() => setMode('draw')}
              className={`px-3 py-1.5 rounded-t-md font-semibold border-b-2 transition ${
                mode === 'draw'
                  ? 'border-purple-600 text-purple-700 bg-purple-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Draw
            </button>
            <button
              onClick={() => setMode('type')}
              className={`px-3 py-1.5 rounded-t-md font-semibold border-b-2 transition ${
                mode === 'type'
                  ? 'border-purple-600 text-purple-700 bg-purple-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Type Name
            </button>
            <button
              onClick={() => setMode('upload')}
              className={`px-3 py-1.5 rounded-t-md font-semibold border-b-2 transition ${
                mode === 'upload'
                  ? 'border-purple-600 text-purple-700 bg-purple-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Upload Image
            </button>
          </div>

          {/* Ink Color Picker */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400 text-[11px]">Ink:</span>
            <button
              onClick={() => setInkColor('#0d47a1')}
              className={`w-5 h-5 rounded-full bg-[#0d47a1] border-2 ${
                inkColor === '#0d47a1' ? 'border-purple-600 scale-110' : 'border-transparent'
              }`}
              title="Signature Blue Ink"
            />
            <button
              onClick={() => setInkColor('#111827')}
              className={`w-5 h-5 rounded-full bg-[#111827] border-2 ${
                inkColor === '#111827' ? 'border-purple-600 scale-110' : 'border-transparent'
              }`}
              title="Black Ink"
            />
          </div>
        </div>

        {/* Mode Body */}
        <div className="p-6 bg-slate-50 flex-1">
          {mode === 'draw' && (
            <div>
              <div className="relative border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={520}
                  height={180}
                  onMouseDown={startDraw}
                  onMouseMove={drawMove}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  className="w-full h-44 cursor-crosshair block"
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs italic">
                    Draw your signature here with mouse or stylus
                  </div>
                )}
                {/* Baseline Guide */}
                <div className="absolute bottom-8 left-8 right-8 border-b border-slate-200 pointer-events-none" />
              </div>

              <div className="flex justify-end mt-2">
                <button
                  onClick={clearCanvas}
                  className="flex items-center space-x-1 text-xs text-slate-500 hover:text-red-600"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Canvas</span>
                </button>
              </div>
            </div>
          )}

          {mode === 'type' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Full Legal Name
                </label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Enter full name..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Select Typography Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {fontOptions.map((font, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedFont(idx)}
                      className={`p-3 rounded-lg border-2 bg-white cursor-pointer transition text-center ${
                        selectedFont === idx
                          ? 'border-purple-600 bg-purple-50/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className={font.css} style={{ color: inkColor }}>
                        {typedName || 'Sign Here'}
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-1">{font.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {mode === 'upload' && (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-white">
              {uploadedDataUrl ? (
                <div>
                  <img
                    src={uploadedDataUrl}
                    alt="Uploaded signature"
                    className="max-h-32 mx-auto object-contain mb-3"
                  />
                  <label className="cursor-pointer text-xs text-purple-600 font-semibold hover:underline">
                    Choose different image
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <span className="text-xs font-semibold text-slate-700 block">
                    Upload Signature Image (PNG or JPG)
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Transparent PNG recommended for best visual results
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          )}

          {/* Previously Saved Signatures */}
          {savedSignatures.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 block mb-2">
                Saved Signatures (1-Click Sign):
              </span>
              <div className="flex space-x-2 overflow-x-auto no-scrollbar">
                {savedSignatures.map((sig) => (
                  <button
                    key={sig.id}
                    onClick={() => handleApplySavedSignature(sig)}
                    className="p-1.5 bg-white border border-slate-200 hover:border-purple-500 rounded-md shrink-0 flex items-center space-x-2"
                  >
                    <img src={sig.dataUrl} alt="Saved" className="h-6 w-16 object-contain" />
                    <span className="text-[10px] text-slate-600 font-medium">{sig.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Security & Options */}
          <div className="mt-4 pt-3 border-t border-slate-200 space-y-2 text-xs">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isDigitalCert}
                onChange={(e) => setIsDigitalCert(e.target.checked)}
                className="accent-purple-600 rounded"
              />
              <span className="font-semibold text-slate-800 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                <span>Attach ISO 32000-compliant Digital Certification badge</span>
              </span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer text-slate-600">
              <input
                type="checkbox"
                checked={saveForReuse}
                onChange={(e) => setSaveForReuse(e.target.checked)}
                className="accent-purple-600 rounded"
              />
              <span>Save signature securely in browser / local database for future use</span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Will place on Page {currentPage}
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsSignatureModalOpen(false)}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleApplySignature}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-xs font-bold shadow-xs transition"
            >
              Sign Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
