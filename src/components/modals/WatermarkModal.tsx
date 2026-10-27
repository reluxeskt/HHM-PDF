import React, { useState } from 'react';
import { X, Sparkles, Check } from 'lucide-react';
import { usePdf } from '../../context/PdfContext';
import { WatermarkConfig } from '../../types';

export const WatermarkModal: React.FC = () => {
  const {
    isWatermarkModalOpen,
    setIsWatermarkModalOpen,
    activeDoc,
    setWatermark,
  } = usePdf();

  const [text, setText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(48);
  const [rotation, setRotation] = useState(45);
  const [opacity, setOpacity] = useState(0.25);
  const [color, setColor] = useState('#94a3b8');
  const [position, setPosition] = useState<'diagonal' | 'center' | 'tile'>('diagonal');

  if (!isWatermarkModalOpen || !activeDoc) return null;

  const presets = ['CONFIDENTIAL', 'DRAFT', 'DO NOT COPY', 'SAMPLE', 'INTERNAL USE ONLY'];

  const handleApply = () => {
    const config: WatermarkConfig = {
      text,
      fontSize,
      fontFamily: 'Helvetica',
      color,
      opacity,
      rotation: position === 'center' ? 0 : rotation,
      position,
    };
    setWatermark(config);
    setIsWatermarkModalOpen(false);
  };

  const handleRemoveWatermark = () => {
    setWatermark({
      text: '',
      fontSize: 48,
      fontFamily: 'Helvetica',
      color: '#000000',
      opacity: 0,
      rotation: 0,
      position: 'center',
    });
    setIsWatermarkModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Add Document Watermark</h2>
              <p className="text-xs text-slate-500">
                Embed permanent watermarks across all pages of your document.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsWatermarkModalOpen(false)}
            className="p-1.5 hover:bg-slate-200 rounded-md text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* Watermark Text */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Watermark Text</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-hidden focus:border-blue-500"
            />
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setText(p)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                    text === p
                      ? 'bg-blue-50 border-blue-400 text-blue-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Position Mode */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Layout Position</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPosition('diagonal');
                  setRotation(45);
                }}
                className={`py-2 px-3 rounded-lg border font-medium transition ${
                  position === 'diagonal'
                    ? 'border-blue-500 bg-blue-50/50 text-blue-700 font-semibold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Diagonal (45°)
              </button>
              <button
                type="button"
                onClick={() => {
                  setPosition('center');
                  setRotation(0);
                }}
                className={`py-2 px-3 rounded-lg border font-medium transition ${
                  position === 'center'
                    ? 'border-blue-500 bg-blue-50/50 text-blue-700 font-semibold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Center Horizontal
              </button>
              <button
                type="button"
                onClick={() => setPosition('tile')}
                className={`py-2 px-3 rounded-lg border font-medium transition ${
                  position === 'tile'
                    ? 'border-blue-500 bg-blue-50/50 text-blue-700 font-semibold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Tiled Pattern
              </button>
            </div>
          </div>

          {/* Sliders: Size, Opacity, Angle, Color */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Font Size</span>
                <span className="text-slate-400">{fontSize} pt</span>
              </div>
              <input
                type="range"
                min={20}
                max={90}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Opacity</span>
                <span className="text-slate-400">{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.05}
                max={0.8}
                step={0.05}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {position === 'diagonal' && (
              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Rotation Angle</span>
                  <span className="text-slate-400">{rotation}°</span>
                </div>
                <input
                  type="range"
                  min={-90}
                  max={90}
                  step={5}
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Color</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 p-0 border border-slate-300 rounded cursor-pointer"
                />
                <span className="font-mono text-slate-500">{color}</span>
              </div>
            </div>
          </div>

          {/* Real-time Preview Box */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 h-32 flex items-center justify-center overflow-hidden relative">
            <span className="text-[11px] text-slate-300 absolute top-2 left-2 font-mono">
              Page Preview
            </span>
            <div
              className="font-bold tracking-widest text-center select-none"
              style={{
                color,
                opacity,
                fontSize: `${fontSize * 0.45}px`,
                transform: `rotate(${position === 'center' ? 0 : rotation}deg)`,
              }}
            >
              {text || 'PREVIEW'}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleRemoveWatermark}
            className="text-xs text-red-600 hover:underline"
          >
            Remove Watermark
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsWatermarkModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition shadow-xs"
            >
              Apply Watermark
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
