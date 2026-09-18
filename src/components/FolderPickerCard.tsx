import React, { useState, useRef } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { PLATFORMS, ALL_GENRES } from '../data/platformsData';
import { PlatformCode, ScanFilters } from '../types';
import { ScanProgress } from '../utils/fileSystem';

interface FolderPickerCardProps {
  onSelectDirectory: (preFilters: ScanFilters) => Promise<void>;
  onSelectFiles: (files: FileList | File[], preFilters: ScanFilters) => Promise<void>;
  isScanning: boolean;
  scanProgress: ScanProgress | null;
  onViewLandingPage?: () => void;
}

export const FolderPickerCard: React.FC<FolderPickerCardProps> = ({
  onSelectDirectory,
  onSelectFiles,
  isScanning,
  scanProgress,
  onViewLandingPage,
}) => {
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformCode[]>(
    PLATFORMS.map((p) => p.id)
  );
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [hideBadDumps, setHideBadDumps] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const togglePlatform = (p: PlatformCode) => {
    if (selectedPlatforms.includes(p)) {
      setSelectedPlatforms(selectedPlatforms.filter((x) => x !== p));
    } else {
      setSelectedPlatforms([...selectedPlatforms, p]);
    }
  };

  const toggleAllPlatforms = () => {
    if (selectedPlatforms.length === PLATFORMS.length) {
      setSelectedPlatforms([]);
    } else {
      setSelectedPlatforms(PLATFORMS.map((p) => p.id));
    }
  };

  const toggleGenre = (g: string) => {
    if (selectedGenres.includes(g)) {
      setSelectedGenres(selectedGenres.filter((x) => x !== g));
    } else {
      setSelectedGenres([...selectedGenres, g]);
    }
  };

  const getFilters = (): ScanFilters => ({
    selectedPlatforms,
    selectedGenres,
    searchQuery: '',
    viewMode: 'all',
    minSizeBytes: 0,
    hideBadDumps,
  });

  // Staged scan confirmation modal in the center of the screen
  const [stagedScan, setStagedScan] = useState<{
    files: FileList | File[];
    folderName: string;
    count: number;
  } | null>(null);

  const handleOpenFolderClick = async () => {
    // Try native File System Access API first (shows "Ordner auswählen" in Windows instead of "Hochladen")
    if (typeof (window as any).showDirectoryPicker === 'function') {
      try {
        await onSelectDirectory(getFilters());
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // User clicked cancel in Windows explorer, do nothing
          return;
        }
        console.warn('showDirectoryPicker failed or restricted in iframe, falling back to file input:', err);
      }
    }

    // Fallback: HTML5 directory input (Chrome shows "Hochladen" button for this)
    folderInputRef.current?.click();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = e.dataTransfer.files;
      let folderName = 'Roms';
      if (files[0] && (files[0] as any).webkitRelativePath) {
        const relPath = (files[0] as any).webkitRelativePath;
        folderName = relPath.split('/')[0] || 'Roms';
      }
      setStagedScan({ files, folderName, count: files.length });
    }
  };

  const handleFolderInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = e.target.files;
      let folderName = 'Roms';
      if (files[0] && (files[0] as any).webkitRelativePath) {
        const relPath = (files[0] as any).webkitRelativePath;
        folderName = relPath.split('/')[0] || 'Roms';
      }
      setStagedScan({ files, folderName, count: files.length });
    }
    e.target.value = '';
  };

  const confirmStagedScan = async () => {
    if (!stagedScan) return;
    const { files } = stagedScan;
    setStagedScan(null);
    await onSelectFiles(files, getFilters());
  };

  return (
    <div className="w-full max-w-3xl mx-auto my-12 px-4 space-y-4">
      {/* Main Drag/Drop Zone with enhanced frosted glass transparency */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`p-10 rounded-2xl border transition text-center ${
          dragOver
            ? 'border-violet-500/70 bg-violet-950/40 shadow-2xl ring-2 ring-violet-500/30 backdrop-blur-2xl'
            : 'frosted-glass text-slate-100'
        }`}
      >
        {isScanning ? (
          <div className="py-4 space-y-3">
            <div className="w-8 h-8 mx-auto border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
            <div className="text-sm font-bold text-white">
              {scanProgress?.stage === 'hashing'
                ? 'Duplikate werden analysiert...'
                : 'Verzeichnis wird gescannt...'}
            </div>
            <div className="text-xs text-slate-400 font-mono truncate max-w-sm mx-auto">
              {scanProgress?.currentFilename || 'Dateien werden gescannt...'}
            </div>
            <div className="max-w-xs mx-auto bg-slate-900/60 rounded-full h-1.5 overflow-hidden border border-white/10">
              <div
                className="bg-linear-to-r from-violet-600 to-fuchsia-500 h-full transition-all duration-200"
                style={{
                  width:
                    scanProgress && scanProgress.scannedCount > 0
                      ? `${Math.round(
                          (scanProgress.hashedCount / Math.max(scanProgress.scannedCount, 1)) * 100
                        )}%`
                      : '20%',
                }}
              />
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {scanProgress?.hashedCount} / {scanProgress?.scannedCount}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">ROM-Sammlung scannen</h2>
              <p className="text-xs text-slate-400 mt-1">
                ROM-Ordner oder SD-Karte per Drag & Drop hineinziehen oder zum Scannen auswählen.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                id="btn-select-os-folder"
                type="button"
                onClick={handleOpenFolderClick}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-linear-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-900/40 transition cursor-pointer"
              >
                Ordner scannen
              </button>

              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-900/40 hover:bg-slate-800/60 border border-white/15 backdrop-blur-md transition cursor-pointer"
              >
                Filter {showFilters ? 'ausblenden' : `(${selectedPlatforms.length} Systeme)`}
              </button>
            </div>

            {/* What happens when selecting a system folder */}
            <div className="mt-4 pt-3 border-t border-white/10 text-xs text-slate-300 max-w-xl mx-auto leading-relaxed text-left">
              <div className="flex items-center gap-2 mb-2.5 justify-center">
                <span className="font-bold text-white text-xs">Was passiert bei der Auswahl eines System-Ordners?</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] text-slate-300">
                <div className="p-2.5 rounded-xl bg-slate-900/40 border border-white/10 backdrop-blur-xs">
                  <div className="font-bold text-cyan-300 mb-0.5">1. Automatische Erkennung</div>
                  Plattformen (z. B. NES, Commodore Amiga, Genesis) und Dateiformate werden blitzschnell identifiziert.
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/40 border border-white/10 backdrop-blur-xs">
                  <div className="font-bold text-emerald-300 mb-0.5">2. Multi-Disk & M3U</div>
                  Zusammengehörige Disketten werden gebündelt, in Unterordner sortiert und M3U-Playlists erstellt.
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/40 border border-white/10 backdrop-blur-xs">
                  <div className="font-bold text-amber-300 mb-0.5">3. 1G1R & Bereinigung</div>
                  Dumping-Kürzel [!] werden entfernt und Duplikate sicher im Ordner <code className="text-amber-200">_Duplicates/</code> isoliert.
                </div>
              </div>
              <p className="text-center text-[11px] text-slate-400 mt-2.5">
                🔒 <strong className="text-slate-300">100% lokaler Scan:</strong> Keine Dateien werden ins Internet hochgeladen oder unwiderruflich gelöscht.
              </p>
            </div>

            {/* Guide & Landing Page Teaser Banner */}
            {onViewLandingPage && (
              <div className="mt-4 p-3 rounded-xl bg-slate-900/35 backdrop-blur-xl border border-violet-500/25 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-violet-600 to-fuchsia-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Was macht der ROM Collection Manager genau?</div>
                    <div className="text-[11px] text-slate-400">Erfahre alles über 1G1R-Kuration, No-Intro Standard & das Multi-Disk M3U-Paket.</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onViewLandingPage}
                  className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800/60 hover:bg-slate-800 text-slate-200 border border-white/15 transition shadow-xs shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Funktionen ansehen</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Hidden Input for Folder selection */}
            <input
              ref={folderInputRef}
              type="file"
              multiple
              // @ts-ignore
              webkitdirectory=""
              directory=""
              onChange={handleFolderInputChange}
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* Pre-scan Filter Dropdown/Panel */}
      {showFilters && (
        <div className="p-4 rounded-2xl frosted-glass space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Systeme ({selectedPlatforms.length}/{PLATFORMS.length})</span>
            <button
              onClick={toggleAllPlatforms}
              className="text-violet-400 hover:text-violet-300 font-medium cursor-pointer"
            >
              {selectedPlatforms.length === PLATFORMS.length ? 'Alle abwählen' : 'Alle auswählen'}
            </button>
          </div>

          <div className="flex flex-wrap gap-1 max-h-56 overflow-y-auto pr-1">
            {PLATFORMS.map((plat) => {
              const active = selectedPlatforms.includes(plat.id);
              return (
                <button
                  key={plat.id}
                  onClick={() => togglePlatform(plat.id)}
                  className={`px-2 py-1 rounded text-xs font-medium transition cursor-pointer border ${
                    active
                      ? 'bg-violet-600 text-white border-violet-500 shadow-xs'
                      : 'bg-slate-900/40 text-slate-300 border-white/10 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  {plat.shortCode}
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={hideBadDumps}
                onChange={(e) => setHideBadDumps(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-violet-600 focus:ring-0"
              />
              <span>Defekte Dumps ([b]) direkt als Duplikat markieren</span>
            </label>
          </div>
        </div>
      )}

      {/* Centered Modal for Folder Scan Confirmation */}
      {stagedScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <div className="frosted-glass-modal rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5 animate-in fade-in zoom-in duration-200 text-slate-100">
            {/* Top Badge Icon */}
            <div className="w-14 h-14 rounded-2xl bg-slate-900/60 border border-white/15 text-amber-300 flex items-center justify-center mx-auto text-2xl shadow-md">
              📁
            </div>

            {/* Title & Description */}
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white">
                Sollen {stagedScan.count} Dateien analysiert werden?
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hierdurch werden alle Dateien aus <span className="font-semibold text-white">„{stagedScan.folderName}“</span> eingelesen, auf Duplikate geprüft und für das No-Intro-Umbenennen vorbereitet.
              </p>
            </div>

            {/* Privacy Guarantee Box */}
            <div className="bg-emerald-950/30 border border-emerald-500/30 backdrop-blur-md rounded-xl p-3 text-left flex items-start gap-2.5">
              <span className="text-base text-emerald-400 shrink-0 mt-0.5">🛡️</span>
              <div className="text-[11px] text-emerald-300 leading-normal">
                <span className="font-semibold block text-emerald-200">100% lokaler Scan in deinem Browser</span>
                Deine ROMs werden <span className="font-medium">nicht</span> auf externe Server hochgeladen. Alle Prüfsummen und No-Intro-Katalogabgleiche laufen rein lokal in deinem PC-Speicher.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                id="btn-modal-cancel-scan"
                type="button"
                onClick={() => setStagedScan(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-white/10 transition cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                id="btn-modal-confirm-scan"
                type="button"
                onClick={confirmStagedScan}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-linear-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-md shadow-violet-900/30 transition cursor-pointer"
              >
                Jetzt scannen ({stagedScan.count})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
