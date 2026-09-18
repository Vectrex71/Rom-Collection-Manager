import React, { useState, useMemo } from 'react';
import { X, ArrowRight, Search, ShieldCheck, Gamepad2, FileCheck, Check, Sparkles, Filter } from 'lucide-react';
import { OrganizeActionItem, RomFile, MultiDiscSet, HandheldPresetId } from '../types';
import { generatePowerShellScript, generateBashScript, generateBatchScript } from '../utils/scriptGenerator';
import { HANDHELD_PRESETS } from '../utils/handheldPresets';

interface OrganizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  actions: OrganizeActionItem[];
  duplicatesToDelete: RomFile[];
  multiDiscSets?: MultiDiscSet[];
  currentPreset?: HandheldPresetId;
  onPresetChange?: (preset: HandheldPresetId) => void;
  onToggleAction: (id: string) => void;
  onToggleAllActions: (selected: boolean) => void;
  onExecuteDirectly: (selectedActions: OrganizeActionItem[]) => Promise<void>;
  hasDirectHandle: boolean;
  isExecuting: boolean;
  executionProgress: { current: number; total: number; filename: string } | null;
}

export const OrganizeModal: React.FC<OrganizeModalProps> = ({
  isOpen,
  onClose,
  actions,
  duplicatesToDelete,
  multiDiscSets = [],
  currentPreset = 'standard',
  onPresetChange,
  onToggleAction,
  onToggleAllActions,
  onExecuteDirectly,
  hasDirectHandle,
  isExecuting,
  executionProgress,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'rename_only' | 'move_only' | 'rename_and_move'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;

  if (!isOpen) return null;

  const selectedCount = actions.filter((a) => a.selected).length;

  // Filter actions by search query and type
  const filteredActions = useMemo(() => {
    return actions.filter((act) => {
      if (filterType !== 'all' && act.type !== filterType) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        act.currentPath.toLowerCase().includes(q) ||
        act.cleanFilename.toLowerCase().includes(q) ||
        act.targetFolder.toLowerCase().includes(q) ||
        act.rom.canonicalTitle.toLowerCase().includes(q)
      );
    });
  }, [actions, filterType, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredActions.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedActions = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredActions.slice(start, start + PAGE_SIZE);
  }, [filteredActions, safeCurrentPage]);

  // Check for duplicate target filenames to guarantee safety in simulation
  const collisionCount = useMemo(() => {
    const seen = new Set<string>();
    let conflicts = 0;
    for (const act of actions) {
      if (!act.selected) continue;
      const key = `${act.targetFolder}/${act.cleanFilename}`.toLowerCase();
      if (seen.has(key)) {
        conflicts++;
      } else {
        seen.add(key);
      }
    }
    return conflicts;
  }, [actions]);

  const handleDownloadBatch = () => {
    const script = generateBatchScript(actions, duplicatesToDelete, multiDiscSets, true);
    const blob = new Blob([script], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'organize_roms_windows.bat';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPowerShell = () => {
    const script = generatePowerShellScript(actions, duplicatesToDelete, multiDiscSets, true);
    const blob = new Blob([script], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'organize_roms.ps1';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadBash = () => {
    const script = generateBashScript(actions, duplicatesToDelete, multiDiscSets, true);
    const blob = new Blob([script], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'organize_roms.sh';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xl">
      <div className="frosted-glass-modal rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-100 shadow-2xl border border-white/15">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-600/20 text-violet-300 border border-violet-500/30 flex items-center justify-center font-bold">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Trockenlauf & Vorschau</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  Simulation aktiv
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Prüfe alle geplanten Umbenennungen und Zielordner vor der eigentlichen Durchführung.
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

        {/* Handheld & OS Preset Selector Toolbar */}
        {onPresetChange && (
          <div className="px-5 py-2.5 bg-slate-900/40 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Gamepad2 className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="font-semibold">Zielsystem / Handheld-Preset:</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {HANDHELD_PRESETS.map((preset) => {
                const isActive = currentPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onPresetChange(preset.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                      isActive
                        ? 'bg-violet-600 text-white font-bold shadow-xs'
                        : 'bg-slate-800/60 text-slate-300 hover:text-white hover:bg-slate-700/60'
                    }`}
                    title={preset.description}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Simulation Safety Check Banner */}
        <div className="px-5 py-2 bg-emerald-950/40 border-b border-emerald-500/20 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {collisionCount === 0
                ? 'Simulation bestanden: Keine Namenskollisionen im Zielverzeichnis.'
                : `Hinweis: ${collisionCount} gleichnamige Zieldateien erkannt (wird automatisch als _1 durchnummeriert).`}
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400/80">
            {selectedCount} von {actions.length} Aktionen ausgewählt
          </span>
        </div>

        {/* Filter and Search Bar */}
        <div className="px-5 py-2.5 bg-slate-950/30 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Quick Select & Type Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onToggleAllActions(selectedCount !== actions.length)}
              className="text-violet-400 hover:text-violet-300 font-bold cursor-pointer"
            >
              {selectedCount === actions.length ? 'Alle abwählen' : 'Alle auswählen'}
            </button>
            <span className="text-slate-600">•</span>
            <div className="inline-flex rounded-lg p-0.5 bg-slate-900/60 border border-white/10 text-[11px]">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                  filterType === 'all' ? 'bg-violet-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Alle ({actions.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('rename_only')}
                className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                  filterType === 'rename_only' ? 'bg-violet-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Nur Umbenennen
              </button>
              <button
                type="button"
                onClick={() => setFilterType('move_only')}
                className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                  filterType === 'move_only' ? 'bg-violet-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Nur Verschieben
              </button>
            </div>
          </div>

          {/* Search box in modal */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="In Vorschau suchen..."
              className="w-full bg-slate-900/60 border border-white/10 rounded-lg pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Display */}
        {isExecuting && executionProgress && (
          <div className="p-3 bg-violet-950/60 border-b border-violet-500/30">
            <div className="flex items-center justify-between text-xs text-violet-300 font-bold mb-1">
              <span>Organisiere Dateien...</span>
              <span>
                {executionProgress.current} von {executionProgress.total}
              </span>
            </div>
            <div className="w-full bg-violet-950 rounded-full h-1.5 overflow-hidden border border-violet-500/30">
              <div
                className="bg-violet-500 h-full transition-all duration-200"
                style={{
                  width: `${Math.round(
                    (executionProgress.current / Math.max(executionProgress.total, 1)) * 100
                  )}%`,
                }}
              />
            </div>
            <p className="text-[11px] font-mono text-violet-400 mt-1 truncate">
              {executionProgress.filename}
            </p>
          </div>
        )}

        {/* Pagination Bar if more than 1 page */}
        {totalPages > 1 && (
          <div className="px-5 py-2 bg-slate-900/60 border-b border-white/10 flex items-center justify-between text-xs text-slate-300">
            <span className="text-[11px] text-slate-400">
              Zeige {(safeCurrentPage - 1) * PAGE_SIZE + 1}–{Math.min(safeCurrentPage * PAGE_SIZE, filteredActions.length)} von {filteredActions.length} Aktionen
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold cursor-pointer"
              >
                ◀ Zurück
              </button>
              <span className="font-mono text-[11px] text-violet-300 px-1">
                {safeCurrentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold cursor-pointer"
              >
                Weiter ▶
              </button>
            </div>
          </div>
        )}

        {/* Plan Table */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/10">
          {pagedActions.map((act) => (
            <div
              key={act.id}
              className={`p-3 flex items-start sm:items-center gap-3 transition text-xs ${
                act.selected ? 'bg-slate-900/60 hover:bg-slate-800/60' : 'bg-slate-950/40 opacity-40'
              }`}
            >
              <input
                type="checkbox"
                checked={act.selected}
                onChange={() => onToggleAction(act.id)}
                className="mt-0.5 sm:mt-0 rounded border-slate-700 bg-slate-800 text-violet-600 focus:ring-violet-500 cursor-pointer"
              />

              <div className="min-w-0 flex-1 flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-slate-300 truncate">{act.currentPath}</div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>Aktueller Pfad</span>
                    <span>•</span>
                    <span className="text-slate-400">{(act.rom.size / (1024 * 1024)).toFixed(1)} MB</span>
                    {act.rom.isArcadeRom && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-950/70 text-amber-300 border border-amber-500/40">
                        🛡️ MAME-Schutz (Dateiname gesichert)
                      </span>
                    )}
                  </div>
                </div>

                <div className="hidden md:flex items-center px-2 text-slate-500">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="font-mono font-bold text-emerald-300 truncate">
                    {act.targetFolder ? `/${act.targetFolder}/${act.cleanFilename}` : `/${act.cleanFilename}`}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-2 mt-0.5">
                    <span>Zielpfad</span>
                    {act.type === 'rename_and_move' && (
                      <span className="text-[9px] bg-violet-500/20 text-violet-300 px-1.5 py-0.2 rounded font-normal">
                        Umbenennen + Verschieben
                      </span>
                    )}
                    {act.type === 'rename_only' && (
                      <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded font-normal">
                        Nur Umbenennen
                      </span>
                    )}
                    {act.type === 'move_only' && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-normal">
                        Nur Verschieben
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="shrink-0 self-start sm:self-center">
                {act.status === 'done' && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                    Erledigt
                  </span>
                )}
                {act.status === 'failed' && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950/60 text-rose-300 border border-rose-500/30">
                    Fehler
                  </span>
                )}
                {act.status === 'pending' && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-white/10">
                    Bereit
                  </span>
                )}
              </div>
            </div>
          ))}

          {filteredActions.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-xs">
              {searchQuery
                ? 'Keine ROMs für diesen Suchbegriff gefunden.'
                : 'Alle ROMs entsprechen bereits dem gewählten Schema.'}
            </div>
          )}
        </div>

        {/* Modal Footer & Execution Triggers */}
        <div className="px-5 py-3 border-t border-white/10 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              id="btn-download-batch"
              onClick={handleDownloadBatch}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 shadow-xs transition cursor-pointer"
              title="Windows Doppelklick-Skript: Keine PowerShell-Rechte nötig!"
            >
              ⚡ Windows Batch (.bat)
            </button>

            <button
              id="btn-download-bash"
              onClick={handleDownloadBash}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900/50 hover:bg-slate-800 text-slate-200 border border-white/15 backdrop-blur-xs transition cursor-pointer"
            >
              Bash (.sh)
            </button>

            <button
              id="btn-download-powershell"
              onClick={handleDownloadPowerShell}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900/50 hover:bg-slate-800 text-slate-200 border border-white/15 backdrop-blur-xs transition cursor-pointer"
            >
              PowerShell (.ps1)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg font-medium bg-slate-800 text-slate-200 border border-white/10 hover:bg-slate-700 transition cursor-pointer"
            >
              Abbrechen
            </button>

            <button
              id="btn-execute-organize-direct"
              disabled={isExecuting || selectedCount === 0}
              onClick={() => onExecuteDirectly(actions.filter((a) => a.selected))}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-linear-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 text-white shadow-md shadow-violet-900/30 transition cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isExecuting ? 'Wird ausgeführt...' : `Plan jetzt ausführen (${selectedCount})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
