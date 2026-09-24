import React, { useState } from 'react';
import { MultiDiscSet, RomFile } from '../types';
import {
  downloadSingleM3U,
  createM3UDirect,
  generateStandaloneMultiDiscBat,
  generateStandaloneMultiDiscPowerShell,
  generateStandaloneMultiDiscBash,
  downloadScriptFile,
} from '../utils/multiDiscManager';
import {
  X,
  Sparkles,
  CheckCircle2,
  FolderSync,
  Download,
  Terminal,
  FileText,
  AlertCircle,
  Layers,
  ArrowRight,
  FolderPlus,
  ExternalLink,
  Disc,
} from 'lucide-react';
import { useTranslation } from '../i18n';

interface MultiDiscModalProps {
  isOpen: boolean;
  onClose: () => void;
  multiDiscSets: MultiDiscSet[];
  rootDirectoryHandle?: any;
  onRefresh?: () => void;
  onOpenOrganizeModal?: () => void;
  onUpdateRoms?: (updatedRoms: RomFile[]) => void;
  allRoms?: RomFile[];
}

export const MultiDiscModal: React.FC<MultiDiscModalProps> = ({
  isOpen,
  onClose,
  multiDiscSets,
  rootDirectoryHandle,
  onOpenOrganizeModal,
  onUpdateRoms,
  allRoms,
}) => {
  const { t, language } = useTranslation();
  const [useSubfolders, setUseSubfolders] = useState<boolean>(true);
  const [selectedSetId, setSelectedSetId] = useState<string>(multiDiscSets[0]?.id || '');
  const [isApplyingDirect, setIsApplyingDirect] = useState<boolean>(false);
  const [directProgress, setDirectProgress] = useState<{ current: number; total: number; title: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showAdvancedScripts, setShowAdvancedScripts] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentSet = multiDiscSets.find((s) => s.id === selectedSetId) || multiDiscSets[0];
  const totalDiscsCount = multiDiscSets.reduce((sum, s) => sum + s.totalDiscs, 0);

  // 1-Click Batch Download for Windows (.bat)
  const handleDownloadBat = () => {
    const batContent = generateStandaloneMultiDiscBat(multiDiscSets, useSubfolders);
    downloadScriptFile(batContent, 'M3U_Rundum_Sorglos_Windows.bat');
    setStatusMessage({
      type: 'success',
      text: language === 'de' 
        ? 'M3U_Rundum_Sorglos_Windows.bat heruntergeladen! Lege die Datei einfach in deinen ROM-Ordner und doppelklicke sie.'
        : 'M3U_Rundum_Sorglos_Windows.bat downloaded! Place the file in your ROM folder and double-click it.',
    });
  };

  // 1-Click PowerShell Download (.ps1)
  const handleDownloadPowerShell = () => {
    const psContent = generateStandaloneMultiDiscPowerShell(multiDiscSets, useSubfolders);
    downloadScriptFile(psContent, 'M3U_Rundum_Sorglos_PowerShell.ps1');
    setStatusMessage({
      type: 'success',
      text: language === 'de'
        ? 'M3U_Rundum_Sorglos_PowerShell.ps1 heruntergeladen! Führe die Datei im ROM-Ordner per Rechtsklick mit PowerShell aus.'
        : 'M3U_Rundum_Sorglos_PowerShell.ps1 downloaded! Right-click and run with PowerShell in your ROM folder.',
    });
  };

  // 1-Click Bash Download (.sh)
  const handleDownloadBash = () => {
    const bashContent = generateStandaloneMultiDiscBash(multiDiscSets, useSubfolders);
    downloadScriptFile(bashContent, 'M3U_Rundum_Sorglos_Linux.sh');
    setStatusMessage({
      type: 'success',
      text: language === 'de'
        ? 'M3U_Rundum_Sorglos_Linux.sh heruntergeladen! Im Terminal mit "bash M3U_Rundum_Sorglos_Linux.sh" ausführen.'
        : 'M3U_Rundum_Sorglos_Linux.sh downloaded! Execute in terminal with "bash M3U_Rundum_Sorglos_Linux.sh".',
    });
  };

  const handleDownloadSingle = (set: MultiDiscSet) => {
    downloadSingleM3U(set, useSubfolders);
  };

  const handleCopyPlaylist = (set: MultiDiscSet) => {
    const text = useSubfolders ? set.m3uSubfolderContent : set.m3uContent;
    navigator.clipboard.writeText(text);
    setCopiedId(set.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Direct Execution in Browser (when rootDirectoryHandle is active)
  const handleExecuteDirectAll = async () => {
    if (!rootDirectoryHandle) {
      setStatusMessage({
        type: 'error',
        text: language === 'de' 
          ? 'Kein Verzeichnis-Schreibzugriff aktiv. Nutze bitte das 1-Klick Windows-Skript (.bat) unten.'
          : 'No folder write access active. Please use the 1-click Windows script (.bat) below.',
      });
      return;
    }

    setShowConfirmModal(false);
    setIsApplyingDirect(true);
    setStatusMessage(null);

    const allUpdatedDiscs: RomFile[] = [];

    try {
      for (let i = 0; i < multiDiscSets.length; i++) {
        const set = multiDiscSets[i];
        setDirectProgress({
          current: i + 1,
          total: multiDiscSets.length,
          title: set.gameTitle,
        });

        const res = await createM3UDirect(set, rootDirectoryHandle, useSubfolders);
        if (res && res.updatedDiscs) {
          allUpdatedDiscs.push(...res.updatedDiscs);
        }
      }

      // Update parent ROM list state if provided
      if (onUpdateRoms && allRoms && allUpdatedDiscs.length > 0) {
        const discMap = new Map(allUpdatedDiscs.map((d) => [d.id, d]));
        const newRoms = allRoms.map((rom) => discMap.get(rom.id) || rom);
        onUpdateRoms(newRoms);
      }

      setStatusMessage({
        type: 'success',
        text: language === 'de'
          ? `Vollautomatisch erledigt! Alle ${multiDiscSets.length} Spiele (${totalDiscsCount} Disks) wurden in Unterordner sortiert und alle .m3u Playlists geschrieben.`
          : `Completed automatically! All ${multiDiscSets.length} games (${totalDiscsCount} discs) sorted into subfolders and all .m3u playlists generated.`,
      });
    } catch (err: any) {
      console.error('Fehler beim direkten Ausführen:', err);
      setStatusMessage({
        type: 'error',
        text: `${language === 'de' ? 'Fehler beim Ausführen' : 'Execution error'}: ${err?.message || err}`,
      });
    } finally {
      setIsApplyingDirect(false);
      setDirectProgress(null);
    }
  };

  return (
    <div
      id="multi-disc-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xl"
    >
      <div
        id="multi-disc-modal-card"
        className="frosted-glass-modal rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-fuchsia-950/80 text-fuchsia-400 border border-fuchsia-500/40">
                <Disc className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-white tracking-tight">
                {t('multidiscModal.title')}
              </h2>
              <span className="text-xs font-semibold text-slate-400">
                {language === 'de' 
                  ? `(${multiDiscSets.length} Spiele, ${totalDiscsCount} Disks)` 
                  : `(${multiDiscSets.length} Games, ${totalDiscsCount} Discs)`}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              {t('multidiscModal.subtitle')}
            </p>
          </div>
          <button
            id="close-multi-disc-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Solution Card */}
        <div className="p-5 border-b border-white/10 bg-linear-to-b from-slate-900/40 via-slate-900/30 to-slate-950/40">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={useSubfolders}
                    onChange={(e) => setUseSubfolders(e.target.checked)}
                    className="rounded text-violet-600 focus:ring-violet-500 border-slate-700 bg-slate-800 cursor-pointer"
                  />
                  <span>{t('multidiscModal.optionSubfolder')}</span>
                </label>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {rootDirectoryHandle
                  ? (language === 'de' 
                      ? 'Klicke auf den Button, um alle Disketten vollautomatisch in Unterordner zu sortieren und passende .m3u Playlists zu schreiben.'
                      : 'Click the button to automatically sort all discs into subfolders and generate compatible .m3u playlists.')
                  : (language === 'de'
                      ? 'Öffne die App im eigenen Tab für direkten Festplatten-Zugriff oder lade die fertige 1-Klick Datei herunter.'
                      : 'Open the app in a new tab for direct disk access, or download the 1-click script.')}
              </p>
            </div>

            {/* Direct execution button if root handle available */}
            {rootDirectoryHandle ? (
              <button
                id="apply-all-m3u-direct-hero-btn"
                onClick={() => setShowConfirmModal(true)}
                disabled={isApplyingDirect}
                className="w-full md:w-auto px-5 py-3 font-bold text-xs sm:text-sm text-white bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] rounded-xl shadow-lg shadow-emerald-900/40 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <FolderSync className="w-4 h-4" />
                <span>
                  {isApplyingDirect 
                    ? (language === 'de' ? 'Wird ausgeführt...' : 'Executing...') 
                    : (language === 'de' ? '⚡ Jetzt vollautomatisch im Ordner anwenden' : '⚡ Apply automatically to folder')}
                </span>
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="px-4 py-2.5 font-bold text-xs text-white bg-linear-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-xl shadow-md shadow-violet-900/30 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{language === 'de' ? '🚀 In eigenem Tab öffnen (Vollautomatisch)' : '🚀 Open in New Tab (Direct Access)'}</span>
                </button>

                <button
                  id="download-bat-btn"
                  onClick={handleDownloadBat}
                  className="px-4 py-2.5 font-bold text-xs text-slate-100 bg-slate-800 border border-white/10 hover:border-violet-500/40 hover:bg-slate-750 rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  title={language === 'de' ? 'Windows Doppelklick-Datei' : 'Windows double-click script'}
                >
                  <Terminal className="w-4 h-4 text-amber-400" />
                  <span>{t('multidiscModal.btnDownloadBat')}</span>
                </button>
              </div>
            )}
          </div>

          {/* Collapsible Advanced Scripts */}
          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setShowAdvancedScripts(!showAdvancedScripts)}
              className="text-slate-400 hover:text-slate-200 font-medium underline decoration-slate-600 cursor-pointer"
            >
              {showAdvancedScripts 
                ? (language === 'de' ? '▲ Manuelle Skripte verbergen' : '▲ Hide manual scripts') 
                : (language === 'de' ? '▼ Manuelle Skripte anzeigen (PowerShell / Linux Bash)' : '▼ Show manual scripts (PowerShell / Linux Bash)')}
            </button>
          </div>

          {showAdvancedScripts && (
            <div className="mt-2.5 p-3 rounded-xl bg-slate-950/60 border border-white/10 flex flex-wrap items-center gap-2 text-xs animate-in fade-in duration-150">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-slate-400" />
                {language === 'de' ? 'Manuelle Skripte:' : 'Manual Scripts:'}
              </span>

              <button
                id="download-ps-btn"
                onClick={handleDownloadPowerShell}
                className="px-3 py-1.5 font-medium text-slate-200 bg-slate-800 border border-white/10 hover:border-white/20 hover:bg-slate-700 rounded-lg shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-violet-400" />
                PowerShell (.ps1)
              </button>

              <button
                id="download-bash-btn"
                onClick={handleDownloadBash}
                className="px-3 py-1.5 font-medium text-slate-200 bg-slate-800 border border-white/10 hover:border-white/20 hover:bg-slate-700 rounded-lg shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                Mac / Linux (.sh)
              </button>
            </div>
          )}
        </div>

        {/* Direct Progress bar when running */}
        {isApplyingDirect && directProgress && (
          <div className="px-6 py-3 bg-emerald-950/60 border-b border-emerald-500/30 text-xs text-emerald-300">
            <div className="flex items-center justify-between font-bold mb-1">
              <span>
                {language === 'de' 
                  ? `Organisiere Spiel ${directProgress.current} von ${directProgress.total}: ${directProgress.title}`
                  : `Organizing game ${directProgress.current} of ${directProgress.total}: ${directProgress.title}`}
              </span>
              <span>{Math.round((directProgress.current / directProgress.total) * 100)}%</span>
            </div>
            <div className="w-full bg-emerald-950 h-2 rounded-full overflow-hidden border border-emerald-500/30">
              <div
                className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${(directProgress.current / directProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`px-6 py-2.5 text-xs flex items-center justify-between border-b ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                : statusMessage.type === 'info'
                ? 'bg-violet-950/60 text-violet-300 border-violet-500/30'
                : 'bg-rose-950/60 text-rose-300 border-rose-500/30'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-200 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Split List & Details */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[320px]">
          {/* Left Column: List of Multi-Disc Games */}
          <div className="border-r border-white/10 overflow-y-auto max-h-[48vh] p-3 space-y-1.5 bg-slate-950/60">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 py-0.5">
              {language === 'de' ? `Erkannte Multi-Disk Spiele (${multiDiscSets.length})` : `Detected Multi-Disc Games (${multiDiscSets.length})`}
            </div>

            {multiDiscSets.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                {language === 'de' ? 'Keine Multi-Disk Spiele in dieser Sammlung gefunden.' : 'No multi-disc games found in this collection.'}
              </div>
            ) : (
              multiDiscSets.map((set) => {
                const isSelected = set.id === currentSet?.id;

                return (
                  <button
                    key={set.id}
                    onClick={() => setSelectedSetId(set.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition text-xs cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/90 border-violet-500/80 shadow-md text-white font-bold ring-2 ring-violet-500/25'
                        : 'bg-slate-900/60 border-white/5 text-slate-300 hover:bg-slate-800/60 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate">{set.gameTitle}</span>
                      <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-md bg-fuchsia-950/60 text-fuchsia-300 border border-fuchsia-500/30">
                        {set.totalDiscs} Disks
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-normal mt-0.5 truncate font-mono">
                      {set.targetFolder}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right Column: Details & Preview */}
          <div className="md:col-span-2 p-5 overflow-y-auto max-h-[48vh] flex flex-col bg-slate-900/40">
            {currentSet ? (
              <div className="space-y-4 text-xs">
                {/* Header */}
                <div className="flex items-start justify-between pb-3 border-b border-white/10">
                  <div>
                    <h3 className="text-sm font-bold text-white">{currentSet.gameTitle}</h3>
                    <p className="text-slate-400 mt-0.5">
                      {language === 'de' ? 'Zielordner:' : 'Target folder:'}{' '}
                      <span className="font-mono text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded border border-white/10">
                        {currentSet.targetFolder}/{useSubfolders ? `${currentSet.gameTitle}/` : ''}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      id="copy-m3u-btn"
                      onClick={() => handleCopyPlaylist(currentSet)}
                      className="px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 border border-white/10 rounded-md hover:bg-slate-700 transition cursor-pointer"
                    >
                      {copiedId === currentSet.id ? (language === 'de' ? 'Kopiert!' : 'Copied!') : (language === 'de' ? 'Playlist kopieren' : 'Copy Playlist')}
                    </button>
                    <button
                      id="download-single-m3u-btn"
                      onClick={() => handleDownloadSingle(currentSet)}
                      title={language === 'de' ? 'Speichert nur diese eine .m3u Datei' : 'Downloads this single .m3u file'}
                      className="px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 border border-white/10 rounded-md hover:bg-slate-700 transition cursor-pointer"
                    >
                      .m3u {language === 'de' ? 'Datei' : 'File'}
                    </button>
                  </div>
                </div>

                {/* Discs list */}
                <div>
                  <div className="font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>{t('multidiscModal.discsInSet')} ({currentSet.discs.length}):</span>
                    <span className="text-[11px] text-slate-400">
                      {language === 'de' ? 'Werden in Unterordner verschoben' : 'Will be moved to subfolder'}
                    </span>
                  </div>
                  <div className="space-y-1 font-mono">
                    {currentSet.discs.map((disc, idx) => (
                      <div
                        key={disc.id}
                        className="flex items-center justify-between p-2 bg-slate-800/60 rounded-lg border border-white/10 text-[11px]"
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <span className="text-amber-400 font-bold shrink-0">{idx + 1}.</span>
                          <span className="text-slate-200 font-medium truncate">
                            {disc.cleanFilename || disc.filename}
                          </span>
                        </div>
                        <span className="text-slate-400 shrink-0 text-[10px]">
                          {(disc.size / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Playlist file preview */}
                <div>
                  <div className="font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>{language === 'de' ? `Generierte Playlist-Datei (${currentSet.m3uFilename}):` : `Generated playlist file (${currentSet.m3uFilename}):`}</span>
                    <span className="text-[11px] text-slate-400">
                      {language === 'de' ? 'Liegt im Plattform-Hauptordner' : 'Located in platform root folder'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto border border-white/10 shadow-inner">
                    <pre className="whitespace-pre">
                      {useSubfolders ? currentSet.m3uSubfolderContent : currentSet.m3uContent}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                {language === 'de' ? 'Wähle ein Spiel aus der linken Liste aus.' : 'Select a game from the list on the left.'}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-400 text-[11px] max-w-lg leading-relaxed">
            <strong className="text-slate-200">
              {language === 'de' ? 'Wie RetroArch & Batocera funktionieren:' : 'How RetroArch & Batocera work:'}
            </strong>{' '}
            {language === 'de'
              ? 'Die Disketten kommen in den Unterordner, die .m3u liegt davor. So erscheint genau 1 Eintrag im Spiele-Menü und das Disc-Wechseln funktioniert nahtlos.'
              : 'Discs are placed in the subfolder, with the .m3u playlist in front. This results in exactly 1 entry in the games menu and seamless disc swapping.'}
          </div>

          <div className="flex items-center gap-2">
            {onOpenOrganizeModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenOrganizeModal();
                }}
                className="px-3.5 py-1.5 font-semibold text-slate-200 bg-slate-800 border border-white/10 hover:bg-slate-700 rounded-lg transition cursor-pointer"
              >
                {language === 'de' ? 'Komplett-Sammlung organisieren' : 'Organize Full Collection'}
              </button>
            )}
            <button
              id="modal-close-bottom-btn"
              onClick={onClose}
              className="px-4 py-1.5 font-bold text-white bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-lg transition cursor-pointer"
            >
              {language === 'de' ? 'Schließen' : 'Close'}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Direct Execution */}
      {showConfirmModal && (
        <div
          id="m3u-confirm-modal-overlay"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xl"
        >
          <div
            id="m3u-confirm-modal-card"
            className="frosted-glass-modal rounded-2xl w-full max-w-md p-6 space-y-4 text-slate-100"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                <FolderPlus className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {language === 'de' ? 'Multi-Disk Spiele vollautomatisch ordnen?' : 'Organize multi-disc games automatically?'}
                </h3>
                <p className="text-xs text-slate-300">
                  {language === 'de' 
                    ? `${multiDiscSets.length} Spiele mit insgesamt ${totalDiscsCount} Disketten` 
                    : `${multiDiscSets.length} games with ${totalDiscsCount} total discs`}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/40 rounded-xl border border-white/10 text-xs space-y-2 text-slate-300">
              <p className="font-semibold text-white">
                {language === 'de' ? 'Was jetzt direkt auf deiner Festplatte passiert:' : 'What will happen directly on your storage:'}
              </p>
              <ul className="space-y-1.5 list-disc pl-4 text-slate-300">
                <li>
                  {language === 'de'
                    ? <>Für jedes Spiel wird automatisch ein eigener Unterordner angelegt (z. B. <code className="text-slate-100 bg-slate-900/60 px-1 py-0.5 rounded">Commodore Amiga/Secret of Monkey Island/</code>).</>
                    : <>A dedicated subfolder is created for each game (e.g. <code className="text-slate-100 bg-slate-900/60 px-1 py-0.5 rounded">Commodore Amiga/Secret of Monkey Island/</code>).</>}
                </li>
                <li>
                  {language === 'de'
                    ? 'Alle zugehörigen Disketten (Disk 1, Disk 2...) werden dorthin verschoben.'
                    : 'All associated discs (Disk 1, Disk 2...) are moved inside.'}
                </li>
                <li>
                  {language === 'de'
                    ? <>Die fertige <code className="text-slate-100 bg-slate-900/60 px-1 py-0.5 rounded">.m3u</code> Playlist wird im Systemordner angelegt.</>
                    : <>The ready-to-use <code className="text-slate-100 bg-slate-900/60 px-1 py-0.5 rounded">.m3u</code> playlist is generated in the system directory.</>}
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-900/50 border border-white/15 hover:bg-slate-800 rounded-xl backdrop-blur-xs transition cursor-pointer"
              >
                {t('confirm.cancel')}
              </button>
              <button
                type="button"
                onClick={handleExecuteDirectAll}
                className="px-4 py-2 text-xs font-bold text-white bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-fuchsia-500 rounded-xl transition cursor-pointer shadow-md shadow-emerald-900/30"
              >
                {language === 'de' ? 'Ja, jetzt vollautomatisch ordnen' : 'Yes, organize automatically now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

