import React, { useState } from 'react';
import { X, ArrowRight, Loader2, AlertCircle, Sparkles, CheckCircle2, FolderSearch, Check } from 'lucide-react';
import { RomFile } from '../types';

interface AiEnhancerModalProps {
  isOpen: boolean;
  onClose: () => void;
  roms: RomFile[];
  onApplyAiSuggestions: (updates: Array<{ id: string; cleanFilename: string; canonicalTitle: string; targetFolder: string; genres: string[] }>) => void;
}

export const AiEnhancerModal: React.FC<AiEnhancerModalProps> = ({
  isOpen,
  onClose,
  roms,
  onApplyAiSuggestions,
}) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<'unclean' | 'all'>('unclean');

  if (!isOpen) return null;

  // Filter roms that might benefit from AI (unclean names, hacks, or messy naming)
  const uncleanRoms = roms.filter(
    (r) => !r.isCleanNamed || r.isHackOrTranslation || r.canonicalTitle.includes('_') || r.isDuplicate
  );

  // Active target pool based on scope
  const activePool = scope === 'unclean' && uncleanRoms.length > 0 ? uncleanRoms : roms;
  const targetBatch = activePool.slice(0, 30);

  const handleStartAiAnalysis = async () => {
    if (targetBatch.length === 0) {
      setError(
        roms.length === 0
          ? 'Keine ROMs geladen. Bitte scanne zuerst ein ROM-Verzeichnis.'
          : 'Keine passenden ROMs für die ausgewählte Gruppe gefunden.'
      );
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const itemsToAnalyze = targetBatch.map((r) => ({
        id: r.id,
        filename: r.filename,
        rawFilename: r.filename,
        originalPath: r.originalPath,
        extension: r.extension,
        currentPlatform: r.platform,
      }));

      const res = await fetch('/api/ai/analyze-roms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roms: itemsToAnalyze }),
      });

      if (!res.ok) {
        let errorMsg = `Serverfehler (${res.status})`;
        try {
          const errData = await res.json();
          if (errData?.error) {
            errorMsg = errData.error;
          }
        } catch {
          // ignore json parse error
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();
      const rawItems = data.results || data.analyzed || [];

      const mappedResults = rawItems.map((item: any) => {
        const originalRom = roms.find((r) => r.id === item.id);
        const cleanName = item.cleanFilename || item.cleanNoIntroFilename || item.canonicalTitle || originalRom?.filename || '';
        return {
          id: item.id,
          rawFilename: item.rawFilename || originalRom?.filename || 'Unbekannt',
          cleanFilename: cleanName,
          canonicalTitle: item.canonicalTitle || originalRom?.canonicalTitle || '',
          targetFolder: item.targetFolder || originalRom?.platform || 'ROMs',
          genres: Array.isArray(item.genres) && item.genres.length > 0 ? item.genres : ['Retro'],
          platform: item.platform || originalRom?.platform || 'OTHER',
          isTop200: Boolean(item.isTop200Candidate ?? item.isTop200),
          confidence: item.confidence || 'high',
        };
      });

      setResults(mappedResults);
      // Select all by default
      setSelectedIds(new Set(mappedResults.map((r: any) => r.id)));
    } catch (err: any) {
      console.error('AI analysis failed:', err);
      setError(err.message || 'Fehler bei der KI-Analyse');
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map((r) => r.id)));
    }
  };

  const handleApply = () => {
    const itemsToApply = results.filter((r) => selectedIds.has(r.id));
    const updates = itemsToApply.map((r) => ({
      id: r.id,
      cleanFilename: r.cleanFilename,
      canonicalTitle: r.canonicalTitle,
      targetFolder: r.targetFolder,
      genres: r.genres,
    }));

    onApplyAiSuggestions(updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xl">
      <div className="frosted-glass-modal rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden text-slate-100 shadow-2xl border border-violet-500/20">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-violet-600 to-fuchsia-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                KI-Metadaten-Bereinigung
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Gemini 3.8
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Automatische Zuordnung unstrukturierter Dateinamen und Plattformen nach No-Intro Konventionen.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {results.length === 0 && !analyzing && (
            <div className="text-center py-6 max-w-xl mx-auto space-y-4">
              {roms.length === 0 ? (
                /* No ROMs in collection state */
                <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/10 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-violet-950/60 border border-violet-500/30 flex items-center justify-center mx-auto text-violet-300">
                    <FolderSearch className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Keine ROMs in der Sammlung geladen</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Bitte wähle zuerst über den Button <strong className="text-violet-300">"Ordner scannen"</strong> ein ROM-Verzeichnis oder deine SD-Karte aus. Anschließend kannst du unstrukturierte Namen per KI automatisch korrigieren lassen.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-white/15 transition cursor-pointer"
                  >
                    Fenster schließen & Ordner wählen
                  </button>
                </div>
              ) : (
                /* ROMs loaded state */
                <div className="space-y-4">
                  {/* Scope Selector */}
                  <div className="flex items-center justify-center gap-2 p-1 bg-slate-950/50 rounded-xl border border-white/10 max-w-md mx-auto">
                    <button
                      type="button"
                      onClick={() => setScope('unclean')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        scope === 'unclean'
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Unformatierte ROMs ({uncleanRoms.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setScope('all')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        scope === 'all'
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Gesamte Sammlung ({roms.length})
                    </button>
                  </div>

                  {scope === 'unclean' && uncleanRoms.length === 0 ? (
                    <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs text-left flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-white mb-0.5">Alle ROMs sind bereits sauber formatiert!</div>
                        Deine {roms.length} ROMs entsprechen bereits den gängigen No-Intro Konventionen. Du kannst oben auf <strong className="text-emerald-300">"Gesamte Sammlung"</strong> wechseln, falls du trotzdem bis zu 30 ROMs mit KI-Vorschlägen (Genres, Plattformabgleich & Top-200-Status) anreichern möchtest.
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {targetBatch.length} ROMs zur KI-Analyse bereit
                        {activePool.length > 30 && (
                          <span className="text-xs text-slate-400 font-normal ml-1">
                            (Stapel 1 von {Math.ceil(activePool.length / 30)})
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-300 mt-1">
                        Analysiert unstrukturierte Dateinamen, bestimmt Plattform und Genre und schlägt saubere No-Intro Bezeichnungen vor.
                      </p>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      id="btn-run-gemini-ai"
                      type="button"
                      disabled={targetBatch.length === 0}
                      onClick={handleStartAiAnalysis}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center gap-2 mx-auto ${
                        targetBatch.length === 0
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                          : 'bg-linear-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-violet-900/30 cursor-pointer'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>{targetBatch.length > 0 ? `${targetBatch.length} ROMs analysieren` : 'Keine ROMs bereit'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {analyzing && (
            <div className="text-center py-12 space-y-3">
              <Loader2 className="w-9 h-9 mx-auto text-violet-400 animate-spin" />
              <h4 className="text-sm font-bold text-white">Metadaten werden analysiert...</h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                Gemini gleicht Titel und Dateimuster mit No-Intro-Archiven und Genre-Datenbanken ab.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-rose-200 mb-0.5">Analyse fehlgeschlagen</div>
                <div>{error}</div>
              </div>
            </div>
          )}

          {/* Results list */}
          {results.length > 0 && !analyzing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-white/10 flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    <span>{selectedIds.size === results.length ? 'Keine abwählen' : 'Alle auswählen'}</span>
                  </button>
                  <span>{results.length} Vorschläge generiert ({selectedIds.size} ausgewählt)</span>
                </div>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Bereit zum Übernehmen
                </span>
              </div>

              <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1">
                {results.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleSelect(item.id)}
                      className={`p-3 rounded-xl border transition flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900/60 border-violet-500/40 ring-1 ring-violet-500/20'
                          : 'bg-slate-950/30 border-white/10 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(item.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 rounded accent-violet-600 cursor-pointer"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-slate-400 truncate text-[11px]">
                            {item.rawFilename}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 font-mono font-bold text-emerald-300 truncate">
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{item.cleanFilename}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span>Ordner: <span className="font-mono font-bold text-slate-200">/{item.targetFolder}/</span></span>
                            <span>•</span>
                            <span>Genre: <span className="text-slate-300">{item.genres?.join(', ') || 'Retro'}</span></span>
                            {item.isTop200 && (
                              <>
                                <span>•</span>
                                <span className="text-amber-400 font-bold">★ Top 200</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {item.platform}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-slate-950/60 flex items-center justify-between text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-medium bg-slate-900/60 text-slate-300 border border-white/15 hover:bg-slate-800 backdrop-blur-xs transition cursor-pointer"
          >
            Abbrechen
          </button>

          {results.length > 0 ? (
            <button
              id="btn-apply-ai-suggestions"
              disabled={selectedIds.size === 0}
              onClick={handleApply}
              className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-1.5 shadow-md ${
                selectedIds.size === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30 cursor-pointer'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{selectedIds.size} Vorschläge übernehmen</span>
            </button>
          ) : (
            roms.length > 0 && targetBatch.length > 0 && (
              <button
                type="button"
                disabled={analyzing}
                onClick={handleStartAiAnalysis}
                className="px-4 py-2 rounded-xl font-bold bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-900/30 transition cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Analyse starten</span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

