import React, { useState, useRef, useMemo } from 'react';
import {
  Cpu,
  FolderOpen,
  Download,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FolderSync,
  Layers,
  ArrowLeft,
  FileText,
  Copy,
  Check,
  Disc,
  RefreshCw,
  Upload,
  Info,
  Archive,
  Search,
  Filter,
  Trash2,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from 'lucide-react';
import {
  analyzeBiosFiles,
  exportBiosToDirectory,
  exportBiosToZip,
  generateBiosScript,
  ScannedBiosFile,
  SystemReadiness,
} from '../utils/biosAnalyzer';
import { useTranslation } from '../i18n';

interface BiosStudioViewProps {
  onBackToManager: () => void;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const BiosStudioView: React.FC<BiosStudioViewProps> = ({
  onBackToManager,
  showToast,
}) => {
  const { language } = useTranslation();
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scan state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number; filename: string } | null>(null);
  const [scannedFiles, setScannedFiles] = useState<ScannedBiosFile[]>([]);
  const [systemsReadiness, setSystemsReadiness] = useState<SystemReadiness[]>([]);
  const [stats, setStats] = useState<{
    totalFiles: number;
    verifiedCount: number;
    needsRenameCount: number;
    duplicateCount: number;
    unknownCount: number;
    readySystemsCount: number;
    totalSystemsCount: number;
  } | null>(null);

  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false);

  // Tab & Filter state
  const [activeTab, setActiveTab] = useState<'systems' | 'clean_bios' | 'duplicates' | 'extras' | 'all_files'>('systems');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterReadiness, setFilterReadiness] = useState<'all' | 'ready' | 'incomplete'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Export configuration
  const [removeDuplicates, setRemoveDuplicates] = useState<boolean>(true);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number; text: string } | null>(null);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [scriptType, setScriptType] = useState<'windows' | 'unix'>('windows');
  const [copiedScript, setCopiedScript] = useState(false);

  // ==================== SCAN HANDLERS ====================

  const processFiles = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0) return;

    setIsScanning(true);
    setScanProgress({
      current: 0,
      total: fileList.length,
      filename: language === 'de' ? 'Lese Dateien...' : 'Reading files...',
    });

    const rawFiles: { file: File; relativePath: string }[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const relativePath = (file as any).webkitRelativePath || file.name;
      rawFiles.push({ file, relativePath });
    }

    try {
      const analysis = await analyzeBiosFiles(rawFiles, (current, total, filename) => {
        setScanProgress({ current, total, filename });
      });

      setScannedFiles(analysis.scannedFiles);
      setSystemsReadiness(analysis.systemsReadiness);
      setStats(analysis.stats);
      setIsScanning(false);
      setScanProgress(null);

      showToast(
        language === 'de'
          ? `${analysis.stats.totalFiles} Dateien analysiert: ${analysis.stats.verifiedCount + analysis.stats.needsRenameCount} offizielle BIOS erkannt, ${analysis.stats.duplicateCount} redundante Duplikate identifiziert!`
          : `${analysis.stats.totalFiles} files analyzed: ${analysis.stats.verifiedCount + analysis.stats.needsRenameCount} official BIOS, ${analysis.stats.duplicateCount} redundant duplicates identified!`,
        'success'
      );
    } catch (err: any) {
      setIsScanning(false);
      setScanProgress(null);
      showToast(err.message || (language === 'de' ? 'Fehler bei der Analyse der Dateien' : 'Error analyzing files'), 'error');
    }
  };

  const handlePickDirectory = async () => {
    if (typeof (window as any).showDirectoryPicker === 'function') {
      try {
        const dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' });
        setIsScanning(true);
        setScanProgress({
          current: 0,
          total: 0,
          filename: language === 'de' ? 'Lese Verzeichnis...' : 'Reading folder...',
        });

        const rawFiles: { file: File; relativePath: string }[] = [];

        async function traverse(handle: any, subpath: string) {
          for await (const entry of handle.values()) {
            if (entry.kind === 'file') {
              const file = await entry.getFile();
              rawFiles.push({
                file,
                relativePath: subpath ? `${subpath}/${entry.name}` : entry.name,
              });
            } else if (entry.kind === 'directory') {
              await traverse(entry, subpath ? `${subpath}/${entry.name}` : entry.name);
            }
          }
        }

        await traverse(dirHandle, '');

        const analysis = await analyzeBiosFiles(rawFiles, (current, total, filename) => {
          setScanProgress({ current, total, filename });
        });

        setScannedFiles(analysis.scannedFiles);
        setSystemsReadiness(analysis.systemsReadiness);
        setStats(analysis.stats);
        setIsScanning(false);
        setScanProgress(null);

        showToast(
          language === 'de'
            ? `${analysis.stats.totalFiles} Dateien analysiert: ${analysis.stats.verifiedCount + analysis.stats.needsRenameCount} offizielle BIOS erkannt, ${analysis.stats.duplicateCount} redundante Duplikate identifiziert!`
            : `${analysis.stats.totalFiles} BIOS files analyzed: ${analysis.stats.verifiedCount + analysis.stats.needsRenameCount} official BIOS, ${analysis.stats.duplicateCount} duplicates identified!`,
          'success'
        );
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('showDirectoryPicker restricted in iframe, falling back to directory input:', err);
      }
    }

    folderInputRef.current?.click();
  };

  const handlePickFiles = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  // ==================== EXPORT HANDLERS ====================

  const handleExportDirectory = async () => {
    if (typeof (window as any).showDirectoryPicker !== 'function') {
      showToast(
        language === 'de'
          ? 'Direktes Schreiben im Simulator nicht erlaubt. Lade stattdessen das saubere ZIP herunter!'
          : 'Direct disk write is restricted in simulator. Please download the clean ZIP instead!',
        'info'
      );
      handleExportZip();
      return;
    }

    try {
      const targetDirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      setIsExporting(true);
      setExportProgress({
        current: 0,
        total: scannedFiles.length,
        text: language === 'de' ? 'Erstelle saubere Ordnerstruktur...' : 'Creating clean folder structure...',
      });

      const exportOptions = {
        includeExtras: false,
        removeDuplicates,
        language,
      };

      const res = await exportBiosToDirectory(
        scannedFiles,
        targetDirHandle,
        exportOptions,
        (current, total, path) => {
          setExportProgress({
            current,
            total,
            text: (language === 'de' ? 'Kopiere: ' : 'Copying: ') + path,
          });
        }
      );

      setIsExporting(false);
      setExportProgress(null);

      if (res.copiedCount > 0) {
        showToast(
          language === 'de'
            ? `Perfekt! ${res.copiedCount} offizielle BIOS-Dateien wurden ohne Duplikate sauber exportiert!`
            : `Success! ${res.copiedCount} official BIOS files exported without duplicates!`,
          'success'
        );
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.warn('showDirectoryPicker write restricted:', err);
      setIsExporting(false);
      setExportProgress(null);
      showToast(
        language === 'de'
          ? 'Im Simulator blockiert der Browser direkten Schreibzugriff. Nutze stattdessen einfach den sauberen ZIP-Download!'
          : 'Direct write is restricted. Please use clean ZIP download!',
        'info'
      );
      handleExportZip();
    }
  };

  const handleDownloadScript = (platform: 'windows' | 'unix') => {
    const exportOptions = {
      includeExtras: false,
      removeDuplicates,
      language,
    };
    const content = generateBiosScript(scannedFiles, platform, exportOptions);
    const filename = platform === 'windows' ? 'Organize_Official_BIOS.bat' : 'organize_official_bios.sh';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(
      language === 'de'
        ? `1-Klick-Skript ${filename} heruntergeladen! Lege es in deinen BIOS-Ordner und starte es per Doppelklick.`
        : `1-Click script ${filename} downloaded! Place it in your BIOS folder and run it.`,
      'success'
    );
  };

  const handleExportZip = async () => {
    setIsExporting(true);

    const progressMsg =
      language === 'de'
        ? 'Komprimiere offizielle System-BIOS-Dateien (klein & schnell)...'
        : 'Compressing official system BIOS (fast & lean)...';

    setExportProgress({ current: 0, total: 100, text: progressMsg });

    try {
      const exportOptions = {
        includeExtras: false,
        removeDuplicates,
        language,
      };

      const { blob: zipBlob, skippedLargeFiles } = await exportBiosToZip(
        scannedFiles,
        exportOptions,
        (percent, currentFile) => {
          setExportProgress({ current: percent, total: 100, text: currentFile });
        }
      );

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Clean_Official_BIOS.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setIsExporting(false);
      setExportProgress(null);

      if (skippedLargeFiles.length > 0) {
        showToast(
          language === 'de'
            ? `ZIP heruntergeladen! (${skippedLargeFiles.length} große Datei(en) >80MB übersprungen – nutze dafür das 1-Klick-Skript)`
            : `ZIP downloaded! (${skippedLargeFiles.length} large files >80MB skipped - use 1-click script)`,
          'info'
        );
      } else {
        showToast(
          language === 'de'
            ? 'Offizielles BIOS ZIP erfolgreich heruntergeladen! 100% spielbereit für RetroArch & Batocera.'
            : 'Official BIOS ZIP downloaded successfully! 100% ready for RetroArch & Batocera.',
          'success'
        );
      }
    } catch (err: any) {
      setIsExporting(false);
      setExportProgress(null);
      showToast(err.message || (language === 'de' ? 'Fehler beim Erstellen der ZIP-Datei' : 'Error creating ZIP file'), 'error');
    }
  };

  // ==================== EXPORT STATS & CANDIDATES ====================
  const officialCandidates = useMemo(() => {
    const removeDups = removeDuplicates !== false;
    return scannedFiles.filter((f) => {
      if (removeDups && (f.status === 'duplicate' || f.isDuplicateOf)) return false;
      return Boolean(f.requirement);
    });
  }, [scannedFiles, removeDuplicates]);

  const officialBytes = useMemo(() => officialCandidates.reduce((acc, f) => acc + f.size, 0), [officialCandidates]);
  const officialMB = Math.round(officialBytes / 1048576);

  // ==================== FILTERING ====================

  const categories = [
    'all',
    'Sony',
    'Nintendo',
    'Sega',
    'Commodore',
    'Arcade',
    'NEC',
    'SNK',
    'Atari',
    '3DO',
    'Microsoft',
    'Sharp',
    'Other',
  ];

  const filteredSystems = systemsReadiness.filter((sys) => {
    if (selectedCategory !== 'all' && sys.category !== selectedCategory) return false;
    if (filterReadiness === 'ready' && sys.status !== 'complete') return false;
    if (filterReadiness === 'incomplete' && sys.status === 'complete') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSys = sys.systemName.toLowerCase().includes(q) || sys.system.toLowerCase().includes(q);
      const matchReq = sys.requirements.some(
        (r) =>
          r.req.filename.toLowerCase().includes(q) ||
          r.req.description.toLowerCase().includes(q) ||
          r.foundFile?.sourceFilename.toLowerCase().includes(q)
      );
      if (!matchSys && !matchReq) return false;
    }
    return true;
  });

  // 1. Official clean BIOS files (Export ready)
  const filteredCleanBios = scannedFiles.filter((f) => {
    if (!f.requirement || f.status === 'duplicate' || f.isDuplicateOf) return false;
    if (selectedCategory !== 'all' && f.inferredCategory !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        f.sourceFilename.toLowerCase().includes(q) ||
        f.targetPath.toLowerCase().includes(q) ||
        f.inferredSystem.toLowerCase().includes(q) ||
        f.md5.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // 2. Duplicate files removed
  const filteredDuplicates = scannedFiles.filter((f) => {
    if (f.status !== 'duplicate' && !f.isDuplicateOf) return false;
    if (selectedCategory !== 'all' && f.inferredCategory !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        f.sourceFilename.toLowerCase().includes(q) ||
        f.sourceRelativePath.toLowerCase().includes(q) ||
        f.inferredSystem.toLowerCase().includes(q) ||
        (f.duplicateReason && f.duplicateReason.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // 3. Unique extra files
  const filteredExtras = scannedFiles.filter((f) => {
    if (f.status !== 'unknown_extra' || f.status === 'duplicate' || f.isDuplicateOf) return false;
    if (selectedCategory !== 'all' && f.inferredCategory !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        f.sourceFilename.toLowerCase().includes(q) ||
        f.targetPath.toLowerCase().includes(q) ||
        f.inferredSystem.toLowerCase().includes(q) ||
        f.md5.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // 4. All files in scan
  const filteredAllFiles = scannedFiles.filter((f) => {
    if (selectedCategory !== 'all' && f.inferredCategory !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        f.sourceFilename.toLowerCase().includes(q) ||
        f.sourceRelativePath.toLowerCase().includes(q) ||
        f.targetPath.toLowerCase().includes(q) ||
        f.inferredSystem.toLowerCase().includes(q) ||
        f.md5.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFileInputChange}
        className="hidden"
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        multiple
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        className="hidden"
        multiple
      />

      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToManager}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800 border border-white/10 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-violet-400" />
          <span>{language === 'de' ? 'Zurück zur ROM-Verwaltung' : 'Back to ROM Manager'}</span>
        </button>

        {scannedFiles.length > 0 && (
          <button
            onClick={() => {
              setScannedFiles([]);
              setStats(null);
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-950/40 hover:bg-slate-900 border border-white/10 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{language === 'de' ? 'Neuen Ordner scannen' : 'Scan New Folder'}</span>
          </button>
        )}
      </div>

      {/* Hero Section */}
      <div className="relative frosted-glass rounded-3xl p-6 sm:p-10 border border-white/15 shadow-2xl overflow-hidden">
        <div className="absolute -top-20 left-1/3 w-80 h-40 bg-violet-600/20 blur-3xl rounded-full pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/60 border border-violet-500/30 text-violet-300 text-xs font-semibold">
              <Cpu className="w-3.5 h-3.5 text-amber-300" />
              <span>BIOS Studio & Verifier</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {language === 'de' ? (
                <>
                  BIOS-Dateien bereinigen &{' '}
                  <span className="bg-linear-to-r from-violet-400 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent">
                    ohne Duplikate ordnen
                  </span>
                </>
              ) : (
                <>
                  Verify, Clean & Deduplicate{' '}
                  <span className="bg-linear-to-r from-violet-400 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent">
                    Official BIOS Files
                  </span>
                </>
              )}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              {language === 'de' ? (
                <>
                  Schluss mit kryptischen Namen und verschachteltem Unterordner-Chaos. Das BIOS Studio prüft echte Prüfsummen (MD5/SHA-1), <strong>filtert doppelte BIOS-Dateien aus Unterverzeichnissen automatisch heraus</strong> und erstellt ein <strong>100% sauberes, flaches Verzeichnis</strong> für RetroArch, Batocera, OnionOS & Handhelds – ohne überflüssige Ordner!
                </>
              ) : (
                <>
                  No more messy nested folders. BIOS Studio checks real MD5 hashes, <strong>filters out redundant duplicate files automatically</strong>, and creates a <strong>100% clean, flat directory</strong> for RetroArch, Batocera, OnionOS, and handhelds!
                </>
              )}
            </p>
          </div>

          {/* Export Configuration Panel */}
          {stats && (
            <div className="flex flex-col gap-3 shrink-0 bg-slate-950/75 p-5 rounded-2xl border border-white/10 w-full md:w-96 shadow-2xl">
              <div className="space-y-3">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{language === 'de' ? 'Sauberer BIOS-Export' : 'Clean BIOS Export'}</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-mono font-bold">
                    {language === 'de' ? '100% Bereinigt' : '100% Cleaned'}
                  </span>
                </div>

                {/* Scope Highlight Tile */}
                <div className="p-3 rounded-xl bg-violet-950/40 border border-violet-500/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-violet-300 font-bold uppercase tracking-wider block">
                      {language === 'de' ? 'Offizielle System-BIOS' : 'Official System BIOS'}
                    </span>
                    <span className="text-xs font-mono font-bold text-violet-200">~{officialMB} MB</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white font-mono">
                      {officialCandidates.length}
                    </span>
                    <span className="text-xs text-slate-300 font-medium">
                      {language === 'de' ? 'spielbereite Dateien' : 'ready-to-play files'}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-violet-300/80 leading-tight">
                    {language === 'de'
                      ? 'Flach & genormt für Batocera, RetroArch, Steam Deck & Handhelds'
                      : 'Flat & normalized for Batocera, RetroArch, Steam Deck & Handhelds'}
                  </p>
                </div>

                {/* Automatic Junk Filter Note */}
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/10 flex items-start gap-2 text-[10.5px] text-slate-300">
                  <Trash2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    <span className="font-bold text-slate-200 block">
                      {language === 'de' ? 'Ballast & Extras automatisch gefiltert:' : 'Junk & Extras Automatically Filtered:'}
                    </span>
                    <span className="text-slate-400">
                      {language === 'de'
                        ? `${stats.duplicateCount} Duplikate und ${stats.unknownCount} inoffizielle Dateien (Readmes, Beifang) werden beim Export verworfen.`
                        : `${stats.duplicateCount} duplicates and ${stats.unknownCount} non-BIOS files (readmes, unknown dumps) are discarded on export.`}
                    </span>
                  </p>
                </div>

                {/* Deduplication Toggle */}
                <div className="pt-0.5">
                  <label className="flex items-center gap-2 text-[11px] font-semibold text-emerald-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={removeDuplicates}
                      onChange={(e) => setRemoveDuplicates(e.target.checked)}
                      className="rounded border-white/20 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4"
                    />
                    <span>
                      {language === 'de'
                        ? `Unterordner-Duplikate filtern (${stats.duplicateCount} Kopien)`
                        : `Filter subfolder duplicates (${stats.duplicateCount} copies)`}
                    </span>
                  </label>
                </div>
              </div>

              {/* Action Buttons: Clean ZIP + 1-Click Script */}
              <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                {/* Clean ZIP */}
                <button
                  onClick={handleExportZip}
                  disabled={isExporting || officialCandidates.length === 0}
                  className="p-3 rounded-xl font-bold text-xs text-white bg-linear-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-md shadow-violet-950/50 flex flex-col items-start gap-0.5 transition cursor-pointer border border-white/15 text-left disabled:opacity-50"
                >
                  <div className="flex items-center gap-1.5 w-full justify-between">
                    <span className="flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-amber-300" />
                      <span>{language === 'de' ? '📦 Sauberes BIOS (.zip) herunterladen' : '📦 Download Clean BIOS (.zip)'}</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30 font-mono text-violet-200">
                      ~{officialMB} MB
                    </span>
                  </div>
                  <span className="text-[10px] text-violet-200/90 font-normal">
                    {language === 'de'
                      ? `${officialCandidates.length} Dateien • Nur echte offizielle BIOS, kein Ballast`
                      : `${officialCandidates.length} files • Official BIOS only, zero junk`}
                  </span>
                </button>

                {/* 1-Click Batch Script Download - Fastest & Never Crashes */}
                <button
                  onClick={() => handleDownloadScript('windows')}
                  className="px-3.5 py-2 rounded-xl font-bold text-xs text-emerald-200 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{language === 'de' ? '⚡ 1-Klick Batch-Skript (.bat) herunterladen' : '⚡ 1-Click Batch (.bat) Download'}</span>
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => handleDownloadScript('unix')}
                    className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition cursor-pointer py-1"
                  >
                    <span>macOS/Linux (.sh)</span>
                  </button>

                  <button
                    onClick={() => setShowScriptModal(true)}
                    className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1.5 transition cursor-pointer py-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{language === 'de' ? 'Skript ansehen' : 'View script'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drop Zone */}
        {scannedFiles.length === 0 && !isScanning && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`mt-8 border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition flex flex-col items-center justify-center space-y-4 ${
              isDragOver
                ? 'border-violet-400 bg-violet-950/40 scale-[1.01]'
                : 'border-violet-500/30 hover:border-violet-500/60 bg-slate-950/40'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-linear-to-tr from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300 shadow-md">
              <FolderOpen className="w-8 h-8 text-amber-300" />
            </div>

            <div className="space-y-1 max-w-md">
              <h3 className="text-base font-bold text-white">
                {language === 'de' ? 'Deinen unordentlichen BIOS-Ordner wählen' : 'Select your messy BIOS directory'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'de'
                  ? 'Wähle den Ordner aus oder ziehe BIOS-Dateien per Drag & Drop hier hinein. Wir lesen alle Daten nur lesend ein!'
                  : 'Choose the folder or drag & drop BIOS files here. Read-only analysis!'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                id="btn-pick-bios-folder"
                onClick={handlePickDirectory}
                className="px-6 py-3 rounded-xl font-bold text-xs text-white bg-linear-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-900/40 flex items-center gap-2 cursor-pointer transition border border-white/15"
              >
                <FolderOpen className="w-4 h-4 text-amber-300" />
                <span>{language === 'de' ? 'BIOS-Ordner auswählen & scannen' : 'Select BIOS Folder & Scan'}</span>
              </button>

              <button
                onClick={handlePickFiles}
                className="px-5 py-3 rounded-xl font-bold text-xs text-slate-300 bg-slate-900/80 hover:bg-slate-800 border border-white/15 flex items-center gap-2 cursor-pointer transition shadow-xs"
              >
                <Upload className="w-4 h-4 text-violet-400" />
                <span>{language === 'de' ? 'Einzelne Dateien auswählen' : 'Select Individual Files'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Loading Progress State */}
        {(isScanning || isExporting) && (
          <div className="mt-8 p-6 rounded-2xl bg-slate-950/80 border border-violet-500/30 text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-violet-300 font-bold text-sm">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
              <span>
                {isScanning
                  ? language === 'de'
                    ? 'Analysiere BIOS-Prüfsummen & Strukturen...'
                    : 'Analyzing BIOS Checksums...'
                  : language === 'de'
                  ? 'Exportiere saubere BIOS-Sammlung ohne Duplikate...'
                  : 'Exporting clean BIOS files without duplicates...'}
              </span>
            </div>

            {scanProgress && (
              <div className="space-y-1.5 max-w-md mx-auto">
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-white/10">
                  <div
                    className="bg-linear-to-r from-violet-500 to-fuchsia-500 h-full transition-all duration-200"
                    style={{
                      width: scanProgress.total > 0 ? `${(scanProgress.current / scanProgress.total) * 100}%` : '50%',
                    }}
                  />
                </div>
                <p className="text-[11px] font-mono text-slate-400 truncate">
                  {scanProgress.filename} ({scanProgress.current}/{scanProgress.total})
                </p>
              </div>
            )}

            {exportProgress && (
              <div className="space-y-1.5 max-w-md mx-auto">
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-white/10">
                  <div
                    className="bg-linear-to-r from-emerald-500 to-teal-400 h-full transition-all duration-200"
                    style={{
                      width: `${exportProgress.current}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] font-mono text-slate-300 truncate">{exportProgress.text}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Dashboard Cards */}
      {stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* 1. Systems */}
            <div
              onClick={() => setActiveTab('systems')}
              className={`bg-slate-950/60 backdrop-blur-md p-4 rounded-2xl border transition cursor-pointer shadow-xs ${
                activeTab === 'systems' ? 'border-violet-500 bg-violet-950/20 ring-1 ring-violet-500' : 'border-violet-500/20 hover:border-violet-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl font-black text-violet-400">{stats.readySystemsCount} / {stats.totalSystemsCount}</span>
                <Cpu className="w-4.5 h-4.5 text-violet-500/60" />
              </div>
              <div className="text-xs text-slate-300 font-bold mt-1">
                {language === 'de' ? 'Systeme Bereit' : 'Systems Ready'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {language === 'de' ? 'Vollständig spielbar' : 'Fully ready'}
              </div>
            </div>

            {/* 2. Clean BIOS */}
            <div
              onClick={() => setActiveTab('clean_bios')}
              className={`bg-slate-950/60 backdrop-blur-md p-4 rounded-2xl border transition cursor-pointer shadow-xs ${
                activeTab === 'clean_bios' ? 'border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500' : 'border-emerald-500/20 hover:border-emerald-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl font-black text-emerald-400">{stats.verifiedCount + stats.needsRenameCount}</span>
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-500/60" />
              </div>
              <div className="text-xs text-slate-300 font-bold mt-1">
                {language === 'de' ? 'Offizielle BIOS' : 'Official BIOS'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {language === 'de'
                  ? `${stats.verifiedCount} exakt, ${stats.needsRenameCount} normiert`
                  : `${stats.verifiedCount} exact, ${stats.needsRenameCount} normalized`}
              </div>
            </div>

            {/* 3. Removed Duplicates (Highlighted!) */}
            <div
              onClick={() => setActiveTab('duplicates')}
              className={`bg-slate-950/60 backdrop-blur-md p-4 rounded-2xl border transition cursor-pointer shadow-xs ${
                activeTab === 'duplicates' ? 'border-amber-500 bg-amber-950/30 ring-1 ring-amber-500' : 'border-amber-500/30 hover:border-amber-500/60 bg-amber-950/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl font-black text-amber-400">{stats.duplicateCount}</span>
                <Trash2 className="w-4.5 h-4.5 text-amber-400" />
              </div>
              <div className="text-xs text-amber-300 font-bold mt-1">
                {language === 'de' ? 'Duplikate entfernt' : 'Duplicates Removed'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {language === 'de' ? 'Aus Unterordnern neutralisiert' : 'Neutralized from subfolders'}
              </div>
            </div>

            {/* 4. Discarded Extras */}
            <div
              onClick={() => setActiveTab('extras')}
              className={`bg-slate-950/60 backdrop-blur-md p-4 rounded-2xl border transition cursor-pointer shadow-xs ${
                activeTab === 'extras' ? 'border-slate-500 bg-slate-900/40 ring-1 ring-slate-400' : 'border-slate-500/20 hover:border-slate-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl font-black text-slate-400">{stats.unknownCount}</span>
                <Archive className="w-4.5 h-4.5 text-slate-500" />
              </div>
              <div className="text-xs text-slate-300 font-bold mt-1">
                {language === 'de' ? 'Verworfene Extras' : 'Discarded Extras'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {language === 'de' ? 'Beim Export ignoriert' : 'Ignored on export'}
              </div>
            </div>

            {/* 5. Total Scanned */}
            <div
              onClick={() => setActiveTab('all_files')}
              className={`bg-slate-950/60 backdrop-blur-md p-4 rounded-2xl border transition cursor-pointer shadow-xs ${
                activeTab === 'all_files' ? 'border-slate-400 bg-slate-900/40 ring-1 ring-slate-400' : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl font-black text-white">{stats.totalFiles}</span>
                <Layers className="w-4.5 h-4.5 text-slate-400" />
              </div>
              <div className="text-xs text-slate-300 font-bold mt-1">
                {language === 'de' ? 'Dateien gescannt' : 'Files Scanned'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {language === 'de' ? '100% erfasst & geprüft' : '100% analyzed & verified'}
              </div>
            </div>
          </div>

          {/* Explanation Banner */}
          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3 text-xs text-slate-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-white">
                {language === 'de'
                  ? `Saubere Ordner-Bereinigung & Deduplizierung:`
                  : `Folder cleanup & deduplication active:`}
              </p>
              <p className="text-slate-300 leading-relaxed">
                {language === 'de' ? (
                  <>
                    Der alte Verzeichnisbaum mit seinen tiefen Unterordnern wird <strong>nicht</strong> mehr 1:1 kopiert! Alle <strong>{stats.duplicateCount} doppelten Dateien</strong> aus Unterverzeichnissen wurden anhand ihres Prüfsummen-Hashes (MD5) identifiziert und beim Export eliminiert. Du erhältst ein <strong>sofort einsatzbereites, flaches BIOS-Verzeichnis</strong> ohne Doppelungen!
                  </>
                ) : (
                  <>
                    Messy nested subfolders will <strong>not</strong> be cloned! All <strong>{stats.duplicateCount} duplicate files</strong> have been identified by MD5 hash and will be skipped. You get an organized, plug-and-play BIOS directory ready for immediate use.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area when Scanned */}
      {scannedFiles.length > 0 && (
        <div className="space-y-6">
          {/* Main Navigation Tabs */}
          <div className="flex border-b border-white/10 gap-2 flex-wrap">
            {/* Tab 1: System Readiness */}
            <button
              onClick={() => setActiveTab('systems')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'systems'
                  ? 'border-violet-500 text-white bg-violet-950/20'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-4 h-4 text-violet-400" />
              <span>{language === 'de' ? 'System-Bereitschaft' : 'System Readiness'}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-violet-900/60 text-[10px] text-violet-200">
                {stats?.readySystemsCount}/{stats?.totalSystemsCount}
              </span>
            </button>

            {/* Tab 2: Clean Official BIOS */}
            <button
              onClick={() => setActiveTab('clean_bios')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'clean_bios'
                  ? 'border-emerald-500 text-white bg-emerald-950/20'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{language === 'de' ? 'Bereinigte BIOS (Ziel-Set)' : 'Clean BIOS (Target Set)'}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-900/60 text-[10px] text-emerald-200">
                {filteredCleanBios.length}
              </span>
            </button>

            {/* Tab 3: Removed Duplicates */}
            <button
              onClick={() => setActiveTab('duplicates')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'duplicates'
                  ? 'border-amber-500 text-white bg-amber-950/30'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Trash2 className="w-4 h-4 text-amber-400" />
              <span>{language === 'de' ? 'Entfernte Duplikate' : 'Removed Duplicates'}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-amber-900/60 text-[10px] text-amber-200">
                {filteredDuplicates.length}
              </span>
            </button>

            {/* Tab 4: Discarded Extras */}
            <button
              onClick={() => setActiveTab('extras')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'extras'
                  ? 'border-slate-400 text-white bg-slate-900/40'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Archive className="w-4 h-4 text-slate-400" />
              <span>{language === 'de' ? 'Verworfene Extras & Beifang' : 'Discarded Extras & Junk'}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300">
                {filteredExtras.length}
              </span>
            </button>

            {/* Tab 5: All Scanned Files */}
            <button
              onClick={() => setActiveTab('all_files')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'all_files'
                  ? 'border-slate-400 text-white bg-slate-900/30'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4 text-slate-400" />
              <span>{language === 'de' ? 'Alle gescannten Dateien' : 'All Files'}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300">
                {stats?.totalFiles}
              </span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="frosted-glass rounded-2xl p-4 border border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="flex flex-wrap items-center gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {cat === 'all' ? (language === 'de' ? 'Alle Systeme' : 'All Systems') : cat}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {activeTab === 'systems' && (
                <div className="inline-flex rounded-xl p-1 bg-slate-900/80 border border-white/10 text-xs shadow-inner">
                  <button
                    onClick={() => setFilterReadiness('all')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                      filterReadiness === 'all' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {language === 'de' ? 'Alle' : 'All'}
                  </button>
                  <button
                    onClick={() => setFilterReadiness('ready')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                      filterReadiness === 'ready' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {language === 'de' ? 'Vollständig' : 'Ready'}
                  </button>
                  <button
                    onClick={() => setFilterReadiness('incomplete')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                      filterReadiness === 'incomplete' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {language === 'de' ? 'Fehlend' : 'Incomplete'}
                  </button>
                </div>
              )}

              <div className="relative">
                <input
                  type="text"
                  placeholder={language === 'de' ? 'Suchen...' : 'Search...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 pr-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 w-44"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2.5" />
              </div>
            </div>
          </div>

          {/* TAB 1: System Readiness Cards */}
          {activeTab === 'systems' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {filteredSystems.map((sys) => {
                const isComplete = sys.status === 'complete';
                const isPartial = sys.status === 'partial';

                return (
                  <div
                    key={sys.system}
                    className={`frosted-glass rounded-2xl p-5 border transition shadow-lg space-y-4 ${
                      isComplete
                        ? 'border-emerald-500/30 hover:border-emerald-500/50'
                        : isPartial
                        ? 'border-amber-500/30 hover:border-amber-500/50'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs border shadow-xs ${
                            isComplete
                              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                              : isPartial
                              ? 'bg-amber-950/60 border-amber-500/40 text-amber-400'
                              : 'bg-slate-900/60 border-white/10 text-slate-400'
                          }`}
                        >
                          <Disc className="w-5 h-5" />
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <span>{sys.systemName}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 border border-white/10 text-slate-300">
                              {sys.category}
                            </span>
                          </h3>
                          <p className="text-[11px] text-slate-400 font-medium">
                            {sys.foundCount} / {sys.requirements.length} {language === 'de' ? 'Dateien gefunden' : 'files found'}
                          </p>
                        </div>
                      </div>

                      {/* Readiness Pill */}
                      <div className="text-right">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-xs ${
                            isComplete
                              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                              : isPartial
                              ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                              : 'bg-slate-900/80 border-white/10 text-slate-400'
                          }`}
                        >
                          {isComplete ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>100% {language === 'de' ? 'Bereit' : 'Ready'}</span>
                            </>
                          ) : isPartial ? (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                              <span>{sys.percentage}% {language === 'de' ? 'Teilweise' : 'Partial'}</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-slate-500" />
                              <span>{language === 'de' ? 'Fehlt' : 'Missing'}</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Requirements List */}
                    <div className="space-y-2 pt-1">
                      {sys.requirements.map(({ req, foundFile }) => {
                        const isFound = Boolean(foundFile);
                        const isExact = foundFile?.status === 'verified_exact';
                        const isRenamed = foundFile?.status === 'needs_rename';

                        return (
                          <div
                            key={req.id}
                            className={`p-3 rounded-xl border text-xs transition ${
                              isExact
                                ? 'bg-emerald-950/20 border-emerald-500/30'
                                : isRenamed
                                ? 'bg-amber-950/25 border-amber-500/35'
                                : 'bg-slate-950/40 border-white/5 opacity-75'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              {/* Left: Target file info */}
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-bold text-white">
                                    {req.targetSubpath}{req.filename}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-semibold border border-white/10">
                                    {req.region}
                                  </span>
                                  {req.importance === 'essential' && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950/60 border border-rose-500/30 text-rose-300 font-semibold">
                                      {language === 'de' ? 'Pflicht' : 'Essential'}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400">{req.description}</p>
                              </div>

                              {/* Right: Match Status */}
                              <div className="shrink-0 text-right">
                                {isExact ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>{language === 'de' ? 'Verifiziert' : 'Verified'}</span>
                                  </span>
                                ) : isRenamed ? (
                                  <div className="space-y-0.5">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-500/30">
                                      <FileCheck2 className="w-3 h-3" />
                                      <span>{language === 'de' ? 'Wird umbenannt' : 'Will rename'}</span>
                                    </span>
                                    <p className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]" title={foundFile?.sourceFilename}>
                                      von: {foundFile?.sourceFilename}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-900/60 px-2 py-0.5 rounded-lg border border-white/5">
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>{language === 'de' ? 'Fehlt' : 'Missing'}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: Clean Official BIOS (Target Export Set) */}
          {activeTab === 'clean_bios' && (
            <div className="frosted-glass rounded-2xl border border-emerald-500/20 overflow-hidden shadow-xl space-y-0">
              <div className="p-4 bg-emerald-950/30 border-b border-emerald-500/20 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>{language === 'de' ? 'Bereinigte, einsatzbereite System-BIOS' : 'Clean Plug-and-Play BIOS Files'}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {language === 'de'
                      ? 'Diese Dateien werden beim Export im Zielordner erstellt – 100% kompatibel mit RetroArch, Batocera & Emulatoren, ohne Duplikate.'
                      : 'These files will be written to the target directory without duplicates.'}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold text-xs">
                  {filteredCleanBios.length} {language === 'de' ? 'Dateien' : 'Files'}
                </span>
              </div>

              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950/80 sticky top-0 z-10 border-b border-white/10 text-slate-400 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">{language === 'de' ? 'Ziel-Dateiname' : 'Target Filename'}</th>
                      <th className="py-3 px-4">{language === 'de' ? 'System & Region' : 'System & Region'}</th>
                      <th className="py-3 px-4">{language === 'de' ? 'Originale Quell-Datei' : 'Source File'}</th>
                      <th className="py-3 px-4">{language === 'de' ? 'Größe' : 'Size'}</th>
                      <th className="py-3 px-4">{language === 'de' ? 'MD5 Prüfsumme' : 'MD5 Hash'}</th>
                      <th className="py-3 px-4 text-right">{language === 'de' ? 'Status' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-slate-300">
                    {filteredCleanBios.map((file) => {
                      const isExact = file.status === 'verified_exact';

                      return (
                        <tr key={file.id} className="hover:bg-slate-900/40 transition">
                          <td className="py-2.5 px-4 font-bold text-emerald-400 truncate max-w-xs" title={file.targetPath}>
                            {file.targetPath}
                          </td>
                          <td className="py-2.5 px-4 font-sans text-slate-300 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-white/10 text-[11px]">
                              {file.requirement?.systemName} ({file.requirement?.region})
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-sans font-medium text-slate-300 truncate max-w-xs" title={file.sourceFilename}>
                            {file.sourceFilename}
                          </td>
                          <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                            {(file.size / 1024).toFixed(1)} KB
                          </td>
                          <td className="py-2.5 px-4 text-slate-400 text-[11px] truncate max-w-[120px]" title={file.md5}>
                            {file.md5 ? file.md5.substring(0, 10) + '...' : '-'}
                          </td>
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            {isExact ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-[10px] font-sans font-bold">
                                {language === 'de' ? '100% Exakt' : '100% Exact'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 text-[10px] font-sans font-bold">
                                {language === 'de' ? 'Genormt umbenannt' : 'Standard Renamed'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Removed Duplicates Table */}
          {activeTab === 'duplicates' && (
            <div className="frosted-glass rounded-2xl border border-amber-500/30 overflow-hidden shadow-xl space-y-0">
              <div className="p-4 bg-amber-950/30 border-b border-amber-500/20 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-amber-400" />
                    <span>{language === 'de' ? 'Erkannte und entfernte Duplikate' : 'Identified and Removed Duplicates'}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {language === 'de'
                      ? 'Diese Dateien existierten mehrfach in verschiedenen Unterordnern deines Quellverzeichnisses und werden beim sauberen Export übersprungen.'
                      : 'These files were duplicate copies across subdirectories and are excluded from the clean export.'}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 font-bold text-xs">
                  {filteredDuplicates.length} {language === 'de' ? 'Duplikate' : 'Duplicates'}
                </span>
              </div>

              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950/80 sticky top-0 z-10 border-b border-white/10 text-slate-400 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">{language === 'de' ? 'Quell-Pfad im Ursprungsordner' : 'Source Path in Origin'}</th>
                      <th className="py-3 px-4">{language === 'de' ? 'Größe' : 'Size'}</th>
                      <th className="py-3 px-4">{language === 'de' ? 'MD5 Prüfsumme' : 'MD5 Hash'}</th>
                      <th className="py-3 px-4">{language === 'de' ? 'Grund für Ausschluss' : 'Reason for Exclusion'}</th>
                      <th className="py-3 px-4 text-right">{language === 'de' ? 'Aktion beim Export' : 'Export Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-slate-300">
                    {filteredDuplicates.map((file) => (
                      <tr key={file.id} className="hover:bg-slate-900/40 transition">
                        <td className="py-2.5 px-4 font-sans font-medium text-slate-200 truncate max-w-sm" title={file.sourceRelativePath}>
                          <span className="text-amber-400/80 text-[11px]">{file.sourceRelativePath}</span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                          {(file.size / 1024).toFixed(1)} KB
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 text-[11px] truncate max-w-[120px]" title={file.md5}>
                          {file.md5 ? file.md5.substring(0, 10) + '...' : '-'}
                        </td>
                        <td className="py-2.5 px-4 font-sans text-slate-300">
                          <span className="text-xs text-amber-200/90 font-medium">
                            {file.duplicateReason || (language === 'de' ? 'Redundante Kopie' : 'Redundant copy')}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 text-[10px] font-sans font-bold">
                            {language === 'de' ? 'Übersprungen' : 'Skipped'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Unique Extras Table */}
          {activeTab === 'extras' && (
            <div className="frosted-glass rounded-2xl border border-cyan-500/20 overflow-hidden shadow-xl space-y-0">
              <div className="p-4 bg-cyan-950/30 border-b border-cyan-500/20 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <Archive className="w-4 h-4 text-slate-400" />
                    <span>
                      {language === 'de'
                        ? 'Verworfene Extras & Beifang (Nicht im Export)'
                        : 'Discarded Extras & Non-BIOS (Excluded)'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {language === 'de'
                      ? 'Dateien, die keinem Emulator-Standard entsprechen (Readme-Dateien, Logs, inoffizielle Dumps). Sie werden beim Export ignoriert und nicht mitkopiert.'
                      : 'Files not matching official emulator requirements (readmes, logs, unclassified dumps). Ignored and excluded from export.'}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-slate-800 border border-white/10 text-slate-300 font-bold text-xs">
                  {filteredExtras.length} {language === 'de' ? 'Dateien verworfen' : 'Files discarded'}
                </span>
              </div>

              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950/80 sticky top-0 z-10 border-b border-white/10 text-slate-400 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">{language === 'de' ? 'Original-Datei' : 'Source File'}</th>
                      <th className="py-3 px-4">{language === 'de' ? 'System / Zuordnung' : 'Inferred System'}</th>
                      <th className="py-3 px-4">{language === 'de' ? 'Größe' : 'Size'}</th>
                      <th className="py-3 px-4">{language === 'de' ? 'MD5' : 'MD5'}</th>
                      <th className="py-3 px-4 text-right">{language === 'de' ? 'Status beim Export' : 'Export Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-slate-300">
                    {filteredExtras.map((file) => (
                      <tr key={file.id} className="hover:bg-slate-900/40 transition">
                        <td className="py-2.5 px-4 font-sans font-medium text-slate-300 truncate max-w-xs" title={file.sourceFilename}>
                          {file.sourceFilename}
                        </td>
                        <td className="py-2.5 px-4 font-sans text-slate-300 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-white/10 text-[11px]">
                            {file.inferredSystem}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                          {(file.size / 1024).toFixed(1)} KB
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 text-[11px] truncate max-w-[120px]" title={file.md5}>
                          {file.md5 ? file.md5.substring(0, 10) + '...' : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-sans font-medium">
                            {language === 'de' ? 'Wird ignoriert' : 'Excluded / Ignored'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: All Scanned Files Table */}
          {activeTab === 'all_files' && (
            <div className="frosted-glass rounded-2xl border border-white/10 overflow-hidden shadow-xl">
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950/80 sticky top-0 z-10 border-b border-white/10 text-slate-400 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">{language === 'de' ? 'Original-Datei' : 'Source File'}</th>
                      <th className="py-3 px-4">{language === 'de' ? 'Größe' : 'Size'}</th>
                      <th className="py-3 px-4">{language === 'de' ? 'MD5 Prüfsumme' : 'MD5 Hash'}</th>
                      <th className="py-3 px-4">{language === 'de' ? 'System / Zuordnung' : 'Inferred System'}</th>
                      <th className="py-3 px-4">{language === 'de' ? 'Zielpfad im neuen Ordner' : 'Target Clean Path'}</th>
                      <th className="py-3 px-4 text-right">{language === 'de' ? 'Status' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-slate-300">
                    {filteredAllFiles.slice(0, 300).map((file) => {
                      const isExact = file.status === 'verified_exact';
                      const isRename = file.status === 'needs_rename' || file.status === 'size_name_match';
                      const isDup = file.status === 'duplicate';

                      return (
                        <tr key={file.id} className="hover:bg-slate-900/40 transition">
                          <td className="py-2.5 px-4 font-sans font-medium text-white truncate max-w-xs" title={file.sourceFilename}>
                            {file.sourceFilename}
                          </td>
                          <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                            {(file.size / 1024).toFixed(1)} KB
                          </td>
                          <td className="py-2.5 px-4 text-slate-400 text-[11px] truncate max-w-[120px]" title={file.md5}>
                            {file.md5 ? file.md5.substring(0, 10) + '...' : '-'}
                          </td>
                          <td className="py-2.5 px-4 font-sans text-slate-300 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-white/10 text-[11px]">
                              {file.inferredSystem}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-bold truncate max-w-xs" title={file.targetPath || file.duplicateReason}>
                            {isDup ? (
                              <span className="text-amber-400/80 text-[11px] font-sans">
                                {file.duplicateReason}
                              </span>
                            ) : (
                              <span className="text-emerald-400">{file.targetPath}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            {isExact ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-[10px] font-sans font-bold">
                                {language === 'de' ? 'Verifiziert' : 'Verified'}
                              </span>
                            ) : isRename ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 text-[10px] font-sans font-bold">
                                {language === 'de' ? 'Umbenannt' : 'Renamed'}
                              </span>
                            ) : isDup ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-950/60 border border-rose-500/40 text-rose-300 text-[10px] font-sans font-bold">
                                {language === 'de' ? 'Duplikat' : 'Duplicate'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-white/10 text-slate-400 text-[10px] font-sans font-medium">
                                {language === 'de' ? 'Extra (Ignoriert)' : 'Extra (Ignored)'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredAllFiles.length > 300 && (
                <div className="p-3 bg-slate-950/60 border-t border-white/10 text-center text-xs text-slate-400">
                  {language === 'de'
                    ? `Zeige 300 von ${filteredAllFiles.length} Dateien.`
                    : `Showing 300 of ${filteredAllFiles.length} files.`}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Script Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="frosted-glass-modal rounded-2xl w-full max-w-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-slate-900/60 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-violet-400" />
                <span>{language === 'de' ? 'Export-Skript für automatische Bereinigung' : 'Export Script for Clean BIOS'}</span>
              </h3>
              <button
                onClick={() => setShowScriptModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setScriptType('windows')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    scriptType === 'windows' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Windows (.bat)
                </button>
                <button
                  onClick={() => setScriptType('unix')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    scriptType === 'unix' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  macOS / Linux (.sh)
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 rounded-xl bg-slate-950 border border-white/10 font-mono text-xs text-slate-300 overflow-x-auto max-h-64 leading-relaxed">
                  {generateBiosScript(scannedFiles, scriptType, {
                    includeExtras: false,
                    removeDuplicates,
                    language,
                  })}
                </pre>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      generateBiosScript(scannedFiles, scriptType, {
                        includeExtras: false,
                        removeDuplicates,
                        language,
                      })
                    );
                    setCopiedScript(true);
                    setTimeout(() => setCopiedScript(false), 2000);
                  }}
                  className="absolute top-3 right-3 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-white/10 cursor-pointer"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript ? (language === 'de' ? 'Kopiert!' : 'Copied!') : (language === 'de' ? 'Kopieren' : 'Copy')}</span>
                </button>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-900/60 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={() => handleDownloadScript(scriptType)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
              >
                <Download className="w-3.5 h-3.5 text-emerald-200" />
                <span>
                  {scriptType === 'windows'
                    ? (language === 'de' ? '⚡ Organize_Official_BIOS.bat herunterladen' : '⚡ Download Organize_Official_BIOS.bat')
                    : (language === 'de' ? '⚡ organize_official_bios.sh herunterladen' : '⚡ Download organize_official_bios.sh')}
                </span>
              </button>

              <button
                onClick={() => setShowScriptModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                {language === 'de' ? 'Schließen' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
