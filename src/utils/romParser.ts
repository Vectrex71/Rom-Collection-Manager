import { PlatformCode, RomFile, DiscInfo, RegionPreference, EditionType } from '../types';
import { getPlatformByExtension, getPlatformMetadata } from '../data/platformsData';
import { TOP_200_ROMS } from '../data/topRomsData';
import { isArcadePlatform, getArcadeTitle } from '../data/arcadeGamesData';

export interface ParsedRomInfo {
  canonicalTitle: string;
  cleanFilename: string;
  platform: PlatformCode;
  targetFolder: string;
  region?: string;
  versionOrRevision?: string;
  discInfo?: DiscInfo;
  isMultiDisc: boolean;
  isBadDump: boolean;
  isHackOrTranslation: boolean;
  editionType?: EditionType;
  translationLanguage?: string;
  hackDetails?: string;
  isVerifiedGood: boolean;
  isArcadeRom?: boolean;
  isTop200: boolean;
  top200Rank?: number;
  genres: string[];
  isJunk?: boolean;
  junkReason?: string;
}

export interface JunkCheckResult {
  isJunk: boolean;
  reason?: string;
}

/**
 * Identifies operating system clutter, cache files, scraper databases, and temporary files
 * that are definitely not ROMs and can safely be deleted (e.g. CPC_cache2.db, Thumbs.db).
 */
export function isJunkFile(filename: string): JunkCheckResult {
  const lower = filename.toLowerCase().trim();
  const lastDot = lower.lastIndexOf('.');
  const ext = lastDot !== -1 ? lower.slice(lastDot) : '';

  // 1. Operating system / file manager junk
  if (
    lower === 'thumbs.db' ||
    lower === 'ehthumbs.db' ||
    lower === 'ehthumbs_vista.db' ||
    lower === 'desktop.ini' ||
    lower === '.ds_store' ||
    lower.startsWith('._') ||
    lower === 'folder.jpg.bak'
  ) {
    return { isJunk: true, reason: 'Betriebssystem-Müll' };
  }

  // 2. Database & cache files (.db, .db-journal, .db-wal, .db-shm, .sqlite)
  // e.g. "CPC_cache2.db", "games.db", "metadata.db"
  if (
    ext === '.db' ||
    ext === '.db-journal' ||
    ext === '.db-wal' ||
    ext === '.db-shm' ||
    ext === '.sqlite' ||
    ext === '.sqlite3'
  ) {
    return { isJunk: true, reason: 'Cache- / Datenbankdatei (.db)' };
  }

  // 3. Backup, temporary and lock files
  if (
    ext === '.tmp' ||
    ext === '.temp' ||
    ext === '.bak' ||
    ext === '.backup' ||
    ext === '.old' ||
    lower.endsWith('~') ||
    lower.endsWith('.swp')
  ) {
    return { isJunk: true, reason: 'Temporäre / Backup-Datei' };
  }

  // 4. Cache keyword in filename with non-ROM or generic scraper extensions
  if (
    lower.includes('cache') &&
    (ext === '.db' || ext === '.bin' || ext === '.dat' || ext === '.idx' || ext === '.xml' || ext === '.json' || ext === '')
  ) {
    return { isJunk: true, reason: 'Emulator- / Scraper-Cache' };
  }

  // 5. Scraper / emulator log files
  if (ext === '.log' || (ext === '.txt' && (lower.includes('error') || lower.includes('crash') || lower.includes('debug')))) {
    return { isJunk: true, reason: 'Log- / Absturzdatei' };
  }

  return { isJunk: false };
}

/**
 * Extracts Disc/Disk/Side information from filenames (e.g. Disk 1, Disc 2, Side A, CD1).
 */
export function extractDiscInfo(filename: string): DiscInfo | undefined {
  const lastDot = filename.lastIndexOf('.');
  const base = lastDot !== -1 ? filename.slice(0, lastDot) : filename;

  // 1. Bracketed or parenthesized patterns: (Disk 1), (Disc 2), (Side A), (CD1), (Disk 1 of 2)
  const parenRegex = /\((?:Disk|Disc|Disque|CD|Side|Face|Part)\s*([A-Za-z0-9]+)(?:\s*(?:of|\/)\s*(\d+))?\)/i;
  const parenMatch = base.match(parenRegex);
  if (parenMatch) {
    const rawVal = parenMatch[1];
    let num = parseInt(rawVal, 10);
    if (isNaN(num)) {
      num = rawVal.toUpperCase().charCodeAt(0) - 64; // A=1, B=2...
    }
    const totalDiscs = parenMatch[2] ? parseInt(parenMatch[2], 10) : undefined;
    const isSide = /side|face/i.test(parenMatch[0]);
    const isCD = /cd/i.test(parenMatch[0]);
    const isDisc = /disc/i.test(parenMatch[0]);
    const prefix = isSide ? 'Side' : isCD || isDisc ? 'Disc' : 'Disk';
    return {
      discNumber: Math.max(1, isNaN(num) ? 1 : num),
      totalDiscs,
      discLabel: `${prefix} ${rawVal.toUpperCase()}`,
      rawMatch: parenMatch[0],
    };
  }

  // 2. Square brackets: [Disk 1], [Disc 2], [Side A]
  const squareRegex = /\[(?:Disk|Disc|Disque|CD|Side|Face|Part)\s*([A-Za-z0-9]+)(?:\s*(?:of|\/)\s*(\d+))?\]/i;
  const squareMatch = base.match(squareRegex);
  if (squareMatch) {
    const rawVal = squareMatch[1];
    let num = parseInt(rawVal, 10);
    if (isNaN(num)) {
      num = rawVal.toUpperCase().charCodeAt(0) - 64;
    }
    const totalDiscs = squareMatch[2] ? parseInt(squareMatch[2], 10) : undefined;
    const isSide = /side|face/i.test(squareMatch[0]);
    const isCD = /cd/i.test(squareMatch[0]);
    const isDisc = /disc/i.test(squareMatch[0]);
    const prefix = isSide ? 'Side' : isCD || isDisc ? 'Disc' : 'Disk';
    return {
      discNumber: Math.max(1, isNaN(num) ? 1 : num),
      totalDiscs,
      discLabel: `${prefix} ${rawVal.toUpperCase()}`,
      rawMatch: squareMatch[0],
    };
  }

  // 3. Delimited words: "Game Disk 1", "Game Disc 2", "Game Side B"
  const wordRegex = /\b(?:Disk|Disc|Disque|Side|Face)\s*([A-Za-z0-9]+)(?:\s*(?:of|\/)\s*(\d+))?\b/i;
  const wordMatch = base.match(wordRegex);
  if (wordMatch) {
    const rawVal = wordMatch[1];
    let num = parseInt(rawVal, 10);
    if (isNaN(num)) {
      num = rawVal.toUpperCase().charCodeAt(0) - 64;
    }
    const totalDiscs = wordMatch[2] ? parseInt(wordMatch[2], 10) : undefined;
    const isSide = /side|face/i.test(wordMatch[0]);
    const isDisc = /disc/i.test(wordMatch[0]);
    const prefix = isSide ? 'Side' : isDisc ? 'Disc' : 'Disk';
    return {
      discNumber: Math.max(1, isNaN(num) ? 1 : num),
      totalDiscs,
      discLabel: `${prefix} ${rawVal.toUpperCase()}`,
      rawMatch: wordMatch[0],
    };
  }

  // 4. Compact CD tags: "Game CD1", "Game CD2"
  const cdRegex = /\bCD\s*(\d+)\b/i;
  const cdMatch = base.match(cdRegex);
  if (cdMatch) {
    const num = parseInt(cdMatch[1], 10);
    return {
      discNumber: Math.max(1, isNaN(num) ? 1 : num),
      discLabel: `Disc ${num}`,
      rawMatch: cdMatch[0],
    };
  }

  // 5. Underscore/hyphen suffix: "Game_Disk1", "Game-Disc2"
  const altRegex = /[_\-](?:Disk|Disc|Disque|Side)([0-9A-Za-z])\b/i;
  const altMatch = base.match(altRegex);
  if (altMatch) {
    const rawVal = altMatch[1];
    let num = parseInt(rawVal, 10);
    if (isNaN(num)) {
      num = rawVal.toUpperCase().charCodeAt(0) - 64;
    }
    return {
      discNumber: Math.max(1, isNaN(num) ? 1 : num),
      discLabel: `Disk ${rawVal.toUpperCase()}`,
      rawMatch: altMatch[0],
    };
  }

  return undefined;
}

/**
 * Accurately detects retro platform from folder path, filename tags, and file extensions.
 * Folder path is treated as authoritative, preventing false cross-console assignment.
 */
export function detectPlatform(
  filename: string,
  parentPath?: string,
  rootFolderName?: string
): PlatformCode {
  const lastDot = filename.lastIndexOf('.');
  const ext = lastDot !== -1 ? filename.slice(lastDot).toLowerCase() : '';

  // 1. DISTINCT EXTENSIONS (Unique to a single platform, e.g. .adf is always Amiga, .sfc is SNES, .nes is NES)
  const extPlat = getPlatformByExtension(ext);
  if (extPlat !== 'OTHER') {
    return extPlat;
  }

  // 2. Gather directory segments (closest parent first)
  const folderSegments: string[] = [];
  if (parentPath) {
    const parts = parentPath.split(/[\/\\]+/).filter(Boolean);
    if (parts.length > 1) {
      folderSegments.push(...parts.slice(0, parts.length - 1).reverse());
    }
  }
  if (rootFolderName) {
    folderSegments.push(rootFolderName);
  }

  // Helper: check if any directory segment matches platform regex using word boundary
  const matchFolder = (regex: RegExp) => folderSegments.some((seg) => regex.test(seg));

  // 3. FOLDER HEURISTICS
  // Specific computer/console systems are checked first!
  // Commodore
  if (matchFolder(/(^|[\s_.-])(amiga\s*cd32|cd32)($|[\s_.-])/i)) return 'AMIGA_CD32';
  if (matchFolder(/(^|[\s_.-])(cdtv|commodore\s*cdtv)($|[\s_.-])/i)) return 'COMMODORE_CDTV';
  if (matchFolder(/(^|[\s_.-])(c64|commodore\s*64)($|[\s_.-])/i)) return 'C64';
  if (matchFolder(/(^|[\s_.-])(amiga|amiga500|amiga1200|amiga2000|amiga4000|commodore\s*amiga)($|[\s_.-])/i)) return 'AMIGA';

  // Amstrad
  if (matchFolder(/(^|[\s_.-])(gx4000|amstrad\s*gx4000)($|[\s_.-])/i)) return 'AMSTRAD_GX4000';
  if (matchFolder(/(^|[\s_.-])(amstrad|cpc|amstradcpc|schneider)($|[\s_.-])/i)) return 'AMSTRAD_CPC';

  // Acorn & Computers
  if (matchFolder(/(^|[\s_.-])(archimedes|acorn)($|[\s_.-])/i)) return 'ARCHIMEDES';
  if (matchFolder(/(^|[\s_.-])(ms\s*dos|msdos|dosgames|dos)($|[\s_.-])/i)) return 'MS_DOS';
  if (matchFolder(/(^|[\s_.-])(x68000|x68k|sharp\s*x68000)($|[\s_.-])/i)) return 'SHARP_X68000';
  if (matchFolder(/(^|[\s_.-])(mz-?700|sharp\s*mz-?700)($|[\s_.-])/i)) return 'SHARP_MZ700';
  if (matchFolder(/(^|[\s_.-])(msx2|msx)($|[\s_.-])/i)) return 'MSX';

  // Capcom Play System & Arcade
  if (matchFolder(/(^|[\s_.-])(cps1|cps-1|capcom\s*play\s*system\s*1)($|[\s_.-])/i)) return 'CPS1';
  if (matchFolder(/(^|[\s_.-])(cps2|cps-2|capcom\s*play\s*system\s*2)($|[\s_.-])/i)) return 'CPS2';
  if (matchFolder(/(^|[\s_.-])(cps3|cps-3|capcom\s*play\s*system\s*3)($|[\s_.-])/i)) return 'CPS3';
  if (matchFolder(/(^|[\s_.-])(cps|capcom\s*play\s*system)($|[\s_.-])/i)) return 'CPS';
  if (matchFolder(/(^|[\s_.-])(finalburn\s*neo|fbneo)($|[\s_.-])/i)) return 'FB_NEO';
  if (matchFolder(/(^|[\s_.-])(finalburn\s*alpha|fba)($|[\s_.-])/i)) return 'FB_ALPHA';
  if (matchFolder(/(^|[\s_.-])(arcade|mame)($|[\s_.-])/i)) return 'ARCADE';
  if (matchFolder(/(^|[\s_.-])(archimedes|acorn)($|[\s_.-])/i)) return 'ARCHIMEDES';
  if (matchFolder(/(^|[\s_.-])(ms\s*dos|msdos|dosgames|dos)($|[\s_.-])/i)) return 'MS_DOS';
  if (matchFolder(/(^|[\s_.-])(x68000|x68k|sharp\s*x68000)($|[\s_.-])/i)) return 'SHARP_X68000';
  if (matchFolder(/(^|[\s_.-])(mz-?700|sharp\s*mz-?700)($|[\s_.-])/i)) return 'SHARP_MZ700';
  if (matchFolder(/(^|[\s_.-])(msx2|msx)($|[\s_.-])/i)) return 'MSX';

  // Atari
  if (matchFolder(/(^|[\s_.-])(atari\s*800|a800|atari\s*xl|atari\s*xe)($|[\s_.-])/i)) return 'ATARI_800';
  if (matchFolder(/(^|[\s_.-])(atari\s*2600|a2600|vcs)($|[\s_.-])/i)) return 'ATARI2600';
  if (matchFolder(/(^|[\s_.-])(atari\s*5200|a5200)($|[\s_.-])/i)) return 'ATARI_5200';
  if (matchFolder(/(^|[\s_.-])(atari\s*7800|a7800)($|[\s_.-])/i)) return 'ATARI_7800';
  if (matchFolder(/(^|[\s_.-])(atari\s*jaguar|jaguar)($|[\s_.-])/i)) return 'ATARI_JAGUAR';
  if (matchFolder(/(^|[\s_.-])(atari\s*lynx|lynx)($|[\s_.-])/i)) return 'ATARI_LYNX';
  if (matchFolder(/(^|[\s_.-])(atari\s*st|atarist)($|[\s_.-])/i)) return 'ATARI_ST';

  // Bandai
  if (matchFolder(/(^|[\s_.-])(wonderswan\s*color|wsc)($|[\s_.-])/i)) return 'WONDERSWAN_COLOR';
  if (matchFolder(/(^|[\s_.-])(wonderswan|ws)($|[\s_.-])/i)) return 'WONDERSWAN';

  // Coleco, Mattel, Vectrex & Others
  if (matchFolder(/(^|[\s_.-])(colecovision|coleco)($|[\s_.-])/i)) return 'COLECOVISION';
  if (matchFolder(/(^|[\s_.-])(intellivision|mattel\s*intellivision)($|[\s_.-])/i)) return 'INTELLIVISION';
  if (matchFolder(/(^|[\s_.-])(vectrex|mb\s*vectrex)($|[\s_.-])/i)) return 'VECTREX';
  if (matchFolder(/(^|[\s_.-])(megaduck|cougar\s*boy)($|[\s_.-])/i)) return 'MEGADUCK';
  if (matchFolder(/(^|[\s_.-])(videopac|odyssey\s*2)($|[\s_.-])/i)) return 'VIDEOPAC';
  if (matchFolder(/(^|[\s_.-])(supervision|watara)($|[\s_.-])/i)) return 'SUPERVISION';
  if (matchFolder(/(^|[\s_.-])(gp32|gamepark)($|[\s_.-])/i)) return 'GP32';
  if (matchFolder(/(^|[\s_.-])(3do|panasonic\s*3do)($|[\s_.-])/i)) return 'PANASONIC_3DO';

  // Sinclair
  if (matchFolder(/(^|[\s_.-])(zx81|sinclair\s*zx81)($|[\s_.-])/i)) return 'ZX81';
  if (matchFolder(/(^|[\s_.-])(zx\s*spectrum|zxspectrum|spectrum|sinclair)($|[\s_.-])/i)) return 'ZX_SPECTRUM';

  // NEC
  if (matchFolder(/(^|[\s_.-])(pce-?cd|pc\s*engine-?cd|turbografx-?cd)($|[\s_.-])/i)) return 'PCE_CD';
  if (matchFolder(/(^|[\s_.-])(supergrafx|sgx)($|[\s_.-])/i)) return 'SUPERGRAFX';
  if (matchFolder(/(^|[\s_.-])(pce|pc\s*engine|turbografx|tg16)($|[\s_.-])/i)) return 'PCE';

  // Nintendo
  if (matchFolder(/(^|[\s_.-])(3ds|nintendo\s*3ds)($|[\s_.-])/i)) return 'N3DS';
  if (matchFolder(/(^|[\s_.-])(nds|nintendo\s*ds)($|[\s_.-])/i)) return 'NDS';
  if (matchFolder(/(^|[\s_.-])(game\s*boy\s*advance|gba|gameboy\s*advance)($|[\s_.-])/i)) return 'GBA';
  if (matchFolder(/(^|[\s_.-])(game\s*boy\s*color|gbc|gameboy\s*color)($|[\s_.-])/i)) return 'GBC';
  if (matchFolder(/(^|[\s_.-])(game\s*&\s*watch|game\s*and\s*watch)($|[\s_.-])/i)) return 'GAME_AND_WATCH';
  if (matchFolder(/(^|[\s_.-])(pokemon\s*mini|pokemini)($|[\s_.-])/i)) return 'POKEMON_MINI';
  if (matchFolder(/(^|[\s_.-])(virtual\s*boy|vboy|vb)($|[\s_.-])/i)) return 'VIRTUAL_BOY';
  if (matchFolder(/(^|[\s_.-])(game\s*boy|gb|gameboy|dmg)($|[\s_.-])/i)) return 'GB';
  if (matchFolder(/(^|[\s_.-])(gamecube|gc|ngc|dolphin)($|[\s_.-])/i)) return 'GAMECUBE';
  if (matchFolder(/(^|[\s_.-])(wii|nintendo\s*wii)($|[\s_.-])/i)) return 'WII';
  if (matchFolder(/(^|[\s_.-])(n64|nintendo\s*64)($|[\s_.-])/i)) return 'N64';
  if (matchFolder(/(^|[\s_.-])(snes|super\s*nintendo|super\s*famicom|sfc)($|[\s_.-])/i)) return 'SNES';
  if (matchFolder(/(^|[\s_.-])(nes|famicom|nintendo\s*entertainment\s*system)($|[\s_.-])/i)) return 'NES';

  // Sega
  if (matchFolder(/(^|[\s_.-])(32x|sega\s*32x)($|[\s_.-])/i)) return 'SEGA_32X';
  if (matchFolder(/(^|[\s_.-])(megacd|mega-?cd|sega\s*megacd)($|[\s_.-])/i)) return 'SEGA_MEGACD';
  if (matchFolder(/(^|[\s_.-])(segacd|sega\s*cd)($|[\s_.-])/i)) return 'SEGA_CD';
  if (matchFolder(/(^|[\s_.-])(gamegear|game\s*gear|gg)($|[\s_.-])/i)) return 'GAMEGEAR';
  if (matchFolder(/(^|[\s_.-])(mastersystem|master\s*system|sms)($|[\s_.-])/i)) return 'MASTERSYSTEM';
  if (matchFolder(/(^|[\s_.-])(model\s*3|sega\s*model\s*3)($|[\s_.-])/i)) return 'SEGA_MODEL_3';
  if (matchFolder(/(^|[\s_.-])(model\s*2|sega\s*model\s*2)($|[\s_.-])/i)) return 'SEGA_MODEL_2';
  if (matchFolder(/(^|[\s_.-])(naomi\s*gd-?rom|naomi\s*gd)($|[\s_.-])/i)) return 'SEGA_NAOMI_GDROM';
  if (matchFolder(/(^|[\s_.-])(naomi\s*2)($|[\s_.-])/i)) return 'SEGA_NAOMI_2';
  if (matchFolder(/(^|[\s_.-])(naomi)($|[\s_.-])/i)) return 'SEGA_NAOMI';
  if (matchFolder(/(^|[\s_.-])(sg-?1000|sega\s*sg-?1000)($|[\s_.-])/i)) return 'SG_1000';
  if (matchFolder(/(^|[\s_.-])(saturn|sega\s*saturn)($|[\s_.-])/i)) return 'SATURN';
  if (matchFolder(/(^|[\s_.-])(dreamcast|sega\s*dreamcast|dc)($|[\s_.-])/i)) return 'DREAMCAST';
  if (matchFolder(/(^|[\s_.-])(genesis|megadrive|mega\s*drive|smd)($|[\s_.-])/i)) return 'GENESIS';

  // SNK Neo Geo
  if (matchFolder(/(^|[\s_.-])(neogeo\s*cd|neo\s*geo\s*cd)($|[\s_.-])/i)) return 'NEOGEO_CD';
  if (matchFolder(/(^|[\s_.-])(neogeo\s*pocket\s*color|ngpc)($|[\s_.-])/i)) return 'NEOGEO_POCKET_COLOR';
  if (matchFolder(/(^|[\s_.-])(neogeo\s*pocket|ngp)($|[\s_.-])/i)) return 'NEOGEO_POCKET';
  if (matchFolder(/(^|[\s_.-])(neogeo|neo\s*geo)($|[\s_.-])/i)) return 'NEOGEO';

  // Sony PlayStation
  if (matchFolder(/(^|[\s_.-])(ps\s*vita|psvita|playstation\s*vita)($|[\s_.-])/i)) return 'PS_VITA';
  if (matchFolder(/(^|[\s_.-])(psp\s*minis|playstation\s*minis)($|[\s_.-])/i)) return 'PS_MINIS';
  if (matchFolder(/(^|[\s_.-])(psp|playstation\s*portable)($|[\s_.-])/i)) return 'PSP';
  if (matchFolder(/(^|[\s_.-])(ps3|playstation\s*3)($|[\s_.-])/i)) return 'PS3';
  if (matchFolder(/(^|[\s_.-])(ps2|playstation\s*2)($|[\s_.-])/i)) return 'PS2';
  if (matchFolder(/(^|[\s_.-])(ps1|psx|psone|playstation\s*1)($|[\s_.-])/i)) return 'PS1';

  // Microsoft
  if (matchFolder(/(^|[\s_.-])(xbox|xbox\s*classic)($|[\s_.-])/i)) return 'XBOX';

  // Specialty & Engines
  if (matchFolder(/(^|[\s_.-])(scummvm|scumm)($|[\s_.-])/i)) return 'SCUMMVM';
  if (matchFolder(/(^|[\s_.-])(pico-?8|pico8)($|[\s_.-])/i)) return 'PICO8';
  if (matchFolder(/(^|[\s_.-])(tic-?80|tic80)($|[\s_.-])/i)) return 'TIC80';
  if (matchFolder(/(^|[\s_.-])(openbor|bor)($|[\s_.-])/i)) return 'OPENBOR';
  if (matchFolder(/(^|[\s_.-])(ports)($|[\s_.-])/i)) return 'PORTS';
  if (matchFolder(/(^|[\s_.-])(daphne)($|[\s_.-])/i)) return 'DAPHNE';
  if (matchFolder(/(^|[\s_.-])(electronic\s*handheld|handhelds)($|[\s_.-])/i)) return 'ELECTRONIC_HANDHELD';
  if (matchFolder(/(^|[\s_.-])(tiger\s*electronics|game\.?com)($|[\s_.-])/i)) return 'TIGER';

  // 2. FILENAME SYSTEM TAGS (e.g. "Bubble Bobble 4CPC.dsk", "Game (SNES).zip")
  const baseWithoutExt = lastDot !== -1 ? filename.slice(0, lastDot) : filename;
  if (/(\b|[\(_\[])(4CPC|CPC|Amstrad)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'AMSTRAD_CPC';
  if (/(\b|[\(_\[])(GX4000)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'AMSTRAD_GX4000';
  if (/(\b|[\(_\[])(4C64|C64|Commodore\s*64)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'C64';
  if (/(\b|[\(_\[])(Amiga|A500|A1200)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'AMIGA';
  if (/(\b|[\(_\[])(CD32)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'AMIGA_CD32';
  if (/(\b|[\(_\[])(ZX|Spectrum)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'ZX_SPECTRUM';
  if (/(\b|[\(_\[])(ZX81)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'ZX81';
  if (/(\b|[\(_\[])(SNES|SFC)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'SNES';
  if (/(\b|[\(_\[])(NES|FC)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'NES';
  if (/(\b|[\(_\[])(N64)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'N64';
  if (/(\b|[\(_\[])(GBA)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'GBA';
  if (/(\b|[\(_\[])(GBC)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'GBC';
  if (/(\b|[\(_\[])(Genesis|MegaDrive|MD)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'GENESIS';
  if (/(\b|[\(_\[])(SMS|MasterSystem)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'MASTERSYSTEM';
  if (/(\b|[\(_\[])(GameGear|GG)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'GAMEGEAR';
  if (/(\b|[\(_\[])(PS1|PSX)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'PS1';
  if (/(\b|[\(_\[])(PS2)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'PS2';
  if (/(\b|[\(_\[])(PS3)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'PS3';
  if (/(\b|[\(_\[])(PSP)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'PSP';
  if (/(\b|[\(_\[])(PSVita|PS_Vita)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'PS_VITA';
  if (/(\b|[\(_\[])(NDS)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'NDS';
  if (/(\b|[\(_\[])(3DS)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'N3DS';
  if (/(\b|[\(_\[])(GameCube|NGC)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'GAMECUBE';
  if (/(\b|[\(_\[])(Wii)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'WII';
  if (/(\b|[\(_\[])(Dreamcast|DC)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'DREAMCAST';
  if (/(\b|[\(_\[])(Saturn)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'SATURN';
  if (/(\b|[\(_\[])(PCE|TurboGrafx)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'PCE';
  if (/(\b|[\(_\[])(NeoGeo)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'NEOGEO';
  if (/(\b|[\(_\[])(NGP)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'NEOGEO_POCKET';
  if (/(\b|[\(_\[])(NGPC)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'NEOGEO_POCKET_COLOR';
  if (/(\b|[\(_\[])(WonderSwan|WS)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'WONDERSWAN';
  if (/(\b|[\(_\[])(WSC)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'WONDERSWAN_COLOR';
  if (/(\b|[\(_\[])(3DO)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'PANASONIC_3DO';
  if (/(\b|[\(_\[])(Vectrex)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'VECTREX';
  if (/(\b|[\(_\[])(Lynx)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'ATARI_LYNX';
  if (/(\b|[\(_\[])(Jaguar)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'ATARI_JAGUAR';
  if (/(\b|[\(_\[])(X68000|X68K)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'SHARP_X68000';
  if (/(\b|[\(_\[])(MSX)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'MSX';
  if (/(\b|[\(_\[])(Xbox)(\b|[\)\]_])/i.test(baseWithoutExt)) return 'XBOX';

  // 4. FALLBACK FOR AMBIGUOUS EXTENSIONS
  if (ext === '.dsk') {
    // Standard Amstrad CPC floppy disk image format
    return 'AMSTRAD_CPC';
  }

  return 'OTHER';
}

export function parseRomFilename(
  filename: string,
  parentPath?: string,
  rootFolderName?: string
): ParsedRomInfo {
  const junkCheck = isJunkFile(filename);
  const lastDot = filename.lastIndexOf('.');
  const ext = lastDot !== -1 ? filename.slice(lastDot) : '';
  let base = lastDot !== -1 ? filename.slice(0, lastDot) : filename;

  if (junkCheck.isJunk) {
    return {
      canonicalTitle: filename,
      cleanFilename: filename,
      platform: 'OTHER',
      targetFolder: '_Junk',
      isMultiDisc: false,
      isBadDump: false,
      isHackOrTranslation: false,
      isVerifiedGood: false,
      isTop200: false,
      genres: [],
      isJunk: true,
      junkReason: junkCheck.reason,
    };
  }

  // Detect platform safely with hierarchy
  const platform = detectPlatform(filename, parentPath, rootFolderName);
  const platMeta = getPlatformMetadata(platform);
  const targetFolder = platMeta ? platMeta.targetFolder : (platform === 'OTHER' ? 'Misc' : platform);

  // Detect dump quality flags
  const isVerifiedGood = base.includes('[!]');
  const isBadDump = /\[b\d*\]/i.test(base) || base.toLowerCase().includes('[bad]');

  // Detect Translations, Romhacks, Homebrews and Prototypes
  let editionType: EditionType = 'official';
  let translationLanguage: string | undefined;
  let hackDetails: string | undefined;
  let isHackOrTranslation = false;

  // 1. Translations
  if (/(?:\[T[+-](?:Ger|Deu|German|Deutsch)\]|\(German\s*Translation\)|\(Deutsch\s*Patch\)|\(DE\))/i.test(base)) {
    editionType = 'translation';
    translationLanguage = 'Deutsch';
    isHackOrTranslation = true;
  } else if (/(?:\[T[+-](?:Eng|English)\]|\(English\s*Translation\)|\(ENG\s*Patch\))/i.test(base)) {
    editionType = 'translation';
    translationLanguage = 'Englisch';
    isHackOrTranslation = true;
  } else if (/(?:\[T[+-](?:Fre|Fra|French)\]|\(French\s*Translation\))/i.test(base)) {
    editionType = 'translation';
    translationLanguage = 'Französisch';
    isHackOrTranslation = true;
  } else if (/(?:\[T[+-](?:Spa|Spanish)\]|\(Spanish\s*Translation\))/i.test(base)) {
    editionType = 'translation';
    translationLanguage = 'Spanisch';
    isHackOrTranslation = true;
  } else if (/(?:\[T[+-](?:Ita|Italian)\]|\(Italian\s*Translation\))/i.test(base)) {
    editionType = 'translation';
    translationLanguage = 'Italienisch';
    isHackOrTranslation = true;
  } else if (/\[t\d*\]|\[t[+-][a-z0-9]+\]|\(Translation\)|\(Translated\)|\btranslated\b/i.test(base)) {
    editionType = 'translation';
    translationLanguage = 'Übersetzung';
    isHackOrTranslation = true;
  }
  // 2. Romhacks
  else if (
    /(?:\[h\d*\]|\bHack\b|\(Hack\)|\bKaizo\b|\bRandomizer\b|\(DX\)|\(Colorized\)|\(Uncensored\)|\(Restoration\)|\(MSU-?1\)|\(FastROM\)|\(Improvement\)|\(Bugfix\)|\(Patched\)|\(Remix\))/i.test(
      base
    )
  ) {
    editionType = 'romhack';
    isHackOrTranslation = true;
    if (/kaizo/i.test(base)) hackDetails = 'Kaizo';
    else if (/randomizer/i.test(base)) hackDetails = 'Randomizer';
    else if (/colorized|\(DX\)/i.test(base)) hackDetails = 'Colorized / DX';
    else if (/uncensored|restoration/i.test(base)) hackDetails = 'Uncut / Restoration';
    else if (/msu-?1/i.test(base)) hackDetails = 'MSU-1 Audio';
    else if (/improvement|bugfix/i.test(base)) hackDetails = 'Improvement';
    else hackDetails = 'Romhack';
  }
  // 3. Homebrew
  else if (/(?:\(Homebrew\)|\[Homebrew\]|\(PD\)|\bPublic\s*Domain\b|\(Aftermarket\)|\bIndie\b)/i.test(base)) {
    editionType = 'homebrew';
  }
  // 4. Prototype / Beta
  else if (/(?:\(Proto(?:type)?\s*\d*\)|\[Proto\]|\(Beta\s*\d*\)|\[Beta\]|\(Sample\))/i.test(base)) {
    editionType = 'prototype';
  }

  // Detect region
  let region: string | undefined;
  if (/\b(USA|U)\b/i.test(base) || base.includes('(USA)') || base.includes('(U)')) {
    region = 'USA';
  } else if (/\b(Europe|E|EUR)\b/i.test(base) || base.includes('(Europe)') || base.includes('(E)')) {
    region = 'Europe';
  } else if (/\b(Japan|J|JPN)\b/i.test(base) || base.includes('(Japan)') || base.includes('(J)')) {
    region = 'Japan';
  } else if (/\b(Germany|G|GER)\b/i.test(base) || base.includes('(Germany)') || base.includes('(G)')) {
    region = 'Germany';
  } else if (/\b(World|W)\b/i.test(base) || base.includes('(World)')) {
    region = 'World';
  } else {
    // Default region based on platform typical geography
    if (['AMSTRAD_CPC', 'C64', 'AMIGA', 'ZX_SPECTRUM', 'ATARI_ST'].includes(platform)) {
      region = 'Europe';
    } else {
      region = 'World';
    }
  }

  // Extract Disc/Disk/Side information
  const discInfo = extractDiscInfo(filename);
  const isMultiDisc = !!discInfo;

  // Detect revision or version
  let versionOrRevision = '';
  const revMatch = base.match(/\((Rev\s*[A-Z0-9]+|v\d+(\.\d+)?|Beta\s*\d*|Proto\s*\d*)\)/i);
  if (revMatch) {
    versionOrRevision = revMatch[1];
  }

  // Clean canonical title:
  // Strip disc tags, brackets [], parentheses (), scene numbering (e.g. "0042 - "), system tags (4CPC, 4C64)
  let workingBase = base;
  if (discInfo) {
    workingBase = workingBase.replace(discInfo.rawMatch, ' ');
  }
  // Also strip any standalone disc words from the canonical title
  workingBase = workingBase.replace(/\b(Disk|Disc|Disque|Side|Face)\s*[0-9A-Za-z]+\b/gi, ' ');
  workingBase = workingBase.replace(/\bCD\s*\d+\b/gi, ' ');

  let cleanTitle = workingBase
    .replace(/^\d{3,5}\s*-\s*/, '') // Remove scene numbering (e.g., "0042 - ")
    .replace(/\[.*?\]/g, '') // Remove [!] [b1] [h]
    .replace(/\(.*?\)/g, '') // Remove (USA) (Rev 1)
    .replace(/\b(4CPC|4C64|4AMIGA)\b/i, '') // Remove platform suffixes like 4CPC
    .replace(/[_.-]+/g, ' ') // Replace underscores and dots with space
    .trim();

  // Normalize multiple spaces
  cleanTitle = cleanTitle.replace(/\s{2,}/g, ' ').trim();

  // Detect Arcade / MAME ROMs: Filenames MUST remain identical for emulators
  const isArcadeRom = isArcadePlatform(platform) || (ext.toLowerCase() === '.zip' && getArcadeTitle(base) !== null);
  const arcadeTitle = isArcadeRom ? getArcadeTitle(base) : null;
  if (arcadeTitle) {
    cleanTitle = arcadeTitle;
  }

  // Standard clean No-Intro naming with Disc tag preserved
  // CRITICAL: For Arcade/MAME ROMs, cleanFilename MUST be identical to filename so zip names like sf2.zip are never altered!
  const regionTag = region ? ` (${region})` : '';
  const discTag = discInfo ? ` (${discInfo.discLabel})` : '';
  const revTag = versionOrRevision ? ` (${versionOrRevision})` : '';
  const cleanFilename = isArcadeRom
    ? filename
    : `${cleanTitle || base}${regionTag}${discTag}${revTag}${ext.toLowerCase()}`;

  // Check against Top 200 list (ONLY strictly for matching platform!)
  let isTop200 = false;
  let top200Rank: number | undefined;
  let matchedGenre: string[] = [];

  if (platform !== 'OTHER') {
    const lowerCleanTitle = cleanTitle.toLowerCase();
    for (const top of TOP_200_ROMS) {
      // STRICT: Never match across different platforms!
      if (top.platform !== platform) continue;

      const lowerTopTitle = top.title.toLowerCase();
      const isExactTitle = lowerCleanTitle === lowerTopTitle;
      const isExactKeyword = top.searchKeywords.some((kw) => kw.toLowerCase() === lowerCleanTitle);

      const lengthRatio =
        Math.min(lowerCleanTitle.length, lowerTopTitle.length) /
        Math.max(lowerCleanTitle.length, lowerTopTitle.length);
      const isHighSimilarity =
        lengthRatio >= 0.75 &&
        (lowerCleanTitle.includes(lowerTopTitle) || lowerTopTitle.includes(lowerCleanTitle));

      if (isExactTitle || isExactKeyword || isHighSimilarity) {
        isTop200 = true;
        top200Rank = top.rank;
        matchedGenre = [top.genre];
        break;
      }
    }
  }

  if (matchedGenre.length === 0) {
    // Default genre guess based on title keywords
    if (/mario|sonic|donkey kong|kirby|crash|spyro|rayman|wario|banjo|bubble bobble/i.test(cleanTitle)) {
      matchedGenre = ['Platformer'];
    } else if (/zelda|metroid|castlevania|alundra/i.test(cleanTitle)) {
      matchedGenre = ['Action-Adventure'];
    } else if (/final fantasy|chrono|pokemon|pokémon|dragon quest|tales of|lufia|earthbound|xenogears/i.test(cleanTitle)) {
      matchedGenre = ['RPG'];
    } else if (/kart|f-zero|racing|gran turismo|wipeout|ridge racer/i.test(cleanTitle)) {
      matchedGenre = ['Racing'];
    } else if (/street fighter|mortal kombat|tekken|punch-out|smash bros/i.test(cleanTitle)) {
      matchedGenre = ['Fighting'];
    } else if (/tetris|dr mario|columns|puzzle|bust-a-move/i.test(cleanTitle)) {
      matchedGenre = ['Puzzle'];
    } else if (/contra|commando|into the eagles nest|nemesis|mega man|metal slug|gunstar|gradius|star fox/i.test(cleanTitle)) {
      matchedGenre = ['Action'];
    } else {
      matchedGenre = ['Action'];
    }
  }

  return {
    canonicalTitle: cleanTitle || base,
    cleanFilename,
    platform,
    targetFolder,
    region,
    versionOrRevision,
    discInfo,
    isMultiDisc,
    isBadDump,
    isHackOrTranslation,
    editionType,
    translationLanguage,
    hackDetails,
    isVerifiedGood,
    isArcadeRom,
    isTop200,
    top200Rank,
    genres: matchedGenre,
  };
}

/**
 * Compares two ROM versions of the same game to decide which is superior.
 * Returns score: higher score is preferred.
 */
export function calculateRomQualityScore(
  rom: RomFile,
  regionPref: RegionPreference = 'europe_first'
): number {
  let score = 100;

  // Good dumps preferred
  if (rom.isVerifiedGood) score += 50;
  if (rom.isBadDump) score -= 80;

  // High bonus for desired language translations (e.g. German translation with german_first preference)
  if (rom.editionType === 'translation') {
    if (rom.translationLanguage === 'Deutsch' && regionPref === 'german_first') {
      score += 40; // Huge bonus for German players
    } else {
      score += 15;
    }
  } else if (rom.editionType === 'romhack') {
    score += 10; // Romhacks are distinct creative releases
  } else if (rom.isHackOrTranslation) {
    score -= 10;
  }

  // Prefer newer revisions
  if (rom.versionOrRevision) {
    if (/Rev\s*([1-9]|B|C)/i.test(rom.versionOrRevision)) score += 20;
    if (/v1\.[1-9]/i.test(rom.versionOrRevision)) score += 20;
    if (/Beta|Proto/i.test(rom.versionOrRevision)) score -= 40;
  }

  // Region scoring based on user preference
  const isEuropeanHomeComputer = ['AMSTRAD_CPC', 'C64', 'AMIGA', 'ZX_SPECTRUM', 'ATARI_ST'].includes(rom.platform);

  if (regionPref === 'german_first') {
    if (rom.region === 'Germany') score += 35;
    else if (rom.region === 'Europe') score += 26;
    else if (rom.region === 'World') score += 22;
    else if (rom.region === 'USA') score += 15;
    else if (rom.region === 'Japan') score += 8;
  } else if (regionPref === 'usa_first') {
    if (rom.region === 'USA') score += 32;
    else if (rom.region === 'World') score += 25;
    else if (rom.region === 'Europe') score += 20;
    else if (rom.region === 'Germany') score += 18;
    else if (rom.region === 'Japan') score += 10;
  } else if (regionPref === 'japan_first') {
    if (rom.region === 'Japan') score += 35;
    else if (rom.region === 'World') score += 25;
    else if (rom.region === 'USA') score += 20;
    else if (rom.region === 'Europe') score += 18;
    else if (rom.region === 'Germany') score += 15;
  } else {
    // Default: europe_first
    if (isEuropeanHomeComputer) {
      if (rom.region === 'Europe') score += 28;
      else if (rom.region === 'Germany') score += 25;
      else if (rom.region === 'World') score += 22;
      else if (rom.region === 'USA') score += 15;
    } else {
      if (rom.region === 'Europe') score += 28;
      else if (rom.region === 'Germany') score += 24;
      else if (rom.region === 'World') score += 22;
      else if (rom.region === 'USA') score += 20;
      else if (rom.region === 'Japan') score += 10;
    }
  }

  // Clean filename bonus
  if (rom.isCleanNamed) score += 10;

  return score;
}
