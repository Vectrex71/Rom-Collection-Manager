import { RomFile } from '../types';

export type SideFileCategory =
  | 'nfo'
  | 'txt'
  | 'url'
  | 'checksum'
  | 'orphaned_cue'
  | 'system_cache'
  | 'other_sidefile';

export interface SideFileItem {
  id: string;
  filename: string;
  originalPath: string;
  size: number;
  category: SideFileCategory;
  categoryLabel: string;
  reason: string;
  suggestedAction: 'delete' | 'move_to_backup' | 'keep';
  parentFolder: string;
  selected: boolean;
  romFile: RomFile;
}

/**
 * Analyzes the scanned ROMs and files to identify side-files (.nfo, .txt, .url, orphaned .cue, .sfv, cache)
 */
export function detectSideFiles(roms: RomFile[]): SideFileItem[] {
  const sideFiles: SideFileItem[] = [];

  // Group paths to detect orphaned .cue files (e.g. if a .chd exists with the same name, or if .bin is missing)
  const pathSet = new Set(roms.map((r) => r.originalPath.toLowerCase()));

  for (const rom of roms) {
    const filename = rom.filename;
    const lower = filename.toLowerCase().trim();
    const lastDot = lower.lastIndexOf('.');
    const ext = lastDot !== -1 ? lower.slice(lastDot) : '';
    const baseWithoutExt = lastDot !== -1 ? lower.slice(0, lastDot) : lower;

    // Check if it's a known sidefile extension or marked as junk
    let category: SideFileCategory | null = null;
    let categoryLabel = '';
    let reason = '';
    let suggestedAction: 'delete' | 'move_to_backup' | 'keep' = 'delete';

    // 1. Release Info / NFO / DIZ
    if (ext === '.nfo' || ext === '.diz') {
      category = 'nfo';
      categoryLabel = 'Release Info (.nfo / .diz)';
      reason = 'Alte Scene-Release Info oder Readme der Dump-Gruppe';
      suggestedAction = 'delete';
    }
    // 2. Text documents & Readmes
    else if (ext === '.txt' || ext === '.doc' || ext === '.rtf') {
      // Don't flag game text assets inside subfolders if essential, but root/side readme.txt
      category = 'txt';
      categoryLabel = 'Textdatei / Readme (.txt)';
      reason = 'Begleitende Textdatei oder Installationshinweis';
      suggestedAction = 'delete';
    }
    // 3. Web & URL shortcuts
    else if (ext === '.url' || ext === '.webloc' || ext === '.lnk' || ext === '.html' || ext === '.htm') {
      category = 'url';
      categoryLabel = 'Weblink / Verknüpfung (.url)';
      reason = 'Internet-Verknüpfung oder Werbelink';
      suggestedAction = 'delete';
    }
    // 4. Checksums & Verification lists
    else if (ext === '.sfv' || ext === '.md5' || ext === '.sha1' || ext === '.crc') {
      category = 'checksum';
      categoryLabel = 'Prüfsummendatei (.sfv / .md5)';
      reason = 'Alte Prüfsummenliste aus damaligem Download';
      suggestedAction = 'delete';
    }
    // 5. Operating system clutter / Cache
    else if (
      rom.isJunk ||
      ext === '.db' ||
      ext === '.db-journal' ||
      ext === '.sqlite' ||
      lower === 'thumbs.db' ||
      lower === 'desktop.ini' ||
      lower === '.ds_store' ||
      lower.startsWith('._')
    ) {
      category = 'system_cache';
      categoryLabel = 'Betriebssystem- & Cache-Müll';
      reason = rom.junkReason || 'System-Cache, Thumbnail-DB oder Mac-Ressourcengabel';
      suggestedAction = 'delete';
    }
    // 6. Orphaned / Redundant .cue files
    else if (ext === '.cue') {
      // Check if a CHD with same basename exists in same folder
      const dirPrefix = rom.originalPath.includes('/')
        ? rom.originalPath.slice(0, rom.originalPath.lastIndexOf('/') + 1)
        : '';
      const matchingChd = `${dirPrefix}${baseWithoutExt}.chd`.toLowerCase();
      const matchingBin = `${dirPrefix}${baseWithoutExt}.bin`.toLowerCase();
      const matchingIso = `${dirPrefix}${baseWithoutExt}.iso`.toLowerCase();

      if (pathSet.has(matchingChd)) {
        category = 'orphaned_cue';
        categoryLabel = 'Überflüssige .cue (CHD vorhanden)';
        reason = `Zu diesem Spiel existiert bereits eine kompakte .chd-Datei. Das .cue ist redundant.`;
        suggestedAction = 'delete';
      } else if (!pathSet.has(matchingBin) && !pathSet.has(matchingIso) && !rom.isMultiDisc) {
        // Standalone .cue without associated .bin/.iso
        category = 'orphaned_cue';
        categoryLabel = 'Verwaiste .cue (Keine Track-Datei)';
        reason = `Keine zugehörige .bin oder .iso Datei im Ordner gefunden.`;
        suggestedAction = 'delete';
      }
    }

    if (category) {
      const parentFolder = rom.originalPath.includes('/')
        ? rom.originalPath.slice(0, rom.originalPath.lastIndexOf('/'))
        : 'Hauptordner';

      sideFiles.push({
        id: `side_${rom.id}`,
        filename: rom.filename,
        originalPath: rom.originalPath,
        size: rom.size,
        category,
        categoryLabel,
        reason,
        suggestedAction,
        parentFolder,
        selected: true,
        romFile: rom,
      });
    }
  }

  return sideFiles;
}

/**
 * Generates a clean Windows Batch (.bat) file to clean up or quarantine side-files
 */
export function generateSideFileCleanupBat(
  items: SideFileItem[],
  action: 'delete' | 'quarantine'
): string {
  const lines: string[] = [
    '@echo off',
    'chcp 65001 > nul',
    'echo =====================================================',
    'echo   ROM COLLECTION MANAGER - SIDE-FILE BEREINIGUNG',
    `echo   Aktion: ${action === 'delete' ? 'Löschen' : 'In "_SideFiles_Backup" sichern'} (${items.length} Dateien)`,
    'echo =====================================================',
    'echo.',
    'pause',
    'echo.',
  ];

  if (action === 'quarantine') {
    lines.push('if not exist "_SideFiles_Backup" mkdir "_SideFiles_Backup"');
  }

  for (const item of items) {
    const safePath = item.originalPath.replace(/\//g, '\\');
    if (action === 'delete') {
      lines.push(`if exist "${safePath}" del /f /q "${safePath}"`);
    } else {
      lines.push(`if exist "${safePath}" move "${safePath}" "_SideFiles_Backup\\"`);
    }
  }

  lines.push(
    'echo.',
    'echo =====================================================',
    'echo   Fertig! Alle ausgewählten Begleitdateien bereinigt.',
    'echo =====================================================',
    'pause'
  );

  return lines.join('\r\n');
}

/**
 * Generates a Linux/macOS Bash (.sh) script for side-file cleanup
 */
export function generateSideFileCleanupSh(
  items: SideFileItem[],
  action: 'delete' | 'quarantine'
): string {
  const lines: string[] = [
    '#!/bin/bash',
    '# ROM Collection Manager - Side-file Cleanup Script',
    `# Mode: ${action} (${items.length} items)`,
    'echo "Starte Bereinigung von Begleitdateien..."',
  ];

  if (action === 'quarantine') {
    lines.push('mkdir -p "_SideFiles_Backup"');
  }

  for (const item of items) {
    const escaped = item.originalPath.replace(/"/g, '\\"');
    if (action === 'delete') {
      lines.push(`rm -f "${escaped}"`);
    } else {
      lines.push(`mv "${escaped}" "_SideFiles_Backup/"`);
    }
  }

  lines.push('echo "Fertig! Alle Begleitdateien bereinigt."');
  return lines.join('\n');
}
