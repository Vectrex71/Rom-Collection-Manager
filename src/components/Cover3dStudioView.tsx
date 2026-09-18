import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Download,
  FolderOpen,
  FolderPlus,
  FolderCheck,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  Box,
  Trash2,
  Search,
  LayoutGrid,
  List as ListIcon,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Check,
  ShieldCheck,
  AlertCircle,
  CheckSquare,
  Square,
  X,
  Info,
  Gauge,
  Sliders,
  Zap,
  FileCode,
  ExternalLink,
} from 'lucide-react';
import JSZip from 'jszip';
import {
  Cover3dStyle,
  Cover3dOptions,
  ConvertedCoverItem,
  SpineMode,
  SpineColorType,
  cleanGameTitle,
  downscaleImageToPng,
  loadImageFromFile,
  render3dBox,
  canvasToBlob,
} from '../utils/cover3dRenderer';
import { RomFile } from '../types';
import {
  CoverPreset,
  SYSTEM_COVER_PRESETS,
  getSavedCustomPresets,
  saveCustomPreset,
  deleteCustomPreset,
} from '../data/coverPresetsData';
import {
  parseGamelistXml,
  resolveCoverFilenameFromGamelist,
  GamelistParseResult,
} from '../utils/gamelistParser';

interface TemplateData {
  filename: string;
  width: number;
  height: number;
  isExisting: boolean;
  blob?: Blob;
  objectUrl?: string;
  lastModified?: number;
}

interface Cover3dStudioViewProps {
  onBackToManager: () => void;
  scannedRoms?: RomFile[];
  directoryHandle?: any;
  showToast?: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  initialCoverFile?: { file: File; rom?: RomFile } | null;
}

export const Cover3dStudioView: React.FC<Cover3dStudioViewProps> = ({
  onBackToManager,
  scannedRoms,
  directoryHandle,
  showToast,
  initialCoverFile,
}) => {
  const [items, setItems] = useState<ConvertedCoverItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [direction, setDirection] = useState<'left' | 'right'>('left');
  const [style, setStyle] = useState<Cover3dStyle>('standard');
  const [angle, setAngle] = useState<number>(26);
  const [spineWidthRatio, setSpineWidthRatio] = useState<number>(0.14);
  const [glossOpacity, setGlossOpacity] = useState<number>(0.24);
  const [shadowOpacity, setShadowOpacity] = useState<number>(0.45);
  const [spineMode, setSpineMode] = useState<SpineMode>('stretch');
  const [spineColorType, setSpineColorType] = useState<SpineColorType>('auto');
  const [templateData, setTemplateData] = useState<TemplateData | null>(null);

  // Vordefinierte Box Formate & eigene Presets
  const [customPresets, setCustomPresets] = useState<CoverPreset[]>(() => getSavedCustomPresets());
  const [selectedPresetId, setSelectedPresetId] = useState<string>('box_standard');
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');

  // gamelist.xml Integration (EmulationStation / RetroArch / Batocera / OnionOS)
  const [gamelistData, setGamelistData] = useState<GamelistParseResult | null>(null);
  const gamelistInputRef = useRef<HTMLInputElement>(null);

  // Performance Downscaling Modal State (Strictly PNG, preserving Aspect Ratio, skipping Template.png)
  const [isDownscaleModalOpen, setIsDownscaleModalOpen] = useState(false);
  const [targetMaxDimension, setTargetMaxDimension] = useState<number>(600);
  const [isDownscaling, setIsDownscaling] = useState(false);
  const [downscaleProgress, setDownscaleProgress] = useState<{ current: number; total: number; filename: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid');
  const [filterOnlyNew, setFilterOnlyNew] = useState<boolean>(true);

  // DOM-Optimierung / Pagination (Für Sammlungen mit hunderten/tausenden Covers)
  const [catalogPage, setCatalogPage] = useState<number>(1);
  const [catalogPageSize, setCatalogPageSize] = useState<number>(48);

  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  // Direct Folder Save & 2D Clean State
  const [sourceDirectoryHandle, setSourceDirectoryHandle] = useState<any>(directoryHandle || null);
  const [sourceFolderName, setSourceFolderName] = useState<string>(directoryHandle?.name || '');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSavingToFolder, setIsSavingToFolder] = useState(false);
  const [saveProgress, setSaveProgress] = useState<{ current: number; total: number; filename: string } | null>(null);
  const [delete2dOriginals, setDelete2dOriginals] = useState<boolean>(true);
  const [createSubfolderCovers, setCreateSubfolderCovers] = useState<boolean>(true);
  const [includeTemplate, setIncludeTemplate] = useState<boolean>(true);
  const [isIframeRestrictionModalOpen, setIsIframeRestrictionModalOpen] = useState(false);

  // Check if app is embedded in an iframe (e.g. AI Studio preview simulator)
  const isRunningInIframe = typeof window !== 'undefined' && window.self !== window.top;

  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Stats
  const newItemsCount = useMemo(() => items.filter((i) => i.isNew).length, [items]);
  const alreadyConvertedCount = useMemo(() => items.filter((i) => i.alreadyConverted).length, [items]);

  // Filtered items list
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterOnlyNew && item.alreadyConverted) return false;
      if (statusFilter === 'pending' && item.status === 'done') return false;
      if (statusFilter === 'done' && item.status !== 'done') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.filename.toLowerCase().includes(q) || item.originalName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [items, filterOnlyNew, statusFilter, searchQuery]);

  // Reset pagination on filter or search query change
  useEffect(() => {
    setCatalogPage(1);
  }, [searchQuery, statusFilter, filterOnlyNew, catalogPageSize]);

  // Paged items for DOM virtualization / performance
  const totalCatalogPages = Math.max(1, Math.ceil(filteredItems.length / (catalogPageSize > 0 ? catalogPageSize : 1)));
  const safeCatalogPage = Math.min(catalogPage, totalCatalogPages);
  const pagedItems = useMemo(() => {
    if (catalogPageSize <= 0 || catalogPageSize >= filteredItems.length) return filteredItems;
    const start = (safeCatalogPage - 1) * catalogPageSize;
    return filteredItems.slice(start, start + catalogPageSize);
  }, [filteredItems, safeCatalogPage, catalogPageSize]);

  // Combined Presets
  const allAvailablePresets = useMemo(() => {
    return [...SYSTEM_COVER_PRESETS, ...customPresets];
  }, [customPresets]);

  const activePreset = useMemo(() => {
    return allAvailablePresets.find((p) => p.id === selectedPresetId) || SYSTEM_COVER_PRESETS[0];
  }, [allAvailablePresets, selectedPresetId]);

  const handleApplyPreset = (preset: CoverPreset) => {
    setSelectedPresetId(preset.id);
    setStyle(preset.style);
    setDirection(preset.direction);
    setAngle(preset.angle);
    setSpineWidthRatio(preset.spineWidthRatio);
    setGlossOpacity(preset.glossOpacity);
    setShadowOpacity(preset.shadowOpacity);
    setSpineMode(preset.spineMode);
    setSpineColorType(preset.spineColorType);

    // Invalidate rendered canvas/url so active preview & batch render adapt immediately
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        renderedCanvas: undefined,
        renderedDataUrl: undefined,
        status: 'pending',
      }))
    );

    if (showToast) {
      showToast(`Design-Vorlage "${preset.name}" angewendet!`, 'info');
    }
  };

  const handleSaveCurrentAsPreset = () => {
    if (!newPresetName.trim()) return;
    const newPreset: CoverPreset = {
      id: `custom_${Date.now()}`,
      name: newPresetName.trim(),
      system: 'Benutzerdefiniert',
      description: `Eigenes Profil: ${angle}° Winkel, ${Math.round(spineWidthRatio * 100)}% Rücken.`,
      icon: '⭐',
      style,
      direction,
      angle,
      spineWidthRatio,
      glossOpacity,
      shadowOpacity,
      spineMode,
      spineColorType,
      isCustom: true,
    };
    const updated = saveCustomPreset(newPreset);
    setCustomPresets(updated);
    setSelectedPresetId(newPreset.id);
    setIsSavePresetModalOpen(false);
    setNewPresetName('');
    if (showToast) {
      showToast(`Preset "${newPreset.name}" dauerhaft gespeichert!`, 'success');
    }
  };

  const handleDeleteCustomPreset = (presetId: string) => {
    const updated = deleteCustomPreset(presetId);
    setCustomPresets(updated);
    setSelectedPresetId('box_standard');
    if (showToast) {
      showToast('Eigenes Preset gelöscht.', 'info');
    }
  };

  // Selected active item
  const activeItem = useMemo(() => {
    if (!selectedItemId && filteredItems.length > 0) return filteredItems[0];
    return filteredItems.find((i) => i.id === selectedItemId) || filteredItems[0] || null;
  }, [filteredItems, selectedItemId]);

  // Active item index for prev/next buttons
  const activeIndex = useMemo(() => {
    if (!activeItem) return -1;
    return filteredItems.findIndex((i) => i.id === activeItem.id);
  }, [filteredItems, activeItem]);

  const doneCount = useMemo(() => filteredItems.filter((i) => i.status === 'done').length, [filteredItems]);
  const pendingCount = filteredItems.length - doneCount;

  // Update canvas preview when active item or parameters change
  useEffect(() => {
    if (!activeItem || !activeItem.originalImage || !previewCanvasRef.current) return;

    const options: Cover3dOptions = {
      style,
      direction,
      angle,
      spineWidthRatio,
      glossOpacity,
      shadowOpacity,
      spineMode,
      spineColorType,
      spineTitleText: activeItem.filename,
      templateDimensions: templateData ? { width: templateData.width, height: templateData.height } : undefined,
      outputWidth: 720,
      outputHeight: 720,
    };

    const renderedCanvas = render3dBox(activeItem.originalImage, options);

    const targetCanvas = previewCanvasRef.current;
    targetCanvas.width = renderedCanvas.width;
    targetCanvas.height = renderedCanvas.height;
    const ctx = targetCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
      ctx.drawImage(renderedCanvas, 0, 0);
    }
  }, [activeItem, style, direction, angle, spineWidthRatio, glossOpacity, shadowOpacity, spineMode, spineColorType, templateData]);

  // Handle file uploads (discovered files from folder picker, drag-drop or file input)
  const loadDiscoveredFiles = async (
    discovered: Array<{ file: File; fileHandle?: any; parentDirHandle?: any }>
  ) => {
    if (discovered.length === 0) return;

    const allImageFiles = discovered.map((d) => d.file);

    // 1. Check if there is already a Template.png in the folder
    const existingTemplateItem = discovered.find((d) =>
      /^template\.(png|jpe?g|webp|bmp)$/i.test(d.file.name)
    );

    let activeTemplate: TemplateData | null = null;

    if (existingTemplateItem) {
      // Existing Template.png found!
      // Its modification date is the master cutoff: covers newer than Template.png were added
      // afterwards (new 2D covers). Covers older or equal to Template.png are already converted 3D covers.
      try {
        const { img, objectUrl } = await loadImageFromFile(existingTemplateItem.file);
        activeTemplate = {
          filename: 'Template.png',
          width: img.width,
          height: img.height,
          isExisting: true,
          blob: existingTemplateItem.file,
          objectUrl,
          lastModified: existingTemplateItem.file.lastModified,
        };
      } catch (err) {
        console.error('Error loading existing Template.png', err);
      }
    } else {
      // No Template.png: this is the first time this folder is converted.
      // Take the first 2D cover image as baseline template.
      const firstSource = discovered.find(
        (d) => !/^template\./i.test(d.file.name)
      ) || discovered[0];

      try {
        const { img, objectUrl } = await loadImageFromFile(firstSource.file);
        activeTemplate = {
          filename: 'Template.png',
          width: img.width,
          height: img.height,
          isExisting: false,
          blob: firstSource.file,
          objectUrl,
          lastModified: firstSource.file.lastModified,
        };
      } catch (err) {
        console.error('Error generating template from 1st cover', err);
      }
    }

    if (activeTemplate) {
      setTemplateData(activeTemplate);
    }

    // Cutoff timestamp:
    // When Template.png exists, covers newer than the template are new 2D additions.
    const cutoffTimestamp = existingTemplateItem ? existingTemplateItem.file.lastModified : 0;

    // Filter candidate cover files:
    // All image files except Template.png itself!
    // Game cover filenames remain 1:1 identical to ROM names (e.g. SuperMario.png).
    const candidateItems = discovered.filter(
      (d) => !/^template\.(png|jpe?g|webp|bmp)$/i.test(d.file.name)
    );

    const newItems: ConvertedCoverItem[] = [];
    for (const item of candidateItems) {
      try {
        const { img, objectUrl } = await loadImageFromFile(item.file);

        // Date-based recognition:
        // If Template.png exists in the folder, files modified AFTER Template.png (+ 2s tolerance)
        // are newly added 2D covers. Older/equal files are already converted 3D covers.
        const isNew = cutoffTimestamp > 0
          ? item.file.lastModified > cutoffTimestamp + 2000
          : true;
        const alreadyConverted = !isNew;

        newItems.push({
          id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          filename: item.file.name,
          originalName: item.file.name,
          originalImage: img,
          objectUrl,
          status: 'pending',
          lastModified: item.file.lastModified,
          isNew,
          alreadyConverted,
          fileHandle: item.fileHandle,
          parentDirHandle: item.parentDirHandle,
        });
      } catch (err) {
        console.error('Failed loading image', item.file.name, err);
      }
    }

    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems]);
      // Default to showing new covers if any new covers exist
      const hasAnyNew = newItems.some((i) => i.isNew);
      if (hasAnyNew) {
        setFilterOnlyNew(true);
        const firstNew = newItems.find((i) => i.isNew);
        if (firstNew) setSelectedItemId(firstNew.id);
      } else {
        setFilterOnlyNew(false);
        if (!selectedItemId) setSelectedItemId(newItems[0].id);
      }
      if (showToast) {
        showToast(`${newItems.length} Covers erfolgreich eingelesen.`, 'info');
      }
    }
  };

  // When opened with a specific cover from RomCatalog
  useEffect(() => {
    if (initialCoverFile) {
      loadDiscoveredFiles([{ file: initialCoverFile.file }]);
    }
  }, [initialCoverFile]);

  // Fallback for file input & drag and drop
  const handleFilesAdded = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const allFiles = Array.from(fileList);

    // Auto-detect gamelist.xml
    const xmlFile = allFiles.find((f) => /\.xml$/i.test(f.name));
    if (xmlFile) {
      try {
        const text = await xmlFile.text();
        const parsed = parseGamelistXml(text, xmlFile.name);
        setGamelistData(parsed);
        if (showToast) {
          showToast(`gamelist.xml verknüpft: ${parsed.totalGames} Spiele, ${parsed.totalWithImages} Cover-Pfade gefunden!`, 'success');
        }
      } catch (err) {
        console.warn('gamelist.xml parse error', err);
      }
    }

    const discovered = allFiles
      .filter((f) => /\.(jpe?g|png|webp|bmp|gif)$/i.test(f.name))
      .map((file) => ({ file }));
    await loadDiscoveredFiles(discovered);
  };

  // Native folder selection using File System Access API with readwrite permissions
  const handleSelectCoverFolder = async () => {
    if (typeof (window as any).showDirectoryPicker === 'function') {
      try {
        const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
        setSourceDirectoryHandle(dirHandle);
        setSourceFolderName(dirHandle.name);

        const discovered: Array<{
          file: File;
          fileHandle: any;
          parentDirHandle: any;
        }> = [];

        for await (const [name, handle] of dirHandle.entries()) {
          if (name.startsWith('.')) continue;

          // Auto-read gamelist.xml if present in folder
          if (handle.kind === 'file' && /\.xml$/i.test(name)) {
            try {
              const xmlFile = await (handle as any).getFile();
              const text = await xmlFile.text();
              const parsed = parseGamelistXml(text, xmlFile.name);
              setGamelistData(parsed);
              if (showToast) {
                showToast(`gamelist.xml automatisch verknüpft: ${parsed.totalGames} Spiele, ${parsed.totalWithImages} Cover-Pfade!`, 'success');
              }
            } catch (xmlErr) {
              console.warn('gamelist.xml read error:', xmlErr);
            }
          }

          if (handle.kind === 'file' && /\.(jpe?g|png|webp|bmp|gif)$/i.test(name)) {
            const file = await handle.getFile();
            discovered.push({ file, fileHandle: handle, parentDirHandle: dirHandle });
          } else if (handle.kind === 'directory' && /^covers$/i.test(name)) {
            // Also inspect 'Covers' subfolder if user selected the ROM system folder
            for await (const [subName, subHandle] of handle.entries()) {
              if (subName.startsWith('.')) continue;
              if (subHandle.kind === 'file' && /\.(jpe?g|png|webp|bmp|gif)$/i.test(subName)) {
                const file = await subHandle.getFile();
                discovered.push({ file, fileHandle: subHandle, parentDirHandle: handle });
              }
            }
          }
        }

        if (discovered.length === 0) {
          if (showToast) showToast('Keine Bilddateien in diesem Ordner gefunden.', 'info');
          return;
        }

        await loadDiscoveredFiles(discovered);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('showDirectoryPicker failed or aborted, falling back to input:', err);
      }
    }
    folderInputRef.current?.click();
  };

  // Allow selecting an alternative folder for saving
  const handleChooseCustomTargetFolder = async () => {
    if (typeof (window as any).showDirectoryPicker === 'function') {
      try {
        const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
        setSourceDirectoryHandle(handle);
        setSourceFolderName(handle.name);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        const isIframeErr =
          err.name === 'SecurityError' ||
          String(err?.message || err).toLowerCase().includes('cross origin') ||
          String(err?.message || err).toLowerCase().includes('sub frame');
        if (isIframeErr) {
          setIsIframeRestrictionModalOpen(true);
          return;
        }
        console.warn('Target folder pick error:', err);
      }
    }
  };

  // Clear all covers and reset template
  const handleClearAll = () => {
    items.forEach((item) => {
      if (item.objectUrl) URL.revokeObjectURL(item.objectUrl);
    });
    if (templateData?.objectUrl) {
      URL.revokeObjectURL(templateData.objectUrl);
    }
    setItems([]);
    setTemplateData(null);
    setSelectedItemId(null);
  };

  // Batch process active covers
  const handleBatchConvertAll = async () => {
    const targets = filteredItems;
    if (targets.length === 0) return;

    setIsProcessingBatch(true);
    setBatchProgress({ current: 0, total: targets.length });

    const baseOptions: Cover3dOptions = {
      style,
      direction,
      angle,
      spineWidthRatio,
      glossOpacity,
      shadowOpacity,
      spineMode,
      spineColorType,
      templateDimensions: templateData ? { width: templateData.width, height: templateData.height } : undefined,
      outputWidth: 720,
      outputHeight: 720,
    };

    const targetIds = new Set(targets.map((t) => t.id));
    const updated = [...items];

    let processedCount = 0;
    for (let i = 0; i < updated.length; i++) {
      const item = updated[i];
      if (!targetIds.has(item.id)) continue;

      try {
        const itemOptions = { ...baseOptions, spineTitleText: item.filename };
        const canvas = render3dBox(item.originalImage, itemOptions);
        const dataUrl = canvas.toDataURL('image/png');
        updated[i] = {
          ...item,
          renderedCanvas: canvas,
          renderedDataUrl: dataUrl,
          status: 'done',
        };
      } catch (err) {
        console.error('Error rendering cover for', item.filename, err);
      }

      processedCount++;
      if (processedCount % 2 === 0 || processedCount === targets.length) {
        setBatchProgress({ current: processedCount, total: targets.length });
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    setItems(updated);
    setIsProcessingBatch(false);
    setBatchProgress(null);
  };

  // Download single active item
  const handleDownloadSingle = async () => {
    if (!activeItem) return;

    const options: Cover3dOptions = {
      style,
      direction,
      angle,
      spineWidthRatio,
      glossOpacity,
      shadowOpacity,
      spineMode,
      spineColorType,
      spineTitleText: activeItem.filename,
      templateDimensions: templateData ? { width: templateData.width, height: templateData.height } : undefined,
      outputWidth: 800,
      outputHeight: 800,
    };

    const canvas = render3dBox(activeItem.originalImage, options);
    const blob = await canvasToBlob(canvas);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const baseName = activeItem.filename.replace(/\.[^/.]+$/, '');
    // 1:1 ROM-matching filename (e.g. SuperMario.png) without "(3D)" suffix for frontend compatibility
    a.download = `${baseName}.png`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Direct Folder Save: Writes 3D covers to a "Covers" folder and deletes 2D originals if requested
  const handleExecuteSaveToFolder = async () => {
    const targets = filteredItems;
    if (targets.length === 0) return;

    setIsSavingToFolder(true);
    setSaveProgress({ current: 0, total: targets.length, filename: '' });

    try {
      let baseHandle = sourceDirectoryHandle;
      if (!baseHandle) {
        if (typeof (window as any).showDirectoryPicker !== 'function') {
          alert(
            'Dein Browser unterstützt direkten Festplattenzugriff leider nicht. Bitte nutze Chrome, Edge oder Brave oder lade das ZIP-Archiv herunter.'
          );
          setIsSavingToFolder(false);
          return;
        }
        baseHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
        setSourceDirectoryHandle(baseHandle);
        setSourceFolderName(baseHandle.name);
      }

      // Target directory handle: create "Covers" subfolder unless selected folder is already named Covers
      let targetDirHandle = baseHandle;
      const isAlreadyCovers = /^covers$/i.test(baseHandle.name);
      if (createSubfolderCovers && !isAlreadyCovers) {
        targetDirHandle = await baseHandle.getDirectoryHandle('Covers', { create: true });
      }

      const baseOptions: Cover3dOptions = {
        style,
        direction,
        angle,
        spineWidthRatio,
        glossOpacity,
        shadowOpacity,
        spineMode,
        spineColorType,
        templateDimensions: templateData ? { width: templateData.width, height: templateData.height } : undefined,
        outputWidth: 800,
        outputHeight: 800,
      };

      // 1. Write Template.png to targetDirHandle if requested
      if (includeTemplate && templateData?.blob) {
        try {
          const tFile = await targetDirHandle.getFileHandle('Template.png', { create: true });
          const tWrite = await tFile.createWritable();
          await tWrite.write(templateData.blob);
          await tWrite.close();
        } catch (tErr) {
          console.warn('Template.png write warning:', tErr);
        }
      }

      let savedCount = 0;
      let deleted2dCount = 0;
      const updatedItems = [...items];

      for (let i = 0; i < targets.length; i++) {
        const item = targets[i];
        setSaveProgress({ current: i + 1, total: targets.length, filename: item.filename });

        let canvas = item.renderedCanvas;
        if (!canvas) {
          canvas = render3dBox(item.originalImage, { ...baseOptions, spineTitleText: item.filename });
        }
        const blob = await canvasToBlob(canvas);
        if (!blob) continue;

        const xmlResolvedName = resolveCoverFilenameFromGamelist(item.filename, gamelistData);
        const baseName = item.filename.replace(/\.[^/.]+$/, '');
        const outFilename = xmlResolvedName ? xmlResolvedName : `${baseName}.png`;

        // Write 3D file to target directory
        const fileHandle = await targetDirHandle.getFileHandle(outFilename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        savedCount++;

        // 2. Delete original 2D file if requested
        if (delete2dOriginals) {
          if (item.parentDirHandle && item.parentDirHandle !== targetDirHandle) {
            try {
              await item.parentDirHandle.removeEntry(item.originalName || item.filename);
              deleted2dCount++;
            } catch (delErr) {
              console.warn('Could not delete original 2D file:', item.filename, delErr);
            }
          } else if (item.parentDirHandle === targetDirHandle) {
            if (item.filename.toLowerCase() !== outFilename.toLowerCase()) {
              try {
                await item.parentDirHandle.removeEntry(item.originalName || item.filename);
                deleted2dCount++;
              } catch (delErr) {
                console.warn('Could not delete original 2D file:', item.filename, delErr);
              }
            } else {
              deleted2dCount++;
            }
          }
        }

        const itemIdx = updatedItems.findIndex((it) => it.id === item.id);
        if (itemIdx !== -1) {
          updatedItems[itemIdx] = {
            ...updatedItems[itemIdx],
            status: 'done',
            alreadyConverted: true,
            isNew: false,
            renderedCanvas: canvas,
          };
        }
      }

      setItems(updatedItems);
      setIsSaveModalOpen(false);

      const summaryMessage = `${savedCount} 3D-Covers im Ordner '${targetDirHandle.name}' gespeichert!${
        deleted2dCount > 0 ? ` (${deleted2dCount} 2D-Originale bereinigt)` : ''
      }`;
      if (showToast) {
        showToast(summaryMessage, 'success');
      }

      // Proaktiv nach getaner Arbeit fragen, ob die Images für flüssige Handheld-Performance verkleinert werden sollen
      setTimeout(() => {
        setIsDownscaleModalOpen(true);
      }, 500);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      const isIframeErr =
        err.name === 'SecurityError' ||
        String(err?.message || err).toLowerCase().includes('cross origin') ||
        String(err?.message || err).toLowerCase().includes('sub frame') ||
        String(err?.message || err).toLowerCase().includes('showdirectorypicker');

      if (isIframeErr) {
        setIsIframeRestrictionModalOpen(true);
        return;
      }
      console.error('Error saving covers to folder:', err);
      if (showToast) {
        showToast(`Fehler beim Speichern in Ordner: ${err.message || err}`, 'error');
      }
    } finally {
      setIsSavingToFolder(false);
      setSaveProgress(null);
    }
  };

  // Downscale images strictly as PNG, preserving aspect ratio, leaving Template.png intact
  const handleExecuteDownscale = async (selectedDimension: number = targetMaxDimension) => {
    if (items.length === 0) return;
    setIsDownscaling(true);
    setDownscaleProgress({ current: 0, total: items.length, filename: '' });

    try {
      let targetDirHandle: any = null;
      if (sourceDirectoryHandle) {
        try {
          const isAlreadyCovers = /^covers$/i.test(sourceDirectoryHandle.name);
          targetDirHandle = isAlreadyCovers
            ? sourceDirectoryHandle
            : await sourceDirectoryHandle.getDirectoryHandle('Covers', { create: false });
        } catch {
          targetDirHandle = sourceDirectoryHandle;
        }
      }

      let scaledCount = 0;
      let skippedTemplateCount = 0;
      const updated = [...items];

      for (let i = 0; i < updated.length; i++) {
        const item = updated[i];
        setDownscaleProgress({ current: i + 1, total: updated.length, filename: item.filename });

        // MANDATE: Never touch Template.png! Keep original resolution
        if (/^template\.png$/i.test(item.filename)) {
          skippedTemplateCount++;
          continue;
        }

        // Image to downscale: prefer renderedCanvas/renderedBlob, fallback to originalImage
        const source = item.renderedCanvas || item.renderedBlob || item.originalImage;
        if (!source) continue;

        try {
          const result = await downscaleImageToPng(source, selectedDimension);
          if (result.scaled) {
            scaledCount++;
            const dataUrl = URL.createObjectURL(result.blob);
            updated[i] = {
              ...item,
              renderedBlob: result.blob,
              renderedDataUrl: dataUrl,
            };

            // If filesystem handle is present, write optimized PNG back
            if (targetDirHandle) {
              try {
                const baseName = item.filename.replace(/\.[^/.]+$/, '');
                const outFilename = `${baseName}.png`;
                const fileHandle = await targetDirHandle.getFileHandle(outFilename, { create: false });
                const writable = await fileHandle.createWritable();
                await writable.write(result.blob);
                await writable.close();
              } catch (fsErr) {
                // If not saved to folder yet, memory update is sufficient
              }
            }
          }
        } catch (scaleErr) {
          console.warn('Downscaling error for', item.filename, scaleErr);
        }

        if (i % 3 === 0) {
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      setItems(updated);
      setIsDownscaleModalOpen(false);

      if (showToast) {
        showToast(
          `${scaledCount} Cover auf max. ${selectedDimension}px (PNG) optimiert! Template.png blieb unberührt.`,
          'success'
        );
      }
    } catch (err: any) {
      console.error('Downscaling error:', err);
      if (showToast) {
        showToast(`Fehler bei der Bildverkleinerung: ${err.message || err}`, 'error');
      }
    } finally {
      setIsDownscaling(false);
      setDownscaleProgress(null);
    }
  };

  // Download all as ZIP (packs cleanly into a "Covers/" folder within the ZIP archive)
  const handleDownloadAllZip = async () => {
    const targets = filteredItems;
    if (targets.length === 0) return;
    setIsZipping(true);

    try {
      const zip = new JSZip();
      const coversFolder = zip.folder('Covers') || zip;

      const baseOptions: Cover3dOptions = {
        style,
        direction,
        angle,
        spineWidthRatio,
        glossOpacity,
        shadowOpacity,
        spineMode,
        spineColorType,
        templateDimensions: templateData ? { width: templateData.width, height: templateData.height } : undefined,
        outputWidth: 800,
        outputHeight: 800,
      };

      // 1. Include unchanged copy of Template.png in the ZIP
      if (templateData?.blob) {
        coversFolder.file('Template.png', templateData.blob);
      }

      // 2. Render all targets with uniform template proportions
      // Filename must match ROM 1:1 (e.g. SuperMario.png) without "(3D)" for frontend compatibility
      for (const item of targets) {
        let canvas = item.renderedCanvas;
        if (!canvas) {
          canvas = render3dBox(item.originalImage, { ...baseOptions, spineTitleText: item.filename });
        }
        const blob = await canvasToBlob(canvas);
        if (blob) {
          const xmlResolvedName = resolveCoverFilenameFromGamelist(item.filename, gamelistData);
          const baseName = item.filename.replace(/\.[^/.]+$/, '');
          const outFilename = xmlResolvedName ? xmlResolvedName : `${baseName}.png`;
          coversFolder.file(outFilename, blob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.download = `Covers_${new Date().toISOString().slice(0, 10)}.zip`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed generating zip', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Top Workspace Bar */}
      <div className="frosted-glass rounded-2xl p-5 border border-fuchsia-500/30 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBackToManager}
              className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 transition cursor-pointer shrink-0"
              title="Zurück zum ROM Manager"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-fuchsia-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-fuchsia-900/40 shrink-0">
              <Box className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                3D Cover Studio
              </h1>
              <p className="text-xs text-slate-300 line-clamp-1">
                Wandle hunderte oder tausende flache 2D-Cover im Handumdrehen in plastische 3D-Boxen mit Spine & Glanzeffekten um.
              </p>
            </div>
          </div>

          {items.length > 0 && (
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-950/80 border border-white/10">
              <span className="text-slate-400">Status:</span>
              <span className="text-fuchsia-300 font-bold">{items.length} Covers</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-bold">{alreadyConvertedCount} 3D-Bereit</span>
            </div>
          )}
        </div>

        {/* Global Action Toolbar - flex-wrap ensures no buttons are ever clipped or hidden */}
        <div className="flex items-center gap-2.5 flex-wrap pt-3.5 border-t border-white/10">
          <input
            type="file"
            ref={folderInputRef}
            // @ts-ignore
            webkitdirectory=""
            // @ts-ignore
            directory=""
            onChange={(e) => handleFilesAdded(e.target.files)}
            className="hidden"
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFilesAdded(e.target.files)}
            multiple
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
          />
          <input
            type="file"
            ref={gamelistInputRef}
            accept=".xml,text/xml"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                try {
                  const text = await file.text();
                  const parsed = parseGamelistXml(text, file.name);
                  setGamelistData(parsed);
                  if (showToast) {
                    showToast(`gamelist.xml verknüpft: ${parsed.totalGames} Spiele, ${parsed.totalWithImages} Cover-Pfade!`, 'success');
                  }
                } catch (err) {
                  if (showToast) showToast('Fehler beim Lesen der gamelist.xml', 'error');
                }
              }
            }}
            className="hidden"
          />

          <button
            id="btn-workspace-add-folder"
            onClick={handleSelectCoverFolder}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/15 transition cursor-pointer flex items-center gap-1.5 shrink-0"
            title="Wähle einen Cover-Ordner (direkter Schreibzugriff für automatische Erstellung und Bereinigung)"
          >
            <FolderOpen className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>Cover-Ordner</span>
          </button>

          <button
            id="btn-workspace-load-gamelist"
            onClick={() => gamelistInputRef.current?.click()}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              gamelistData
                ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300 shadow-md shadow-cyan-950/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-white/15'
            }`}
            title="Lade gamelist.xml (Cover-Dateinamen werden automatisch 1:1 an die XML angepasst, sodass alle Spiele gefunden werden)"
          >
            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {gamelistData
                ? `✓ gamelist.xml (${gamelistData.totalWithImages} Covers verknüpft)`
                : 'gamelist.xml laden'}
            </span>
          </button>

          {items.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-rose-500/20 transition cursor-pointer flex items-center gap-1 shrink-0"
              title="Alle geladenen Covers aus der Liste entfernen"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Leeren</span>
            </button>
          )}

          <div className="h-5 w-px bg-white/10 hidden sm:block mx-0.5" />

          <button
            id="btn-workspace-convert-all"
            disabled={filteredItems.length === 0 || isProcessingBatch}
            onClick={handleBatchConvertAll}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-linear-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 disabled:opacity-50 text-white shadow-md shadow-fuchsia-900/40 transition cursor-pointer flex items-center gap-2 shrink-0 whitespace-nowrap"
            title="Berechnet die 3D-Vorschau für alle geladenen Covers"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>
              {isProcessingBatch
                ? `Rendere ${batchProgress?.current}/${batchProgress?.total}...`
                : filterOnlyNew && alreadyConvertedCount > 0
                ? `Nur ${filteredItems.length} neue rendern`
                : `Alle ${filteredItems.length} rendern`}
            </span>
          </button>

          <button
            id="btn-workspace-save-folder"
            disabled={filteredItems.length === 0 || isSavingToFolder}
            onClick={() => setIsSaveModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white shadow-md shadow-emerald-950/40 transition cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap"
            title="Erstellt den Ordner 'Covers' und speichert alle 3D-Boxen direkt auf die Festplatte"
          >
            <FolderPlus className="w-3.5 h-3.5 text-emerald-200" />
            <span>
              {isSavingToFolder
                ? 'Speichere in Covers...'
                : `In 'Covers' speichern (${filteredItems.length})`}
            </span>
          </button>

          <div className="h-5 w-px bg-white/10 hidden sm:block mx-0.5" />

          <button
            id="btn-workspace-downscale"
            disabled={items.length === 0 || isDownscaling}
            onClick={() => setIsDownscaleModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-sky-200 border border-sky-500/30 transition cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap shadow-sm hover:border-sky-400/50"
            title="Verkleinert Cover-Bilder für flüssige Handheld-Performance (PNG, behält Proportionen, lässt Template.png unberührt)"
          >
            <Gauge className="w-3.5 h-3.5 text-sky-400" />
            <span>{isDownscaling ? 'Optimiere...' : 'Handheld-Größe (PNG)'}</span>
          </button>

          <button
            id="btn-workspace-download-zip"
            disabled={filteredItems.length === 0 || isZipping}
            onClick={handleDownloadAllZip}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-white/15 transition cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap"
            title="Alternativ: Als ZIP-Archiv mit 'Covers/'-Ordnerstruktur herunterladen"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>{isZipping ? 'Packe ZIP...' : `ZIP Archiv`}</span>
          </button>
        </div>
      </div>

      {/* Main Spacious Studio Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Mass Catalog & File Browser (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Smart New-Cover Detection & Protection Banner */}
          {items.length > 0 && alreadyConvertedCount > 0 && (
            <div className="frosted-glass rounded-2xl p-4 border border-fuchsia-500/40 bg-slate-950/85 space-y-2.5 shadow-lg">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-xs font-bold text-white tracking-wide">
                    Intelligenter Cover-Schutz aktiv
                  </span>
                  {templateData?.isExisting && templateData.lastModified && (
                    <span className="text-[10px] text-fuchsia-300 font-mono px-2 py-0.5 rounded-full bg-fuchsia-950/60 border border-fuchsia-500/20">
                      Basis: Template.png ({new Date(templateData.lastModified).toLocaleDateString('de-DE')})
                    </span>
                  )}
                </div>

                <div className="inline-flex rounded-lg p-0.5 bg-slate-900 border border-white/10 text-xs">
                  <button
                    onClick={() => setFilterOnlyNew(true)}
                    className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                      filterOnlyNew
                        ? 'bg-fuchsia-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ★ Nur neue Covers ({newItemsCount})
                  </button>
                  <button
                    onClick={() => setFilterOnlyNew(false)}
                    className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                      !filterOnlyNew
                        ? 'bg-fuchsia-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Alle anzeigen ({items.length})
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/60 rounded-xl p-2.5 border border-white/5 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  {filterOnlyNew ? (
                    <span>
                      <strong className="text-emerald-400">{newItemsCount} neue Covers</strong> wurden anhand des Änderungsdatums (neuer als Template.png) identifiziert.{' '}
                      <span className="text-slate-300">
                        {alreadyConvertedCount} bestehende Covers sind älter/gleich alt und werden geschützt (keine Doppelberechnung).
                      </span>{' '}
                      <span className="text-emerald-300 font-medium">
                        Dateinamen bleiben 1:1 identisch zum ROM (z. B. SuperMario.png) für sofortige Frontend-Erkennung.
                      </span>
                    </span>
                  ) : (
                    <span>
                      Es werden alle <strong className="text-white">{items.length} Covers</strong> angezeigt. Bereits konvertierte Covers sind mit einem Badge markiert und behalten ihren exakten ROM-Dateinamen.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Controls Bar: Search, Status Filters, Display Toggle */}
          <div className="frosted-glass rounded-2xl p-4 border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Covers filtern..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950/60 border border-white/15 rounded-xl text-white placeholder-slate-400 focus:outline-hidden focus:border-fuchsia-400"
                />
              </div>

              {/* Status filter tabs & View mode toggle */}
              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                <div className="inline-flex rounded-lg p-0.5 bg-slate-950/70 border border-white/10 text-xs">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                      statusFilter === 'all'
                        ? 'bg-fuchsia-600 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Alle ({items.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('pending')}
                    className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                      statusFilter === 'pending'
                        ? 'bg-fuchsia-600 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Bereit ({pendingCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('done')}
                    className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                      statusFilter === 'done'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Fertig ({doneCount})
                  </button>
                </div>

                <div className="inline-flex rounded-lg p-0.5 bg-slate-950/70 border border-white/10 text-xs">
                  <button
                    onClick={() => setDisplayMode('grid')}
                    className={`p-1.5 rounded-md transition cursor-pointer ${
                      displayMode === 'grid'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Kachel-Raster"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDisplayMode('list')}
                    className={`p-1.5 rounded-md transition cursor-pointer ${
                      displayMode === 'list'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Listen-Ansicht"
                  >
                    <ListIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Dropzone hint */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFilesAdded(e.dataTransfer.files);
              }}
              onClick={() => folderInputRef.current?.click()}
              className="border border-dashed border-white/15 hover:border-fuchsia-500/50 rounded-xl py-2 px-3 text-center transition cursor-pointer bg-slate-950/30 flex items-center justify-center gap-2"
            >
              <FolderOpen className="w-4 h-4 text-fuchsia-400/80" />
              <p className="text-xs text-slate-300 font-medium">
                Cover-Ordner oder Bild-Dateien (.png, .jpg, .webp) per Drag & Drop hier ablegen
              </p>
            </div>
          </div>

          {/* Catalog View Area */}
          <div className="frosted-glass rounded-2xl p-4 border border-white/10 min-h-[500px] max-h-[750px] overflow-y-auto flex flex-col gap-3">
            {/* Top Pagination & Info Bar */}
            {filteredItems.length > 0 && (
              <div className="flex items-center justify-between gap-3 pb-2 border-b border-white/10 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Pro Seite:</span>
                  <select
                    value={catalogPageSize}
                    onChange={(e) => setCatalogPageSize(Number(e.target.value))}
                    className="bg-slate-900 border border-white/15 rounded-md px-2 py-0.5 text-xs text-white cursor-pointer"
                  >
                    <option value={24}>24 Covers</option>
                    <option value={48}>48 Covers</option>
                    <option value={96}>96 Covers</option>
                    <option value={0}>Alle ({filteredItems.length})</option>
                  </select>
                </div>

                {catalogPageSize > 0 && totalCatalogPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={safeCatalogPage <= 1}
                      onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
                      className="px-2 py-0.5 rounded bg-slate-800 disabled:opacity-30 hover:bg-slate-700 text-white cursor-pointer"
                    >
                      ◀
                    </button>
                    <span className="font-mono text-xs text-slate-300">
                      {safeCatalogPage} / {totalCatalogPages}
                    </span>
                    <button
                      disabled={safeCatalogPage >= totalCatalogPages}
                      onClick={() => setCatalogPage((p) => Math.min(totalCatalogPages, p + 1))}
                      className="px-2 py-0.5 rounded bg-slate-800 disabled:opacity-30 hover:bg-slate-700 text-white cursor-pointer"
                    >
                      ▶
                    </button>
                  </div>
                )}
              </div>
            )}

            {items.length === 0 ? (
              <div className="py-24 px-6 text-center flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-fuchsia-950/60 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400 shadow-xl">
                  <Box className="w-8 h-8 opacity-80" />
                </div>
                <div className="space-y-1.5 max-w-md">
                  <h3 className="text-base font-bold text-white">Noch keine 2D-Covers geladen</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Wähle einen Cover-Ordner aus oder ziehe ihn direkt hier hinein. Das Studio verarbeitet auch große Sammlungen mit hunderten von Covern performant im Browser.
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => folderInputRef.current?.click()}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-md transition cursor-pointer flex items-center gap-2"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>Cover-Ordner öffnen</span>
                  </button>
                </div>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                Keine Covers entsprechen dem aktuellen Filter „{searchQuery}“.
              </div>
            ) : displayMode === 'grid' ? (
              /* Grid Mode: Spacious multi-column card layout */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {pagedItems.map((item) => {
                  const isSelected = activeItem?.id === item.id;
                  const displayImageSrc = item.renderedDataUrl || item.objectUrl || item.originalImage.src;
                  const xmlResolved = resolveCoverFilenameFromGamelist(item.filename, gamelistData);
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className={`group relative rounded-xl p-2 flex flex-col items-center gap-2 border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-fuchsia-950/50 border-fuchsia-500 shadow-lg shadow-fuchsia-950/50 ring-2 ring-fuchsia-500/30'
                          : 'bg-slate-950/40 border-white/10 hover:border-white/20 hover:bg-slate-900/60'
                      }`}
                    >
                      {/* Image container */}
                      <div className="relative w-full aspect-3/4 rounded-lg bg-slate-950 overflow-hidden flex items-center justify-center border border-white/10">
                        <img
                          src={displayImageSrc}
                          alt={item.filename}
                          className="w-full h-full object-contain p-1 transition-transform group-hover:scale-105"
                          loading="lazy"
                        />

                        {/* Badges: New / Already 3D */}
                        {item.isNew && (
                          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-bold shadow-md tracking-wider">
                            ★ Neu
                          </div>
                        )}
                        {item.alreadyConverted && (
                          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-slate-800/90 text-slate-300 text-[9px] font-semibold border border-white/15 shadow-md">
                            Bereits 3D
                          </div>
                        )}

                        {/* Status Checkmark */}
                        {item.status === 'done' && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500/90 text-white flex items-center justify-center shadow-md">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      {/* Info & Title */}
                      <div className="w-full text-left min-w-0">
                        <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-white" title={item.filename}>
                          {item.filename}
                        </p>
                        {xmlResolved && (
                          <p className="text-[9px] font-mono text-cyan-300 truncate" title={`XML-Ziel: ${xmlResolved}`}>
                            XML: {xmlResolved}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                          <span>{item.originalImage.width}×{item.originalImage.height} px</span>
                          {item.lastModified && (
                            <span className="text-[9px] text-slate-400 font-sans">
                              {new Date(item.lastModified).toLocaleDateString('de-DE')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* List Mode: Dense row table layout */
              <div className="divide-y divide-white/5 font-sans">
                {pagedItems.map((item) => {
                  const isSelected = activeItem?.id === item.id;
                  const displayImageSrc = item.renderedDataUrl || item.objectUrl || item.originalImage.src;
                  const xmlResolved = resolveCoverFilenameFromGamelist(item.filename, gamelistData);
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className={`p-2.5 rounded-xl flex items-center justify-between gap-3 transition cursor-pointer ${
                        isSelected
                          ? 'bg-fuchsia-950/50 border border-fuchsia-500/50 text-white'
                          : 'hover:bg-slate-900/50 text-slate-300 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={displayImageSrc}
                          alt={item.filename}
                          className="w-9 h-11 object-contain rounded bg-slate-950 border border-white/10 shrink-0"
                          loading="lazy"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-semibold truncate text-white">{item.filename}</p>
                            {xmlResolved && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/30 shrink-0">
                                XML: {xmlResolved}
                              </span>
                            )}
                            {item.isNew && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30 shrink-0">
                                ★ Neu
                              </span>
                            )}
                            {item.alreadyConverted && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-800 text-slate-400 border border-white/10 shrink-0">
                                Bereits 3D
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                            <span>{item.originalImage.width}×{item.originalImage.height} px</span>
                            {item.lastModified && (
                              <>
                                <span>•</span>
                                <span>{new Date(item.lastModified).toLocaleDateString('de-DE')}</span>
                              </>
                            )}
                            <span>•</span>
                            <span className={item.status === 'done' ? 'text-emerald-400' : 'text-amber-400'}>
                              {item.status === 'done' ? 'Gerendert' : 'Bereit'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {item.status === 'done' ? (
                        <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="hidden sm:inline">3D bereit</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 shrink-0">Bereit</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Pagination */}
            {catalogPageSize > 0 && totalCatalogPages > 1 && (
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10 text-xs text-slate-400">
                <span>
                  Zeige {(safeCatalogPage - 1) * catalogPageSize + 1}–{Math.min(safeCatalogPage * catalogPageSize, filteredItems.length)} von {filteredItems.length} Covers
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={safeCatalogPage <= 1}
                    onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded bg-slate-800 disabled:opacity-30 hover:bg-slate-700 text-white cursor-pointer"
                  >
                    ◀ Zurück
                  </button>
                  <span className="font-mono text-xs text-slate-200">
                    {safeCatalogPage} / {totalCatalogPages}
                  </span>
                  <button
                    disabled={safeCatalogPage >= totalCatalogPages}
                    onClick={() => setCatalogPage((p) => Math.min(totalCatalogPages, p + 1))}
                    className="px-2.5 py-1 rounded bg-slate-800 disabled:opacity-30 hover:bg-slate-700 text-white cursor-pointer"
                  >
                    Weiter ▶
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Sticky 3D Box Preview & Studio Controls (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4 sticky top-6">
          {/* Live Canvas Preview Stage */}
          <div className="frosted-glass rounded-2xl p-4 border border-white/10 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-fuchsia-400" />
                <span className="text-xs font-bold text-white">Echtzeit 3D-Vorschau</span>
              </div>

              {/* Prev / Next navigation for cycling through covers */}
              {items.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    disabled={activeIndex <= 0}
                    onClick={() => {
                      if (activeIndex > 0) setSelectedItemId(items[activeIndex - 1].id);
                    }}
                    className="p-1 rounded-lg bg-slate-900/60 hover:bg-slate-800 disabled:opacity-40 text-slate-300 hover:text-white transition cursor-pointer"
                    title="Vorheriges Cover"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] text-slate-400 font-mono px-1">
                    {activeIndex + 1} / {items.length}
                  </span>
                  <button
                    disabled={activeIndex >= items.length - 1}
                    onClick={() => {
                      if (activeIndex < items.length - 1) setSelectedItemId(items[activeIndex + 1].id);
                    }}
                    className="p-1 rounded-lg bg-slate-900/60 hover:bg-slate-800 disabled:opacity-40 text-slate-300 hover:text-white transition cursor-pointer"
                    title="Nächstes Cover"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Canvas Stage with Checkerboard transparency pattern */}
            <div className="relative rounded-xl bg-slate-950/90 border border-white/10 p-4 flex items-center justify-center min-h-[380px] overflow-hidden shadow-inner">
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(#d946ef 1px, transparent 1px), radial-gradient(#8b5cf6 1px, transparent 1px)`,
                  backgroundSize: '24px 24px',
                  backgroundPosition: '0 0, 12px 12px',
                }}
              />

              {activeItem ? (
                <>
                  <canvas
                    ref={previewCanvasRef}
                    className="relative z-10 max-h-[340px] w-auto drop-shadow-2xl transition-transform duration-150"
                  />

                  <div className="absolute top-3 right-3 z-20">
                    <button
                      onClick={handleDownloadSingle}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-fuchsia-600/90 hover:bg-fuchsia-500 text-white shadow-md backdrop-blur-md transition cursor-pointer flex items-center gap-1.5"
                      title="Aktuelles 3D Cover als PNG speichern"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PNG speichern</span>
                    </button>
                  </div>

                  <div className="absolute bottom-3 left-3 z-20 bg-slate-900/80 border border-white/15 px-3 py-1 rounded-lg backdrop-blur-md text-[11px] text-slate-300 font-mono truncate max-w-[280px]">
                    {activeItem.filename}
                  </div>
                </>
              ) : (
                <div className="relative z-10 flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-fuchsia-950/60 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400 shadow-lg">
                    <Box className="w-7 h-7 opacity-90" />
                  </div>
                  <div className="space-y-1 max-w-xs">
                    <p className="text-sm font-bold text-slate-200">Kein Cover ausgewählt</p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Lade einen Cover-Ordner (.png, .jpg) hoch oder wähle ein Cover aus der Liste links.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3D Box Customization & System Template */}
          <div className="frosted-glass rounded-2xl p-4 border border-white/10 space-y-4">
            {/* Vordefiniertes Box Format (Preset) & Coole Visual Design Vorlagen */}
            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-violet-500/30 space-y-3 shadow-inner">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-base">🎨</span>
                  <span className="text-xs font-bold text-white">Vorgefertigte Design-Vorlagen</span>
                </div>
                <button
                  type="button"
                  id="btn-save-current-preset"
                  onClick={() => setIsSavePresetModalOpen(true)}
                  className="text-[11px] text-violet-300 hover:text-white flex items-center gap-1 font-semibold cursor-pointer bg-violet-950/60 hover:bg-violet-900/60 px-2.5 py-1 rounded-lg border border-violet-500/30 transition shadow-xs"
                  title="Speichere deine aktuellen Einstellungen als Vorlage für spätere Covers"
                >
                  <span>💾</span>
                  <span>Als Preset speichern</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-400 leading-normal">
                Wähle ein vorgefertigtes Design für deine Cover-Sammlung:
              </p>

              {/* Quick Visual Design Cards Grid (6 Core Visual Styles) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SYSTEM_COVER_PRESETS.slice(0, 6).map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className={`p-2.5 rounded-xl text-left transition flex flex-col justify-between gap-1.5 cursor-pointer relative ${
                        isSelected
                          ? 'bg-linear-to-b from-violet-900/70 to-fuchsia-950/80 border-2 border-violet-400 shadow-md shadow-violet-950/50 text-white ring-1 ring-violet-400/40'
                          : 'bg-slate-900/70 hover:bg-slate-800/80 border border-white/10 hover:border-white/20 text-slate-300'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-violet-500 text-white flex items-center justify-center text-[10px] font-bold">
                          ✓
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-2xl shrink-0">{preset.icon}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-tight truncate">{preset.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{preset.system}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Dropdown for All Profiles & Custom Presets */}
              <div className="pt-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                  Weitere Konsolen-Profile & Eigene Presets:
                </label>
                <select
                  id="select-cover-preset"
                  value={selectedPresetId}
                  onChange={(e) => {
                    const pId = e.target.value;
                    const found = allAvailablePresets.find((p) => p.id === pId);
                    if (found) {
                      handleApplyPreset(found);
                    }
                  }}
                  className="w-full bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white cursor-pointer focus:border-violet-400"
                >
                  <optgroup label="🎨 Vorgefertigte Designs (Mockup-Stile)">
                    {SYSTEM_COVER_PRESETS.slice(0, 6).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.icon} {p.name} ({p.system})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="🎮 Spezifische Konsolen-Boxen">
                    {SYSTEM_COVER_PRESETS.slice(6).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.icon} {p.name} ({p.angle}°, {Math.round(p.spineWidthRatio * 100)}% Rücken)
                      </option>
                    ))}
                  </optgroup>
                  {customPresets.length > 0 && (
                    <optgroup label="⭐ Eigene Presets">
                      {customPresets.map((p) => (
                        <option key={p.id} value={p.id}>
                          ⭐ {p.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {activePreset && (
                <div className="text-[11px] text-violet-300/90 bg-violet-950/40 p-2.5 rounded-lg border border-violet-500/20 flex items-start justify-between gap-2">
                  <div>
                    <strong className="text-white">{activePreset.name}:</strong> {activePreset.description}
                  </div>
                  {activePreset.isCustom && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomPreset(activePreset.id)}
                      className="text-rose-400 hover:text-rose-300 shrink-0 underline text-[10px] cursor-pointer"
                    >
                      Löschen
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* System Reference Template (Template.png) */}
            {templateData ? (
              <div className="p-3 rounded-xl bg-slate-950/90 border border-fuchsia-500/30 space-y-1.5 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-white">System-Vorgabe (Template.png)</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-fuchsia-300 bg-fuchsia-950/60 px-2 py-0.5 rounded border border-fuchsia-500/30">
                    {templateData.width} × {templateData.height} px
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span className="text-emerald-400 font-medium">
                    {templateData.isExisting
                      ? '✓ Aus Ordner geladen'
                      : '✓ Automatisch aus 1. Cover erzeugt'}
                  </span>
                  <button
                    onClick={() => {
                      if (!templateData.blob) return;
                      const url = URL.createObjectURL(templateData.blob);
                      const a = document.createElement('a');
                      a.download = 'Template.png';
                      a.href = url;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="text-fuchsia-400 hover:text-fuchsia-300 underline font-medium cursor-pointer"
                    title="Template.png als unverändertes Vorbild herunterladen"
                  >
                    Template.png speichern
                  </button>
                </div>
                {templateData.lastModified && (
                  <p className="text-[10px] text-fuchsia-300/80 font-mono">
                    Zeitstempel: {new Date(templateData.lastModified).toLocaleString('de-DE')} • Referenz für neue Covers
                  </p>
                )}
                <p className="text-[10px] text-slate-400 leading-normal">
                  Alle Covers in diesem Ordner werden einheitlich an diese Maße angepasst. Neu hinzugefügte ROM-Covers werden automatisch am Zeitstempel erkannt.
                </p>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-950/40 border border-white/5 text-[11px] text-slate-400">
                Wähle einen Cover-Ordner. Das 1. Bild dient automatisch als <span className="text-slate-200 font-semibold">Template.png</span> für einheitliche Maße aller Boxen.
              </div>
            )}

            {/* Direction Selector (Drehrichtung: Nach links zur Liste vs. Nach rechts) */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Blickrichtung (Horizontal)</span>
                <span className="text-[10px] text-fuchsia-300 font-medium">
                  {direction === 'left' ? '← Nach links (zur Liste)' : 'Nach rechts →'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-slate-950 rounded-lg border border-white/10 text-xs">
                <button
                  onClick={() => setDirection('left')}
                  className={`py-1.5 px-2 rounded-md font-medium text-center transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    direction === 'left'
                      ? 'bg-fuchsia-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Cover schaut nach links (in Richtung der Cover-Liste)"
                >
                  <span>←</span>
                  <span>Nach links (zur Liste)</span>
                </button>
                <button
                  onClick={() => setDirection('right')}
                  className={`py-1.5 px-2 rounded-md font-medium text-center transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    direction === 'right'
                      ? 'bg-fuchsia-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Cover schaut nach rechts"
                >
                  <span>Nach rechts</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-3 pt-1">
              {/* Angle Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Blickwinkel (Perspektive)</span>
                  <span className="font-mono text-fuchsia-400 font-bold">{angle}°</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="48"
                  value={angle}
                  onChange={(e) => setAngle(Number(e.target.value))}
                  className="w-full accent-fuchsia-500 cursor-pointer h-1.5 bg-slate-900 rounded-lg"
                />
              </div>

              {/* Spine Width Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Buchrücken (Spine-Tiefe)</span>
                  <span className="font-mono text-fuchsia-400 font-bold">
                    {Math.round(spineWidthRatio * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.06"
                  max="0.25"
                  step="0.01"
                  value={spineWidthRatio}
                  onChange={(e) => setSpineWidthRatio(Number(e.target.value))}
                  className="w-full accent-fuchsia-500 cursor-pointer h-1.5 bg-slate-900 rounded-lg"
                />
              </div>

              {/* Gloss / Sheen Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Lichtglanz (Sheen)</span>
                  <span className="font-mono text-fuchsia-400 font-bold">
                    {Math.round(glossOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.6"
                  step="0.02"
                  value={glossOpacity}
                  onChange={(e) => setGlossOpacity(Number(e.target.value))}
                  className="w-full accent-fuchsia-500 cursor-pointer h-1.5 bg-slate-900 rounded-lg"
                />
              </div>

              {/* Drop Shadow Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Schlagschatten (Tiefe)</span>
                  <span className="font-mono text-fuchsia-400 font-bold">
                    {Math.round(shadowOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.8"
                  step="0.05"
                  value={shadowOpacity}
                  onChange={(e) => setShadowOpacity(Number(e.target.value))}
                  className="w-full accent-fuchsia-500 cursor-pointer h-1.5 bg-slate-900 rounded-lg"
                />
              </div>

              {/* Spine Mode Selector (Stretch vs Color vs Title) */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Buchrücken-Methode</span>
                  <span className="text-[10px] text-fuchsia-300 font-medium">
                    {spineMode === 'stretch'
                      ? '1px Rand-Streckung'
                      : spineMode === 'color'
                      ? 'Vollfarbe'
                      : 'Mit Spieltitel'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-950 rounded-lg border border-white/10 text-[11px]">
                  <button
                    onClick={() => setSpineMode('stretch')}
                    className={`py-1.5 px-1 rounded-md font-medium text-center transition cursor-pointer ${
                      spineMode === 'stretch'
                        ? 'bg-fuchsia-600 text-white font-bold shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="1px Rand-Streckung (Authentische Kanten-Extrusion)"
                  >
                    1px Rand
                  </button>
                  <button
                    onClick={() => setSpineMode('color')}
                    className={`py-1.5 px-1 rounded-md font-medium text-center transition cursor-pointer ${
                      spineMode === 'color'
                        ? 'bg-fuchsia-600 text-white font-bold shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Volltonfarbe aus Randfarbe ermitteln"
                  >
                    Vollfarbe
                  </button>
                  <button
                    onClick={() => setSpineMode('title')}
                    className={`py-1.5 px-1 rounded-md font-medium text-center transition cursor-pointer ${
                      spineMode === 'title'
                        ? 'bg-fuchsia-600 text-white font-bold shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Retro-Buchrücken mit vertikalem Spieltitel"
                  >
                    Mit Titel
                  </button>
                </div>

                {/* Sub-controls when Spine Title mode is active */}
                {spineMode === 'title' && (
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-fuchsia-500/20 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span>Rücken-Farbe:</span>
                      <span className="text-[10px] text-fuchsia-400 font-mono">
                        {spineColorType === 'auto'
                          ? 'Auto (Cover-Rand)'
                          : spineColorType === 'black'
                          ? 'Klassisch Schwarz'
                          : spineColorType === 'dark'
                          ? 'Abgedunkelt'
                          : 'Klassisch Weiß'}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      <button
                        onClick={() => setSpineColorType('auto')}
                        className={`py-1 px-1 rounded-md text-[10px] font-medium border text-center transition cursor-pointer ${
                          spineColorType === 'auto'
                            ? 'bg-fuchsia-950 text-fuchsia-200 border-fuchsia-500/60 font-bold'
                            : 'bg-slate-900/80 text-slate-400 border-white/5 hover:text-white'
                        }`}
                        title="Automatisch aus der Kantenfarbe des Covers generieren"
                      >
                        Auto
                      </button>
                      <button
                        onClick={() => setSpineColorType('black')}
                        className={`py-1 px-1 rounded-md text-[10px] font-medium border text-center transition cursor-pointer ${
                          spineColorType === 'black'
                            ? 'bg-fuchsia-950 text-fuchsia-200 border-fuchsia-500/60 font-bold'
                            : 'bg-slate-900/80 text-slate-400 border-white/5 hover:text-white'
                        }`}
                        title="Klassisches tiefes Schwarz mit weißer Schrift"
                      >
                        Schwarz
                      </button>
                      <button
                        onClick={() => setSpineColorType('dark')}
                        className={`py-1 px-1 rounded-md text-[10px] font-medium border text-center transition cursor-pointer ${
                          spineColorType === 'dark'
                            ? 'bg-fuchsia-950 text-fuchsia-200 border-fuchsia-500/60 font-bold'
                            : 'bg-slate-900/80 text-slate-400 border-white/5 hover:text-white'
                        }`}
                        title="Abgedunkelte Version der Randfarbe"
                      >
                        Dunkel
                      </button>
                      <button
                        onClick={() => setSpineColorType('white')}
                        className={`py-1 px-1 rounded-md text-[10px] font-medium border text-center transition cursor-pointer ${
                          spineColorType === 'white'
                            ? 'bg-fuchsia-950 text-fuchsia-200 border-fuchsia-500/60 font-bold'
                            : 'bg-slate-900/80 text-slate-400 border-white/5 hover:text-white'
                        }`}
                        title="Klassisches helles Weiß mit dunkler Schrift"
                      >
                        Weiß
                      </button>
                    </div>

                    {activeItem && (
                      <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Aktiver Titel:</span>
                        <span
                          className="text-slate-200 font-semibold truncate max-w-[170px]"
                          title={cleanGameTitle(activeItem.filename)}
                        >
                          {cleanGameTitle(activeItem.filename)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Direct Save to "Covers" Folder & 2D Cleanup Modal */}
      {isSaveModalOpen && (
        <div
          id="modal-save-to-covers"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-left relative animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    In Ordner 'Covers' speichern
                  </h3>
                  <p className="text-xs text-slate-300">
                    Schreibt die 3D-Boxen direkt auf die Festplatte (1:1 ROM-Dateinamen).
                  </p>
                </div>
              </div>
              <button
                disabled={isSavingToFolder}
                onClick={() => setIsSaveModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer disabled:opacity-30"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Note for embedded simulator / iframe */}
            {isRunningInIframe && (
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-start gap-2.5 text-xs text-sky-200">
                <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <span className="font-semibold text-sky-100 block">
                    Hinweis zum Vorschau-Simulator (iFrame)
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Browser blockieren in eingebetteten Vorschaufenstern den direkten Schreibzugriff auf Festplattenordner.
                    Für direktes Speichern öffne die App in einem <strong>eigenen Tab</strong> oder nutze den bequemen <strong>ZIP-Download</strong>!
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => window.open(window.location.href, '_blank')}
                      className="px-2.5 py-1 rounded-lg bg-sky-600/30 hover:bg-sky-600/50 border border-sky-500/40 text-white font-medium text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>In neuem Tab öffnen</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSaveModalOpen(false);
                        handleDownloadAllZip();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-200 font-medium text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Als ZIP laden</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Folder Target Path */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Zielverzeichnis:</span>
                <button
                  type="button"
                  disabled={isSavingToFolder}
                  onClick={handleChooseCustomTargetFolder}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer underline text-[11px]"
                >
                  {sourceFolderName ? 'Ordner ändern...' : 'Ordner wählen...'}
                </button>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900 border border-white/5 text-xs text-slate-200">
                <FolderCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-mono truncate font-medium">
                  {sourceFolderName
                    ? createSubfolderCovers && !/^covers$/i.test(sourceFolderName)
                      ? `${sourceFolderName}/Covers/`
                      : `${sourceFolderName}/`
                    : "Wird beim Klick auf 'Speichern' abgefragt"}
                </span>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  disabled={isSavingToFolder || (Boolean(sourceFolderName) && /^covers$/i.test(sourceFolderName))}
                  checked={createSubfolderCovers}
                  onChange={(e) => setCreateSubfolderCovers(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span>
                  Unterordner <strong className="text-white">Covers</strong> erstellen / nutzen (Standard für Retro-Frontends)
                </span>
              </label>
            </div>

            {/* Clean & Replace 2D Originals Option */}
            <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/30 space-y-2.5">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  disabled={isSavingToFolder}
                  checked={delete2dOriginals}
                  onChange={(e) => setDelete2dOriginals(e.target.checked)}
                  className="rounded border-amber-500/50 text-amber-500 focus:ring-amber-500 w-4 h-4 mt-0.5 cursor-pointer shrink-0"
                />
                <div className="space-y-1 text-xs">
                  <span className="font-bold text-amber-200 block">
                    Alte 2D-Originale nach erfolgreicher Umwandlung löschen
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Entfernt die alten flachen 2D-Dateien. Frontends greifen sofort auf das neue 3D-Cover zu, und das versehentliche Berechnen einer 3D-Box auf eine bestehende 3D-Box ist damit dauerhaft ausgeschlossen.
                  </p>
                </div>
              </label>
            </div>

            {/* Include Template.png */}
            <div className="px-1 text-xs">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  disabled={isSavingToFolder}
                  checked={includeTemplate}
                  onChange={(e) => setIncludeTemplate(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span>
                  System-Referenz <code className="text-fuchsia-300">Template.png</code> im Covers-Ordner mitspeichern
                </span>
              </label>
            </div>

            {/* Live Progress Bar */}
            {isSavingToFolder && saveProgress && (
              <div className="space-y-2 p-3 rounded-xl bg-slate-950 border border-emerald-500/30">
                <div className="flex justify-between text-xs font-semibold text-emerald-400">
                  <span>Speichere Covers direkt auf Festplatte...</span>
                  <span>{saveProgress.current} / {saveProgress.total}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-linear-to-r from-emerald-500 to-teal-400 h-2 transition-all duration-150"
                    style={{
                      width: `${Math.round((saveProgress.current / saveProgress.total) * 100)}%`,
                    }}
                  />
                </div>
                <div className="text-[11px] text-slate-400 truncate font-mono">
                  {saveProgress.filename}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSavingToFolder}
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer disabled:opacity-40"
              >
                Abbrechen
              </button>
              <button
                type="button"
                id="btn-confirm-save-to-covers"
                disabled={isSavingToFolder || filteredItems.length === 0}
                onClick={handleExecuteSaveToFolder}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white shadow-lg shadow-emerald-950/40 transition cursor-pointer flex items-center gap-2"
              >
                <FolderPlus className="w-4 h-4" />
                <span>
                  {isSavingToFolder
                    ? 'Schreibe auf Festplatte...'
                    : `Jetzt in 'Covers' speichern (${filteredItems.length})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Iframe / Simulator Restriction Help Modal */}
      {isIframeRestrictionModalOpen && (
        <div
          id="modal-iframe-restriction-help"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-slate-900 border border-sky-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-left relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Ja, das liegt nur am Simulator!
                  </h3>
                  <p className="text-xs text-sky-300">
                    Browser-Sicherheitsrichtlinie für iFrames
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsIframeRestrictionModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                Im AI Studio Vorschau-Fenster läuft die Web-App innerhalb eines sogenannten <strong className="text-white">iFrames (Cross-Origin Sub-Frame)</strong>.
              </p>
              <p>
                Browser wie Google Chrome, Edge und Brave blockieren in iFrames aus Sicherheitsgründen den direkten Schreibzugriff auf Festplattenordner (<code className="text-amber-300 font-mono text-[11px]">showDirectoryPicker</code>).
              </p>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
                <p className="font-semibold text-emerald-100 mb-1">
                  Im echten Browser-Tab:
                </p>
                <p className="text-[11px] text-slate-300">
                  Sobald du die App in einem <strong>eigenen Tab</strong> öffnest (oder als installierte/bereitgestellte App), läuft sie nicht im iFrame. Das direkte Speichern und Bereinigen in deinen echten Ordner auf der SD-Karte / Festplatte funktioniert dort 100% einwandfrei!
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  window.open(window.location.href, '_blank');
                  setIsIframeRestrictionModalOpen(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-950/40 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>In eigenem Tab öffnen (für direkten Ordnerzugriff)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsIframeRestrictionModalOpen(false);
                  handleDownloadAllZip();
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Jetzt als ZIP-Archiv herunterladen ({filteredItems.length} Covers)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsIframeRestrictionModalOpen(false)}
                className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer text-center"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Downscale / Performance Optimization Modal (Strictly PNG, preserving Aspect Ratio, Template.png untouched) */}
      {isDownscaleModalOpen && (
        <div
          id="modal-downscale-covers"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-slate-900 border border-sky-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-left relative animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                  <Gauge className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Images für Handhelds verkleinern?
                  </h3>
                  <p className="text-xs text-slate-300">
                    Sorgt für ruckelfreies, schnelles Scrollen in Batocera, RetroPie & EmulationStation.
                  </p>
                </div>
              </div>
              <button
                disabled={isDownscaling}
                onClick={() => setIsDownscaleModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer disabled:opacity-30"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Core Guarantees Banner */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/10 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Aspect Ratio bleibt 100% erhalten (kein Verzerren oder Dehnen)</span>
              </div>
              <div className="flex items-center gap-2 text-sky-300 font-semibold">
                <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Nur PNG: Höchste Frontend-Kompatibilität (kein WebP)</span>
              </div>
              <div className="flex items-center gap-2 text-amber-300 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Template.png bleibt vollkommen unberührt in Originalgröße</span>
              </div>
            </div>

            {/* Resolution Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-200 block">
                Maximale Bildkante auswählen:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { size: 500, label: '500 px', desc: 'Miyoo Mini, Anbernic RG35XX (Ultra-flüssig)' },
                  { size: 600, label: '600 px (Empfohlen)', desc: 'Optimaler Standard für 480p/720p Frontends' },
                  { size: 720, label: '720 px', desc: 'HD Handhelds (Retroid Pocket, Odin)' },
                  { size: 800, label: '800 px', desc: 'Höhere Auflösung für TV & große Displays' },
                ].map((preset) => (
                  <button
                    key={preset.size}
                    type="button"
                    disabled={isDownscaling}
                    onClick={() => setTargetMaxDimension(preset.size)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col gap-0.5 ${
                      targetMaxDimension === preset.size
                        ? 'bg-sky-950/60 border-sky-400/80 text-white ring-1 ring-sky-400/50'
                        : 'bg-slate-950/40 border-white/10 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <span className="text-xs font-bold text-white flex items-center justify-between">
                      {preset.label}
                      {targetMaxDimension === preset.size && (
                        <Check className="w-3 h-3 text-sky-400" />
                      )}
                    </span>
                    <span className="text-[10px] text-slate-400 leading-tight">
                      {preset.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Downscale Progress Bar */}
            {isDownscaling && downscaleProgress && (
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-950 border border-sky-500/30">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="truncate max-w-[280px]">
                    Optimiere: {downscaleProgress.filename}
                  </span>
                  <span className="font-mono text-sky-400 font-bold shrink-0">
                    {downscaleProgress.current} / {downscaleProgress.total}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-sky-500 to-teal-400 transition-all duration-150"
                    style={{
                      width: `${Math.round(
                        (downscaleProgress.current / downscaleProgress.total) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDownscaling}
                onClick={() => setIsDownscaleModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer disabled:opacity-40"
              >
                Überspringen / Später
              </button>
              <button
                type="button"
                id="btn-confirm-downscale"
                disabled={isDownscaling || items.length === 0}
                onClick={() => handleExecuteDownscale(targetMaxDimension)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-linear-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 disabled:opacity-50 text-white shadow-lg shadow-sky-950/40 transition cursor-pointer flex items-center gap-2"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>
                  {isDownscaling
                    ? 'Verkleinere Covers...'
                    : `Jetzt auf max. ${targetMaxDimension}px verkleinern`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Save Custom Preset */}
      {isSavePresetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-violet-500/30 rounded-2xl max-w-md w-full p-6 text-slate-100 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">💾</span>
                <h3 className="text-base font-bold text-white">Eigenes Box-Preset speichern</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSavePresetModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Speichere deine aktuellen 3D-Werte ({angle}° Blickwinkel, {Math.round(spineWidthRatio * 100)}% Buchrücken-Tiefe, {Math.round(glossOpacity * 100)}% Glanz), um jederzeit konsistente Covers zu erstellen.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">Name des Presets:</label>
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="z.B. SNES EU Standard (26°, 14% Rücken)"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSavePresetModalOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={!newPresetName.trim()}
                onClick={handleSaveCurrentAsPreset}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white shadow-md shadow-violet-900/30 cursor-pointer"
              >
                Preset speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
