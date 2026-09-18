import React, { useState, useMemo } from 'react';
import {
  X,
  Trash2,
  FolderArchive,
  FileText,
  FileCode,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Download,
  Filter,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import {
  SideFileItem,
  SideFileCategory,
  detectSideFiles,
  generateSideFileCleanupBat,
  generateSideFileCleanupSh,
} from '../utils/sideFileManager';
import { RomFile } from '../types';
import { deleteRomDirect, moveOrRenameRomDirect } from '../utils/fileSystem';
import { downloadScriptFile } from '../utils/multiDiscManager';

interface SideFileCleanupModalProps {
  isOpen: boolean;
  onClose: () => void;
  roms: RomFile[];
  onRomsUpdated: (updatedRoms: RomFile[]) => void;
  rootDirectoryHandle?: any;
  onSnapshotCreated?: (label: string, items: any[]) => void;
}

export const SideFileCleanupModal: React.FC<SideFileCleanupModalProps> = ({
  isOpen,
  onClose,
  roms,
  onRomsUpdated,
  rootDirectoryHandle,
  onSnapshotCreated,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<SideFileCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  // Initial detection
  const detectedSideFiles = useMemo(() => {
    return detectSideFiles(roms);
  }, [roms]);

  // Local selection state for checkboxes
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return new Set(detectedSideFiles.map((f) => f.id));
  });

  if (!isOpen) return null;

  // Filtered items
  const filteredItems = detectedSideFiles.filter((item) => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.filename.toLowerCase().includes(q) ||
        item.originalPath.toLowerCase().includes(q) ||
        item.reason.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedItems = detectedSideFiles.filter((item) => selectedIds.has(item.id));
  const totalSelectedBytes = selectedItems.reduce((sum, item) => sum + item.size, 0);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleToggleSelectAll = (select: boolean) => {
    if (select) {
      setSelectedIds(new Set(detectedSideFiles.map((f) => f.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Execution: Move to quarantine "_SideFiles_Backup"
  const handleExecuteQuarantine = async () => {
    if (selectedItems.length === 0) return;
    setIsProcessing(true);
    let successCount = 0;
    const rollbackItems: any[] = [];

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      setProgress({ current: i + 1, total: selectedItems.length });

      if (rootDirectoryHandle) {
        try {
          await moveOrRenameRomDirect(
            item.romFile,
            rootDirectoryHandle,
            '_SideFiles_Backup',
            item.filename
          );
          successCount++;
          rollbackItems.push({
            romId: item.romFile.id,
            previousPath: item.originalPath,
            previousFilename: item.filename,
            appliedPath: `_SideFiles_Backup/${item.filename}`,
            appliedFilename: item.filename,
            targetFolder: '_SideFiles_Backup',
          });
        } catch (err) {
          console.warn('Fehler beim Verschieben:', item.filename, err);
        }
      } else {
        successCount++;
      }
    }

    if (onSnapshotCreated && rollbackItems.length > 0) {
      onSnapshotCreated(`Begleitdateien sichern (${rollbackItems.length} Dateien)`, rollbackItems);
    }

    // Update in-memory roms: change path to _SideFiles_Backup
    const selectedIdSet = new Set(selectedItems.map((s) => s.romFile.id));
    const updated = roms.map((r) =>
      selectedIdSet.has(r.id)
        ? {
            ...r,
            originalPath: `_SideFiles_Backup/${r.filename}`,
            targetFolder: '_SideFiles_Backup',
          }
        : r
    );

    onRomsUpdated(updated);
    setIsProcessing(false);
    setProgress(null);
    onClose();
  };

  // Execution: Permanent Delete
  const handleExecuteDelete = async () => {
    if (selectedItems.length === 0) return;
    if (
      !window.confirm(
        `Möchtest du wirklich ${selectedItems.length} Begleit- und Cache-Dateien (${formatBytes(
          totalSelectedBytes
        )}) unwiderruflich löschen?`
      )
    ) {
      return;
    }

    setIsProcessing(true);
    let successCount = 0;

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      setProgress({ current: i + 1, total: selectedItems.length });

      if (rootDirectoryHandle && item.romFile.fileHandle) {
        try {
          await deleteRomDirect(item.romFile);
          successCount++;
        } catch (err) {
          console.warn('Fehler beim Löschen:', item.filename, err);
        }
      } else {
        successCount++;
      }
    }

    // Remove deleted from roms
    const deletedIdSet = new Set(selectedItems.map((s) => s.romFile.id));
    const updated = roms.filter((r) => !deletedIdSet.has(r.id));

    onRomsUpdated(updated);
    setIsProcessing(false);
    setProgress(null);
    onClose();
  };

  const getCategoryBadge = (cat: SideFileCategory) => {
    switch (cat) {
      case 'nfo':
        return 'bg-amber-950/60 text-amber-300 border-amber-500/30';
      case 'txt':
        return 'bg-blue-950/60 text-blue-300 border-blue-500/30';
      case 'url':
        return 'bg-rose-950/60 text-rose-300 border-rose-500/30';
      case 'checksum':
        return 'bg-purple-950/60 text-purple-300 border-purple-500/30';
      case 'orphaned_cue':
        return 'bg-orange-950/60 text-orange-300 border-orange-500/30';
      case 'system_cache':
        return 'bg-red-950/60 text-red-300 border-red-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-white/10';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="frosted-glass-modal rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col text-slate-100 shadow-2xl border border-white/15 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center font-bold shadow-md">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Begleit- & Mülldateien bereinigen (Side-files)
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {detectedSideFiles.length} gefunden
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Entferne überflüssige .nfo, .txt, .url, verwaiste .cue und Thumbnail-Caches ohne Spielverlust
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter and Category Bar */}
        <div className="px-6 py-3 border-b border-white/10 bg-slate-900/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-violet-600 text-white font-bold'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              Alle ({detectedSideFiles.length})
            </button>
            <button
              onClick={() => setSelectedCategory('nfo')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                selectedCategory === 'nfo'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              .nfo / .diz ({detectedSideFiles.filter((f) => f.category === 'nfo').length})
            </button>
            <button
              onClick={() => setSelectedCategory('txt')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                selectedCategory === 'txt'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              .txt / Readmes ({detectedSideFiles.filter((f) => f.category === 'txt').length})
            </button>
            <button
              onClick={() => setSelectedCategory('url')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                selectedCategory === 'url'
                  ? 'bg-rose-600 text-white font-bold'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              .url Links ({detectedSideFiles.filter((f) => f.category === 'url').length})
            </button>
            <button
              onClick={() => setSelectedCategory('orphaned_cue')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                selectedCategory === 'orphaned_cue'
                  ? 'bg-orange-600 text-white font-bold'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              Verwaiste .cue ({detectedSideFiles.filter((f) => f.category === 'orphaned_cue').length})
            </button>
            <button
              onClick={() => setSelectedCategory('system_cache')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                selectedCategory === 'system_cache'
                  ? 'bg-red-600 text-white font-bold'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              System-Cache ({detectedSideFiles.filter((f) => f.category === 'system_cache').length})
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <input
              type="text"
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1 bg-slate-900/60 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
            <button
              onClick={() => handleToggleSelectAll(selectedIds.size < detectedSideFiles.length)}
              className="px-2.5 py-1 rounded-lg font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
            >
              {selectedIds.size === detectedSideFiles.length ? 'Keine' : 'Alle'}
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {detectedSideFiles.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Alles blitzsauber!</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                In deiner Sammlung wurden keine überflüssigen .nfo, .url, verwaisten .cue oder Cache-Dateien gefunden.
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Keine Begleitdateien passend zu den aktuellen Filtern.
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredItems.map((item) => {
                const isChecked = selectedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleItem(item.id)}
                    className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer select-none ${
                      isChecked
                        ? 'bg-slate-800/80 border-violet-500/50'
                        : 'bg-slate-900/40 border-white/5 opacity-70 hover:opacity-90'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-violet-600 focus:ring-0 focus:outline-none cursor-pointer"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate max-w-sm sm:max-w-md">
                            {item.filename}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getCategoryBadge(
                              item.category
                            )}`}
                          >
                            {item.categoryLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="truncate">{item.originalPath}</span>
                          <span>•</span>
                          <span className="font-mono">{formatBytes(item.size)}</span>
                          <span>•</span>
                          <span className="text-slate-300 italic">{item.reason}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>{selectedItems.length}</strong> von {detectedSideFiles.length} ausgewählt (
              {formatBytes(totalSelectedBytes)})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Script Download */}
            <button
              onClick={() => {
                const bat = generateSideFileCleanupBat(selectedItems, 'quarantine');
                downloadScriptFile(bat, 'SideFiles_Sichern.bat');
              }}
              disabled={selectedItems.length === 0}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
              title="Windows .bat Skript herunterladen"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Batch (.bat)</span>
            </button>

            {/* Quarantine Option */}
            <button
              onClick={handleExecuteQuarantine}
              disabled={selectedItems.length === 0 || isProcessing}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-900/30 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>In "_SideFiles_Backup" sichern ({selectedItems.length})</span>
            </button>

            {/* Permanent Delete Option */}
            <button
              onClick={handleExecuteDelete}
              disabled={selectedItems.length === 0 || isProcessing}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-900/30 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Endgültig löschen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
