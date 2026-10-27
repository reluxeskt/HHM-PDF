import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Presentation,
  Globe,
  File,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { usePdf } from '../../context/PdfContext';
import { ConversionEngine } from '../../services/conversionEngine';
import { PdfEngine } from '../../services/pdfEngine';
import { PdfAProfile, PdfAValidationReport } from '../../types';

export const ExportModal: React.FC = () => {
  const {
    isExportModalOpen,
    setIsExportModalOpen,
    activeDoc,
    exportToImages,
    exportToTxt,
  } = usePdf();

  const [category, setCategory] = useState<
    'word' | 'excel' | 'powerpoint' | 'pdfa' | 'image' | 'html' | 'more'
  >('word');
  const [exportFormat, setExportFormat] = useState<string>('docx');
  const [enableOcr, setEnableOcr] = useState(false);
  const [pptxMode, setPptxMode] = useState<'editable' | 'slide_image'>('editable');
  const [isExporting, setIsExporting] = useState(false);
  const [statusText, setStatusText] = useState<string>('');

  // PDF/A state
  const [pdfaProfile, setPdfaProfile] = useState<PdfAProfile>('PDF/A-1b');
  const [pdfaReport, setPdfaReport] = useState<PdfAValidationReport | null>(null);
  const [isValidatingPdfa, setIsValidatingPdfa] = useState(false);
  const [isChecksExpanded, setIsChecksExpanded] = useState(false);

  // Trigger PDF/A validation when opening PDF/A tab or changing profile
  useEffect(() => {
    if (isExportModalOpen && activeDoc && category === 'pdfa') {
      runPdfaValidation(pdfaProfile);
    }
  }, [category, pdfaProfile, isExportModalOpen, activeDoc]);

  if (!isExportModalOpen || !activeDoc) return null;

  const runPdfaValidation = async (profile: PdfAProfile) => {
    if (!activeDoc) return;
    setIsValidatingPdfa(true);
    try {
      const report = await PdfEngine.validatePdfA(activeDoc.data, profile);
      setPdfaReport(report);
    } catch (err) {
      console.error('PDF/A validation error:', err);
    } finally {
      setIsValidatingPdfa(false);
    }
  };

  const handleFormatChange = (
    cat: 'word' | 'excel' | 'powerpoint' | 'pdfa' | 'image' | 'html' | 'more',
    fmt: string
  ) => {
    setCategory(cat);
    setExportFormat(fmt);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setStatusText('Preparing export...');
    try {
      const docNameClean = activeDoc.name.replace(/\.[^/.]+$/, '');

      if (category === 'pdfa') {
        setStatusText(`Generating ${pdfaProfile} compliant archive...`);
        const { pdfBytes, validationReport } = await PdfEngine.exportToPdfA(
          activeDoc.data,
          pdfaProfile,
          activeDoc.metadata
        );
        setPdfaReport(validationReport);
        const profileTag = pdfaProfile.replace(/[^a-zA-Z0-9]/g, '');
        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], {
          type: 'application/pdf',
        });
        downloadBlob(blob, `${docNameClean}_${profileTag}.pdf`);
      } else if (exportFormat === 'png' || exportFormat === 'jpg') {
        await exportToImages(exportFormat === 'png' ? 'image/png' : 'image/jpeg');
      } else if (exportFormat === 'txt') {
        await exportToTxt();
      } else if (exportFormat === 'docx') {
        setStatusText('Generating structured Word (.docx) document...');
        const result = await ConversionEngine.convertPdfToDocx(activeDoc.data, {
          enableOcr,
          onProgress: (msg) => setStatusText(msg),
        });
        downloadBlob(result.blob, `${docNameClean}.docx`);
      } else if (exportFormat === 'xlsx') {
        setStatusText('Extracting tables and rows to Excel (.xlsx)...');
        const result = await ConversionEngine.convertPdfToXlsx(activeDoc.data, {
          enableOcr,
          onProgress: (msg) => setStatusText(msg),
        });
        downloadBlob(result.blob, `${docNameClean}.xlsx`);
      } else if (exportFormat === 'pptx') {
        setStatusText('Building PowerPoint (.pptx) presentation...');
        const result = await ConversionEngine.convertPdfToPptx(activeDoc.data, {
          layoutMode: pptxMode,
          onProgress: (msg) => setStatusText(msg),
        });
        downloadBlob(result.blob, `${docNameClean}.pptx`);
      } else if (exportFormat === 'html') {
        const text =
          (await (window as any)._extractAllText?.()) ||
          `HHM PDF Export for ${activeDoc.name}`;
        const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${activeDoc.name}</title><style>body{font-family:sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.6;color:#333;background:#fafafa;}h1{border-bottom:2px solid #0066cc;padding-bottom:10px;color:#0066cc;}</style></head><body><h1>${activeDoc.name}</h1><p><em>Exported from HHM PDF</em></p><hr/><div style="background:white;padding:30px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);white-space:pre-wrap;">${text}</div></body></html>`;
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        downloadBlob(blob, `${docNameClean}.html`);
      } else if (exportFormat === 'rtf') {
        const rtfContent = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Calibri;}}\\f0\\fs22 HHM PDF Export - ${activeDoc.name}\\par Total Pages: ${activeDoc.pageCount}\\par}`;
        const blob = new Blob([rtfContent], { type: 'application/rtf' });
        downloadBlob(blob, `${docNameClean}.rtf`);
      } else if (exportFormat === 'svg') {
        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800"><rect width="100%" height="100%" fill="white"/><text x="50" y="80" font-family="Arial" font-size="24" fill="#0066cc">${activeDoc.name}</text><text x="50" y="130" font-family="Arial" font-size="14" fill="#666">Vector Export from HHM PDF</text></svg>`;
        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        downloadBlob(blob, `${docNameClean}_page1.svg`);
      } else if (exportFormat === 'json') {
        const formData = {
          document: activeDoc.name,
          pageCount: activeDoc.pageCount,
          exportedAt: new Date().toISOString(),
          metadata: activeDoc.metadata,
          formFields: activeDoc.formFields.map((f) => ({
            name: f.name,
            value: f.value,
            type: f.type,
            page: f.page,
          })),
        };
        const blob = new Blob([JSON.stringify(formData, null, 2)], {
          type: 'application/json',
        });
        downloadBlob(blob, `${docNameClean}_Data.json`);
      }

      setIsExportModalOpen(false);
    } catch (e: any) {
      console.error(e);
      alert(`Error during export process: ${e.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
      setStatusText('');
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Helper for status badge presentation
  const renderComplianceBadge = () => {
    if (isValidatingPdfa) {
      return (
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Auditing ISO 19005 Compliance...</span>
        </div>
      );
    }
    if (!pdfaReport) return null;

    if (pdfaReport.status === 'validated_compliant') {
      return (
        <div className="flex items-center space-x-2 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <div className="text-xs font-bold">Validated Compliant ({pdfaReport.profile})</div>
            <div className="text-[11px] text-emerald-700">{pdfaReport.summary}</div>
          </div>
        </div>
      );
    }

    if (pdfaReport.status === 'validation_warnings') {
      return (
        <div className="flex items-center space-x-2 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <div className="text-xs font-bold">Validation Warnings ({pdfaReport.profile})</div>
            <div className="text-[11px] text-amber-700">{pdfaReport.summary}</div>
          </div>
        </div>
      );
    }

    if (pdfaReport.status === 'non_compliant') {
      return (
        <div className="flex items-center space-x-2 px-3 py-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg">
          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <div>
            <div className="text-xs font-bold">Non-Compliant with {pdfaReport.profile}</div>
            <div className="text-[11px] text-rose-700">{pdfaReport.summary}</div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg">
        <Info className="w-4 h-4 text-slate-500 shrink-0" />
        <div>
          <div className="text-xs font-bold">Not Validated</div>
          <div className="text-[11px] text-slate-600">{pdfaReport.summary}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Export & Format Conversion Studio
              </h2>
              <p className="text-[11px] text-slate-500">
                Convert or archive "{activeDoc.name}" with full preflight compliance
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsExportModalOpen(false)}
            className="p-1.5 hover:bg-slate-200 rounded-md text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 overflow-hidden flex-1 min-h-[400px]">
          {/* Left Format Selector */}
          <div className="p-4 space-y-1 bg-slate-50/50 overflow-y-auto">
            <button
              onClick={() => handleFormatChange('word', 'docx')}
              className={`w-full p-2.5 rounded-lg flex items-center space-x-2.5 transition text-left ${
                category === 'word'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <FileText
                className={`w-4 h-4 ${category === 'word' ? 'text-white' : 'text-blue-600'}`}
              />
              <span className="text-xs">Microsoft Word (.docx)</span>
            </button>

            <button
              onClick={() => handleFormatChange('excel', 'xlsx')}
              className={`w-full p-2.5 rounded-lg flex items-center space-x-2.5 transition text-left ${
                category === 'excel'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <FileSpreadsheet
                className={`w-4 h-4 ${category === 'excel' ? 'text-white' : 'text-emerald-600'}`}
              />
              <span className="text-xs">Excel Spreadsheet (.xlsx)</span>
            </button>

            <button
              onClick={() => handleFormatChange('powerpoint', 'pptx')}
              className={`w-full p-2.5 rounded-lg flex items-center space-x-2.5 transition text-left ${
                category === 'powerpoint'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Presentation
                className={`w-4 h-4 ${category === 'powerpoint' ? 'text-white' : 'text-amber-600'}`}
              />
              <span className="text-xs">PowerPoint (.pptx)</span>
            </button>

            {/* Dedicated PDF/A Archival Option */}
            <button
              onClick={() => handleFormatChange('pdfa', 'pdfa')}
              className={`w-full p-2.5 rounded-lg flex items-center space-x-2.5 transition text-left ${
                category === 'pdfa'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <ShieldCheck
                className={`w-4 h-4 ${category === 'pdfa' ? 'text-white' : 'text-teal-600'}`}
              />
              <div className="flex-1">
                <div className="text-xs font-semibold">PDF/A Archival</div>
                <div
                  className={`text-[10px] ${category === 'pdfa' ? 'text-blue-100' : 'text-slate-400'}`}
                >
                  ISO 19005-1 / 19005-2
                </div>
              </div>
            </button>

            <button
              onClick={() => handleFormatChange('image', 'png')}
              className={`w-full p-2.5 rounded-lg flex items-center space-x-2.5 transition text-left ${
                category === 'image'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <ImageIcon
                className={`w-4 h-4 ${category === 'image' ? 'text-white' : 'text-indigo-600'}`}
              />
              <span className="text-xs">Images (PNG, JPG)</span>
            </button>

            <button
              onClick={() => handleFormatChange('html', 'html')}
              className={`w-full p-2.5 rounded-lg flex items-center space-x-2.5 transition text-left ${
                category === 'html'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Globe
                className={`w-4 h-4 ${category === 'html' ? 'text-white' : 'text-purple-600'}`}
              />
              <span className="text-xs">HTML Web Page (.html)</span>
            </button>

            <button
              onClick={() => handleFormatChange('more', 'txt')}
              className={`w-full p-2.5 rounded-lg flex items-center space-x-2.5 transition text-left ${
                category === 'more'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <File
                className={`w-4 h-4 ${category === 'more' ? 'text-white' : 'text-slate-600'}`}
              />
              <span className="text-xs">More Formats (TXT, RTF, JSON)</span>
            </button>
          </div>

          {/* Right Configuration Panel */}
          <div className="md:col-span-2 p-6 flex flex-col justify-between overflow-y-auto max-h-[75vh]">
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-800 text-sm mb-1">
                  {category === 'word' && 'Microsoft Word Document (.docx)'}
                  {category === 'excel' && 'Excel Spreadsheet (.xlsx)'}
                  {category === 'powerpoint' && 'Microsoft PowerPoint Presentation (.pptx)'}
                  {category === 'pdfa' && 'PDF/A Long-Term Archival (ISO 19005)'}
                  {category === 'image' && 'High-Resolution Page Images'}
                  {category === 'html' && 'HTML Web Page Export'}
                  {category === 'more' && 'Plain Text, RTF & JSON Export'}
                </h3>
                <p className="text-slate-500 text-xs">
                  {category === 'word' &&
                    'Converts PDF paragraphs, headings, and tables into an editable .docx file.'}
                  {category === 'excel' &&
                    'Extracts tabular columns and numerical data into separate worksheets (.xlsx).'}
                  {category === 'powerpoint' &&
                    'Creates slide presentations with editable text boxes or high-fidelity slide backgrounds.'}
                  {category === 'pdfa' &&
                    'Produces standardized, self-contained PDF/A archives ensuring visual fidelity across future decades.'}
                  {category === 'image' &&
                    'Renders each page into a standalone high-resolution PNG or JPEG raster image.'}
                  {category === 'html' &&
                    'Exports clean, responsive HTML representation of the document content.'}
                  {category === 'more' &&
                    'Export as plain text (TXT), Rich Text Format (RTF), or structured JSON metadata.'}
                </p>
              </div>

              {/* PDF/A Profile Selection & Preflight Audit */}
              {category === 'pdfa' && (
                <div className="space-y-4">
                  {/* Conformance Profile Switcher */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Archival Conformance Standard
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPdfaProfile('PDF/A-1b')}
                        className={`p-3 rounded-lg border text-left transition ${
                          pdfaProfile === 'PDF/A-1b'
                            ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-xs ring-1 ring-blue-500/20'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">PDF/A-1b</span>
                          <span className="text-[10px] uppercase font-semibold text-slate-400">
                            ISO 19005-1
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                          PDF 1.4 baseline. Enforces embedded fonts, device-independent color, no encryption, and strict zero transparency.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPdfaProfile('PDF/A-2b')}
                        className={`p-3 rounded-lg border text-left transition ${
                          pdfaProfile === 'PDF/A-2b'
                            ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-xs ring-1 ring-blue-500/20'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">PDF/A-2b</span>
                          <span className="text-[10px] uppercase font-semibold text-slate-400">
                            ISO 19005-2
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                          PDF 1.7 standard. Enforces embedded fonts, unencrypted streams, while supporting modern transparency and JPEG2000.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Preflight Compliance Audit Section */}
                  <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50/70">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-slate-800">
                          Preflight Compliance Audit
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => runPdfaValidation(pdfaProfile)}
                        disabled={isValidatingPdfa}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1 transition"
                      >
                        <RefreshCw
                          className={`w-3 h-3 ${isValidatingPdfa ? 'animate-spin' : ''}`}
                        />
                        <span>Re-audit</span>
                      </button>
                    </div>

                    {/* Status Banner */}
                    {renderComplianceBadge()}

                    {/* Summary Metrics Row */}
                    {pdfaReport && !isValidatingPdfa && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                        <div className="p-2 bg-white rounded border border-slate-200">
                          <div className="text-[10px] text-slate-400 font-medium">Fonts</div>
                          <div className="font-semibold text-slate-700 truncate">
                            {pdfaReport.fontsDetected.length === 0
                              ? 'No Fonts (Clean)'
                              : pdfaReport.fontsDetected.every((f) => f.isEmbedded)
                              ? 'All Embedded'
                              : `${pdfaReport.fontsDetected.filter((f) => !f.isEmbedded).length} Unembedded`}
                          </div>
                        </div>

                        <div className="p-2 bg-white rounded border border-slate-200">
                          <div className="text-[10px] text-slate-400 font-medium">Security</div>
                          <div className="font-semibold text-slate-700 truncate">
                            {!pdfaReport.isEncrypted ? 'Unencrypted (Pass)' : 'Encrypted (Fail)'}
                          </div>
                        </div>

                        <div className="p-2 bg-white rounded border border-slate-200">
                          <div className="text-[10px] text-slate-400 font-medium">Color Intent</div>
                          <div className="font-semibold text-slate-700 truncate">
                            {pdfaReport.hasOutputIntent ? 'OutputIntent Present' : 'Injected on Export'}
                          </div>
                        </div>

                        <div className="p-2 bg-white rounded border border-slate-200">
                          <div className="text-[10px] text-slate-400 font-medium">Transparency</div>
                          <div className="font-semibold text-slate-700 truncate">
                            {pdfaProfile === 'PDF/A-1b'
                              ? pdfaReport.hasTransparency
                                ? 'Forbidden (Fail)'
                                : 'None (Pass)'
                              : 'Allowed (PDF/A-2b)'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Collapsible Checks Checklist */}
                    {pdfaReport && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setIsChecksExpanded(!isChecksExpanded)}
                          className="w-full flex items-center justify-between text-left text-xs font-medium text-slate-600 hover:text-slate-800 transition py-1"
                        >
                          <span>
                            Inspection Checklist ({pdfaReport.checks.length} compliance rules)
                          </span>
                          {isChecksExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>

                        {isChecksExpanded && (
                          <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {pdfaReport.checks.map((chk) => (
                              <div
                                key={chk.id}
                                className="p-2 bg-white rounded border border-slate-200 flex items-start space-x-2 text-xs"
                              >
                                {chk.status === 'pass' && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                )}
                                {chk.status === 'warn' && (
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                )}
                                {chk.status === 'fail' && (
                                  <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1">
                                  <div className="font-semibold text-slate-800 text-[11px]">
                                    {chk.name}
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-0.5">
                                    {chk.details}
                                  </p>
                                  {chk.recommendation && (
                                    <p className="text-[10px] text-amber-700 mt-0.5 font-medium">
                                      Recommendation: {chk.recommendation}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Transparency notice */}
                    <div className="text-[10px] text-slate-500 border-t border-slate-200 pt-2 flex items-start space-x-1.5">
                      <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>
                        HHM PDF validates ISO 19005 structural requirements client-side. The original document remains untouched.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Conversion Options */}
              {(category === 'word' || category === 'excel') && (
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableOcr}
                      onChange={(e) => setEnableOcr(e.target.checked)}
                      className="accent-blue-600 rounded"
                    />
                    <span className="text-xs font-semibold text-blue-900">
                      Enable Tesseract.js OCR for Scanned / Image-Based PDFs
                    </span>
                  </label>
                  <p className="text-[10px] text-blue-700 pl-5">
                    Automatically recognizes text in scanned images so content is not missed
                    during conversion.
                  </p>
                </div>
              )}

              {category === 'powerpoint' && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700">
                    Slide Generation Mode
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPptxMode('editable')}
                      className={`p-3 rounded-lg border text-left transition ${
                        pptxMode === 'editable'
                          ? 'border-blue-600 bg-blue-50/50 text-blue-900'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-semibold text-xs">Editable Text</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Maps text to PPTX text boxes
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPptxMode('slide_image')}
                      className={`p-3 rounded-lg border text-left transition ${
                        pptxMode === 'slide_image'
                          ? 'border-blue-600 bg-blue-50/50 text-blue-900'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-semibold text-xs">High-Fidelity Image</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Preserves exact page layout
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {category === 'more' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Format Selection
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setExportFormat('txt')}
                      className={`p-2.5 rounded border text-xs font-medium transition ${
                        exportFormat === 'txt'
                          ? 'border-blue-600 bg-blue-50 text-blue-900'
                          : 'border-slate-200 text-slate-700'
                      }`}
                    >
                      Plain Text (.txt)
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportFormat('rtf')}
                      className={`p-2.5 rounded border text-xs font-medium transition ${
                        exportFormat === 'rtf'
                          ? 'border-blue-600 bg-blue-50 text-blue-900'
                          : 'border-slate-200 text-slate-700'
                      }`}
                    >
                      Rich Text (.rtf)
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportFormat('json')}
                      className={`p-2.5 rounded border text-xs font-medium transition ${
                        exportFormat === 'json'
                          ? 'border-blue-600 bg-blue-50 text-blue-900'
                          : 'border-slate-200 text-slate-700'
                      }`}
                    >
                      Metadata (.json)
                    </button>
                  </div>
                </div>
              )}

              {isExporting && (
                <div className="p-3 bg-slate-100 rounded-lg flex items-center space-x-3">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span className="text-xs font-medium text-slate-700">{statusText}</span>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between mt-4">
              <span className="text-[10px] text-slate-400">
                Original document remains unchanged.
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {isExporting
                      ? 'Processing...'
                      : category === 'pdfa'
                      ? `Export ${pdfaProfile}`
                      : 'Export & Download'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
