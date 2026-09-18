import React, { useState, useMemo } from 'react';
import { RomFile, PlatformCode } from '../types';
import { getPlatformMetadata, PLATFORMS } from '../data/platformsData';

interface RomCatalogProps {
  roms: RomFile[];
  onRenameRom: (rom: RomFile) => void;
  onMoveRom: (rom: RomFile) => void;
  onDeleteRom: (rom: RomFile) => void;
  onSelectDuplicateView: () => void;
  onChangePlatform?: (romId: string, newPlatform: PlatformCode) => void;
  onBatchChangePlatform?: (newPlatform: PlatformCode) => void;
  onBatchRename?: (targets: RomFile[]) => void;
  onBatchMove?: (targets: RomFile[]) => void;
  onBatchOrganize?: (targets: RomFile[]) => void;
  onAssignCover?: (rom: RomFile, file: File) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export const RomCatalog: React.FC<RomCatalogProps> = ({
  roms,
  onRenameRom,
  onMoveRom,
  onDeleteRom,
  onSelectDuplicateView,
  onChangePlatform,
  onBatchChangePlatform,
  onBatchRename,
  onBatchMove,
  onBatchOrganize,
  onAssignCover,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [dragOverRomId, setDragOverRomId] = useState<string | null>(null);

  // Filter out any IDs no longer present in roms
  const validSelectedCount = useMemo(() => {
    let count = 0;
    const romIdSet = new Set(roms.map((r) => r.id));
    for (const id of selectedIds) {
      if (romIdSet.has(id)) count++;
    }
    return count;
  }, [selectedIds, roms]);

  const isSelectionActive = validSelectedCount > 0;
  const isAllSelected = roms.length > 0 && validSelectedCount === roms.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(roms.map((r) => r.id)));
    }
  };

  const handleToggleSelectRom = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Target ROMs: either the user's manual selection, or all visible ROMs
  const activeRoms = useMemo(() => {
    if (isSelectionActive) {
      return roms.filter((r) => selectedIds.has(r.id));
    }
    return roms;
  }, [roms, isSelectionActive, selectedIds]);

  // Counts for batch operations - STRICT: exclude protected Arcade/MAME ROMs from batch renaming!
  const uncleanRoms = useMemo(
    () => activeRoms.filter((r) => !r.isCleanNamed && !r.isJunk && !r.isArcadeRom),
    [activeRoms]
  );
  const unmovedRoms = useMemo(
    () => activeRoms.filter((r) => !r.originalPath.startsWith(`${r.targetFolder}/`) && !r.isJunk),
    [activeRoms]
  );
  const unorganizedRoms = useMemo(
    () =>
      activeRoms.filter(
        (r) =>
          (!r.originalPath.startsWith(`${r.targetFolder}/`) || (!r.isCleanNamed && !r.isArcadeRom)) && !r.isJunk
      ),
    [activeRoms]
  );

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(roms.length / (pageSize > 0 ? pageSize : 1)));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const displayedRoms = useMemo(() => {
    if (pageSize <= 0 || pageSize >= roms.length) return roms;
    const start = (safeCurrentPage - 1) * pageSize;
    return roms.slice(start, start + pageSize);
  }, [roms, safeCurrentPage, pageSize]);

  if (roms.length === 0) {
    return (
      <div className="text-center py-12 px-4 frosted-glass rounded-2xl my-6 text-slate-100">
        <h4 className="text-sm font-bold text-white">Keine passenden ROMs gefunden</h4>
        <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
          Passe deine Suche oder System-Filter an.
        </p>
      </div>
    );
  }

  return (
    <div className="frosted-glass rounded-2xl overflow-hidden flex flex-col my-4 text-slate-100">
      {/* Batch Actions & Table Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 border-b border-white/10 bg-slate-950/30 backdrop-blur-md">
        {/* Left: Select all & Count Indicator */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={(el) => {
                if (el) {
                  el.indeterminate = isSelectionActive && !isAllSelected;
                }
              }}
              onChange={handleToggleSelectAll}
              className="rounded border-slate-700 bg-slate-800 text-violet-600 focus:ring-violet-500 w-4 h-4 cursor-pointer"
            />
            <span>
              {isSelectionActive
                ? `${validSelectedCount} von ${roms.length} ausgewählt`
                : `${roms.length} ROMs`}
            </span>
          </label>

          {isSelectionActive && (
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
            >
              Auswahl aufheben
            </button>
          )}
        </div>

        {/* Right: Batch Execution Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Batch Rename Button */}
          {uncleanRoms.length > 0 && onBatchRename && (
            <button
              id="btn-batch-rename-all"
              onClick={() => onBatchRename(uncleanRoms)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30 transition flex items-center gap-1.5 cursor-pointer"
              title={`${uncleanRoms.length} ROMs nach No-Intro Standard umbenennen`}
            >
              <span>⚡</span>
              <span>
                {isSelectionActive
                  ? `Ausgewählte umbenennen (${uncleanRoms.length})`
                  : `Alle umbenennen (${uncleanRoms.length})`}
              </span>
            </button>
          )}

          {/* Batch Move Button */}
          {unmovedRoms.length > 0 && onBatchMove && (
            <button
              id="btn-batch-move-all"
              onClick={() => onBatchMove(unmovedRoms)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900/50 hover:bg-slate-800 text-slate-200 border border-white/15 backdrop-blur-md shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              title={`${unmovedRoms.length} ROMs in System-Unterordner verschieben`}
            >
              <span>📁</span>
              <span>
                {isSelectionActive
                  ? `In Ordner verschieben (${unmovedRoms.length})`
                  : `In Ordner (${unmovedRoms.length})`}
              </span>
            </button>
          )}

          {/* Master 1-Click Organize Button */}
          {unorganizedRoms.length > 0 && onBatchOrganize && (
            <button
              id="btn-batch-organize-all"
              onClick={() => onBatchOrganize(unorganizedRoms)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-linear-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-md shadow-violet-900/30 transition flex items-center gap-1.5 cursor-pointer"
              title={`${unorganizedRoms.length} ROMs in einem Rutsch umbenennen und in Systemordner verschieben`}
            >
              <span>✨</span>
              <span>In einem Rutsch ordnen ({unorganizedRoms.length})</span>
            </button>
          )}

          {/* Batch Platform Assignment */}
          {onBatchChangePlatform && (
            <div className="flex items-center gap-1 text-xs text-slate-400 ml-1">
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    onBatchChangePlatform(e.target.value as PlatformCode);
                    e.target.value = '';
                  }
                }}
                className="bg-slate-900/60 border border-white/15 backdrop-blur-md rounded-lg px-2 py-1 text-xs text-slate-200 cursor-pointer shadow-xs"
              >
                <option value="" disabled>
                  System zuweisen...
                </option>
                {PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Top Pagination & Quick View Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 bg-slate-950/50 border-b border-white/10 text-xs text-slate-300">
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400">
            Zeige {roms.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1}–
            {Math.min(safeCurrentPage * pageSize, roms.length)} von {roms.length} ROMs
          </span>
          <span className="text-slate-600">•</span>
          <label className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span>Pro Seite:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-900 border border-white/15 rounded px-2 py-0.5 text-xs text-slate-200 cursor-pointer"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={-1}>Alle ({roms.length})</option>
            </select>
          </label>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold cursor-pointer"
            >
              ◀ Vorherige
            </button>
            <span className="font-mono text-xs font-bold text-violet-300 px-1">
              Seite {safeCurrentPage} von {totalPages}
            </span>
            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold cursor-pointer"
            >
              Nächste ▶
            </button>
          </div>
        )}
      </div>

      <div className="divide-y divide-white/10">
        {displayedRoms.map((rom) => {
          const isSelected = selectedIds.has(rom.id);
          const isDraggingOverThis = dragOverRomId === rom.id;

          return (
            <div
              key={rom.id}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes('Files')) {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverRomId(rom.id);
                }
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (dragOverRomId === rom.id) {
                  setDragOverRomId(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOverRomId(null);
                const files = e.dataTransfer.files;
                if (files && files.length > 0) {
                  const file = files[0];
                  if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp)$/i.test(file.name)) {
                    onAssignCover?.(rom, file);
                  }
                }
              }}
              className={`px-4 py-3 hover:bg-slate-800/50 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-3 relative ${
                isDraggingOverThis
                  ? 'bg-emerald-950/60 ring-2 ring-emerald-400 ring-inset'
                  : isSelected
                  ? 'bg-violet-950/30'
                  : rom.isJunk
                  ? 'bg-rose-950/30'
                  : rom.isDuplicate
                  ? 'bg-rose-950/20'
                  : ''
              }`}
            >
              {/* Drag over overlay banner */}
              {isDraggingOverThis && (
                <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex items-center justify-center gap-2 z-10 pointer-events-none text-emerald-300 font-bold text-xs border-2 border-dashed border-emerald-400 rounded-lg">
                  <span>📥 Cover hier ablegen für &quot;{rom.canonicalTitle}&quot;</span>
                  <span className="font-mono text-[11px] text-emerald-400">
                    (wird als {rom.cleanFilename.replace(/\.[^/.]+$/, '')}.png verknüpft)
                  </span>
                </div>
              )}

              {/* Left: Checkbox + System Selector & File Details */}
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggleSelectRom(rom.id)}
                  className="mt-1 rounded border-slate-700 bg-slate-800 text-violet-600 focus:ring-violet-500 w-4 h-4 cursor-pointer shrink-0"
                />

                {/* Platform select */}
                <select
                  value={rom.platform}
                  onChange={(e) => onChangePlatform?.(rom.id, e.target.value as PlatformCode)}
                  className="shrink-0 px-2 py-1 rounded-lg border border-white/15 bg-slate-900/50 backdrop-blur-xs text-xs font-bold text-slate-200 cursor-pointer"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                      {p.shortCode}
                    </option>
                  ))}
                  <option value="OTHER" className="bg-slate-900 text-white">OTHER</option>
                </select>

                {/* Title & Path */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate">
                      {rom.canonicalTitle}
                    </span>

                    {/* MAME Protection Badge */}
                    {rom.isArcadeRom && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-500/40">
                        🛡️ MAME-Schutz
                      </span>
                    )}

                    {/* Status Tags - Clean, minimal text only */}
                    {rom.isJunk && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-500/30">
                        {rom.junkReason || 'Cache-/Systemmüll'}
                      </span>
                    )}

                    {/* Translation Badge */}
                    {rom.editionType === 'translation' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-950/70 text-teal-300 border border-teal-500/40">
                        {rom.translationLanguage ? `${rom.translationLanguage}-Patch` : 'Übersetzung'}
                      </span>
                    )}

                    {/* Romhack Badge */}
                    {rom.editionType === 'romhack' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-950/70 text-violet-300 border border-violet-500/40">
                        ⚡ {rom.hackDetails || 'Romhack'}
                      </span>
                    )}

                    {/* Homebrew Badge */}
                    {rom.editionType === 'homebrew' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-500/40">
                        Homebrew
                      </span>
                    )}

                    {/* Prototype Badge */}
                    {rom.editionType === 'prototype' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-950/70 text-indigo-300 border border-indigo-500/40">
                        Proto
                      </span>
                    )}

                    {rom.isTop200 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-500/40">
                        Top 200 #{rom.top200Rank}
                      </span>
                    )}

                    {rom.discInfo && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-fuchsia-950/60 text-fuchsia-300 border border-fuchsia-500/40">
                        {rom.discInfo.discLabel}
                      </span>
                    )}

                    {rom.isDuplicate && (
                      <button
                        onClick={onSelectDuplicateView}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-500/40 hover:bg-rose-900/60 cursor-pointer"
                      >
                        {rom.isExactHashDuplicate ? 'Klon' : 'Revision'}
                      </button>
                    )}

                    {rom.isVerifiedGood && (
                      <span className="text-[10px] font-mono font-bold px-1 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/40">
                        [!]
                      </span>
                    )}
                    {rom.isBadDump && (
                      <span className="text-[10px] font-mono font-bold px-1 rounded bg-rose-950/60 text-rose-300 border border-rose-500/40">
                        [b]
                      </span>
                    )}
                  </div>

                  {/* Filename & Recommendation */}
                  <div className="text-xs text-slate-400 font-mono truncate">
                    <span>{rom.filename}</span>
                    {!rom.isJunk && !rom.isCleanNamed && !rom.isArcadeRom && (
                      <span className="text-emerald-400 ml-2 font-sans font-medium">
                        → {rom.cleanFilename}
                      </span>
                    )}
                  </div>

                  {/* Path & Technical Info */}
                  <div className="text-[11px] text-slate-500 font-mono flex flex-wrap items-center gap-x-2">
                    <span>{rom.originalPath}</span>
                    <span>•</span>
                    <span>{formatBytes(rom.size)}</span>
                    {rom.region && !rom.isJunk && (
                      <>
                        <span>•</span>
                        <span>{rom.region}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Individual Actions & Drag & Drop Tip */}
              <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                {rom.isJunk ? (
                  <button
                    onClick={() => onDeleteRom(rom)}
                    className="px-2.5 py-1 rounded text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition cursor-pointer"
                  >
                    Löschen
                  </button>
                ) : (
                  <>
                    {!rom.isArcadeRom && !rom.isCleanNamed && (
                      <button
                        onClick={() => onRenameRom(rom)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-900/50 hover:bg-slate-800 text-slate-200 border border-white/15 backdrop-blur-xs transition cursor-pointer"
                        title="Einzeln umbenennen"
                      >
                        Umbenennen
                      </button>
                    )}

                    {!rom.originalPath.startsWith(`${rom.targetFolder}/`) && (
                      <button
                        onClick={() => onMoveRom(rom)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-900/50 hover:bg-slate-800 text-slate-200 border border-white/15 backdrop-blur-xs transition cursor-pointer"
                        title="Einzeln in Systemordner verschieben"
                      >
                        /{rom.targetFolder}/
                      </button>
                    )}

                    {rom.isDuplicate && (
                      <button
                        onClick={() => onDeleteRom(rom)}
                        className="px-2.5 py-1 rounded text-xs font-semibold bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 transition cursor-pointer"
                      >
                        Löschen
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Pagination Bar if multiple pages */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 bg-slate-950/50 border-t border-white/10 text-xs text-slate-300">
          <span className="text-[11px] text-slate-400">
            Seite {safeCurrentPage} von {totalPages} ({roms.length} ROMs insgesamt)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold cursor-pointer"
            >
              ◀ Vorherige Seite
            </button>
            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => {
                setCurrentPage((p) => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold cursor-pointer"
            >
              Nächste Seite ▶
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
