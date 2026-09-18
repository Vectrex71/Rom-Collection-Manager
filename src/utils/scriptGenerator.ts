import { OrganizeActionItem, RomFile, MultiDiscSet } from '../types';
import { sanitizeFolderName } from './multiDiscManager';

/**
 * Generates a safe, well-commented PowerShell script (.ps1) for Windows users
 */
export function generatePowerShellScript(
  actions: OrganizeActionItem[],
  duplicateDeletions: RomFile[],
  multiDiscSets: MultiDiscSet[] = [],
  useSubfoldersForDiscs: boolean = true
): string {
  const lines: string[] = [
    '# ==========================================================================',
    '# ROM Collection Organizer - Automatisiertes Sortier- & Bereinigungsskript',
    '# Erstellt vom ROM Collection Manager',
    '# ==========================================================================',
    '# HINWEIS: Dieses Skript verschiebt und benennt deine ROM-Dateien sauber um,',
    '# legt Plattform-Ordner an und generiert M3U-Playlists fuer Multi-Disk Spiele.',
    '# ==========================================================================',
    '',
    'param (',
    '    [switch]$DryRun = $false # Auf $true setzen fuer Testlauf ohne Aenderungen',
    ')',
    '',
    'Write-Host "=== ROM Collection Organizer ===" -ForegroundColor Cyan',
    'if ($DryRun) {',
    '    Write-Host "[DRY-RUN MODUS] Es werden keine Dateien veraendert." -ForegroundColor Yellow',
    '}',
    '',
    '# 1. Plattform-Verzeichnisse erstellen',
  ];

  // Collect unique target folders
  const targetFolders = new Set<string>();
  for (const act of actions) {
    if (act.selected && act.targetFolder) {
      targetFolders.add(act.targetFolder);
    }
  }
  for (const set of multiDiscSets) {
    if (set.targetFolder) {
      targetFolders.add(set.targetFolder);
    }
  }

  for (const folder of Array.from(targetFolders).sort()) {
    lines.push(`if (-not (Test-Path -Path "${folder}")) {`);
    lines.push(`    Write-Host "Erstelle Ordner: ${folder}" -ForegroundColor DarkGray`);
    lines.push(`    if (-not $DryRun) { New-Item -ItemType Directory -Path "${folder}" -Force | Out-Null }`);
    lines.push('}');
  }

  lines.push('', '# 2. Dateien umbenennen und in Plattform-Ordner verschieben');

  for (const act of actions) {
    if (!act.selected) continue;
    const src = act.currentPath.replace(/\//g, '\\');
    const dest = act.targetFolder
      ? `${act.targetFolder}\\${act.cleanFilename}`.replace(/\//g, '\\')
      : act.cleanFilename.replace(/\//g, '\\');

    lines.push(`if (Test-Path -LiteralPath "${src}") {`);
    lines.push(`    Write-Host "Verschiebe: ${src} -> ${dest}" -ForegroundColor Green`);
    lines.push(`    if (-not $DryRun) { Move-Item -LiteralPath "${src}" -Destination "${dest}" -Force }`);
    lines.push('} else {');
    lines.push(`    Write-Host "Quelldatei nicht gefunden: ${src}" -ForegroundColor Red`);
    lines.push('}');
  }

  // 3. Multi-Disk / Multi-CD Sets & M3U Playlists
  if (multiDiscSets.length > 0) {
    lines.push('', '# 3. Multi-Disk / Multi-CD M3U Playlists erstellen');
    for (const set of multiDiscSets) {
      const folder = set.targetFolder;
      const sub = sanitizeFolderName(set.gameTitle);

      if (useSubfoldersForDiscs) {
        // Create dedicated game folder inside platform folder and move discs into it
        lines.push(`$subDir = "${folder}\\${sub}"`);
        lines.push('if (-not (Test-Path -Path $subDir)) {');
        lines.push('    if (-not $DryRun) { New-Item -ItemType Directory -Path $subDir -Force | Out-Null }');
        lines.push('}');

        for (const disc of set.discs) {
          const discName = disc.cleanFilename || disc.filename;
          const origName = disc.filename;
          const origPathWin = disc.originalPath.replace(/\//g, '\\');
          const currentPlace = `${folder}\\${discName}`;
          const finalPlace = `${folder}\\${sub}\\${discName}`;
          lines.push(`$discCandidates = @("${currentPlace}", "${folder}\\${origName}", "${origPathWin}", "${discName}", "${origName}")`);
          lines.push(`foreach ($cand in $discCandidates) {`);
          lines.push(`    if (Test-Path -LiteralPath $cand) {`);
          lines.push(`        if ($cand -ne "${finalPlace}") {`);
          lines.push(`            Write-Host "Verschiebe Disk in Unterordner: $cand -> ${finalPlace}" -ForegroundColor Yellow`);
          lines.push(`            if (-not $DryRun) { Move-Item -LiteralPath $cand -Destination "${finalPlace}" -Force }`);
          lines.push(`        }`);
          lines.push(`        break`);
          lines.push(`    }`);
          lines.push(`}`);
        }

        // Create M3U playlist file
        const m3uPath = `${folder}\\${set.m3uFilename}`;
        const playlistLines = set.m3uSubfolderContent.split('\n').map((l) => l.trim()).filter(Boolean);
        lines.push(`$m3uContent = @"\n${playlistLines.join('\r\n')}\n"@`);
        lines.push(`Write-Host "Erstelle RetroArch Playlist: ${m3uPath}" -ForegroundColor Cyan`);
        lines.push(`if (-not $DryRun) { Set-Content -LiteralPath "${m3uPath}" -Value $m3uContent -Encoding UTF8 }`);
      } else {
        // Flat M3U alongside discs
        const m3uPath = `${folder}\\${set.m3uFilename}`;
        const playlistLines = set.m3uContent.split('\n').map((l) => l.trim()).filter(Boolean);
        lines.push(`$m3uContent = @"\n${playlistLines.join('\r\n')}\n"@`);
        lines.push(`Write-Host "Erstelle RetroArch Playlist: ${m3uPath}" -ForegroundColor Cyan`);
        lines.push(`if (-not $DryRun) { Set-Content -LiteralPath "${m3uPath}" -Value $m3uContent -Encoding UTF8 }`);
      }
    }
  }

  if (duplicateDeletions.length > 0) {
    lines.push('', '# 4. Exakte Duplikate und Mülldateien bereinigen (in _Duplicates verschieben)');
    lines.push('if (-not (Test-Path -Path "_Duplicates")) {');
    lines.push('    if (-not $DryRun) { New-Item -ItemType Directory -Path "_Duplicates" -Force | Out-Null }');
    lines.push('}');

    for (const dup of duplicateDeletions) {
      const src = dup.originalPath.replace(/\//g, '\\');
      const actionLabel = dup.isJunk ? 'Entferne Müll/Cache' : 'Sichere Duplikat';
      lines.push(`if (Test-Path -LiteralPath "${src}") {`);
      lines.push(`    Write-Host "${actionLabel}: ${src} -> _Duplicates\\" -ForegroundColor Magenta`);
      lines.push(`    if (-not $DryRun) { Move-Item -LiteralPath "${src}" -Destination "_Duplicates\\" -Force }`);
      lines.push('}');
    }
  }

  lines.push('', 'Write-Host "Bereinigung, Multi-Disk Playlists und Organisation abgeschlossen!" -ForegroundColor Cyan');

  return lines.join('\r\n');
}

/**
 * Generates a POSIX Bash script (.sh) for macOS / Linux users
 */
export function generateBashScript(
  actions: OrganizeActionItem[],
  duplicateDeletions: RomFile[],
  multiDiscSets: MultiDiscSet[] = [],
  useSubfoldersForDiscs: boolean = true
): string {
  const lines: string[] = [
    '#!/usr/bin/env bash',
    '# ==========================================================================',
    '# ROM Collection Organizer - Automatisiertes Sortier- & Bereinigungsskript',
    '# Erstellt vom ROM Collection Manager',
    '# ==========================================================================',
    'set -e',
    'echo "=== ROM Collection Organizer ==="',
    '',
    '# 1. Plattform-Verzeichnisse erstellen',
  ];

  const targetFolders = new Set<string>();
  for (const act of actions) {
    if (act.selected && act.targetFolder) {
      targetFolders.add(act.targetFolder);
    }
  }
  for (const set of multiDiscSets) {
    if (set.targetFolder) {
      targetFolders.add(set.targetFolder);
    }
  }

  for (const folder of Array.from(targetFolders).sort()) {
    lines.push(`mkdir -p "${folder}"`);
  }

  lines.push('', '# 2. Dateien umbenennen und verschieben');

  for (const act of actions) {
    if (!act.selected) continue;
    const src = act.currentPath;
    const dest = act.targetFolder ? `${act.targetFolder}/${act.cleanFilename}` : act.cleanFilename;
    lines.push(`if [ -f "${src}" ]; then`);
    lines.push(`  echo "Verschiebe: ${src} -> ${dest}"`);
    lines.push(`  mv -n "${src}" "${dest}"`);
    lines.push('fi');
  }

  // 3. Multi-Disk Sets & M3U Playlists
  if (multiDiscSets.length > 0) {
    lines.push('', '# 3. Multi-Disk / Multi-CD M3U Playlists erstellen');
    for (const set of multiDiscSets) {
      const folder = set.targetFolder;
      const sub = sanitizeFolderName(set.gameTitle);

      if (useSubfoldersForDiscs) {
        lines.push(`mkdir -p "${folder}/${sub}"`);
        for (const disc of set.discs) {
          const discName = disc.cleanFilename || disc.filename;
          lines.push(`if [ -f "${folder}/${discName}" ]; then`);
          lines.push(`  echo "Verschiebe Disk in Unterordner: ${discName}"`);
          lines.push(`  mv -n "${folder}/${discName}" "${folder}/${sub}/"`);
          lines.push('fi');
        }

        const playlistLines = set.m3uSubfolderContent.split('\n').map((l) => l.trim()).filter(Boolean);
        lines.push(`echo "Erstelle RetroArch M3U Playlist: ${folder}/${set.m3uFilename}"`);
        lines.push(`cat << 'EOF' > "${folder}/${set.m3uFilename}"`);
        for (const line of playlistLines) {
          lines.push(line);
        }
        lines.push('EOF');
      } else {
        const playlistLines = set.m3uContent.split('\n').map((l) => l.trim()).filter(Boolean);
        lines.push(`echo "Erstelle RetroArch M3U Playlist: ${folder}/${set.m3uFilename}"`);
        lines.push(`cat << 'EOF' > "${folder}/${set.m3uFilename}"`);
        for (const line of playlistLines) {
          lines.push(line);
        }
        lines.push('EOF');
      }
    }
  }

  if (duplicateDeletions.length > 0) {
    lines.push('', '# 4. Duplikate und Mülldateien sichern in _Duplicates Ordner');
    lines.push('mkdir -p "_Duplicates"');
    for (const dup of duplicateDeletions) {
      const actionText = dup.isJunk ? 'Müll/Cache sichern' : 'Duplikat sichern';
      lines.push(`if [ -f "${dup.originalPath}" ]; then`);
      lines.push(`  echo "${actionText}: ${dup.originalPath}"`);
      lines.push(`  mv -n "${dup.originalPath}" "_Duplicates/"`);
      lines.push('fi');
    }
  }

  lines.push('', 'echo "ROM Organisation & M3U Playlists erfolgreich abgeschlossen!"');

  return lines.join('\n');
}

/**
 * Generates a 1-click Windows CMD / Batch script (.bat) that can be run simply by double-clicking.
 */
export function generateBatchScript(
  actions: OrganizeActionItem[],
  duplicateDeletions: RomFile[],
  multiDiscSets: MultiDiscSet[] = [],
  useSubfoldersForDiscs: boolean = true
): string {
  const lines: string[] = [
    '@echo off',
    'chcp 65001 >nul',
    'title ROM Collection Manager - 1-Klick Automatisierung',
    'cls',
    'echo ==============================================================================',
    'echo         ROM COLLECTION MANAGER: 1-KLICK RUNDUM-SORGLOS-PAKET',
    'echo ==============================================================================',
    'echo.',
    'echo 1. Erstelle Ziel-Verzeichnisse...',
  ];

  const targetFolders = new Set<string>();
  for (const act of actions) {
    if (act.selected && act.targetFolder) {
      targetFolders.add(act.targetFolder);
    }
  }
  for (const set of multiDiscSets) {
    if (set.targetFolder) {
      targetFolders.add(set.targetFolder);
    }
  }

  for (const folder of Array.from(targetFolders).sort()) {
    lines.push(`if not exist "${folder}" mkdir "${folder}" 2>nul`);
  }

  lines.push('', 'echo 2. Benenne ROMs um und verschiebe in Plattform-Ordner...');
  for (const act of actions) {
    if (!act.selected) continue;
    const src = act.currentPath.replace(/\//g, '\\');
    const dest = act.targetFolder
      ? `${act.targetFolder}\\${act.cleanFilename}`.replace(/\//g, '\\')
      : act.cleanFilename.replace(/\//g, '\\');
    lines.push(`if exist "${src}" (`);
    lines.push(`    if not exist "${dest}" (`);
    lines.push(`        move /Y "${src}" "${dest}" >nul`);
    lines.push(`    )`);
    lines.push(`)`);
  }

  if (multiDiscSets.length > 0) {
    lines.push('', 'echo 3. Multi-Disk Spiele in Unterordner sortieren und M3U Playlists schreiben...');
    for (const set of multiDiscSets) {
      const folder = set.targetFolder;
      const sub = sanitizeFolderName(set.gameTitle);

      if (useSubfoldersForDiscs) {
        lines.push(`if not exist "${folder}\\${sub}" mkdir "${folder}\\${sub}" 2>nul`);
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
          lines.push(`)`);
        }

        const playlistLines = set.m3uSubfolderContent.split('\n').map((l) => l.trim()).filter(Boolean);
        lines.push(`(`);
        for (const pl of playlistLines) {
          lines.push(`  echo ${pl}`);
        }
        lines.push(`) > "${folder}\\${set.m3uFilename}" 2>nul`);
      } else {
        const playlistLines = set.m3uContent.split('\n').map((l) => l.trim()).filter(Boolean);
        lines.push(`(`);
        for (const pl of playlistLines) {
          lines.push(`  echo ${pl}`);
        }
        lines.push(`) > "${folder}\\${set.m3uFilename}" 2>nul`);
      }
    }
  }

  if (duplicateDeletions.length > 0) {
    lines.push('', 'echo 4. Duplikate und Cache-Dateien in _Duplicates sichern...');
    lines.push('if not exist "_Duplicates" mkdir "_Duplicates" 2>nul');
    for (const dup of duplicateDeletions) {
      const src = dup.originalPath.replace(/\//g, '\\');
      lines.push(`if exist "${src}" move /Y "${src}" "_Duplicates\\" >nul`);
    }
  }

  lines.push('');
  lines.push('echo ==============================================================================');
  lines.push('echo [FERTIG!] Deine ROM-Sammlung und M3U-Playlists wurden sauber sortiert!');
  lines.push('echo ==============================================================================');
  lines.push('echo.');
  lines.push('pause');

  return lines.join('\r\n');
}
