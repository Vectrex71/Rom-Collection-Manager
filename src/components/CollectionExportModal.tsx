import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, FileText, CheckCircle2, Copy } from 'lucide-react';
import { RomFile } from '../types';
import { exportCollectionToCsv, exportCollectionToMarkdown, triggerFileDownload } from '../utils/exportManager';
import { useTranslation } from '../i18n';

interface CollectionExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  roms: RomFile[];
  folderName: string;
}

export const CollectionExportModal: React.FC<CollectionExportModalProps> = ({
  isOpen,
  onClose,
  roms,
  folderName,
}) => {
  const { t, language } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'markdown'>('csv');

  if (!isOpen) return null;

  const activeRoms = roms.filter((r) => !r.isJunk && (!r.isDuplicate || r.recommendedAction === 'keep'));
  const top200Count = activeRoms.filter((r) => r.isTop200).length;
  const totalSizeBytes = activeRoms.reduce((sum, r) => sum + r.size, 0);
  const totalSizeFormatted =
    totalSizeBytes > 1024 * 1024 * 1024
      ? `${(totalSizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
      : `${(totalSizeBytes / (1024 * 1024)).toFixed(1)} MB`;

  const handleDownload = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const safeName = (folderName || 'rom_sammlung').replace(/[^a-zA-Z0-9_-]/g, '_');

    if (exportFormat === 'csv') {
      const csv = exportCollectionToCsv(roms);
      triggerFileDownload(csv, `${safeName}_export_${dateStr}.csv`, 'text/csv');
    } else {
      const md = exportCollectionToMarkdown(roms, folderName);
      triggerFileDownload(md, `${safeName}_checklist_${dateStr}.md`, 'text/markdown');
    }
  };

  const handleCopyMarkdown = () => {
    const md = exportCollectionToMarkdown(roms, folderName);
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xl">
      <div className="frosted-glass-modal rounded-2xl w-full max-w-2xl flex flex-col overflow-hidden text-slate-100 shadow-2xl border border-white/15">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              📊
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {language === 'de' ? 'Sammlung exportieren & teilen' : 'Export & Share Collection'}
              </h3>
              <p className="text-xs text-slate-300">
                {language === 'de' 
                  ? 'Lade deine kuratierte Spieleliste als CSV-Tabelle oder Markdown-Checkliste herunter.'
                  : 'Download your curated game list as a CSV spreadsheet or Markdown checklist.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-900/50 rounded-xl border border-white/10 text-center">
              <div className="text-base font-bold text-white">{activeRoms.length}</div>
              <div className="text-[11px] text-slate-400">
                {language === 'de' ? 'Aktive Spiele' : 'Active Games'}
              </div>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-xl border border-white/10 text-center">
              <div className="text-base font-bold text-amber-300">{top200Count} / 200</div>
              <div className="text-[11px] text-slate-400">
                {language === 'de' ? 'Top 200 Titel' : 'Top 200 Titles'}
              </div>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-xl border border-white/10 text-center">
              <div className="text-base font-bold text-emerald-300">{totalSizeFormatted}</div>
              <div className="text-[11px] text-slate-400">
                {language === 'de' ? 'Speicherplatz' : 'Storage Size'}
              </div>
            </div>
          </div>

          {/* Format selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200">
              {language === 'de' ? 'Exportformat wählen:' : 'Select export format:'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportFormat('csv')}
                className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  exportFormat === 'csv'
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-white shadow-md'
                    : 'bg-slate-900/40 border-white/10 text-slate-300 hover:border-white/20'
                }`}
              >
                <FileSpreadsheet className={`w-5 h-5 shrink-0 mt-0.5 ${exportFormat === 'csv' ? 'text-emerald-400' : 'text-slate-400'}`} />
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    {language === 'de' ? 'CSV-Tabelle (.csv)' : 'CSV Spreadsheet (.csv)'}
                    {exportFormat === 'csv' && <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded">{language === 'de' ? 'Aktiv' : 'Active'}</span>}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {language === 'de'
                      ? 'Ideal für Excel, Google Sheets, LibreOffice. Enthält Titel, Hashes, Regionen, Multi-Disks und Größen.'
                      : 'Ideal for Excel, Google Sheets, LibreOffice. Includes titles, hashes, regions, multi-discs and sizes.'}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('markdown')}
                className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  exportFormat === 'markdown'
                    ? 'bg-violet-950/40 border-violet-500/50 text-white shadow-md'
                    : 'bg-slate-900/40 border-white/10 text-slate-300 hover:border-white/20'
                }`}
              >
                <FileText className={`w-5 h-5 shrink-0 mt-0.5 ${exportFormat === 'markdown' ? 'text-violet-400' : 'text-slate-400'}`} />
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    {language === 'de' ? 'Markdown-Checkliste (.md)' : 'Markdown Checklist (.md)'}
                    {exportFormat === 'markdown' && <span className="text-[10px] bg-violet-500/20 text-violet-300 px-1.5 py-0.2 rounded">{language === 'de' ? 'Aktiv' : 'Active'}</span>}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {language === 'de'
                      ? 'Strukturierte Liste mit Abhakhäkchen [x], sortiert nach Konsole. Perfekt für GitHub README oder Notion.'
                      : 'Structured list with checkboxes [x], grouped by console. Perfect for GitHub README or Notion.'}
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-slate-950/60 flex items-center justify-between gap-3">
          {exportFormat === 'markdown' ? (
            <button
              onClick={handleCopyMarkdown}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-white/10 transition flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">
                    {language === 'de' ? 'In Zwischenablage kopiert!' : 'Copied to clipboard!'}
                  </span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>{language === 'de' ? 'Als Text kopieren' : 'Copy text'}</span>
                </>
              )}
            </button>
          ) : (
            <div className="text-[11px] text-slate-400">
              {language === 'de' ? 'Kompilierte Datei ist UTF-8 formatiert.' : 'Compiled file is UTF-8 formatted.'}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition cursor-pointer"
            >
              {t('confirm.cancel')}
            </button>

            <button
              id="btn-confirm-export-download"
              onClick={handleDownload}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 transition flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>
                {exportFormat === 'csv' 
                  ? (language === 'de' ? 'CSV herunterladen' : 'Download CSV') 
                  : (language === 'de' ? 'Markdown herunterladen' : 'Download Markdown')}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

