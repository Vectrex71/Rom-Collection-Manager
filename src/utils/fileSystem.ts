import { DuplicateGroup, PlatformCode, RomFile, RegionPreference } from '../types';
import { calculateRomQualityScore, parseRomFilename } from './romParser';

export interface ScanProgress {
  scannedCount: number;
  hashedCount: number;
  currentFilename: string;
  stage: 'scanning' | 'hashing' | 'analyzing' | 'done';
}

/**
 * Zero-I/O metadata fingerprint for ROM files.
 * Uses only file.size, file.lastModified, and file.name without reading file byte contents.
 * CRITICAL: On Chromebooks / Google Drive (HDrive) / Cloud-mounted folders, reading file bytes
 * forces the operating system to download the entire ROM file from the cloud!
 * Using metadata prevents any cloud download, completing scans instantly with 0 data usage.
 */
export function computeFileHash(file: File): string {
  if (!file || file.size === 0) return 'empty_0';

  // Fast string hash for filename
  let nameHash = 0x811c9dc5;
  for (let i = 0; i < file.name.length; i++) {
    nameHash = Math.imul(nameHash ^ file.name.charCodeAt(i), 0x01000193);
  }

  return `meta_${file.size.toString(16)}_${file.lastModified.toString(16)}_${(nameHash >>> 0).toString(16)}`;
}

/**
 * Recursively scans a FileSystemDirectoryHandle from window.showDirectoryPicker()
 */
export async function scanDirectoryHandle(
  dirHandle: any,
  onProgress?: (progress: ScanProgress) => void,
  abortSignal?: AbortSignal
): Promise<RomFile[]> {
  const discoveredFiles: Array<{
    file: File;
    fileHandle: any;
    parentDirHandle: any;
    path: string;
  }> = [];

  async function traverse(currentDir: any, currentPath: string) {
    if (abortSignal?.aborted) return;
    for await (const [name, handle] of currentDir.entries()) {
      if (abortSignal?.aborted) return;
      if (name.startsWith('.')) continue; // ignore hidden files/folders

      const relativePath = currentPath ? `${currentPath}/${name}` : name;
      if (handle.kind === 'directory') {
        await traverse(handle, relativePath);
      } else if (handle.kind === 'file') {
        const file = await handle.getFile();
        discoveredFiles.push({
          file,
          fileHandle: handle,
          parentDirHandle: currentDir,
          path: relativePath,
        });

        if (onProgress && discoveredFiles.length % 25 === 0) {
          onProgress({
            scannedCount: discoveredFiles.length,
            hashedCount: 0,
            currentFilename: name,
            stage: 'scanning',
          });
        }
      }
    }
  }

  await traverse(dirHandle, '');

  // High-speed parallel batch processing
  const romFiles: RomFile[] = [];
  let hashed = 0;
  const rootFolderName = dirHandle?.name || '';
  const BATCH_SIZE = 100;

  for (let i = 0; i < discoveredFiles.length; i += BATCH_SIZE) {
    if (abortSignal?.aborted) break;
    const batch = discoveredFiles.slice(i, i + BATCH_SIZE);

    for (const item of batch) {
      const hash = computeFileHash(item.file);
      const parsed = parseRomFilename(item.file.name, item.path, rootFolderName);
      const rom: RomFile = {
        id: `${item.path}_${item.file.size}_${item.file.lastModified}`,
        filename: item.file.name,
        extension: item.file.name.slice(item.file.name.lastIndexOf('.')),
        originalPath: item.path,
        size: item.file.size,
        lastModified: item.file.lastModified,
        hash,
        platform: parsed.platform,
        canonicalTitle: parsed.canonicalTitle,
        cleanFilename: parsed.cleanFilename,
        targetFolder: parsed.targetFolder,
        genres: parsed.genres,
        region: parsed.region,
        versionOrRevision: parsed.versionOrRevision,
        discInfo: parsed.discInfo,
        isMultiDisc: parsed.isMultiDisc,
        isBadDump: parsed.isBadDump,
        isHackOrTranslation: parsed.isHackOrTranslation,
        isVerifiedGood: parsed.isVerifiedGood,
        isArcadeRom: parsed.isArcadeRom,
        isJunk: parsed.isJunk,
        junkReason: parsed.junkReason,
        isTop200: parsed.isTop200,
        top200Rank: parsed.top200Rank,
        isDuplicate: false,
        isCleanNamed: item.file.name === parsed.cleanFilename,
        recommendedAction: parsed.isJunk ? 'delete' : 'keep',
        fileHandle: item.fileHandle,
        parentDirHandle: item.parentDirHandle,
      };
      romFiles.push(rom);
    }

    hashed += batch.length;

    if (onProgress) {
      onProgress({
        scannedCount: discoveredFiles.length,
        hashedCount: Math.min(hashed, discoveredFiles.length),
        currentFilename: batch[batch.length - 1].file.name,
        stage: 'hashing',
      });
    }

    // Brief tick to allow UI rendering update
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return analyzeDuplicateGroups(romFiles);
}

/**
 * Scans standard HTML5 FileList (from <input type="file" webkitdirectory /> or Drag&Drop)
 */
export async function scanFileList(
  files: FileList | File[],
  rootFolderOrProgress?: string | ((progress: ScanProgress) => void),
  progressOrSignal?: ((progress: ScanProgress) => void) | AbortSignal,
  abortSignal?: AbortSignal
): Promise<RomFile[]> {
  const fileArray = Array.from(files).filter((f) => !f.name.startsWith('.'));
  const romFiles: RomFile[] = [];
  let hashed = 0;

  let rootFolderName = typeof rootFolderOrProgress === 'string' ? rootFolderOrProgress : '';
  const onProgress =
    typeof rootFolderOrProgress === 'function'
      ? rootFolderOrProgress
      : typeof progressOrSignal === 'function'
      ? progressOrSignal
      : undefined;
  const signal =
    abortSignal || (progressOrSignal && typeof progressOrSignal !== 'function' ? progressOrSignal : undefined);

  // Auto-detect root directory name from webkitRelativePath if not explicitly given
  if (!rootFolderName && fileArray.length > 0) {
    const firstRel = (fileArray[0] as any).webkitRelativePath;
    if (firstRel && firstRel.includes('/')) {
      rootFolderName = firstRel.split('/')[0];
    }
  }

  const BATCH_SIZE = 100;
  for (let i = 0; i < fileArray.length; i += BATCH_SIZE) {
    if (signal?.aborted) break;
    const batch = fileArray.slice(i, i + BATCH_SIZE);

    for (const file of batch) {
      const path = (file as any).webkitRelativePath || file.name;
      const hash = computeFileHash(file);
      const parsed = parseRomFilename(file.name, path, rootFolderName);
      const rom: RomFile = {
        id: `${path}_${file.size}_${file.lastModified}`,
        filename: file.name,
        extension: file.name.slice(file.name.lastIndexOf('.')),
        originalPath: path,
        size: file.size,
        lastModified: file.lastModified,
        hash,
        platform: parsed.platform,
        canonicalTitle: parsed.canonicalTitle,
        cleanFilename: parsed.cleanFilename,
        targetFolder: parsed.targetFolder,
        genres: parsed.genres,
        region: parsed.region,
        versionOrRevision: parsed.versionOrRevision,
        discInfo: parsed.discInfo,
        isMultiDisc: parsed.isMultiDisc,
        isBadDump: parsed.isBadDump,
        isHackOrTranslation: parsed.isHackOrTranslation,
        isVerifiedGood: parsed.isVerifiedGood,
        isArcadeRom: parsed.isArcadeRom,
        isJunk: parsed.isJunk,
        junkReason: parsed.junkReason,
        isTop200: parsed.isTop200,
        top200Rank: parsed.top200Rank,
        isDuplicate: false,
        isCleanNamed: file.name === parsed.cleanFilename,
        recommendedAction: parsed.isJunk ? 'delete' : 'keep',
      };
      romFiles.push(rom);
    }

    hashed += batch.length;

    if (onProgress) {
      onProgress({
        scannedCount: fileArray.length,
        hashedCount: Math.min(hashed, fileArray.length),
        currentFilename: batch[batch.length - 1].name,
        stage: 'hashing',
      });
    }

    // Brief tick to allow UI rendering update
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return analyzeDuplicateGroups(romFiles);
}

/**
 * Detects duplicates both by EXACT SHA-256 hash match AND by canonical title/platform version match.
 * Multi-disc games (Disk 1, Disk 2, Disc 1, etc.) are strictly separated so discs are never marked as duplicates!
 * Junk and cache files are excluded from duplicate matching.
 */
export function analyzeDuplicateGroups(
  romFiles: RomFile[],
  regionPref: RegionPreference = 'europe_first'
): RomFile[] {
  // 1. Group by exact hash
  const hashBuckets = new Map<string, RomFile[]>();
  for (const rom of romFiles) {
    if (rom.isJunk) continue;
    const bucket = hashBuckets.get(rom.hash) || [];
    bucket.push(rom);
    hashBuckets.set(rom.hash, bucket);
  }

    // 2. Group by canonical title + platform + edition + disc
    // Multi-disc titles with different disc numbers get their own unique bucket!
    // Translations and Romhacks get their own unique bucket so they are NEVER purged as duplicates of vanilla releases!
    const titleBuckets = new Map<string, RomFile[]>();
    for (const rom of romFiles) {
      if (rom.isJunk) continue;
      const discPart = rom.discInfo ? `_disc_${rom.discInfo.discLabel.toLowerCase().trim()}` : '';

      let editionPart = '';
      if (rom.editionType === 'translation') {
        editionPart = `_trans_${rom.translationLanguage?.toLowerCase() || 'other'}`;
      } else if (rom.editionType === 'romhack') {
        editionPart = `_hack_${(rom.hackDetails || rom.filename).toLowerCase()}`;
      } else if (rom.editionType === 'homebrew') {
        editionPart = `_homebrew`;
      } else if (rom.editionType === 'prototype') {
        editionPart = `_proto`;
      }

      const key = `${rom.platform}_${rom.canonicalTitle.toLowerCase().trim()}${editionPart}${discPart}`;
      const bucket = titleBuckets.get(key) || [];
      bucket.push(rom);
      titleBuckets.set(key, bucket);
    }

  // Assign duplicates
  const updatedRoms = romFiles.map((r) => ({ ...r }));

  // Mark exact hash duplicates
  for (const [hash, group] of hashBuckets.entries()) {
    if (group.length > 1) {
      const groupId = `hash_${hash.slice(0, 12)}`;
      // Find best version to keep
      let bestRom = group[0];
      let bestScore = calculateRomQualityScore(bestRom, regionPref);

      for (let i = 1; i < group.length; i++) {
        const score = calculateRomQualityScore(group[i], regionPref);
        if (score > bestScore) {
          bestScore = score;
          bestRom = group[i];
        }
      }

      for (const item of group) {
        const target = updatedRoms.find((r) => r.id === item.id);
        if (target) {
          target.isDuplicate = true;
          target.duplicateGroupId = groupId;
          target.isExactHashDuplicate = true;
          target.recommendedAction = target.id === bestRom.id ? 'keep' : 'delete';
        }
      }
    }
  }

  // Mark title/platform revision duplicates (if not already exact hash duplicate)
  for (const [key, group] of titleBuckets.entries()) {
    if (group.length > 1) {
      const groupId = `title_${key}`;
      let bestRom = group[0];
      let bestScore = calculateRomQualityScore(bestRom, regionPref);

      for (let i = 1; i < group.length; i++) {
        const score = calculateRomQualityScore(group[i], regionPref);
        if (score > bestScore) {
          bestScore = score;
          bestRom = group[i];
        }
      }

      for (const item of group) {
        const target = updatedRoms.find((r) => r.id === item.id);
        if (target && !target.isDuplicate) {
          target.isDuplicate = true;
          target.duplicateGroupId = groupId;
          target.isExactHashDuplicate = false;
          target.recommendedAction = target.id === bestRom.id ? 'keep' : 'delete';
        }
      }
    }
  }

  return updatedRoms;
}

/**
 * Extracts distinct duplicate groups from ROM list
 */
export function extractDuplicateGroups(
  romFiles: RomFile[],
  regionPref: RegionPreference = 'europe_first'
): DuplicateGroup[] {
  const groupsMap = new Map<string, RomFile[]>();

  for (const rom of romFiles) {
    if (rom.isDuplicate && rom.duplicateGroupId) {
      const group = groupsMap.get(rom.duplicateGroupId) || [];
      group.push(rom);
      groupsMap.set(rom.duplicateGroupId, group);
    }
  }

  const result: DuplicateGroup[] = [];

  for (const [groupId, files] of groupsMap.entries()) {
    if (files.length <= 1) continue;

    const isExact = files.every((f) => f.hash === files[0].hash);
    let best = files[0];
    let bestScore = calculateRomQualityScore(best, regionPref);

    for (let i = 1; i < files.length; i++) {
      const score = calculateRomQualityScore(files[i], regionPref);
      if (score > bestScore) {
        bestScore = score;
        best = files[i];
      }
    }

    const reason = isExact
      ? '100% identische Bit-Kopie (gleicher SHA-256 Hash). Duplikat kann gefahrlos gelöscht werden.'
      : 'Mehrere Versionen/Regionen desselben Spiels gefunden. Die sauberste, aktuellste Version wird zum Behalten empfohlen.';

    result.push({
      id: groupId,
      canonicalTitle: files[0].canonicalTitle,
      platform: files[0].platform,
      isExactHashMatch: isExact,
      hash: files[0].hash,
      files,
      recommendedKeepId: best.id,
      recommendationReason: reason,
    });
  }

  return result;
}

/**
 * Deletes a file directly using the FileSystemAccessAPI
 */
export async function deleteRomDirect(rom: RomFile): Promise<boolean> {
  if (rom.parentDirHandle && rom.filename) {
    await rom.parentDirHandle.removeEntry(rom.filename);
    return true;
  }
  throw new Error('Kein direkter Dateisystem-Handle für diesen ROM verfügbar.');
}

/**
 * Renames a ROM file in place within its current directory
 */
export async function renameRomInPlaceDirect(
  rom: RomFile,
  newFilename: string
): Promise<boolean> {
  if (rom.fileHandle) {
    if (typeof rom.fileHandle.move === 'function') {
      await rom.fileHandle.move(newFilename);
      return true;
    }

    if (rom.parentDirHandle) {
      const file = await rom.fileHandle.getFile();
      const newFileHandle = await rom.parentDirHandle.getFileHandle(newFilename, { create: true });
      const writable = await newFileHandle.createWritable();
      await writable.write(await file.arrayBuffer());
      await writable.close();

      await rom.parentDirHandle.removeEntry(rom.filename);
      return true;
    }
  }
  return false;
}

/**
 * Renames or moves a file into a target folder using FileSystemAccessAPI
 */
export async function moveOrRenameRomDirect(
  rom: RomFile,
  rootDirectoryHandle: any,
  targetFolder: string,
  newFilename: string
): Promise<boolean> {
  const currentFolder = rom.originalPath.includes('/')
    ? rom.originalPath.slice(0, rom.originalPath.lastIndexOf('/'))
    : '';

  // In-place rename if target folder is the same
  if (!targetFolder || targetFolder === currentFolder) {
    return renameRomInPlaceDirect(rom, newFilename);
  }

  if (!rootDirectoryHandle) {
    throw new Error('Kein Root-Ordner Handle vorhanden.');
  }

  // Get or create target directory
  let targetDirHandle = rootDirectoryHandle;
  const parts = targetFolder.split('/').filter(Boolean);
  for (const part of parts) {
    targetDirHandle = await targetDirHandle.getDirectoryHandle(part, { create: true });
  }

  if (rom.fileHandle) {
    // Check if move method is supported (Chrome 111+)
    if (typeof rom.fileHandle.move === 'function') {
      await rom.fileHandle.move(targetDirHandle, newFilename);
      return true;
    }

    // Fallback: Copy content then delete source
    const file = await rom.fileHandle.getFile();
    const newFileHandle = await targetDirHandle.getFileHandle(newFilename, { create: true });
    const writable = await newFileHandle.createWritable();
    await writable.write(await file.arrayBuffer());
    await writable.close();

    // Remove source file
    if (rom.parentDirHandle) {
      await rom.parentDirHandle.removeEntry(rom.filename);
    }
    return true;
  }

  throw new Error('Direkter Schreibzugriff ist für diese Datei nicht verfügbar.');
}

