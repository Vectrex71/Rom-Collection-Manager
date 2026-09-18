/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { FolderPickerCard } from './components/FolderPickerCard';
import { FilterBar } from './components/FilterBar';
import { RomCatalog } from './components/RomCatalog';
import { DuplicateManager } from './components/DuplicateManager';
import { Top200Curator } from './components/Top200Curator';
import { OrganizeModal } from './components/OrganizeModal';
import { AiEnhancerModal } from './components/AiEnhancerModal';
import { MultiDiscModal } from './components/MultiDiscModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { SystemVerificationModal } from './components/SystemVerificationModal';
import { LandingPage } from './components/LandingPage';
import { BackgroundMedia } from './components/BackgroundMedia';
import { CollectionExportModal } from './components/CollectionExportModal';
import { UndoModal } from './components/UndoModal';
import { SideFileCleanupModal } from './components/SideFileCleanupModal';
import { Cover3dStudioView } from './components/Cover3dStudioView';
import {
  RomFile,
  ScanFilters,
  DuplicateGroup,
  OrganizeActionItem,
  PlatformCode,
  HandheldPresetId,
  RegionPreference,
  UndoSnapshot,
  RollbackActionItem,
} from './types';
import {
  scanDirectoryHandle,
  scanFileList,
  extractDuplicateGroups,
  analyzeDuplicateGroups,
  deleteRomDirect,
  moveOrRenameRomDirect,
  renameRomInPlaceDirect,
  ScanProgress,
} from './utils/fileSystem';
import { PLATFORMS, getPlatformMetadata } from './data/platformsData';
import { TOP_200_ROMS } from './data/topRomsData';
import { generatePowerShellScript } from './utils/scriptGenerator';
import {
  detectMultiDiscSets,
  createM3UDirect,
  generateStandaloneMultiDiscBat,
  downloadScriptFile,
} from './utils/multiDiscManager';
import { getStoredUndoSnapshots, saveUndoSnapshot } from './utils/rollbackManager';
import { applyHandheldPresetToRoms, HANDHELD_PRESETS } from './utils/handheldPresets';
import { detectSideFiles } from './utils/sideFileManager';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  Layers,
  Zap,
  ExternalLink,
  Disc,
} from 'lucide-react';

export default function App() {
  const [roms, setRoms] = useState<RomFile[]>([]);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [directoryHandle, setDirectoryHandle] = useState<any | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);

  // In-app notifications
  const [toast, setToast] = useState<{
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
  } | null>(null);

  const showToast = (
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Active filters
  const [currentView, setCurrentView] = useState<'manager' | 'landing' | 'cover3d'>('landing');
  const [filters, setFilters] = useState<ScanFilters>({
    selectedPlatforms: PLATFORMS.map((p) => p.id),
    selectedGenres: [],
    searchQuery: '',
    viewMode: 'all',
    minSizeBytes: 0,
    hideBadDumps: false,
  });

  // Modals state
  const [isOrganizeModalOpen, setIsOrganizeModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isMultiDiscModalOpen, setIsMultiDiscModalOpen] = useState(false);
  const [isAutoFixingMultiDisc, setIsAutoFixingMultiDisc] = useState(false);
  const [autoFixProgress, setAutoFixProgress] = useState<{
    current: number;
    total: number;
    title: string;
  } | null>(null);
  const [showAutoFixSuccessModal, setShowAutoFixSuccessModal] = useState(false);
  const [showIframeAccessModal, setShowIframeAccessModal] = useState(false);
  const [organizeActions, setOrganizeActions] = useState<OrganizeActionItem[]>([]);
  const [isExecutingOrganize, setIsExecutingOrganize] = useState(false);
  const [executionProgress, setExecutionProgress] = useState<{
    current: number;
    total: number;
    filename: string;
  } | null>(null);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    filename: string;
    actionTitle: string;
  } | null>(null);

  // Handheld OS Preset, 1G1R Region Preference, Undo & Side-Files
  const [currentPreset, setCurrentPreset] = useState<HandheldPresetId>('standard');
  const [regionPref, setRegionPref] = useState<RegionPreference>('europe_first');
  const [studioInitialCoverFile, setStudioInitialCoverFile] = useState<{ file: File; rom?: RomFile } | null>(null);
  const [undoSnapshots, setUndoSnapshots] = useState<UndoSnapshot[]>(() => getStoredUndoSnapshots());
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isUndoModalOpen, setIsUndoModalOpen] = useState(false);
  const [isSideFileModalOpen, setIsSideFileModalOpen] = useState(false);

  // Global app activity state: video plays when working (scanning, organizing, renaming, etc.), returns to frame 0 when idle
  const isAppWorking = Boolean(
    isScanning ||
    isExecutingOrganize ||
    isAutoFixingMultiDisc ||
    batchProgress !== null ||
    executionProgress !== null ||
    autoFixProgress !== null
  );

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    confirmVariant?: 'danger' | 'primary';
    action: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {},
  });

  // System Verification Modal state (Transparent folder inspection before importing)
  const [pendingVerificationRoms, setPendingVerificationRoms] = useState<RomFile[]>([]);
  const [pendingFolderName, setPendingFolderName] = useState<string>('');
  const [isSystemVerificationModalOpen, setIsSystemVerificationModalOpen] = useState(false);

  // Extract duplicate groups whenever roms or region preference change
  const duplicateGroups = useMemo(() => {
    return extractDuplicateGroups(roms, regionPref);
  }, [roms, regionPref]);

  // Detect multi-disc games (discs, disks, CDs, parts)
  const multiDiscSets = useMemo(() => {
    return detectMultiDiscSets(roms);
  }, [roms]);

  // Detect side-files (.nfo, .txt, .url, orphaned .cue, caches)
  const sideFiles = useMemo(() => {
    return detectSideFiles(roms);
  }, [roms]);

  // Counts for the filter bar
  const counts = useMemo(() => {
    const total = roms.length;
    const duplicates = duplicateGroups.reduce(
      (acc, g) => acc + (g.files.length - 1),
      0
    );
    const junk = roms.filter((r) => r.isJunk).length;
    const top200 = roms.filter((r) => r.isTop200).length;
    const missingTop200 = 200 - top200;
    const unorganized = roms.filter(
      (r) => !r.isJunk && (!r.originalPath.startsWith(`${r.targetFolder}/`) || !r.isCleanNamed)
    ).length;
    const multidisc = multiDiscSets.length;
    const sidefileCount = sideFiles.length;
    const translationsAndHacks = roms.filter(
      (r) =>
        !r.isJunk &&
        (r.editionType === 'translation' ||
          r.editionType === 'romhack' ||
          r.editionType === 'homebrew' ||
          r.editionType === 'prototype' ||
          r.isHackOrTranslation)
    ).length;

    return {
      total,
      duplicates,
      junk,
      top200,
      missingTop200,
      unorganized,
      multidisc,
      sidefileCount,
      translationsAndHacks,
    };
  }, [roms, duplicateGroups, multiDiscSets, sideFiles]);

  // Filtered ROMs according to current filters
  const filteredRoms = useMemo(() => {
    return roms.filter((rom) => {
      // Platform filter
      if (
        filters.selectedPlatforms.length > 0 &&
        !filters.selectedPlatforms.includes(rom.platform)
      ) {
        return false;
      }

      // Genre filter
      if (
        filters.selectedGenres.length > 0 &&
        !rom.genres.some((g) => filters.selectedGenres.includes(g))
      ) {
        return false;
      }

      // View mode filter
      if (filters.viewMode === 'duplicates' && !rom.isDuplicate && !rom.isJunk) {
        return false;
      }
      if (filters.viewMode === 'junk' && !rom.isJunk) {
        return false;
      }
      if (filters.viewMode === 'multidisc' && !rom.isMultiDisc && !rom.discInfo) {
        return false;
      }
      if (filters.viewMode === 'top200' && !rom.isTop200) {
        return false;
      }
      if (
        filters.viewMode === 'unorganized' &&
        (rom.isJunk || ((!rom.targetFolder || rom.originalPath.startsWith(`${rom.targetFolder}/`)) && rom.isCleanNamed))
      ) {
        return false;
      }
      if (
        filters.viewMode === 'translations_and_hacks' &&
        (rom.isJunk ||
          (rom.editionType !== 'translation' &&
            rom.editionType !== 'romhack' &&
            rom.editionType !== 'homebrew' &&
            rom.editionType !== 'prototype' &&
            !rom.isHackOrTranslation))
      ) {
        return false;
      }

      // Bad dump filter
      if (filters.hideBadDumps && rom.isBadDump) {
        return false;
      }

      // Search Query
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const matchTitle = rom.canonicalTitle.toLowerCase().includes(q);
        const matchFile = rom.filename.toLowerCase().includes(q);
        const matchPath = rom.originalPath.toLowerCase().includes(q);
        const matchRegion = (rom.region || '').toLowerCase().includes(q);
        if (!matchTitle && !matchFile && !matchPath && !matchRegion) {
          return false;
        }
      }

      return true;
    });
  }, [roms, filters]);

  // Sync organize plan actions whenever roms update
  useEffect(() => {
    const actions: OrganizeActionItem[] = [];
    for (const rom of roms) {
      if (rom.isJunk) continue; // Skip junk files from normal ROM organization
      // If targetFolder is empty, file remains in root folder, so needsMove is false
      const needsMove = Boolean(rom.targetFolder && !rom.originalPath.startsWith(`${rom.targetFolder}/`));
      const needsRename = !rom.isCleanNamed;

      if (needsMove || needsRename) {
        let type: OrganizeActionItem['type'] = 'rename_and_move';
        if (needsMove && !needsRename) type = 'move_only';
        if (!needsMove && needsRename) type = 'rename_only';

        actions.push({
          id: `act_${rom.id}`,
          rom,
          currentPath: rom.originalPath,
          newPath: rom.targetFolder ? `${rom.targetFolder}/${rom.cleanFilename}` : rom.cleanFilename,
          targetFolder: rom.targetFolder,
          cleanFilename: rom.cleanFilename,
          type,
          selected: true,
          status: 'pending',
        });
      }
    }
    setOrganizeActions(actions);
  }, [roms]);

  // Handler: Select OS Directory via File System Access API
  const handleSelectDirectory = async (preFilters: ScanFilters) => {
    if (typeof (window as any).showDirectoryPicker !== 'function') {
      throw new Error('NOT_SUPPORTED');
    }

    try {
      setIsScanning(true);
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
      });

      setDirectoryHandle(dirHandle);
      setFolderName(dirHandle.name);
      setFilters(preFilters);

      const scannedRoms = await scanDirectoryHandle(dirHandle, (progress) => {
        setScanProgress(progress);
      });

      // Open System Verification modal so user can confirm or correct detected systems & folder structure
      setPendingVerificationRoms(scannedRoms);
      setPendingFolderName(dirHandle.name);
      setIsSystemVerificationModalOpen(true);
      showToast(`${scannedRoms.length} Dateien eingelesen. Bitte Systeme kurz überprüfen.`, 'info');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      if (err.name === 'SecurityError' || String(err?.message || err).includes('Cross origin')) {
        throw err;
      }
      console.error('Fehler beim Öffnen des Ordners:', err);
      showToast(`Fehler beim Ordnerzugriff: ${err.message || err}`, 'warning');
    } finally {
      setIsScanning(false);
      setScanProgress(null);
    }
  };

  // Handler: Scan FileList (HTML file input fallback / webkitdirectory / drag & drop)
  const handleSelectFiles = async (
    files: FileList | File[],
    preFilters: ScanFilters
  ) => {
    const fileList = Array.from(files).filter((f) => !f.name.startsWith('.'));
    if (fileList.length === 0) return;

    try {
      setIsScanning(true);
      setDirectoryHandle(null);

      // Extract top folder name from webkitRelativePath if available
      let detectedName = 'Ausgewählte ROMs';
      const first = fileList[0];
      const relPath = (first as any).webkitRelativePath;
      if (relPath && relPath.includes('/')) {
        detectedName = relPath.split('/')[0];
      } else if (fileList.length === 1) {
        detectedName = first.name;
      } else {
        detectedName = `${fileList.length} ROM-Dateien`;
      }

      setFolderName(detectedName);
      setFilters(preFilters);

      const scannedRoms = await scanFileList(fileList, detectedName, (progress) => {
        setScanProgress(progress);
      });

      // Open System Verification modal so user can confirm or correct detected systems & folder structure
      setPendingVerificationRoms(scannedRoms);
      setPendingFolderName(detectedName);
      setIsSystemVerificationModalOpen(true);
      showToast(`${scannedRoms.length} Dateien eingelesen. Bitte Systeme kurz überprüfen.`, 'info');
    } catch (err: any) {
      console.error('Fehler beim Scannen der Dateien:', err);
      showToast(`Fehler beim Scannen: ${err.message || err}`, 'warning');
    } finally {
      setIsScanning(false);
      setScanProgress(null);
    }
  };

  // Handlers for System Verification Modal
  const handleConfirmVerifiedSystems = (
    updatedRoms: RomFile[],
    keepInRootFolder: boolean,
    preset: HandheldPresetId = 'standard',
    selectedRegionPref: RegionPreference = 'europe_first'
  ) => {
    setCurrentPreset(preset);
    setRegionPref(selectedRegionPref);
    const reanalyzed = analyzeDuplicateGroups(updatedRoms, selectedRegionPref);
    setRoms(reanalyzed);
    setFolderName(pendingFolderName);
    setIsSystemVerificationModalOpen(false);
    setPendingVerificationRoms([]);
    setCurrentView('manager');
    const presetName = HANDHELD_PRESETS.find((p) => p.id === preset)?.name || 'Standard';
    showToast(
      `${updatedRoms.length} ROMs bestätigt (${pendingFolderName}) – Preset: ${presetName}.`,
      'success'
    );
  };

  const handlePresetChange = (newPreset: HandheldPresetId) => {
    setCurrentPreset(newPreset);
    setRoms((prev) => applyHandheldPresetToRoms(prev, newPreset));
    const presetName = HANDHELD_PRESETS.find((p) => p.id === newPreset)?.name || 'Standard';
    showToast(`Handheld-Ordnerstruktur auf "${presetName}" umgestellt!`, 'info');
  };

  const handleRegionPrefChange = (newPref: RegionPreference) => {
    setRegionPref(newPref);
    setRoms((prev) => analyzeDuplicateGroups(prev, newPref));
    showToast('1G1R-Regionspräferenz aktualisiert.', 'info');
  };

  const handleCancelSystemVerification = () => {
    setIsSystemVerificationModalOpen(false);
    setPendingVerificationRoms([]);
    setPendingFolderName('');
    setDirectoryHandle(null);
    setFolderName('');
  };

  // Handler: Update Platform for a single ROM
  const handleUpdateRomPlatform = (romId: string, newPlatform: PlatformCode) => {
    const platMeta = getPlatformMetadata(newPlatform);
    const newTargetFolder = platMeta ? platMeta.targetFolder : (newPlatform === 'OTHER' ? 'Misc' : newPlatform);

    setRoms((prevRoms) => {
      const updated = prevRoms.map((r) => {
        if (r.id === romId) {
          return {
            ...r,
            platform: newPlatform,
            targetFolder: newTargetFolder,
          };
        }
        return r;
      });
      return analyzeDuplicateGroups(updated);
    });

    showToast(`Plattform geändert auf ${platMeta?.name || newPlatform}.`, 'success');
  };

  // Handler: Batch update platform for all current ROMs
  const handleBatchUpdatePlatform = (newPlatform: PlatformCode) => {
    const platMeta = getPlatformMetadata(newPlatform);
    const newTargetFolder = platMeta ? platMeta.targetFolder : (newPlatform === 'OTHER' ? 'Misc' : newPlatform);

    setRoms((prevRoms) => {
      const updated = prevRoms.map((r) => ({
        ...r,
        platform: newPlatform,
        targetFolder: newTargetFolder,
      }));
      return analyzeDuplicateGroups(updated);
    });

    showToast(`Alle ${roms.length} ROMs wurden auf ${platMeta?.name || newPlatform} umgestellt.`, 'success');
  };

  // Handler: 1-Click Fully-Automated Multi-Disc & M3U Organization ("Ooppsss, mach alles automatisch!")
  const handleAutoFixAllMultiDiscs = async () => {
    if (multiDiscSets.length === 0) return;

    if (!directoryHandle) {
      setShowIframeAccessModal(true);
      return;
    }

    try {
      setIsAutoFixingMultiDisc(true);
      const allUpdatedDiscs: RomFile[] = [];

      for (let i = 0; i < multiDiscSets.length; i++) {
        const set = multiDiscSets[i];
        setAutoFixProgress({
          current: i + 1,
          total: multiDiscSets.length,
          title: set.gameTitle,
        });

        const res = await createM3UDirect(set, directoryHandle, true);
        if (res && res.updatedDiscs) {
          allUpdatedDiscs.push(...res.updatedDiscs);
        }
      }

      if (allUpdatedDiscs.length > 0) {
        const discMap = new Map(allUpdatedDiscs.map((d) => [d.id, d]));
        setRoms((prev) => prev.map((r) => discMap.get(r.id) || r));
      }

      setShowAutoFixSuccessModal(true);
      showToast(
        `🎉 Vollautomatisch erledigt! Alle ${multiDiscSets.length} Multi-Disk Spiele wurden in Unterordner sortiert und M3U-Playlists erstellt!`,
        'success'
      );
    } catch (err: any) {
      console.error('Fehler bei automatischer Multi-Disk Organisation:', err);
      showToast(`Fehler: ${err?.message || err}`, 'error');
    } finally {
      setIsAutoFixingMultiDisc(false);
      setAutoFixProgress(null);
    }
  };

  // Handler: Set which ROM to keep in a duplicate group
  const handleSetKeepRom = (groupId: string, romIdToKeep: string) => {
    setRoms((prevRoms) =>
      prevRoms.map((r) => {
        if (r.duplicateGroupId === groupId) {
          const isKeep = r.id === romIdToKeep;
          return {
            ...r,
            recommendedAction: isKeep ? 'keep' : 'delete',
          };
        }
        return r;
      })
    );
  };

  // Handler: Rename ROM directly
  const handleRenameRom = (rom: RomFile) => {
    setConfirmDialog({
      isOpen: true,
      title: 'ROM umbenennen',
      message: `Möchtest du "${rom.filename}" in den No-Intro Standardnamen "${rom.cleanFilename}" umbenennen?`,
      confirmLabel: 'Jetzt umbenennen',
      confirmVariant: 'primary',
      action: async () => {
        if (directoryHandle) {
          try {
            await moveOrRenameRomDirect(
              rom,
              rom.parentDirHandle || directoryHandle,
              rom.originalPath.split('/')[0] || rom.targetFolder,
              rom.cleanFilename
            );
          } catch (err) {
            console.warn('Direktes Umbenennen fehlgeschlagen:', err);
          }
        }
        setRoms((prev) =>
          prev.map((r) =>
            r.id === rom.id
              ? {
                  ...r,
                  filename: rom.cleanFilename,
                  isCleanNamed: true,
                  originalPath: r.originalPath.replace(r.filename, rom.cleanFilename),
                }
              : r
          )
        );
        setConfirmDialog((c) => ({ ...c, isOpen: false }));
      },
    });
  };

  // Handler: Move ROM to platform folder
  const handleMoveRom = (rom: RomFile) => {
    setConfirmDialog({
      isOpen: true,
      title: 'In Plattform-Ordner verschieben',
      message: `Soll "${rom.filename}" in das Verzeichnis "/${rom.targetFolder}/" verschoben werden?`,
      confirmLabel: 'Verschieben',
      confirmVariant: 'primary',
      action: async () => {
        if (directoryHandle) {
          try {
            await moveOrRenameRomDirect(
              rom,
              directoryHandle,
              rom.targetFolder,
              rom.filename
            );
          } catch (err) {
            console.warn('Direktes Verschieben fehlgeschlagen:', err);
          }
        }
        setRoms((prev) =>
          prev.map((r) =>
            r.id === rom.id
              ? {
                  ...r,
                  originalPath: `${rom.targetFolder}/${r.filename}`,
                }
              : r
          )
        );
        setConfirmDialog((c) => ({ ...c, isOpen: false }));
      },
    });
  };

  // Handler: Delete single ROM
  const handleDeleteRom = (rom: RomFile) => {
    setConfirmDialog({
      isOpen: true,
      title: 'ROM-Datei löschen',
      message: `Möchtest du die Datei "${rom.filename}" (${rom.originalPath}) wirklich unwiderruflich löschen?`,
      confirmLabel: 'Unwiderruflich löschen',
      confirmVariant: 'danger',
      action: async () => {
        if (directoryHandle && rom.fileHandle) {
          try {
            await deleteRomDirect(rom);
          } catch (err) {
            console.warn('Dateisystem-Löschung nicht möglich:', err);
          }
        }
        setRoms((prev) => prev.filter((r) => r.id !== rom.id));
        setConfirmDialog((c) => ({ ...c, isOpen: false }));
      },
    });
  };

  // Handler: Bulk move duplicates to '_Duplicates' folder
  const handleBulkMoveDuplicatesToFolder = () => {
    const duplicatesToMove = roms.filter(
      (r) => r.isDuplicate && r.recommendedAction === 'delete'
    );

    if (duplicatesToMove.length === 0) {
      showToast('Keine überflüssigen Duplikate zum Verschieben markiert.', 'info');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Duplikate in Sicherungsordner verschieben',
      message: `Es wurden ${duplicatesToMove.length} überflüssige Duplikate gefunden. Möchtest du diese sicher in den Ordner "_Duplicates/" verschieben?`,
      confirmLabel: `${duplicatesToMove.length} Duplikate verschieben`,
      confirmVariant: 'primary',
      action: async () => {
        if (directoryHandle) {
          for (const dup of duplicatesToMove) {
            try {
              await moveOrRenameRomDirect(
                dup,
                directoryHandle,
                '_Duplicates',
                dup.filename
              );
            } catch (err) {
              console.warn(err);
            }
          }
        }
        setRoms((prev) =>
          prev.map((r) =>
            r.isDuplicate && r.recommendedAction === 'delete'
              ? {
                  ...r,
                  originalPath: `_Duplicates/${r.filename}`,
                  targetFolder: '_Duplicates',
                }
              : r
          )
        );
        setConfirmDialog((c) => ({ ...c, isOpen: false }));
        showToast(`${duplicatesToMove.length} Duplikate wurden nach "_Duplicates/" verschoben.`, 'success');
      },
    });
  };

  // Handler: Bulk delete duplicates and junk files
  const handleBulkDeleteDuplicates = () => {
    const filesToDelete = roms.filter(
      (r) => (r.isDuplicate && r.recommendedAction === 'delete') || r.isJunk
    );

    if (filesToDelete.length === 0) {
      showToast('Keine überflüssigen Duplikate oder Mülldateien zum Löschen vorhanden.', 'info');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Duplikate & Mülldateien löschen',
      message: `ACHTUNG: Dies wird ${filesToDelete.length} redundante Kopien und Cache-/Systemdateien (.db, Thumbs, etc.) löschen. Empfohlene ROMs werden behalten. Fortfahren?`,
      confirmLabel: `${filesToDelete.length} Dateien löschen`,
      confirmVariant: 'danger',
      action: async () => {
        if (directoryHandle) {
          for (const item of filesToDelete) {
            try {
              await deleteRomDirect(item);
            } catch (err) {
              console.warn(err);
            }
          }
        }
        setRoms((prev) =>
          prev.filter((r) => !((r.isDuplicate && r.recommendedAction === 'delete') || r.isJunk))
        );
        setConfirmDialog((c) => ({ ...c, isOpen: false }));
        showToast(`${filesToDelete.length} Duplikate & Mülldateien erfolgreich entfernt.`, 'success');
      },
    });
  };

  // Handler: Bulk delete ONLY junk files
  const handleBulkDeleteJunk = () => {
    const junkFiles = roms.filter((r) => r.isJunk);
    if (junkFiles.length === 0) {
      showToast('Keine Cache- oder Mülldateien vorhanden.', 'info');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Alle Cache- & Mülldateien löschen',
      message: `Möchtest du alle ${junkFiles.length} erkannten Cache- und Systemdateien (z.B. .db, Thumbs.db, Temp) sicher aus deiner Sammlung löschen?`,
      confirmLabel: `${junkFiles.length} Mülldateien löschen`,
      confirmVariant: 'danger',
      action: async () => {
        if (directoryHandle) {
          for (const item of junkFiles) {
            try {
              await deleteRomDirect(item);
            } catch (err) {
              console.warn(err);
            }
          }
        }
        setRoms((prev) => prev.filter((r) => !r.isJunk));
        setConfirmDialog((c) => ({ ...c, isOpen: false }));
        showToast(`${junkFiles.length} Cache- & Mülldateien erfolgreich gelöscht.`, 'success');
      },
    });
  };

  // Handler: Batch Rename ROMs in one single run
  const handleBatchRename = (targets: RomFile[]) => {
    if (targets.length === 0) {
      showToast('Keine unbenannten ROMs zum Bearbeiten vorhanden.', 'info');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: `${targets.length} ROMs in einem Rutsch umbenennen`,
      message: `Möchtest du alle ${targets.length} ROMs auf den sauberen No-Intro Standard umbenennen? Die Dateien bleiben in ihrem aktuellen Ordner.`,
      confirmLabel: `Jetzt alle ${targets.length} umbenennen`,
      confirmVariant: 'primary',
      action: async () => {
        setConfirmDialog((c) => ({ ...c, isOpen: false }));
        let successCount = 0;

        for (let i = 0; i < targets.length; i++) {
          const target = targets[i];
          setBatchProgress({
            current: i + 1,
            total: targets.length,
            filename: `${target.filename} → ${target.cleanFilename}`,
            actionTitle: 'Stapel-Umbenennung läuft...',
          });

          if (directoryHandle) {
            try {
              await renameRomInPlaceDirect(target, target.cleanFilename);
              successCount++;
            } catch (err) {
              console.warn('Fehler beim Umbenennen von:', target.filename, err);
            }
          } else {
            successCount++;
          }

          // In-memory state update
          setRoms((prev) =>
            prev.map((r) =>
              r.id === target.id
                ? {
                    ...r,
                    filename: target.cleanFilename,
                    cleanFilename: target.cleanFilename,
                    isCleanNamed: true,
                    originalPath: r.originalPath.replace(r.filename, target.cleanFilename),
                  }
                : r
            )
          );

          if (targets.length > 15) {
            await new Promise((resolve) => setTimeout(resolve, 15));
          }
        }

        setBatchProgress(null);

        if (directoryHandle) {
          showToast(
            `${successCount} von ${targets.length} ROMs erfolgreich in einem Rutsch umbenannt!`,
            'success'
          );
        } else {
          showToast(
            `${successCount} ROMs im Katalog umbenannt! PowerShell-/Bash-Skripte stehen zum Download bereit.`,
            'success'
          );
        }
      },
    });
  };

  // Handler: Batch Move ROMs to system folders
  const handleBatchMoveToFolders = (targets: RomFile[]) => {
    if (targets.length === 0) {
      showToast('Alle ROMs befinden sich bereits in ihren Systemordnern.', 'info');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: `${targets.length} ROMs in Systemordner verschieben`,
      message: `Möchtest du alle ${targets.length} ROMs in ihre jeweiligen System-Unterordner (z.B. /${targets[0]?.targetFolder}/) verschieben?`,
      confirmLabel: `Jetzt alle ${targets.length} verschieben`,
      confirmVariant: 'primary',
      action: async () => {
        setConfirmDialog((c) => ({ ...c, isOpen: false }));
        let successCount = 0;

        for (let i = 0; i < targets.length; i++) {
          const target = targets[i];
          setBatchProgress({
            current: i + 1,
            total: targets.length,
            filename: `${target.filename} → /${target.targetFolder}/`,
            actionTitle: 'Dateien werden in Systemordner verschoben...',
          });

          if (directoryHandle) {
            try {
              await moveOrRenameRomDirect(
                target,
                directoryHandle,
                target.targetFolder,
                target.filename
              );
              successCount++;
            } catch (err) {
              console.warn('Fehler beim Verschieben von:', target.filename, err);
            }
          } else {
            successCount++;
          }

          setRoms((prev) =>
            prev.map((r) =>
              r.id === target.id
                ? {
                    ...r,
                    originalPath: `${target.targetFolder}/${target.filename}`,
                  }
                : r
            )
          );

          if (targets.length > 15) {
            await new Promise((resolve) => setTimeout(resolve, 15));
          }
        }

        setBatchProgress(null);

        if (directoryHandle) {
          showToast(
            `${successCount} von ${targets.length} ROMs erfolgreich in Systemordner verschoben!`,
            'success'
          );
        } else {
          showToast(
            `${successCount} ROMs geordnet! PowerShell-/Bash-Skripte stehen zum Download bereit.`,
            'success'
          );
        }
      },
    });
  };

  // Handler: Batch Organize ALL (Rename + Move in 1 go)
  const handleBatchOrganize = (targets: RomFile[]) => {
    if (targets.length === 0) {
      showToast('Alle ROMs sind bereits sauber benannt und sortiert.', 'info');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: `${targets.length} ROMs in einem Rutsch ordnen`,
      message: `Möchtest du alle ${targets.length} ROMs vollautomatisch in einem Rutsch nach No-Intro Standard umbenennen UND in die plattformspezifischen Ordner einsortieren?`,
      confirmLabel: `Jetzt alles in einem Rutsch ordnen (${targets.length})`,
      confirmVariant: 'primary',
      action: async () => {
        setConfirmDialog((c) => ({ ...c, isOpen: false }));
        let successCount = 0;

        for (let i = 0; i < targets.length; i++) {
          const target = targets[i];
          setBatchProgress({
            current: i + 1,
            total: targets.length,
            filename: `${target.filename} → /${target.targetFolder}/${target.cleanFilename}`,
            actionTitle: 'Vollautomatisches Ordnen läuft...',
          });

          if (directoryHandle) {
            try {
              await moveOrRenameRomDirect(
                target,
                directoryHandle,
                target.targetFolder,
                target.cleanFilename
              );
              successCount++;
            } catch (err) {
              console.warn('Fehler beim Ordnen von:', target.filename, err);
            }
          } else {
            successCount++;
          }

          setRoms((prev) =>
            prev.map((r) =>
              r.id === target.id
                ? {
                    ...r,
                    filename: target.cleanFilename,
                    cleanFilename: target.cleanFilename,
                    isCleanNamed: true,
                    originalPath: `${target.targetFolder}/${target.cleanFilename}`,
                    targetFolder: target.targetFolder,
                  }
                : r
            )
          );

          if (targets.length > 15) {
            await new Promise((resolve) => setTimeout(resolve, 15));
          }
        }

        setBatchProgress(null);

        if (directoryHandle) {
          showToast(
            `Perfekt! ${successCount} ROMs wurden in einem Rutsch umbenannt und einsortiert.`,
            'success'
          );
        } else {
          showToast(
            `${successCount} ROMs im Katalog geordnet! PowerShell-/Bash-Skripte stehen zum Download bereit.`,
            'success'
          );
        }
      },
    });
  };

  // Handler: Execute Organize Plan directly in File System
  const handleExecuteOrganizeDirectly = async (
    selectedActions: OrganizeActionItem[]
  ) => {
    setIsExecutingOrganize(true);
    let count = 0;

    // Create undo snapshot before executing
    const rollbackItems: RollbackActionItem[] = selectedActions.map((act) => ({
      romId: act.rom.id,
      previousPath: act.rom.originalPath,
      previousFilename: act.rom.filename,
      appliedPath: act.targetFolder ? `${act.targetFolder}/${act.cleanFilename}` : act.cleanFilename,
      appliedFilename: act.cleanFilename,
      targetFolder: act.targetFolder,
    }));

    const snapshot: UndoSnapshot = {
      id: `snap_${Date.now()}`,
      timestamp: Date.now(),
      label: `Organisieren (${selectedActions.length} Dateien)`,
      folderName: folderName || 'ROMs',
      items: rollbackItems,
    };
    saveUndoSnapshot(snapshot);
    setUndoSnapshots(getStoredUndoSnapshots());

    for (const act of selectedActions) {
      setExecutionProgress({
        current: count + 1,
        total: selectedActions.length,
        filename: act.cleanFilename,
      });

      const rom = roms.find((r) => r.id === act.rom.id);
      if (rom && directoryHandle) {
        try {
          await moveOrRenameRomDirect(
            rom,
            directoryHandle,
            act.targetFolder,
            act.cleanFilename
          );
          act.status = 'done';
        } catch (err) {
          console.error(err);
          act.status = 'failed';
        }
      } else {
        // In-memory state update
        act.status = 'done';
      }

      // Update state in roms
      setRoms((prev) =>
        prev.map((r) =>
          r.id === act.rom.id
            ? {
                ...r,
                filename: act.cleanFilename,
                cleanFilename: act.cleanFilename,
                isCleanNamed: true,
                originalPath: `${act.targetFolder}/${act.cleanFilename}`,
                targetFolder: act.targetFolder,
              }
            : r
        )
      );

      count++;
      // Brief yield
      await new Promise((resolve) => setTimeout(resolve, 60));
    }

    setIsExecutingOrganize(false);
    setExecutionProgress(null);
  };

  // Handler: Assign Cover Image via Drag & Drop on ROM Tile
  const handleAssignCover = async (rom: RomFile, file: File) => {
    const baseName = rom.cleanFilename.replace(/\.[^/.]+$/, '');
    const targetCoverName = `${baseName}.png`;

    if (directoryHandle) {
      try {
        let coversDir = directoryHandle;
        try {
          coversDir = await directoryHandle.getDirectoryHandle('covers', { create: true });
        } catch (e) {
          try {
            coversDir = await directoryHandle.getDirectoryHandle('Covers', { create: true });
          } catch (e2) {
            coversDir = directoryHandle;
          }
        }
        const fileHandle = await coversDir.getFileHandle(targetCoverName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(file);
        await writable.close();
        showToast(`Cover für "${rom.canonicalTitle}" als ${targetCoverName} in Covers/ gespeichert!`, 'success');
        return;
      } catch (err) {
        console.warn('Direct cover write warning:', err);
      }
    }

    setStudioInitialCoverFile({ file, rom });
    setCurrentView('cover3d');
    showToast(`Cover für "${rom.canonicalTitle}" im 3D Box Studio geöffnet!`, 'info');
  };

  // Handler: Isolate Top 200 into '_Top200' folder
  const handleIsolateTop200 = () => {
    const top200Roms = roms.filter((r) => r.isTop200);
    setConfirmDialog({
      isOpen: true,
      title: 'Top 200 ROMs ordnen',
      message: `Möchtest du alle ${top200Roms.length} erkannten Top 200 Spiele in den Ordner "_Top200/<Plattform>/" sortieren?`,
      confirmLabel: 'Top 200 sortieren',
      confirmVariant: 'primary',
      action: async () => {
        setRoms((prev) =>
          prev.map((r) => {
            if (r.isTop200) {
              return {
                ...r,
                originalPath: `_Top200/${r.platform}/${r.filename}`,
                targetFolder: `_Top200/${r.platform}`,
              };
            }
            return r;
          })
        );
        setConfirmDialog((c) => ({ ...c, isOpen: false }));
        showToast(`Alle ${top200Roms.length} Top 200 ROMs wurden markiert.`, 'success');
      },
    });
  };

  // Handler: Apply Gemini AI suggestions
  const handleApplyAiSuggestions = (
    updates: Array<{
      id: string;
      cleanFilename: string;
      canonicalTitle: string;
      targetFolder: string;
      genres: string[];
    }>
  ) => {
    setRoms((prev) =>
      prev.map((rom) => {
        const update = updates.find((u) => u.id === rom.id);
        if (update) {
          return {
            ...rom,
            cleanFilename: update.cleanFilename,
            canonicalTitle: update.canonicalTitle,
            targetFolder: update.targetFolder,
            genres: update.genres,
            isCleanNamed: rom.filename === update.cleanFilename,
          };
        }
        return rom;
      })
    );
  };

  const duplicatesToDelete = useMemo(() => {
    return roms.filter((r) => (r.isDuplicate && r.recommendedAction === 'delete') || r.isJunk);
  }, [roms]);

  return (
    <div className="min-h-screen text-slate-100 flex flex-col antialiased relative">
      {/* Dynamic Background Media (Background.mp4 plays during busy operations, resets to frame 0 when idle) */}
      <BackgroundMedia isWorking={isAppWorking} />

      {/* App Header */}
      <Header
        folderName={folderName}
        roms={roms}
        multiDiscCount={multiDiscSets.length}
        undoCount={undoSnapshots.length}
        sideFileCount={sideFiles.length}
        currentView={currentView}
        onToggleView={setCurrentView}
        onOpenFolderPicker={() => {
          setRoms([]);
          setFolderName(null);
          setCurrentView('manager');
        }}
        onOpenAiEnhancer={() => setIsAiModalOpen(true)}
        onOpenOrganizeModal={() => setIsOrganizeModalOpen(true)}
        onOpenMultiDiscModal={() => setIsMultiDiscModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenUndoModal={() => setIsUndoModalOpen(true)}
        onOpenSideFileModal={() => setIsSideFileModalOpen(true)}
        onOpenCover3dModal={() => setCurrentView('cover3d')}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {currentView === 'landing' ? (
          /* Explanatory Landing Page */
          <LandingPage
            onStartScan={() => setCurrentView('manager')}
            hasLoadedRoms={roms.length > 0}
            onOpenCover3dModal={() => setCurrentView('cover3d')}
          />
        ) : currentView === 'cover3d' ? (
          /* Full-width 3D Cover Studio Workspace */
          <Cover3dStudioView
            onBackToManager={() => setCurrentView(roms.length > 0 ? 'manager' : 'landing')}
            scannedRoms={roms}
            directoryHandle={directoryHandle}
            showToast={showToast}
            initialCoverFile={studioInitialCoverFile}
          />
        ) : roms.length === 0 ? (
          /* Folder Picker & Pre-scan Filters Screen */
          <FolderPickerCard
            onSelectDirectory={handleSelectDirectory}
            onSelectFiles={handleSelectFiles}
            isScanning={isScanning}
            scanProgress={scanProgress}
            onViewLandingPage={() => setCurrentView('landing')}
          />
        ) : (
          /* Active Collection Dashboard */
          <>
            {/* Filter & View Mode Bar */}
            <FilterBar
              filters={filters}
              onFilterChange={setFilters}
              counts={counts}
            />

            {/* Tab Views */}
            <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-3 pb-8">
              {/* "Ooppsss, da hat es ein Game mit mehreren Datenträgern!" Zero-Friction Auto-Fix Banner */}
              {multiDiscSets.length > 0 && (
                <div className="frosted-glass border-violet-500/35 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-3 text-slate-100">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0 shadow-md text-xl font-bold">
                      💿
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-white">
                        Ooppsss, da hat es {multiDiscSets.length} {multiDiscSets.length === 1 ? 'Spiel' : 'Spiele'} mit mehreren Datenträgern!
                      </h3>
                      <p className="text-xs text-slate-300 mt-1 max-w-2xl font-normal">
                        Z. B. <strong className="text-white font-bold">{multiDiscSets.slice(0, 2).map((s) => s.gameTitle).join(', ')}</strong> ({multiDiscSets.reduce((sum, s) => sum + s.totalDiscs, 0)} Disketten/CDs insgesamt).
                        Möchtest du, dass die App alle Disketten automatisch in Unterordner packt und die .m3u Playlists anlegt?
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                    <button
                      id="btn-auto-fix-all-multidisc-banner"
                      onClick={handleAutoFixAllMultiDiscs}
                      disabled={isAutoFixingMultiDisc}
                      className="w-full md:w-auto px-5 py-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-md shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                      <span>{isAutoFixingMultiDisc ? 'Wird ausgeführt...' : 'Alles vollautomatisch erledigen'}</span>
                    </button>

                    <button
                      id="btn-view-multidisc-details"
                      onClick={() => setIsMultiDiscModalOpen(true)}
                      className="px-3.5 py-3 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-900/40 hover:bg-slate-800/70 border border-white/15 backdrop-blur-md transition shrink-0 cursor-pointer"
                      title="Spiele im Detail ansehen"
                    >
                      Übersicht
                    </button>
                  </div>
                </div>
              )}

              {filters.viewMode === 'multidisc' && (
                <div className="frosted-glass rounded-xl p-3.5 my-3 flex flex-wrap items-center justify-between gap-3 text-slate-100">
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      Multi-Disk & M3U ({multiDiscSets.length} Spiele)
                    </h4>
                    <p className="text-xs text-slate-400">
                      Mehrteilige Disks und CDs zusammenfassen und M3U-Playlists erstellen.
                    </p>
                  </div>
                  <button
                    id="btn-trigger-multidisc-modal"
                    onClick={() => setIsMultiDiscModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-900/30 transition cursor-pointer"
                  >
                    M3U-Playlists verwalten
                  </button>
                </div>
              )}

              {filters.viewMode === 'duplicates' ? (
                <DuplicateManager
                  groups={duplicateGroups}
                  junkFiles={roms.filter((r) => r.isJunk)}
                  onSetKeepRom={handleSetKeepRom}
                  onBulkMoveDuplicatesToFolder={handleBulkMoveDuplicatesToFolder}
                  onBulkDeleteDuplicates={handleBulkDeleteDuplicates}
                  onBulkDeleteJunk={handleBulkDeleteJunk}
                  onDeleteSingleJunk={handleDeleteRom}
                  onDownloadScript={() => {
                    const script = generatePowerShellScript(
                      organizeActions,
                      duplicatesToDelete,
                      multiDiscSets
                    );
                    const blob = new Blob([script], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'organize_roms.ps1';
                    a.click();
                  }}
                />
              ) : filters.viewMode === 'top200' ||
                filters.viewMode === 'missing_top200' ? (
                <Top200Curator
                  roms={roms}
                  onIsolateTop200={handleIsolateTop200}
                />
              ) : (
                /* Catalog List View */
                <>
                  {filters.viewMode === 'junk' && (
                    <div className="frosted-glass border border-rose-500/30 rounded-2xl p-4 my-3 flex flex-wrap items-center justify-between gap-3 shadow-xl backdrop-blur-md text-slate-100">
                      <div>
                        <h4 className="text-xs font-bold text-rose-300">
                          Erkannte Cache- & Mülldateien ({counts.junk})
                        </h4>
                        <p className="text-xs text-slate-300 mt-0.5 font-normal">
                          Dateien wie .db, Thumbs.db oder temporäre Caches sind keine Spiele und können bedenkenlos gelöscht werden.
                        </p>
                      </div>
                      <button
                        id="btn-delete-all-junk-catalog"
                        onClick={handleBulkDeleteJunk}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950/40 transition cursor-pointer"
                      >
                        Alle {counts.junk} Mülldateien löschen
                      </button>
                    </div>
                  )}
                  <RomCatalog
                    roms={filteredRoms}
                    onRenameRom={handleRenameRom}
                    onMoveRom={handleMoveRom}
                    onDeleteRom={handleDeleteRom}
                    onSelectDuplicateView={() =>
                      setFilters((f) => ({ ...f, viewMode: 'duplicates' }))
                    }
                    onChangePlatform={handleUpdateRomPlatform}
                    onBatchChangePlatform={handleBatchUpdatePlatform}
                    onBatchRename={handleBatchRename}
                    onBatchMove={handleBatchMoveToFolders}
                    onBatchOrganize={handleBatchOrganize}
                    onAssignCover={handleAssignCover}
                  />
                </>
              )}
            </div>
          </>
        )}
      </main>

      {/* Organize Modal */}
      <OrganizeModal
        isOpen={isOrganizeModalOpen}
        onClose={() => setIsOrganizeModalOpen(false)}
        actions={organizeActions}
        duplicatesToDelete={duplicatesToDelete}
        multiDiscSets={multiDiscSets}
        currentPreset={currentPreset}
        onPresetChange={handlePresetChange}
        onToggleAction={(id) => {
          setOrganizeActions((prev) =>
            prev.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a))
          );
        }}
        onToggleAllActions={(selected) => {
          setOrganizeActions((prev) => prev.map((a) => ({ ...a, selected })));
        }}
        onExecuteDirectly={handleExecuteOrganizeDirectly}
        hasDirectHandle={Boolean(directoryHandle)}
        isExecuting={isExecutingOrganize}
        executionProgress={executionProgress}
      />

      {/* Multi-Disc & M3U Playlist Modal */}
      <MultiDiscModal
        isOpen={isMultiDiscModalOpen}
        onClose={() => setIsMultiDiscModalOpen(false)}
        multiDiscSets={multiDiscSets}
        rootDirectoryHandle={directoryHandle}
        onOpenOrganizeModal={() => setIsOrganizeModalOpen(true)}
        onUpdateRoms={(updatedRoms) => setRoms(updatedRoms)}
        allRoms={roms}
      />

      {/* Gemini AI Enhancer Modal */}
      <AiEnhancerModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        roms={roms}
        onApplyAiSuggestions={handleApplyAiSuggestions}
      />

      {/* Real-time Batch Progress Modal */}
      {batchProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xl">
          <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl text-center space-y-4 text-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-violet-950/60 border border-violet-500/30 text-violet-400 flex items-center justify-center mx-auto text-xl font-bold shadow-md">
              ⚡
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {batchProgress.actionTitle || 'Stapelverarbeitung läuft...'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {batchProgress.current} von {batchProgress.total} verarbeitet (
                {Math.round((batchProgress.current / Math.max(batchProgress.total, 1)) * 100)}%)
              </p>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-white/10">
              <div
                className="bg-linear-to-r from-violet-500 to-fuchsia-500 h-full transition-all duration-150 rounded-full"
                style={{
                  width: `${Math.round(
                    (batchProgress.current / Math.max(batchProgress.total, 1)) * 100
                  )}%`,
                }}
              />
            </div>

            <p className="text-xs font-mono text-slate-300 truncate px-3 py-2 bg-slate-800/80 rounded-lg border border-white/10">
              {batchProgress.filename}
            </p>

            <p className="text-[11px] text-slate-400">
              Änderungen werden vollautomatisch in einem Rutsch angewendet...
            </p>
          </div>
        </div>
      )}

      {/* Automated Multi-Disc Execution Running Progress */}
      {isAutoFixingMultiDisc && autoFixProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xl">
          <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl text-center space-y-4 animate-in fade-in duration-150 text-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-violet-950/60 border border-violet-500/30 text-violet-400 mx-auto flex items-center justify-center animate-spin shadow-md">
              <Disc className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Multi-Disk Spiele werden vollautomatisch sortiert...
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1 truncate">
                {autoFixProgress.title} ({autoFixProgress.current} von {autoFixProgress.total})
              </p>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-white/10">
              <div
                className="bg-linear-to-r from-emerald-500 to-teal-400 h-full transition-all duration-200 rounded-full"
                style={{
                  width: `${Math.round((autoFixProgress.current / autoFixProgress.total) * 100)}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Disketten werden in Unterordner verschoben & M3U-Playlists geschrieben...
            </p>
          </div>
        </div>
      )}

      {/* Modal: Full-Auto Success Celebratory Modal */}
      {showAutoFixSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <div className="frosted-glass-modal rounded-3xl max-w-md w-full p-6 text-slate-100 text-center space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-14 h-14 rounded-2xl bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 mx-auto flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-white">
              Vollautomatisch erledigt!
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              Alle <strong>{multiDiscSets.length} Multi-Disk Spiele</strong> wurden in eigene Unterordner verschoben und passende <code className="bg-slate-800/80 px-1 py-0.5 rounded text-white font-bold border border-white/15">.m3u</code>-Playlists wurden direkt erstellt.
            </p>

            <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-bold backdrop-blur-xs">
              🎮 RetroArch & Batocera zeigen ab jetzt genau 1 sauberen Menüeintrag pro Spiel an!
            </div>

            <button
              onClick={() => setShowAutoFixSuccessModal(false)}
              className="w-full py-3 rounded-xl font-bold text-xs text-white bg-linear-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition cursor-pointer shadow-md shadow-violet-900/30"
            >
              Klasse, weiter zur Sammlung
            </button>
          </div>
        </div>
      )}

      {/* Modal: Activate Direct Disk Access */}
      {showIframeAccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <div className="frosted-glass-modal rounded-3xl max-w-lg w-full p-6 text-slate-100 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center text-xl shrink-0 shadow-md font-bold">
                  💿
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Direkten Schreibzugriff für Ordner erlauben
                  </h3>
                  <p className="text-xs text-slate-400">
                    {multiDiscSets.length} Multi-Disk Spiele vollautomatisch sortieren
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIframeAccessModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-violet-950/40 border border-violet-500/30 text-xs text-slate-300 space-y-2 leading-relaxed backdrop-blur-xs">
              <p className="font-bold text-violet-300">
                Damit Chrome Unterordner anlegen und Disketten verschieben darf:
              </p>
              <p>
                Im eingebetteten Vorschaufenster verweigert Google aus Sicherheitsgründen den Festplatten-Schreibzugriff.
                Öffne die App einfach in einem <strong>eigenen Tab</strong> – dort darf Chrome die Ordner und Playlists mit 1 Klick vollautomatisch schreiben!
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                onClick={() => {
                  window.open(window.location.href, '_blank');
                  setShowIframeAccessModal(false);
                }}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-linear-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-900/40 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>In eigenem Tab öffnen (100% Vollautomatisch)</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-white/10"></div>
                <span className="shrink mx-3 text-[11px] text-slate-500 font-medium">ODER</span>
                <div className="grow border-t border-white/10"></div>
              </div>

              <button
                onClick={() => {
                  const batContent = generateStandaloneMultiDiscBat(multiDiscSets, true);
                  downloadScriptFile(batContent, 'MultiDisk_Vollautomatisch.bat');
                  setShowIframeAccessModal(false);
                  showToast('1-Klick Datei heruntergeladen! Doppelklick genügt.', 'success');
                }}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-slate-200 bg-slate-900/50 hover:bg-slate-800 border border-white/15 backdrop-blur-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>⚡ Windows 1-Klick Batch herunterladen (Doppelklick genügt)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Destructive / Action Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        confirmVariant={confirmDialog.confirmVariant}
        onConfirm={confirmDialog.action}
        onCancel={() => setConfirmDialog((c) => ({ ...c, isOpen: false }))}
      />

      {/* System Verification & Confirmation Modal */}
      <SystemVerificationModal
        isOpen={isSystemVerificationModalOpen}
        folderName={pendingFolderName}
        roms={pendingVerificationRoms}
        onConfirm={handleConfirmVerifiedSystems}
        onCancel={handleCancelSystemVerification}
      />

      {/* Collection Export Modal (CSV & Markdown) */}
      <CollectionExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        roms={roms}
        folderName={folderName || 'ROMs'}
      />

      {/* Undo / Rollback Modal */}
      <UndoModal
        isOpen={isUndoModalOpen}
        onClose={() => setIsUndoModalOpen(false)}
        snapshots={undoSnapshots}
        onSnapshotsChange={(updated) => setUndoSnapshots(updated)}
        rootDirectoryHandle={directoryHandle}
        currentRoms={roms}
        onRomsRestored={(restoredRoms) => {
          setRoms(analyzeDuplicateGroups(restoredRoms, regionPref));
          showToast('Wiederherstellung erfolgreich abgeschlossen!', 'success');
        }}
      />

      {/* Side-Files Cleanup Modal (.nfo, .txt, .url, verwaiste .cue, Caches) */}
      <SideFileCleanupModal
        isOpen={isSideFileModalOpen}
        onClose={() => setIsSideFileModalOpen(false)}
        roms={roms}
        rootDirectoryHandle={directoryHandle}
        onRomsUpdated={(updatedRoms) => {
          setRoms(updatedRoms);
          showToast('Begleitdateien erfolgreich bereinigt!', 'success');
        }}
        onSnapshotCreated={(label, rollbackItems) => {
          const snapshot: UndoSnapshot = {
            id: `snap_${Date.now()}`,
            timestamp: Date.now(),
            label,
            folderName: folderName || 'ROMs',
            items: rollbackItems,
          };
          saveUndoSnapshot(snapshot);
          setUndoSnapshots(getStoredUndoSnapshots());
        }}
      />

      {/* Non-intrusive Toast Notification */}
      {toast && (
        <div
          role="alert"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl frosted-glass text-white text-xs font-medium shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-md"
        >
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toast.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          {(!toast.type || toast.type === 'info') && <Info className="w-4 h-4 text-indigo-400 shrink-0" />}
          <span className="flex-1 leading-snug">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

