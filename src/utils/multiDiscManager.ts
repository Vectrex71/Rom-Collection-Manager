import { RomFile, MultiDiscSet, PlatformCode } from '../types';

/**
 * Detects all multi-disc / multi-disk games in a ROM collection.
 * Sorts discs by their disc number (Disk 1, Disk 2, Side A, etc.) and prepares
 * RetroArch/Batocera-compatible .m3u playlist files.
 */
export function detectMultiDiscSets(romFiles: RomFile[]): MultiDiscSet[] {
  const groups = new Map<string, RomFile[]>();

  for (const rom of romFiles) {
    // Only consider the recommended/active version of each disc (filter out bad dump duplicates of the same disc)
    if (rom.isDuplicate && rom.recommendedAction === 'delete') {
      continue;
    }

    const key = `${rom.platform}___${rom.canonicalTitle.toLowerCase().trim()}`;
    const list = groups.get(key) || [];
    list.push(rom);
    groups.set(key, list);
  }

  const multiSets: MultiDiscSet[] = [];

  for (const [, files] of groups.entries()) {
    // Multi-disc condition:
    // Either multiple files for this canonical title with disc indicators,
    // or at least one file explicitly tagged as part of a multi-disc set
    const hasDiscTag = files.some((f) => f.discInfo || f.isMultiDisc);
    if (!hasDiscTag && files.length < 2) {
      continue;
    }

    // If multiple files without disc tags, only treat as multi-disc if filenames differentiate media (e.g. CD1/CD2)
    if (!hasDiscTag && files.length >= 2) {
      const distinctNames = new Set(files.map((f) => f.filename));
      if (distinctNames.size < 2) continue;
    }

    // Sort discs sequentially by discNumber (1, 2, 3...) or filename
    const sortedDiscs = [...files].sort((a, b) => {
      const numA = a.discInfo?.discNumber ?? 999;
      const numB = b.discInfo?.discNumber ?? 999;
      if (numA !== numB) return numA - numB;
      return a.filename.localeCompare(b.filename);
    });

    const first = sortedDiscs[0];
    const gameTitle = first.canonicalTitle;
    const platform = first.platform;
    const targetFolder = first.targetFolder;

    // Clean filename for the playlist
    const m3uFilename = `${gameTitle}.m3u`;

    // 1. Flat Structure (Discs alongside .m3u file)
    // In RetroArch / Batocera: Each line is the filename of a disc in the same directory
    const m3uContent = sortedDiscs
      .map((d) => d.cleanFilename || d.filename)
      .join('\n');

    // 2. Subfolder Structure (Discs in a dedicated subfolder, e.g. "GameTitle/GameTitle (Disc 1).chd")
    // This allows RetroArch to hide individual disc files in the UI and show only ONE single clean entry!
    const subfolderName = sanitizeFolderName(gameTitle);
    const m3uSubfolderContent = sortedDiscs
      .map((d) => `${subfolderName}/${d.cleanFilename || d.filename}`)
      .join('\n');

    multiSets.push({
      id: `m3u_${platform}_${gameTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      gameTitle,
      platform,
      targetFolder,
      discs: sortedDiscs,
      totalDiscs: sortedDiscs.length,
      m3uFilename,
      m3uContent,
      m3uSubfolderContent,
    });
  }

  // Sort multi-disc sets alphabetically by game title
  return multiSets.sort((a, b) => a.gameTitle.localeCompare(b.gameTitle));
}

/**
 * Sanitizes folder names by removing illegal path characters
 */
export function sanitizeFolderName(name: string): string {
  return name.replace(/[<>:"/\\|?*]+/g, '').trim();
}

/**
 * Triggers a browser download of a single .m3u playlist file
 */
export function downloadSingleM3U(set: MultiDiscSet, useSubfolder: boolean = false): void {
  const content = useSubfolder ? set.m3uSubfolderContent : set.m3uContent;
  const blob = new Blob([content], { type: 'audio/x-mpegurl;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = set.m3uFilename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Downloads a text-based script file (.bat, .ps1, .sh, .m3u)
 */
export function downloadScriptFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generates a 1-click Windows Batch (.bat) file for automated multi-disc setup.
 * Double-clicking this file in Windows Explorer executes without PowerShell permissions:
 * 1. Creates dedicated subfolder for each game
 * 2. Moves all discs into the subfolder
 * 3. Creates the .m3u playlist in UTF-8
 */
export function generateStandaloneMultiDiscBat(
  multiDiscSets: MultiDiscSet[],
  useSubfolders: boolean = true
): string {
  const lines: string[] = [
    '@echo off',
    'chcp 65001 >nul',
    'title M3U Rundum-Sorglos-Paket - RetroArch & Batocera Playlists',
    'cls',
    'echo ============================================================================== ',
    'echo           RUNDUM-SORGLOS-PAKET: MULTI-DISK & M3U AUTOMATISIERUNG               ',
    'echo ============================================================================== ',
    'echo.',
    'echo Dieses Skript erledigt ALLES in einem einzigen Durchgang:',
    'echo   1. Erstellt Unterordner fuer jedes Multi-Disk-Spiel',
    'echo   2. Verschiebt alle Disketten/CDs (Disk 1, Disk 2...) automatisch hinein',
    'echo   3. Erstellt die fertige .m3u Playlist fuer RetroArch, Batocera & MiSTer',
    'echo.',
    'echo ------------------------------------------------------------------------------ ',
    'echo.',
  ];

  for (let idx = 0; idx < multiDiscSets.length; idx++) {
    const set = multiDiscSets[idx];
    const folder = set.targetFolder;
    const sub = sanitizeFolderName(set.gameTitle);

    lines.push(`echo [${idx + 1}/${multiDiscSets.length}] Verarbeite: ${set.gameTitle} (${set.totalDiscs} Disks)...`);

    if (useSubfolders) {
      lines.push(`if not exist "${folder}\\${sub}" mkdir "${folder}\\${sub}" 2>nul`);
      lines.push(`if not exist "${sub}" mkdir "${sub}" 2>nul`);

      for (const disc of set.discs) {
        const discName = disc.cleanFilename || disc.filename;
        const origName = disc.filename;
        const origPathWin = disc.originalPath.replace(/\//g, '\\');

        lines.push(`if exist "${folder}\\${discName}" (`);
        lines.push(`    move /Y "${folder}\\${discName}" "${folder}\\${sub}\\" >nul`);
        lines.push(`) else if exist "${folder}\\${origName}" (`);
        lines.push(`    move /Y "${folder}\\${origName}" "${folder}\\${sub}\\${discName}" >nul`);
        lines.push(`) else if exist "${origPathWin}" (`);
        lines.push(`    move /Y "${origPathWin}" "${folder}\\${sub}\\${discName}" >nul`);
        lines.push(`) else if exist "${discName}" (`);
        lines.push(`    move /Y "${discName}" "${sub}\\" >nul`);
        lines.push(`) else if exist "${origName}" (`);
        lines.push(`    move /Y "${origName}" "${sub}\\${discName}" >nul`);
        lines.push(`)`);
      }

      const playlistLines = set.m3uSubfolderContent.split('\n').map((l) => l.trim()).filter(Boolean);
      lines.push(`(`);
      for (const pl of playlistLines) {
        lines.push(`  echo ${pl}`);
      }
      lines.push(`) > "${folder}\\${set.m3uFilename}" 2>nul`);

      lines.push(`if not exist "${folder}\\${set.m3uFilename}" (`);
      lines.push(`  (`);
      for (const pl of playlistLines) {
        lines.push(`    echo ${pl}`);
      }
      lines.push(`  ) > "${set.m3uFilename}" 2>nul`);
      lines.push(`)`);

      lines.push(`echo    -> ${set.totalDiscs} Disks einsortiert in "${sub}" & Playlist angelegt.`);
    } else {
      const playlistLines = set.m3uContent.split('\n').map((l) => l.trim()).filter(Boolean);
      lines.push(`(`);
      for (const pl of playlistLines) {
        lines.push(`  echo ${pl}`);
      }
      lines.push(`) > "${folder}\\${set.m3uFilename}" 2>nul`);
      lines.push(`if not exist "${folder}\\${set.m3uFilename}" (`);
      lines.push(`  (`);
      for (const pl of playlistLines) {
        lines.push(`    echo ${pl}`);
      }
      lines.push(`  ) > "${set.m3uFilename}" 2>nul`);
      lines.push(`)`);
      lines.push(`echo    -> Playlist "${set.m3uFilename}" angelegt.`);
    }

    lines.push('echo.');
  }

  lines.push('echo ============================================================================== ');
  lines.push('echo [ERFOLG] Alle Multi-Disk Spiele & M3U-Playlists wurden fertiggestellt!');
  lines.push('echo RetroArch und Batocera zeigen ab jetzt nur noch genau 1 sauberen Eintrag.');
  lines.push('echo ============================================================================== ');
  lines.push('echo.');
  lines.push('pause');

  return lines.join('\r\n');
}

/**
 * Generates a standalone PowerShell (.ps1) script for automated multi-disc setup.
 */
export function generateStandaloneMultiDiscPowerShell(
  multiDiscSets: MultiDiscSet[],
  useSubfolders: boolean = true
): string {
  const lines: string[] = [
    '# ============================================================================== ',
    '# RUNDUM-SORGLOS-PAKET: MULTI-DISK & M3U AUTOMATISIERUNG (PowerShell)           ',
    '# ============================================================================== ',
    '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
    '$OutputEncoding = [System.Text.Encoding]::UTF8',
    'Write-Host "==============================================================================" -ForegroundColor Cyan',
    'Write-Host "       RUNDUM-SORGLOS-PAKET: MULTI-DISK & M3U AUTOMATISIERUNG" -ForegroundColor Cyan',
    'Write-Host "==============================================================================" -ForegroundColor Cyan',
    'Write-Host ""',
  ];

  for (let idx = 0; idx < multiDiscSets.length; idx++) {
    const set = multiDiscSets[idx];
    const folder = set.targetFolder;
    const sub = sanitizeFolderName(set.gameTitle);

    lines.push(`Write-Host "[$(${idx + 1})/${multiDiscSets.length}] Verarbeite: ${set.gameTitle}..." -ForegroundColor Yellow`);

    if (useSubfolders) {
      lines.push(`$subDir = if (Test-Path -Path "${folder}") { "${folder}\\${sub}" } else { "${sub}" }`);
      lines.push(`if (-not (Test-Path -Path $subDir)) { New-Item -ItemType Directory -Path $subDir -Force | Out-Null }`);

      for (const disc of set.discs) {
        const discName = disc.cleanFilename || disc.filename;
        const origName = disc.filename;
        const origPath = disc.originalPath.replace(/\//g, '\\');

        lines.push(`$candidates = @("${folder}\\${discName}", "${folder}\\${origName}", "${origPath}", "${discName}", "${origName}")`);
        lines.push(`foreach ($cand in $candidates) {`);
        lines.push(`    if (Test-Path -LiteralPath $cand) {`);
        lines.push(`        $target = Join-Path $subDir "${discName}"`);
        lines.push(`        if ($cand -ne $target) {`);
        lines.push(`            Move-Item -LiteralPath $cand -Destination $target -Force`);
        lines.push(`            Write-Host "  -> Disk verschoben: ${discName}" -ForegroundColor Green`);
        lines.push(`        }`);
        lines.push(`        break`);
        lines.push(`    }`);
        lines.push(`}`);
      }

      const playlistLines = set.m3uSubfolderContent.split('\n').map((l) => l.trim()).filter(Boolean);
      lines.push(`$m3uPath = if (Test-Path -Path "${folder}") { "${folder}\\${set.m3uFilename}" } else { "${set.m3uFilename}" }`);
      lines.push(`$content = @"\n${playlistLines.join('\r\n')}\n"@`);
      lines.push(`Set-Content -LiteralPath $m3uPath -Value $content -Encoding UTF8`);
      lines.push(`Write-Host "  -> M3U Playlist erstellt: $m3uPath" -ForegroundColor Cyan`);
    } else {
      const playlistLines = set.m3uContent.split('\n').map((l) => l.trim()).filter(Boolean);
      lines.push(`$m3uPath = if (Test-Path -Path "${folder}") { "${folder}\\${set.m3uFilename}" } else { "${set.m3uFilename}" }`);
      lines.push(`$content = @"\n${playlistLines.join('\r\n')}\n"@`);
      lines.push(`Set-Content -LiteralPath $m3uPath -Value $content -Encoding UTF8`);
      lines.push(`Write-Host "  -> M3U Playlist erstellt: $m3uPath" -ForegroundColor Cyan`);
    }
    lines.push('');
  }

  lines.push('Write-Host "==============================================================================" -ForegroundColor Green');
  lines.push('Write-Host "[ERFOLG] Alle Multi-Disk Spiele & M3U-Playlists wurden fertiggestellt!" -ForegroundColor Green');
  lines.push('Write-Host "RetroArch und Batocera zeigen ab jetzt nur noch 1 sauberen Eintrag pro Spiel." -ForegroundColor Green');
  lines.push('Write-Host "==============================================================================" -ForegroundColor Green');
  lines.push('Read-Host -Prompt "Druecke Enter zum Beenden"');

  return lines.join('\r\n');
}

/**
 * Generates a standalone Bash (.sh) script for Mac / Linux / Steam Deck users
 */
export function generateStandaloneMultiDiscBash(
  multiDiscSets: MultiDiscSet[],
  useSubfolders: boolean = true
): string {
  const lines: string[] = [
    '#!/usr/bin/env bash',
    '# ============================================================================== ',
    '# RUNDUM-SORGLOS-PAKET: MULTI-DISK & M3U AUTOMATISIERUNG (Bash)                 ',
    '# ============================================================================== ',
    'set -e',
    'echo "=============================================================================="',
    'echo "       RUNDUM-SORGLOS-PAKET: MULTI-DISK & M3U AUTOMATISIERUNG"',
    'echo "=============================================================================="',
    'echo ""',
  ];

  for (let idx = 0; idx < multiDiscSets.length; idx++) {
    const set = multiDiscSets[idx];
    const folder = set.targetFolder;
    const sub = sanitizeFolderName(set.gameTitle);

    lines.push(`echo "[$(${idx + 1})/${multiDiscSets.length}] Verarbeite: ${set.gameTitle}..."`);

    if (useSubfolders) {
      lines.push(`if [ -d "${folder}" ]; then subDir="${folder}/${sub}"; else subDir="${sub}"; fi`);
      lines.push(`mkdir -p "$subDir"`);

      for (const disc of set.discs) {
        const discName = disc.cleanFilename || disc.filename;
        const origName = disc.filename;
        const origPath = disc.originalPath;

        lines.push(`for cand in "${folder}/${discName}" "${folder}/${origName}" "${origPath}" "${discName}" "${origName}"; do`);
        lines.push(`    if [ -f "$cand" ]; then`);
        lines.push(`        if [ "$cand" != "$subDir/${discName}" ]; then`);
        lines.push(`            mv -f "$cand" "$subDir/${discName}"`);
        lines.push(`            echo "  -> Disk verschoben: ${discName}"`);
        lines.push(`        fi`);
        lines.push(`        break`);
        lines.push(`    fi`);
        lines.push(`done`);
      }

      const playlistLines = set.m3uSubfolderContent.split('\n').map((l) => l.trim()).filter(Boolean);
      lines.push(`if [ -d "${folder}" ]; then m3uPath="${folder}/${set.m3uFilename}"; else m3uPath="${set.m3uFilename}"; fi`);
      lines.push(`cat << 'EOF' > "$m3uPath"`);
      for (const pl of playlistLines) {
        lines.push(pl);
      }
      lines.push('EOF');
      lines.push(`echo "  -> M3U Playlist erstellt: $m3uPath"`);
    } else {
      const playlistLines = set.m3uContent.split('\n').map((l) => l.trim()).filter(Boolean);
      lines.push(`if [ -d "${folder}" ]; then m3uPath="${folder}/${set.m3uFilename}"; else m3uPath="${set.m3uFilename}"; fi`);
      lines.push(`cat << 'EOF' > "$m3uPath"`);
      for (const pl of playlistLines) {
        lines.push(pl);
      }
      lines.push('EOF');
      lines.push(`echo "  -> M3U Playlist erstellt: $m3uPath"`);
    }
    lines.push('');
  }

  lines.push('echo "=============================================================================="');
  lines.push('echo "[ERFOLG] Alle Multi-Disk Spiele & M3U-Playlists wurden fertiggestellt!"');
  lines.push('echo "=============================================================================="');

  return lines.join('\n');
}

/**
 * Writes an M3U playlist file directly into the local directory via FileSystemAccessAPI,
 * creates the game subfolder, and moves all related discs into it.
 */
export async function createM3UDirect(
  set: MultiDiscSet,
  rootDirectoryHandle: any,
  useSubfolder: boolean = false
): Promise<{ success: boolean; updatedDiscs: RomFile[] }> {
  if (!rootDirectoryHandle) {
    throw new Error('Kein Verzeichnis-Zugriff vorhanden.');
  }

  try {
    let platDirHandle = rootDirectoryHandle;
    if (set.targetFolder && rootDirectoryHandle.name !== set.targetFolder) {
      const parts = set.targetFolder.split('/').filter(Boolean);
      for (const part of parts) {
        if (platDirHandle.name !== part) {
          platDirHandle = await platDirHandle.getDirectoryHandle(part, { create: true });
        }
      }
    }

    const subfolderName = sanitizeFolderName(set.gameTitle);
    const updatedDiscs: RomFile[] = [];

    if (useSubfolder) {
      // 1. Create dedicated subfolder for the game discs
      const gameSubfolderHandle = await platDirHandle.getDirectoryHandle(subfolderName, { create: true });

      // 2. Move discs into dedicated subfolder
      for (const disc of set.discs) {
        const targetName = disc.cleanFilename || disc.filename;
        let moved = false;

        if (disc.fileHandle) {
          if (typeof disc.fileHandle.move === 'function') {
            try {
              await disc.fileHandle.move(gameSubfolderHandle, targetName);
              moved = true;
            } catch (err) {
              console.warn('fileHandle.move fallback to copy/delete', err);
            }
          }

          if (!moved) {
            try {
              const file = await disc.fileHandle.getFile();
              const newFileHandle = await gameSubfolderHandle.getFileHandle(targetName, { create: true });
              const writable = await newFileHandle.createWritable();
              await writable.write(await file.arrayBuffer());
              await writable.close();

              if (disc.parentDirHandle) {
                try {
                  await disc.parentDirHandle.removeEntry(disc.filename);
                } catch (delErr) {
                  console.warn('Could not remove source file after copy', delErr);
                }
              }
              disc.fileHandle = newFileHandle;
              disc.parentDirHandle = gameSubfolderHandle;
              moved = true;
            } catch (copyErr) {
              console.error('Error during copy to subfolder', copyErr);
            }
          }
        }

        const newOriginalPath = `${set.targetFolder}/${subfolderName}/${targetName}`;
        updatedDiscs.push({
          ...disc,
          filename: targetName,
          cleanFilename: targetName,
          originalPath: newOriginalPath,
          targetFolder: `${set.targetFolder}/${subfolderName}`,
        });
      }

      // 3. Write M3U file in the platform folder pointing into the subfolder
      const m3uFileHandle = await platDirHandle.getFileHandle(set.m3uFilename, { create: true });
      const writable = await m3uFileHandle.createWritable();
      await writable.write(set.m3uSubfolderContent);
      await writable.close();
    } else {
      // Flat structure
      for (const disc of set.discs) {
        updatedDiscs.push(disc);
      }
      const m3uFileHandle = await platDirHandle.getFileHandle(set.m3uFilename, { create: true });
      const writable = await m3uFileHandle.createWritable();
      await writable.write(set.m3uContent);
      await writable.close();
    }

    return { success: true, updatedDiscs };
  } catch (err) {
    console.error('Fehler beim Erstellen der M3U Playlist:', err);
    throw err;
  }
}
