import React from 'react';
import { DuplicateGroup, RomFile } from '../types';

interface DuplicateManagerProps {
  groups: DuplicateGroup[];
  junkFiles?: RomFile[];
  onSetKeepRom: (groupId: string, romIdToKeep: string) => void;
  onBulkMoveDuplicatesToFolder: () => void;
  onBulkDeleteDuplicates: () => void;
  onBulkDeleteJunk?: () => void;
  onDeleteSingleJunk?: (rom: RomFile) => void;
  onDownloadScript: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const DuplicateManager: React.FC<DuplicateManagerProps> = ({
  groups,
  junkFiles = [],
  onSetKeepRom,
  onBulkMoveDuplicatesToFolder,
  onBulkDeleteDuplicates,
  onBulkDeleteJunk,
  onDeleteSingleJunk,
  onDownloadScript,
}) => {
  const totalDuplicates = groups.reduce((acc, g) => acc + (g.files.length - 1), 0);
  const totalSafeToDelete = totalDuplicates + junkFiles.length;

  if (groups.length === 0 && junkFiles.length === 0) {
    return (
      <div className="text-center py-12 px-4 frosted-glass rounded-2xl m-6 text-slate-100">
        <h3 className="text-sm font-bold text-white">Keine Duplikate oder Mülldateien gefunden</h3>
        <p className="text-xs text-slate-300 mt-1">
          Alle gescannten ROMs sind eindeutig und sauber.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 text-slate-100">
      {/* Action Bar */}
      <div className="p-4 rounded-2xl frosted-glass flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-white">
            {groups.length > 0 && `${groups.length} Duplikat-Gruppen (${totalDuplicates} Kopien)`}
            {groups.length > 0 && junkFiles.length > 0 && ' & '}
            {junkFiles.length > 0 && `${junkFiles.length} Cache-/Mülldateien`}
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Überflüssige Duplikate und Cache-Dateien (.db, Thumbs, Temp) können sicher gelöscht werden.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {groups.length > 0 && (
            <button
              id="btn-bulk-move-duplicates"
              onClick={onBulkMoveDuplicatesToFolder}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-900/30 transition cursor-pointer"
            >
              In _Duplicates/ sichern
            </button>
          )}

          <button
            id="btn-bulk-delete-duplicates"
            onClick={onBulkDeleteDuplicates}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-950/70 hover:bg-rose-900/70 text-rose-300 border border-rose-500/40 shadow-xs transition cursor-pointer"
          >
            Alle löschen ({totalSafeToDelete})
          </button>

          <button
            id="btn-download-script-dups"
            onClick={onDownloadScript}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900/50 hover:bg-slate-800 text-slate-200 border border-white/15 shadow-xs backdrop-blur-md transition cursor-pointer"
          >
            PowerShell-Skript
          </button>
        </div>
      </div>

      {/* Junk / Cache Files Section */}
      {junkFiles.length > 0 && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 backdrop-blur-md overflow-hidden shadow-xl">
          <div className="px-4 py-2.5 bg-rose-950/60 border-b border-rose-500/30 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-rose-200">
                Gefundene Cache- & Mülldateien ({junkFiles.length})
              </span>
              <p className="text-[11px] text-rose-300/80">
                Diese Dateien (.db, Thumbs.db, Cache-Datenbanken) sind keine Spiele und können bedenkenlos entfernt werden.
              </p>
            </div>
            {onBulkDeleteJunk && (
              <button
                id="btn-delete-all-junk-section"
                onClick={onBulkDeleteJunk}
                className="px-2.5 py-1 rounded text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950/50 transition cursor-pointer"
              >
                Nur Mülldateien löschen ({junkFiles.length})
              </button>
            )}
          </div>

          <div className="divide-y divide-rose-500/20">
            {junkFiles.map((file) => (
              <div
                key={file.id}
                className="px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white truncate">
                      {file.filename}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/70 text-rose-300 font-bold border border-rose-500/30">
                      {file.junkReason || 'System-/Cache-Müll'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {file.originalPath} • {formatBytes(file.size)}
                  </div>
                </div>

                {onDeleteSingleJunk && (
                  <button
                    onClick={() => onDeleteSingleJunk(file)}
                    className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 transition cursor-pointer self-end sm:self-center"
                  >
                    Löschen
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duplicate Groups List */}
      <div className="space-y-3">
        {groups.map((group) => {
          return (
            <div
              key={group.id}
              className="rounded-2xl frosted-glass overflow-hidden"
            >
              {/* Group Header */}
              <div className="px-4 py-2.5 bg-slate-950/30 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-slate-900/60 border border-white/15 text-slate-200 backdrop-blur-xs">
                    {group.platform}
                  </span>
                  <span className="text-xs font-bold text-white">{group.canonicalTitle}</span>
                  <span className="text-xs text-slate-400">
                    ({group.files.length} Dateien)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {group.isExactHashMatch ? (
                    <span className="text-[10px] font-semibold text-emerald-400 font-mono">
                      Identischer Hash (Bit-Klon)
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400 font-medium">
                      Unterschiedliche Revisionen
                    </span>
                  )}
                </div>
              </div>

              {/* Group Files Comparison */}
              <div className="divide-y divide-white/10">
                {group.files.map((file) => {
                  const isKept = file.id === group.recommendedKeepId;

                  return (
                    <div
                      key={file.id}
                      className={`px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        isKept ? 'bg-emerald-950/20' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-mono font-semibold text-slate-200 truncate">
                            {file.filename}
                          </span>
                          {isKept ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                              Original
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950/60 text-rose-300 border border-rose-500/30">
                              Duplikat
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400 font-mono flex flex-wrap items-center gap-x-2">
                          <span>{file.originalPath}</span>
                          <span>•</span>
                          <span>{formatBytes(file.size)}</span>
                          <span>•</span>
                          <span>{file.hash.slice(0, 10)}...</span>
                        </div>
                      </div>

                      {/* Manual switch button */}
                      <button
                        onClick={() => onSetKeepRom(group.id, file.id)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition cursor-pointer self-end sm:self-center shrink-0 ${
                          isKept
                            ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-300 font-bold'
                            : 'border-white/15 bg-slate-900/50 text-slate-300 hover:bg-slate-800 backdrop-blur-xs'
                        }`}
                      >
                        {isKept ? 'Behalten' : 'Als Behalten wählen'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
