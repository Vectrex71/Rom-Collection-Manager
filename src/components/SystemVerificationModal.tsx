import React, { useState, useMemo } from 'react';
import { CheckCircle2, AlertTriangle, Folder, HelpCircle, ArrowRight, ShieldCheck, RefreshCw, X, Gamepad2, Globe } from 'lucide-react';
import { PlatformCode, RomFile, HandheldPresetId, RegionPreference } from '../types';
import { PLATFORMS, getPlatformMetadata } from '../data/platformsData';
import { HANDHELD_PRESETS, getTargetFolderForPlatform } from '../utils/handheldPresets';

export interface DetectedSystemGroup {
  originalPlatform: PlatformCode;
  assignedPlatform: PlatformCode;
  count: number;
  extensions: string[];
  samples: string[];
  fileIds: Set<string>;
}

interface SystemVerificationModalProps {
  isOpen: boolean;
  folderName: string;
  roms: RomFile[];
  initialPreset?: HandheldPresetId;
  initialRegionPref?: RegionPreference;
  onConfirm: (
    updatedRoms: RomFile[],
    keepInRootFolder: boolean,
    preset: HandheldPresetId,
    regionPref: RegionPreference
  ) => void;
  onCancel: () => void;
}

export const SystemVerificationModal: React.FC<SystemVerificationModalProps> = ({
  isOpen,
  folderName,
  roms,
  initialPreset = 'standard',
  initialRegionPref = 'europe_first',
  onConfirm,
  onCancel,
}) => {
  const [keepInRootFolder, setKeepInRootFolder] = useState<boolean>(true);
  const [selectedPreset, setSelectedPreset] = useState<HandheldPresetId>(initialPreset);
  const [regionPref, setRegionPref] = useState<RegionPreference>(initialRegionPref);

  // Group ROMs by their initially detected platform
  const initialGroups = useMemo(() => {
    const map = new Map<PlatformCode, { count: number; exts: Set<string>; samples: string[]; fileIds: Set<string> }>();

    for (const rom of roms) {
      const plat = rom.platform;
      const existing = map.get(plat) || { count: 0, exts: new Set<string>(), samples: [], fileIds: new Set<string>() };
      existing.count++;
      if (rom.extension) existing.exts.add(rom.extension.toLowerCase());
      if (existing.samples.length < 3) existing.samples.push(rom.filename);
      existing.fileIds.add(rom.id);
      map.set(plat, existing);
    }

    const groups: DetectedSystemGroup[] = [];
    for (const [plat, data] of map.entries()) {
      groups.push({
        originalPlatform: plat,
        assignedPlatform: plat,
        count: data.count,
        extensions: Array.from(data.exts),
        samples: data.samples,
        fileIds: data.fileIds,
      });
    }

    // Sort by count descending
    return groups.sort((a, b) => b.count - a.count);
  }, [roms]);

  // Current assigned platform per group
  const [groupAssignments, setGroupAssignments] = useState<{ [key: string]: PlatformCode }>({});

  // Global override system selector
  const [globalPlatformOverride, setGlobalPlatformOverride] = useState<PlatformCode | ''>('');

  // Handle individual group assignment change
  const handleAssignmentChange = (groupPlatformKey: PlatformCode, newPlat: PlatformCode) => {
    setGroupAssignments((prev) => ({
      ...prev,
      [groupPlatformKey]: newPlat,
    }));
  };

  // Handle global override: assign ALL files to one system
  const handleApplyGlobalOverride = (plat: PlatformCode) => {
    if (!plat) return;
    const next: { [key: string]: PlatformCode } = {};
    for (const g of initialGroups) {
      next[g.originalPlatform] = plat;
    }
    setGroupAssignments(next);
  };

  const handleConfirm = () => {
    // Map assignments back to roms
    const updatedRoms = roms.map((rom) => {
      // Find what platform was assigned to this rom's initial group
      const targetPlat = groupAssignments[rom.platform] || rom.platform;
      const platTargetFolder = getTargetFolderForPlatform(targetPlat, selectedPreset);

      return {
        ...rom,
        platform: targetPlat,
        // If keepInRootFolder is selected: targetFolder is empty, so no subfolders (e.g. Amiga/Amiga) are created!
        targetFolder: keepInRootFolder ? '' : platTargetFolder,
      };
    });

    onConfirm(updatedRoms, keepInRootFolder, selectedPreset, regionPref);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="frosted-glass-modal rounded-2xl w-full max-w-3xl overflow-hidden text-slate-100 shadow-2xl border border-white/10 my-8 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900/60 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Ordner-Inhalt & Plattform-Konfiguration
              </h2>
              <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                Ordner: <span className="font-semibold text-white">{folderName || 'Ausgewählter Ordner'}</span>
                <span className="text-slate-500">•</span>
                <span className="text-violet-300 font-medium">{roms.length} ROMs eingelesen</span>
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            title="Abbrechen & anderen Ordner wählen"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Guidance Banner */}
        <div className="px-6 py-3 bg-indigo-950/30 border-b border-indigo-500/20 flex items-start gap-3 text-xs text-indigo-200">
          <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-indigo-100">Volle Kontrolle & Transparenz:</span> Prüfe kurz die erkannten Plattformen und wähle dein bevorzugtes Handheld- oder Ordner-Schema (z. B. Batocera, OnionOS oder Standard).
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Handheld Preset Picker */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-violet-400" />
                Handheld & OS Ziel-Preset:
              </h4>
              <span className="text-[11px] font-mono text-slate-400">
                {HANDHELD_PRESETS.find((p) => p.id === selectedPreset)?.exampleFolder}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {HANDHELD_PRESETS.map((preset) => {
                const isSelected = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPreset(preset.id)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-violet-950/40 border-violet-500/50 text-white shadow-xs'
                        : 'bg-slate-800/40 border-white/5 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <span className="text-xs font-bold text-white block truncate">{preset.name}</span>
                    <span className="text-[10px] text-slate-400 block truncate mt-0.5">{preset.subtitle}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Region Preference Picker */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                1G1R Regions-Präferenz (Bevorzugte Spielversion):
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-800/40 border border-white/5 hover:border-white/20 cursor-pointer">
                <input
                  type="radio"
                  name="region_pref"
                  checked={regionPref === 'german_first'}
                  onChange={() => setRegionPref('german_first')}
                  className="text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-bold text-white block">🇩🇪 Deutsch bevorzugt</span>
                  <span className="text-[10px] text-slate-400 block">Deutschland/Deutsch vor Europa & USA</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-800/40 border border-white/5 hover:border-white/20 cursor-pointer">
                <input
                  type="radio"
                  name="region_pref"
                  checked={regionPref === 'europe_first'}
                  onChange={() => setRegionPref('europe_first')}
                  className="text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-bold text-white block">🇪🇺 Europa (Standard)</span>
                  <span className="text-[10px] text-slate-400 block">PAL / Europa vor USA & Japan</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-800/40 border border-white/5 hover:border-white/20 cursor-pointer">
                <input
                  type="radio"
                  name="region_pref"
                  checked={regionPref === 'usa_first'}
                  onChange={() => setRegionPref('usa_first')}
                  className="text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-bold text-white block">🇺🇸 USA / NTSC</span>
                  <span className="text-[10px] text-slate-400 block">60Hz USA-Versionen bevorzugt</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-800/40 border border-white/5 hover:border-white/20 cursor-pointer">
                <input
                  type="radio"
                  name="region_pref"
                  checked={regionPref === 'japan_first'}
                  onChange={() => setRegionPref('japan_first')}
                  className="text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-bold text-white block">🇯🇵 Japan / NTSC-J</span>
                  <span className="text-[10px] text-slate-400 block">Original japanische Releases</span>
                </div>
              </label>
            </div>
          </div>

          {/* Quick Action: Assign entire folder to 1 system */}
          <div className="p-3.5 rounded-xl bg-slate-900/40 border border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs">
              <span className="font-bold text-slate-200">Schnell-Zuweisung:</span>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Ist dieser gesamte Ordner eine Sammlung für ein einziges System (z. B. nur Amiga oder nur NES)?
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                id="select-global-platform-override"
                value={globalPlatformOverride}
                onChange={(e) => {
                  const val = e.target.value as PlatformCode;
                  setGlobalPlatformOverride(val);
                  if (val) handleApplyGlobalOverride(val);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 border border-white/20 text-white focus:outline-none focus:border-violet-500 cursor-pointer"
              >
                <option value="">-- Alle Dateien einem System zuweisen --</option>
                {PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.shortCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* List of Detected System Groups */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Erkannte Plattform-Gruppen ({initialGroups.length}):
            </h3>

            {initialGroups.map((group) => {
              const currentPlatId = groupAssignments[group.originalPlatform] || group.originalPlatform;
              const originalMeta = getPlatformMetadata(group.originalPlatform);
              const currentMeta = getPlatformMetadata(currentPlatId);
              const isModified = currentPlatId !== group.originalPlatform;

              return (
                <div
                  key={group.originalPlatform}
                  className={`p-4 rounded-xl border transition ${
                    isModified
                      ? 'bg-violet-950/25 border-violet-500/40 shadow-xs'
                      : 'bg-slate-900/40 border-white/10'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Left: Info */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-sm text-white">
                          {originalMeta ? originalMeta.name : group.originalPlatform}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 border border-white/10 text-slate-300">
                          {group.count} {group.count === 1 ? 'Datei' : 'Dateien'}
                        </span>
                        {group.extensions.length > 0 && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            Endungen: {group.extensions.slice(0, 4).join(', ')}
                          </span>
                        )}
                        {isModified && (
                          <span className="text-[10px] font-bold text-violet-400 bg-violet-950/60 px-1.5 py-0.5 rounded border border-violet-500/40">
                            Geändert zu: {currentMeta?.name}
                          </span>
                        )}
                      </div>

                      {/* Sample filenames */}
                      {group.samples.length > 0 && (
                        <div className="text-[11px] text-slate-400 font-mono truncate max-w-lg">
                          <span className="text-slate-500">Beispiele: </span>
                          {group.samples.slice(0, 2).join(' • ')}
                        </div>
                      )}
                    </div>

                    {/* Right: Dropdown to change */}
                    <div className="shrink-0 flex items-center gap-2">
                      <select
                        id={`select-system-group-${group.originalPlatform}`}
                        value={currentPlatId}
                        onChange={(e) => handleAssignmentChange(group.originalPlatform, e.target.value as PlatformCode)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none transition cursor-pointer border ${
                          isModified
                            ? 'bg-violet-900/40 border-violet-400 text-violet-100'
                            : 'bg-slate-800 border-white/20 text-slate-200 hover:border-white/30'
                        }`}
                      >
                        {PLATFORMS.map((plat) => (
                          <option key={plat.id} value={plat.id}>
                            {plat.name} ({plat.shortCode})
                          </option>
                        ))}
                        <option value="OTHER">Sonstige / Nicht zugeordnet (OTHER)</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Directory Organization Option (Prevents Amiga/Amiga double folder bug) */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-white/10 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Folder className="w-4 h-4 text-violet-400" />
              Ziel-Ordnerstruktur (Verhindert doppelte Unterordner)
            </h4>

            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-white/5 hover:border-violet-500/30 transition cursor-pointer">
                <input
                  type="radio"
                  name="folder_structure_mode"
                  checked={keepInRootFolder}
                  onChange={() => setKeepInRootFolder(true)}
                  className="mt-1 text-violet-600 focus:ring-violet-500 rounded cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-white block">
                    Dateien direkt in diesem Ordner belassen (Empfohlen)
                  </span>
                  <span className="text-slate-400 text-[11px] block mt-0.5">
                    Die Dateien verbleiben direkt im gewählten Ordner <span className="text-white font-mono">„{folderName}“</span>. Es werden <strong>keine doppelten Unterordner</strong> wie <span className="text-amber-300 font-mono">„{folderName}/{folderName}/“</span> erstellt.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-white/5 hover:border-violet-500/30 transition cursor-pointer">
                <input
                  type="radio"
                  name="folder_structure_mode"
                  checked={!keepInRootFolder}
                  onChange={() => setKeepInRootFolder(false)}
                  className="mt-1 text-violet-600 focus:ring-violet-500 rounded cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-white block">
                    In separate System-Unterordner sortieren
                  </span>
                  <span className="text-slate-400 text-[11px] block mt-0.5">
                    Erstellt Unterordner passend zum gewählten Preset (z. B. <span className="text-white font-mono">„{folderName}/{HANDHELD_PRESETS.find((p) => p.id === selectedPreset)?.exampleFolder}“</span>).
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-900/70 border-t border-white/10 flex items-center justify-between gap-3">
          <button
            id="btn-cancel-system-verification"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
          >
            Anderen Ordner wählen
          </button>

          <button
            id="btn-confirm-systems-and-proceed"
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-linear-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-900/30 flex items-center gap-2 transition cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>Systeme bestätigen & Sammlung öffnen ({roms.length} ROMs)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
