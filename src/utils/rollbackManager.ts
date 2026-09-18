import { RollbackActionItem, RomFile, UndoSnapshot } from '../types';
import { moveOrRenameRomDirect, renameRomInPlaceDirect } from './fileSystem';

const STORAGE_KEY = 'rom_manager_undo_snapshots_v1';

/**
 * Loads stored undo snapshots from localStorage
 */
export function getStoredUndoSnapshots(): UndoSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Fehler beim Laden der Undo-Historie:', err);
    return [];
  }
}

/**
 * Saves a new undo snapshot to localStorage (keeps last 10 snapshots)
 */
export function saveUndoSnapshot(snapshot: UndoSnapshot): void {
  try {
    const current = getStoredUndoSnapshots();
    const updated = [snapshot, ...current.filter((s) => s.id !== snapshot.id)].slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Fehler beim Speichern des Undo-Snapshots:', err);
  }
}

/**
 * Removes a snapshot from localStorage
 */
export function removeUndoSnapshot(snapshotId: string): void {
  try {
    const current = getStoredUndoSnapshots();
    const updated = current.filter((s) => s.id !== snapshotId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Fehler beim Entfernen des Undo-Snapshots:', err);
  }
}

/**
 * Generates a Windows Batch (.bat) rollback script
 */
export function generateRollbackBatchScript(snapshot: UndoSnapshot): string {
  const lines: string[] = [
    '@echo off',
    'chcp 65001 >nul',
    'echo ========================================================',
    'echo   ROM COLLECTION MANAGER - 1-KLICK RUECKGAENGIG-SKRIPT',
    `echo   Snapshot: ${snapshot.label}`,
    `echo   Erstellt am: ${new Date(snapshot.timestamp).toLocaleString('de-DE')}`,
    'echo ========================================================',
    'echo.',
    'pause',
    'echo.',
  ];

  for (const item of snapshot.items) {
    // Current applied path: item.appliedPath
    // Previous original path: item.previousPath
    const fromWin = item.appliedPath.replace(/\//g, '\\');
    const toWin = item.previousPath.replace(/\//g, '\\');

    lines.push(`if exist "${fromWin}" (`);
    // Ensure parent directory of destination exists
    if (item.previousPath.includes('/')) {
      const parentDir = item.previousPath.slice(0, item.previousPath.lastIndexOf('/')).replace(/\//g, '\\');
      lines.push(`  if not exist "${parentDir}" mkdir "${parentDir}"`);
    }
    lines.push(`  move /Y "${fromWin}" "${toWin}" >nul`);
    lines.push(`  echo [OK] Wiederhergestellt: "${toWin}"`);
    lines.push(')');
  }

  lines.push('echo.');
  lines.push('echo ========================================================');
  lines.push('echo   Alle verfuegbaren Dateien wurden zurueckgestellt!');
  lines.push('echo ========================================================');
  lines.push('pause');

  return lines.join('\r\n');
}

/**
 * Generates a Linux/macOS Bash (.sh) rollback script
 */
export function generateRollbackBashScript(snapshot: UndoSnapshot): string {
  const lines: string[] = [
    '#!/usr/bin/env bash',
    '# ========================================================',
    '#   ROM COLLECTION MANAGER - 1-KLICK RUECKGAENGIG-SKRIPT',
    `#   Snapshot: ${snapshot.label}`,
    `#   Erstellt am: ${new Date(snapshot.timestamp).toLocaleString('de-DE')}`,
    '# ========================================================',
    'set -e',
    'echo "Moechten Sie die letzten Aenderungen rueckgaengig machen?"',
    'read -p "Druecken Sie [ENTER] zum Fortfahren..."',
    '',
  ];

  for (const item of snapshot.items) {
    lines.push(`if [ -f "${item.appliedPath}" ]; then`);
    if (item.previousPath.includes('/')) {
      const parentDir = item.previousPath.slice(0, item.previousPath.lastIndexOf('/'));
      lines.push(`  mkdir -p "${parentDir}"`);
    }
    lines.push(`  mv -n "${item.appliedPath}" "${item.previousPath}"`);
    lines.push(`  echo "Wiederhergestellt: ${item.previousPath}"`);
    lines.push('fi');
  }

  lines.push('');
  lines.push('echo "Fertig! Alle Dateien wurden zurueckgesetzt."');

  return lines.join('\n');
}

/**
 * Directly executes a rollback using the browser FileSystemAccessAPI
 */
export async function executeDirectRollback(
  snapshot: UndoSnapshot,
  rootDirectoryHandle: any,
  currentRoms: RomFile[],
  onProgress?: (current: number, total: number, filename: string) => void
): Promise<{ revertedCount: number; updatedRoms: RomFile[] }> {
  let revertedCount = 0;
  let updatedRoms = [...currentRoms];

  for (let i = 0; i < snapshot.items.length; i++) {
    const item = snapshot.items[i];
    if (onProgress) {
      onProgress(i + 1, snapshot.items.length, item.previousFilename);
    }

    const matchingRom = updatedRoms.find((r) => r.id === item.romId);

    if (rootDirectoryHandle && matchingRom) {
      try {
        const destFolder = item.previousPath.includes('/')
          ? item.previousPath.slice(0, item.previousPath.lastIndexOf('/'))
          : '';

        if (!destFolder) {
          // Move back to root directory
          await moveOrRenameRomDirect(
            matchingRom,
            rootDirectoryHandle,
            '',
            item.previousFilename
          );
        } else {
          await moveOrRenameRomDirect(
            matchingRom,
            rootDirectoryHandle,
            destFolder,
            item.previousFilename
          );
        }
        revertedCount++;
      } catch (err) {
        console.warn('Rollback-Fehler für:', item.previousFilename, err);
      }
    } else {
      revertedCount++;
    }

    // Update in-memory ROM state
    updatedRoms = updatedRoms.map((r) => {
      if (r.id === item.romId) {
        return {
          ...r,
          filename: item.previousFilename,
          originalPath: item.previousPath,
          cleanFilename: item.previousFilename,
          isCleanNamed: false,
        };
      }
      return r;
    });

    // Brief yield
    if (snapshot.items.length > 20) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  return { revertedCount, updatedRoms };
}
