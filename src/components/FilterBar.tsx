import React from 'react';
import { Search, X } from 'lucide-react';
import { PlatformCode, ScanFilters } from '../types';
import { PLATFORMS } from '../data/platformsData';

interface FilterBarProps {
  filters: ScanFilters;
  onFilterChange: (newFilters: ScanFilters) => void;
  counts: {
    total: number;
    duplicates: number;
    junk: number;
    top200: number;
    missingTop200: number;
    unorganized: number;
    multidisc: number;
    translationsAndHacks?: number;
  };
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  counts,
}) => {
  const setViewMode = (mode: ScanFilters['viewMode']) => {
    onFilterChange({ ...filters, viewMode: mode });
  };

  const togglePlatform = (p: PlatformCode) => {
    const isSelected = filters.selectedPlatforms.includes(p);
    let updated: PlatformCode[];
    if (isSelected) {
      updated = filters.selectedPlatforms.filter((x) => x !== p);
    } else {
      updated = [...filters.selectedPlatforms, p];
    }
    onFilterChange({ ...filters, selectedPlatforms: updated });
  };

  const clearAllPlatformFilters = () => {
    onFilterChange({
      ...filters,
      selectedPlatforms: PLATFORMS.map((p) => p.id),
      selectedGenres: [],
      searchQuery: '',
    });
  };

  return (
    <div className="frosted-glass-subtle border-b border-white/15 py-2.5 px-4 sm:px-6 lg:px-8 shadow-lg text-slate-100">
      <div className="max-w-7xl mx-auto space-y-2.5">
        {/* Top Row: View Mode Tabs & Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Segmented control tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/40 backdrop-blur-md border border-white/15 overflow-x-auto w-full md:w-auto">
            <button
              id="tab-view-all"
              onClick={() => setViewMode('all')}
              className={`px-3 py-1 rounded-lg text-xs transition cursor-pointer whitespace-nowrap ${
                filters.viewMode === 'all'
                  ? 'bg-violet-600 text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60 font-medium'
              }`}
            >
              Alle ({counts.total})
            </button>

            <button
              id="tab-view-duplicates"
              onClick={() => setViewMode('duplicates')}
              className={`px-3 py-1 rounded-lg text-xs transition cursor-pointer whitespace-nowrap ${
                filters.viewMode === 'duplicates'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : 'text-rose-300 hover:text-rose-200 hover:bg-rose-950/40 font-medium'
              }`}
            >
              Duplikate ({counts.duplicates})
            </button>

            {counts.junk > 0 && (
              <button
                id="tab-view-junk"
                onClick={() => setViewMode('junk')}
                className={`px-3 py-1 rounded-lg text-xs transition cursor-pointer whitespace-nowrap ${
                  filters.viewMode === 'junk'
                    ? 'bg-rose-600 text-white shadow-xs font-bold'
                    : 'text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 font-medium border border-rose-500/30'
                }`}
              >
                Müll & Cache ({counts.junk})
              </button>
            )}

            <button
              id="tab-view-multidisc"
              onClick={() => setViewMode('multidisc')}
              className={`px-3 py-1 rounded-lg text-xs transition cursor-pointer whitespace-nowrap ${
                filters.viewMode === 'multidisc'
                  ? 'bg-fuchsia-600 text-white shadow-xs font-bold'
                  : 'text-fuchsia-300 hover:text-fuchsia-200 hover:bg-fuchsia-950/40 font-medium'
              }`}
            >
              Multi-Disk ({counts.multidisc})
            </button>

            {counts.translationsAndHacks !== undefined && counts.translationsAndHacks > 0 && (
              <button
                id="tab-view-translations-hacks"
                onClick={() => setViewMode('translations_and_hacks')}
                className={`px-3 py-1 rounded-lg text-xs transition cursor-pointer whitespace-nowrap ${
                  filters.viewMode === 'translations_and_hacks'
                    ? 'bg-cyan-600 text-white shadow-xs font-bold'
                    : 'text-cyan-300 hover:text-cyan-200 hover:bg-cyan-950/40 font-medium'
                }`}
              >
                Hacks & Patches ({counts.translationsAndHacks})
              </button>
            )}

            <button
              id="tab-view-top200"
              onClick={() => setViewMode('top200')}
              className={`px-3 py-1 rounded-lg text-xs transition cursor-pointer whitespace-nowrap ${
                filters.viewMode === 'top200'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                  : 'text-amber-300 hover:text-amber-200 hover:bg-amber-950/40 font-medium'
              }`}
            >
              Top 200 ({counts.top200})
            </button>

            <button
              id="tab-view-missing-top200"
              onClick={() => setViewMode('missing_top200')}
              className={`px-3 py-1 rounded-lg text-xs transition cursor-pointer whitespace-nowrap ${
                filters.viewMode === 'missing_top200'
                  ? 'bg-violet-600 text-white shadow-xs font-bold'
                  : 'text-violet-300 hover:text-violet-200 hover:bg-violet-950/40 font-medium'
              }`}
            >
              Fehlende ({counts.missingTop200})
            </button>

            <button
              id="tab-view-unorganized"
              onClick={() => setViewMode('unorganized')}
              className={`px-3 py-1 rounded-lg text-xs transition cursor-pointer whitespace-nowrap ${
                filters.viewMode === 'unorganized'
                  ? 'bg-teal-600 text-white shadow-xs font-bold'
                  : 'text-teal-300 hover:text-teal-200 hover:bg-teal-950/40 font-medium'
              }`}
            >
              Unorganisiert ({counts.unorganized})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-rom-search"
              type="text"
              value={filters.searchQuery}
              onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
              placeholder="Suchen..."
              className="w-full bg-slate-900/40 border border-white/15 rounded-xl pl-8 pr-8 py-1.5 text-xs text-white placeholder-slate-400 focus:bg-slate-900/60 focus:outline-hidden focus:border-violet-400 backdrop-blur-md transition"
            />
            {filters.searchQuery && (
              <button
                onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Row: Platform Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs scrollbar-thin">
          <span className="text-slate-300 text-[11px] font-medium mr-1 uppercase shrink-0">Systeme:</span>
          {PLATFORMS.map((plat) => {
            const active = filters.selectedPlatforms.includes(plat.id);
            return (
              <button
                key={plat.id}
                onClick={() => togglePlatform(plat.id)}
                title={plat.name}
                className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap transition cursor-pointer border ${
                  active
                    ? 'bg-violet-600 text-white border-violet-400 shadow-xs'
                    : 'bg-slate-900/40 border-white/10 text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                {plat.shortCode}
              </button>
            );
          })}

          {(filters.selectedPlatforms.length < PLATFORMS.length ||
            filters.selectedGenres.length > 0 ||
            filters.searchQuery) && (
            <button
              onClick={clearAllPlatformFilters}
              className="ml-auto text-[11px] text-amber-300 hover:text-amber-200 font-medium whitespace-nowrap cursor-pointer px-2 py-0.5 rounded bg-slate-900/60 border border-white/15 backdrop-blur-xs"
            >
              Zurücksetzen
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
