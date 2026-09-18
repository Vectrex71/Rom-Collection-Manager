import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { RomFile } from '../types';
import { TOP_200_ROMS } from '../data/topRomsData';
import { PLATFORMS } from '../data/platformsData';

interface Top200CuratorProps {
  roms: RomFile[];
  onIsolateTop200: () => void;
}

export const Top200Curator: React.FC<Top200CuratorProps> = ({
  roms,
  onIsolateTop200,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'owned' | 'missing'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [copiedWishlist, setCopiedWishlist] = useState(false);

  // Match owned ROMs against Top 200 list
  const enrichedTopList = useMemo(() => {
    return TOP_200_ROMS.map((entry) => {
      const matchedRom = roms.find(
        (r) =>
          r.isTop200 &&
          r.top200Rank === entry.rank
      ) || roms.find((r) => {
        const lowerR = r.canonicalTitle.toLowerCase();
        const lowerT = entry.title.toLowerCase();
        return (
          (r.platform === entry.platform || r.platform === 'OTHER') &&
          (lowerR === lowerT ||
            lowerR.includes(lowerT) ||
            lowerT.includes(lowerR) ||
            entry.searchKeywords.some((kw) => lowerR.includes(kw)))
        );
      });

      return {
        ...entry,
        isOwned: Boolean(matchedRom),
        matchedRomId: matchedRom?.id,
        matchedRomFilename: matchedRom?.filename,
        matchedRomPath: matchedRom?.originalPath,
      };
    });
  }, [roms]);

  const ownedCount = enrichedTopList.filter((e) => e.isOwned).length;
  const percentage = Math.round((ownedCount / 200) * 100);

  // Platform breakdown
  const platformStats = useMemo(() => {
    const stats: Record<string, { total: number; owned: number }> = {};
    for (const item of enrichedTopList) {
      if (!stats[item.platform]) {
        stats[item.platform] = { total: 0, owned: 0 };
      }
      stats[item.platform].total++;
      if (item.isOwned) stats[item.platform].owned++;
    }
    return stats;
  }, [enrichedTopList]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return enrichedTopList.filter((item) => {
      if (filterMode === 'owned' && !item.isOwned) return false;
      if (filterMode === 'missing' && item.isOwned) return false;
      if (selectedPlatform !== 'ALL' && item.platform !== selectedPlatform) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchGenre = item.genre.toLowerCase().includes(q);
        const matchKeywords = item.searchKeywords.some((k) => k.includes(q));
        if (!matchTitle && !matchGenre && !matchKeywords) return false;
      }
      return true;
    });
  }, [enrichedTopList, filterMode, selectedPlatform, searchQuery]);

  const handleCopyMissingWishlist = () => {
    const missing = enrichedTopList
      .filter((i) => !i.isOwned)
      .map((i) => `#${i.rank} [${i.platform}] ${i.title} (${i.year}) - ${i.genre}`)
      .join('\n');

    navigator.clipboard.writeText(
      `=== Top 200 Retro ROMs - Fehlend (${200 - ownedCount} Spiele) ===\n\n${missing}`
    );
    setCopiedWishlist(true);
    setTimeout(() => setCopiedWishlist(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 text-slate-100">
      {/* Top 200 Overview & Actions */}
      <div className="p-5 rounded-2xl frosted-glass shadow-2xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-white">
              Top 200 Retro-Kuration
            </h2>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-2xl font-bold text-white">{percentage}%</span>
              <div className="w-48 bg-slate-900/60 border border-white/15 rounded-full h-2 overflow-hidden backdrop-blur-xs">
                <div
                  className="bg-linear-to-r from-violet-500 to-fuchsia-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-xs text-slate-300 font-medium">
                {ownedCount} / 200 in Sammlung
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-isolate-top200"
              onClick={onIsolateTop200}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-900/30 transition cursor-pointer"
            >
              In _Top200/ ordnen
            </button>

            <button
              id="btn-copy-wishlist"
              onClick={handleCopyMissingWishlist}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900/50 hover:bg-slate-800 text-slate-200 border border-white/15 backdrop-blur-md transition cursor-pointer"
            >
              {copiedWishlist ? 'Kopiert!' : 'Fehlende Titel kopieren'}
            </button>
          </div>
        </div>

        {/* Platform breakdown */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto scrollbar-thin text-xs">
          <span className="text-slate-300 text-[11px] font-medium mr-1 uppercase shrink-0">
            Systeme:
          </span>
          {(Object.entries(platformStats) as [string, { total: number; owned: number }][]).map(([plat, stat]) => (
            <div
              key={plat}
              className="px-2 py-0.5 rounded bg-slate-900/50 border border-white/15 text-[11px] font-medium shrink-0 text-slate-300 backdrop-blur-xs"
            >
              <span className="text-white font-bold">{plat}:</span> {stat.owned}/{stat.total}
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-2.5 rounded-xl frosted-glass-subtle shadow-xl flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-950/50 border border-white/15 w-full md:w-auto backdrop-blur-xs">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer ${
              filterMode === 'all'
                ? 'bg-violet-600 text-white font-bold shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Alle (200)
          </button>
          <button
            onClick={() => setFilterMode('owned')}
            className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer ${
              filterMode === 'owned'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'text-slate-300 hover:text-emerald-300'
            }`}
          >
            Vorhanden ({ownedCount})
          </button>
          <button
            onClick={() => setFilterMode('missing')}
            className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer ${
              filterMode === 'missing'
                ? 'bg-amber-600 text-white font-bold shadow-xs'
                : 'text-slate-300 hover:text-amber-300'
            }`}
          >
            Fehlend ({200 - ownedCount})
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="bg-slate-900/50 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-slate-200 cursor-pointer backdrop-blur-xs"
          >
            <option value="ALL" className="bg-slate-900 text-white">Alle Systeme</option>
            {PLATFORMS.map((p) => (
              <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                {p.name}
              </option>
            ))}
          </select>

          <div className="relative w-full md:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Titel filtern..."
              className="w-full bg-slate-900/40 border border-white/15 rounded-lg pl-7 pr-3 py-1 text-xs text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-violet-400 backdrop-blur-xs"
            />
          </div>
        </div>
      </div>

      {/* Top 200 Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {filteredItems.map((item) => {
          return (
            <div
              key={item.rank}
              className={`p-3 rounded-xl border transition flex items-start justify-between gap-3 shadow-lg backdrop-blur-md ${
                item.isOwned
                  ? 'bg-slate-950/40 border-emerald-500/30'
                  : 'bg-slate-950/25 border-white/10 opacity-85 hover:opacity-100'
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <span className="font-mono text-xs font-bold text-slate-400 shrink-0 w-8 pt-0.5">
                  #{item.rank}
                </span>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-white truncate">{item.title}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-white/10 text-slate-200">
                      {item.platform}
                    </span>
                    <span className="text-[10px] text-slate-400">{item.genre} • {item.year}</span>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-1">{item.description}</p>

                  {item.isOwned ? (
                    <div className="text-[11px] text-emerald-400 font-mono truncate">
                      {item.matchedRomFilename}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500">
                      Nicht in Sammlung
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0 self-center">
                {item.isOwned ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                    Vorhanden
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-white/10">
                    Fehlt
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
