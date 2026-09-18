import React from 'react';
import { Gamepad2, Sparkles, RotateCcw, Download, FolderOpen, Box, Disc } from 'lucide-react';
import { RomFile } from '../types';

interface HeaderProps {
  folderName: string | null;
  roms: RomFile[];
  multiDiscCount?: number;
  undoCount?: number;
  sideFileCount?: number;
  currentView?: 'manager' | 'landing' | 'cover3d';
  onToggleView?: (view: 'manager' | 'landing' | 'cover3d') => void;
  onOpenFolderPicker: () => void;
  onOpenAiEnhancer: () => void;
  onOpenOrganizeModal: () => void;
  onOpenMultiDiscModal?: () => void;
  onOpenExportModal?: () => void;
  onOpenUndoModal?: () => void;
  onOpenSideFileModal?: () => void;
  onOpenCover3dModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  folderName,
  roms,
  multiDiscCount = 0,
  undoCount = 0,
  sideFileCount = 0,
  currentView = 'manager',
  onToggleView,
  onOpenFolderPicker,
  onOpenAiEnhancer,
  onOpenOrganizeModal,
  onOpenMultiDiscModal,
  onOpenExportModal,
  onOpenUndoModal,
  onOpenSideFileModal,
  onOpenCover3dModal,
}) => {
  const duplicateCount = roms.filter((r) => r.isDuplicate && r.recommendedAction === 'delete').length;
  const unorganizedCount = roms.filter(
    (r) => !r.originalPath.startsWith(r.targetFolder) || !r.isCleanNamed
  ).length;

  return (
    <header className="frosted-glass-header sticky top-0 z-30 text-slate-100 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Brand Lockup & Navigation */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-violet-600 via-fuchsia-600 to-amber-400 text-white flex items-center justify-center font-black text-xs shadow-lg shadow-violet-900/40 border border-white/20 shrink-0">
              <Gamepad2 className="w-4 h-4 text-white drop-shadow-xs" />
            </div>
            <div className="hidden sm:flex flex-col">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-extrabold tracking-tight text-white shrink-0">
                  ROM Collection Manager
                </h1>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  1G1R
                </span>
              </div>
            </div>
          </div>

          {/* Navigation View Switcher */}
          {onToggleView && (
            <nav className="inline-flex rounded-xl p-1 bg-slate-950/60 backdrop-blur-xl border border-white/10 text-xs shadow-inner">
              <button
                id="nav-tab-landing"
                onClick={() => onToggleView('landing')}
                className={`px-3 py-1.2 rounded-lg font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                  currentView === 'landing'
                    ? 'bg-linear-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-md shadow-violet-900/40 border border-white/15'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sparkles className={`w-3.5 h-3.5 ${currentView === 'landing' ? 'text-amber-300 animate-pulse' : 'text-slate-400'}`} />
                <span className="hidden md:inline">Was kann das Tool?</span>
                <span className="md:hidden">Info</span>
              </button>
              <button
                id="nav-tab-manager"
                onClick={() => onToggleView('manager')}
                className={`px-3 py-1.2 rounded-lg font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                  currentView === 'manager'
                    ? 'bg-linear-to-r from-violet-600 to-fuchsia-600 text-white font-bold shadow-md shadow-violet-900/40 border border-white/15'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Gamepad2 className={`w-3.5 h-3.5 ${currentView === 'manager' ? 'text-white' : 'text-slate-400'}`} />
                <span>Sammlung</span>
              </button>
              <button
                id="nav-tab-cover3d"
                onClick={() => onToggleView('cover3d')}
                className={`px-3 py-1.2 rounded-lg font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                  currentView === 'cover3d'
                    ? 'bg-linear-to-r from-fuchsia-600 to-rose-600 text-white font-bold shadow-md shadow-fuchsia-900/40 border border-white/15'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Box className={`w-3.5 h-3.5 ${currentView === 'cover3d' ? 'text-rose-200' : 'text-slate-400'}`} />
                <span>3D Covers</span>
              </button>
            </nav>
          )}

          {folderName && currentView === 'manager' && (
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-white/10 text-xs">
              <span className="text-slate-500 font-mono">📁</span>
              <span className="font-mono text-slate-300 truncate max-w-[160px]" title={folderName}>
                {folderName}
              </span>
            </div>
          )}

          {roms.length > 0 && currentView === 'manager' && (
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-200 font-bold">
                {roms.length.toLocaleString('de-DE')} ROMs
              </span>
              {duplicateCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/30 text-rose-300 font-semibold">
                  {duplicateCount} Duplikate
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Action Buttons & Synthek Brand */}
        <div className="flex items-center gap-2 shrink-0">
          {currentView === 'manager' && roms.length > 0 && (
            <>
              {onOpenUndoModal && undoCount > 0 && (
                <button
                  id="btn-open-undo-modal"
                  onClick={onOpenUndoModal}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-500/40 hover:border-amber-400/60 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                  title="Letzte Aktionen rückgängig machen"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Undo</span>
                  <span className="bg-amber-500/20 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                    {undoCount}
                  </span>
                </button>
              )}

              {onOpenExportModal && (
                <button
                  id="btn-open-export-modal"
                  onClick={onOpenExportModal}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900/60 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-white/20 backdrop-blur-md transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                  title="Sammlung als CSV oder Markdown exportieren"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              )}

              <button
                id="btn-open-ai-enhancer"
                onClick={onOpenAiEnhancer}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-200 border border-indigo-500/30 hover:border-indigo-400/50 backdrop-blur-md transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                title="KI-gestützte No-Intro Erkennung & Umbenennung"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">KI-Rename</span>
              </button>

              {onOpenSideFileModal && sideFileCount > 0 && (
                <button
                  id="btn-open-side-files-modal"
                  onClick={onOpenSideFileModal}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-950/50 hover:bg-amber-900/70 text-amber-300 border border-amber-500/30 transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                  title="Begleitdateien (.nfo, .txt, .url, Caches) bereinigen"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden md:inline">Side-Files ({sideFileCount})</span>
                  <span className="md:hidden">({sideFileCount})</span>
                </button>
              )}

              {onOpenMultiDiscModal && multiDiscCount > 0 && (
                <button
                  id="btn-open-multi-disc-modal"
                  onClick={onOpenMultiDiscModal}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-fuchsia-950/60 hover:bg-fuchsia-900/80 text-fuchsia-200 border border-fuchsia-500/30 hover:border-fuchsia-400/50 backdrop-blur-md transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                  title="Multi-Disk M3U Playlists erstellen"
                >
                  <Disc className="w-3.5 h-3.5 text-fuchsia-300" />
                  <span className="hidden sm:inline">Multi-Disk</span>
                  <span className="bg-fuchsia-500/20 px-1.5 py-0.2 rounded-full text-[10px]">
                    {multiDiscCount}
                  </span>
                </button>
              )}

              <button
                id="btn-open-organize-modal"
                onClick={onOpenOrganizeModal}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-linear-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-md shadow-violet-900/40 hover:shadow-violet-900/60 border border-white/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Ordnen</span>
                {unorganizedCount > 0 && (
                  <span className="bg-white/20 px-1.5 py-0.2 rounded-full text-[10px]">
                    {unorganizedCount}
                  </span>
                )}
              </button>
            </>
          )}

          {currentView === 'manager' && (
            <button
              id="btn-change-folder"
              onClick={onOpenFolderPicker}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900/60 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-white/20 backdrop-blur-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FolderOpen className="w-3.5 h-3.5 text-slate-300" />
              <span>{folderName ? 'Neu scannen' : 'Ordner scannen'}</span>
            </button>
          )}

          {/* Synthek Branding Badge with link */}
          <a
            id="header-synthek-logo-link"
            href="https://hj-wuethrich.cv"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/50 hover:bg-slate-800/80 border border-white/10 hover:border-violet-500/40 transition-all group cursor-pointer shadow-xs ml-1"
            title="Entwickelt von Synthek (hj-wuethrich.cv)"
          >
            <span className="text-[10px] uppercase font-semibold text-slate-400 group-hover:text-slate-300 tracking-wider hidden sm:inline">by</span>
            <img
              src="/Synthek-Logo.png"
              alt="Synthek Logo"
              className="h-4 sm:h-4.5 w-auto object-contain opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all drop-shadow-sm"
            />
          </a>
        </div>
      </div>
    </header>
  );
};
