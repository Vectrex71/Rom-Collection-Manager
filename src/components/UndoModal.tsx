import React, { useState } from 'react';
import { X, RotateCcw, AlertTriangle, CheckCircle2, Terminal, Trash2, Calendar, FileText } from 'lucide-react';
import { RomFile, UndoSnapshot } from '../types';
import {
  generateRollbackBatchScript,
  generateRollbackBashScript,
  executeDirectRollback,
  removeUndoSnapshot,
} from '../utils/rollbackManager';
import { triggerFileDownload } from '../utils/exportManager';
import { useTranslation } from '../i18n';

interface UndoModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: UndoSnapshot[];
  onSnapshotsChange: (snapshots: UndoSnapshot[]) => void;
  rootDirectoryHandle: any;
  currentRoms: RomFile[];
  onRomsRestored: (updatedRoms: RomFile[]) => void;
}

export const UndoModal: React.FC<UndoModalProps> = ({
  isOpen,
  onClose,
  snapshots,
  onSnapshotsChange,
  rootDirectoryHandle,
  currentRoms,
  onRomsRestored,
}) => {
  const { t, language } = useTranslation();
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>(
    snapshots.length > 0 ? snapshots[0].id : ''
  );
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; filename: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeSnapshot = snapshots.find((s) => s.id === selectedSnapshotId) || snapshots[0];

  const handleDirectRollback = async () => {
    if (!activeSnapshot) return;
    setIsExecuting(true);
    setSuccessMessage(null);

    try {
      const { revertedCount, updatedRoms } = await executeDirectRollback(
        activeSnapshot,
        rootDirectoryHandle,
        currentRoms,
        (current, total, filename) => {
          setProgress({ current, total, filename });
        }
      );

      onRomsRestored(updatedRoms);
      setSuccessMessage(
        language === 'de'
          ? `${revertedCount} Dateien wurden erfolgreich auf ihren Ursprungszustand zurückgesetzt!`
          : `${revertedCount} files successfully restored to their original state!`
      );
      // Remove snapshot after successful restore
      removeUndoSnapshot(activeSnapshot.id);
      const remaining = snapshots.filter((s) => s.id !== activeSnapshot.id);
      onSnapshotsChange(remaining);
      if (remaining.length > 0) {
        setSelectedSnapshotId(remaining[0].id);
      }
    } catch (err: any) {
      console.error('Fehler beim Rollback:', err);
    } finally {
      setIsExecuting(false);
      setProgress(null);
    }
  };

  const handleDownloadBatch = () => {
    if (!activeSnapshot) return;
    const script = generateRollbackBatchScript(activeSnapshot);
    triggerFileDownload(script, `rollback_${activeSnapshot.id.slice(0, 8)}.bat`, 'text/plain');
  };

  const handleDownloadBash = () => {
    if (!activeSnapshot) return;
    const script = generateRollbackBashScript(activeSnapshot);
    triggerFileDownload(script, `rollback_${activeSnapshot.id.slice(0, 8)}.sh`, 'text/plain');
  };

  const handleDeleteSnapshot = (id: string) => {
    removeUndoSnapshot(id);
    const updated = snapshots.filter((s) => s.id !== id);
    onSnapshotsChange(updated);
    if (selectedSnapshotId === id && updated.length > 0) {
      setSelectedSnapshotId(updated[0].id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xl">
      <div className="frosted-glass-modal rounded-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100 shadow-2xl border border-white/15">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {language === 'de' ? 'Änderungen rückgängig machen (Undo / Rollback)' : 'Undo Changes (Rollback History)'}
              </h3>
              <p className="text-xs text-slate-300">
                {language === 'de' 
                  ? 'Stelle Originaldateinamen und ursprüngliche Ordnerpfade jederzeit 1:1 wieder her.'
                  : 'Restore original filenames and folder structures 1:1 anytime.'}
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
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {successMessage && (
            <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {progress && (
            <div className="p-3 bg-violet-950/60 border border-violet-500/30 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs text-violet-300 font-bold">
                <span>{language === 'de' ? 'Stelle Dateien wieder her...' : 'Restoring files...'}</span>
                <span>
                  {progress.current} {language === 'de' ? 'von' : 'of'} {progress.total}
                </span>
              </div>
              <div className="w-full bg-violet-950 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-violet-500 h-full transition-all duration-150"
                  style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                />
              </div>
              <div className="text-[11px] font-mono text-violet-400 truncate">{progress.filename}</div>
            </div>
          )}

          {snapshots.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <div className="text-3xl">🛡️</div>
              <div className="text-sm font-bold text-slate-200">
                {language === 'de' ? 'Noch keine Aktionen protokolliert' : 'No recorded actions yet'}
              </div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {language === 'de'
                  ? 'Sobald du ROMs umbenennst, verschiebst oder Playlists anlegst, wird hier automatisch ein Sicherungspunkt erstellt. So kannst du jeden Schritt per Klick rückgängig machen.'
                  : 'As soon as you rename, organize ROMs or generate playlists, an undo snapshot is saved here so you can revert any step with 1 click.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Snapshot selector */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  {language === 'de' 
                    ? `Verfügbare Sicherungspunkte (${snapshots.length}):` 
                    : `Available Snapshots (${snapshots.length}):`}
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {snapshots.map((snap) => {
                    const isSelected = snap.id === (activeSnapshot ? activeSnapshot.id : '');
                    return (
                      <div
                        key={snap.id}
                        onClick={() => setSelectedSnapshotId(snap.id)}
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 cursor-pointer transition ${
                          isSelected
                            ? 'bg-amber-950/30 border-amber-500/40 text-white shadow-xs'
                            : 'bg-slate-900/40 border-white/10 text-slate-300 hover:bg-slate-900/70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <RotateCcw className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                          <div className="min-w-0">
                            <div className="font-bold truncate text-white">{snap.label}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                {new Date(snap.timestamp).toLocaleTimeString(language === 'de' ? 'de-DE' : 'en-US')}
                              </span>
                              <span>•</span>
                              <span>
                                {snap.items.length} {language === 'de' ? 'betroffene Dateien' : 'affected files'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSnapshot(snap.id);
                          }}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800/80 transition"
                          title={language === 'de' ? 'Sicherungspunkt löschen' : 'Delete snapshot'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Details of active snapshot */}
              {activeSnapshot && (
                <div className="p-4 bg-slate-900/60 rounded-xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">
                      {language === 'de' 
                        ? `Dateien in diesem Snapshot (${activeSnapshot.items.length}):` 
                        : `Files in this snapshot (${activeSnapshot.items.length}):`}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">{activeSnapshot.folderName}</span>
                  </div>

                  <div className="max-h-40 overflow-y-auto divide-y divide-white/5 font-mono text-[11px]">
                    {activeSnapshot.items.slice(0, 50).map((item, idx) => (
                      <div key={idx} className="py-1 flex items-center justify-between gap-2 text-slate-300">
                        <span className="text-rose-400/90 truncate">{item.appliedFilename}</span>
                        <span className="text-slate-500 text-[10px]">
                          {language === 'de' ? 'wird zu' : 'becomes'}
                        </span>
                        <span className="text-emerald-400 font-bold truncate text-right">{item.previousFilename}</span>
                      </div>
                    ))}
                    {activeSnapshot.items.length > 50 && (
                      <div className="py-1 text-center text-slate-500 text-[10px]">
                        + {activeSnapshot.items.length - 50} {language === 'de' ? 'weitere Dateien' : 'more files'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {activeSnapshot && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadBatch}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition cursor-pointer flex items-center gap-1.5"
                  title={language === 'de' ? 'Windows Batch (.bat) Skript zum Wiederherstellen herunterladen' : 'Download Windows Batch (.bat) rollback script'}
                >
                  <Terminal className="w-3.5 h-3.5 text-amber-300" />
                  <span>Windows (.bat)</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadBash}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition cursor-pointer flex items-center gap-1.5"
                  title={language === 'de' ? 'Bash (.sh) Skript zum Wiederherstellen herunterladen' : 'Download Bash (.sh) rollback script'}
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Linux / Mac (.sh)</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition cursor-pointer"
            >
              {language === 'de' ? 'Schließen' : 'Close'}
            </button>

            {activeSnapshot && (
              <button
                id="btn-confirm-direct-rollback"
                disabled={isExecuting}
                onClick={handleDirectRollback}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-950/40 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                <span>
                  {isExecuting 
                    ? (language === 'de' ? 'Wird wiederhergestellt...' : 'Restoring...') 
                    : (language === 'de' ? 'Jetzt 1:1 rückgängig machen' : 'Restore 1:1 Now')}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

