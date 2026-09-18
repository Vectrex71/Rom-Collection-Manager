import { RomFile } from '../types';
import { getPlatformMetadata } from '../data/platformsData';

/**
 * Generates a clean CSV file from the ROM collection
 */
export function exportCollectionToCsv(roms: RomFile[]): string {
  const headers = [
    'Titel',
    'Plattform',
    'System-Kuerzel',
    'Dateiname',
    'Pfad',
    'Groesse_MB',
    'Region',
    'Version',
    'MultiDisk',
    'DiskLabel',
    'Top200',
    'Top200_Rang',
    'Ist_Duplikat',
    'Ist_Junk',
    'Genre',
    'Hash',
  ];

  const escapeCsv = (val: any) => {
    const str = val === undefined || val === null ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = roms.map((r) => {
    const meta = getPlatformMetadata(r.platform);
    const sizeMb = (r.size / (1024 * 1024)).toFixed(2);
    return [
      escapeCsv(r.canonicalTitle),
      escapeCsv(meta ? meta.name : r.platform),
      escapeCsv(r.platform),
      escapeCsv(r.cleanFilename || r.filename),
      escapeCsv(r.originalPath),
      escapeCsv(sizeMb),
      escapeCsv(r.region || ''),
      escapeCsv(r.versionOrRevision || ''),
      escapeCsv(r.isMultiDisc ? 'Ja' : 'Nein'),
      escapeCsv(r.discInfo ? r.discInfo.discLabel : ''),
      escapeCsv(r.isTop200 ? 'Ja' : 'Nein'),
      escapeCsv(r.top200Rank || ''),
      escapeCsv(r.isDuplicate ? 'Ja' : 'Nein'),
      escapeCsv(r.isJunk ? 'Ja' : 'Nein'),
      escapeCsv(r.genres.join(' / ')),
      escapeCsv(r.hash),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Generates an elegant Markdown Checklist with summary statistics
 */
export function exportCollectionToMarkdown(roms: RomFile[], folderName: string = 'ROMs'): string {
  const activeRoms = roms.filter((r) => !r.isJunk && (!r.isDuplicate || r.recommendedAction === 'keep'));
  const totalCount = activeRoms.length;
  const top200Count = activeRoms.filter((r) => r.isTop200).length;

  // Group by platform
  const byPlatform = new Map<string, RomFile[]>();
  for (const rom of activeRoms) {
    const meta = getPlatformMetadata(rom.platform);
    const platName = meta ? meta.name : rom.platform;
    const list = byPlatform.get(platName) || [];
    list.push(rom);
    byPlatform.set(platName, list);
  }

  const lines: string[] = [
    `# 🎮 Meine Retro-ROM-Sammlung: ${folderName}`,
    ``,
    `*Erstellt mit dem ROM Collection Manager am ${new Date().toLocaleDateString('de-DE')}*`,
    ``,
    `### 📊 Statistiken`,
    `- **Gesamtzahl aktive Spiele:** ${totalCount}`,
    `- **Kuratierte Top-200 Titel:** ${top200Count} von 200 (${Math.round((top200Count / 200) * 100)}%)`,
    `- **Enthaltene Systeme:** ${byPlatform.size}`,
    ``,
    `---`,
    ``,
  ];

  // Sort platforms alphabetically
  const sortedPlatforms = Array.from(byPlatform.keys()).sort((a, b) => a.localeCompare(b));

  for (const plat of sortedPlatforms) {
    const games = byPlatform.get(plat) || [];
    // Sort games by canonical title
    games.sort((a, b) => a.canonicalTitle.localeCompare(b.canonicalTitle));

    lines.push(`## ${plat} (${games.length} ${games.length === 1 ? 'Spiel' : 'Spiele'})`);
    lines.push(``);

    for (const g of games) {
      const topBadge = g.isTop200 ? ' ⭐ **[Top 200]**' : '';
      const regionBadge = g.region ? ` *(${g.region})*` : '';
      const discBadge = g.discInfo ? ` \`[${g.discInfo.discLabel}]\`` : '';
      lines.push(`- [x] **${g.canonicalTitle}**${regionBadge}${discBadge}${topBadge} — \`${g.cleanFilename || g.filename}\``);
    }

    lines.push(``);
  }

  return lines.join('\n');
}

/**
 * Downloads a file to the user's browser
 */
export function triggerFileDownload(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
