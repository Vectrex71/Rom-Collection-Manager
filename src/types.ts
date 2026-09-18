export type PlatformCode =
  // Original / Core Platforms
  | 'AMSTRAD_CPC'
  | 'AMSTRAD_GX4000'
  | 'ARCADE'
  | 'MAME'
  | 'ARCHIMEDES'
  | 'ATARI_800'
  | 'ATARI2600'
  | 'ATARI_5200'
  | 'ATARI_7800'
  | 'ATARI_JAGUAR'
  | 'ATARI_LYNX'
  | 'ATARI_ST'
  | 'WONDERSWAN'
  | 'WONDERSWAN_COLOR'
  | 'CPS1'
  | 'CPS2'
  | 'CPS3'
  | 'CPS'
  | 'COLECOVISION'
  | 'AMIGA'
  | 'AMIGA_CD32'
  | 'C64'
  | 'COMMODORE_CDTV'
  | 'DAPHNE'
  | 'ELECTRONIC_HANDHELD'
  | 'FB_ALPHA'
  | 'FB_NEO'
  | 'GP32'
  | 'INTELLIVISION'
  | 'VECTREX'
  | 'MEGADUCK'
  | 'MS_DOS'
  | 'MSX'
  | 'PCE'
  | 'PCE_CD'
  | 'SUPERGRAFX'
  | 'N3DS'
  | 'NDS'
  | 'GB'
  | 'GBA'
  | 'GBC'
  | 'GAMECUBE'
  | 'GAME_AND_WATCH'
  | 'N64'
  | 'NES'
  | 'POKEMON_MINI'
  | 'SNES'
  | 'VIRTUAL_BOY'
  | 'WII'
  | 'OPENBOR'
  | 'PANASONIC_3DO'
  | 'VIDEOPAC'
  | 'PICO8'
  | 'PORTS'
  | 'SCUMMVM'
  | 'SEGA_32X'
  | 'SEGA_CD'
  | 'DREAMCAST'
  | 'GAMEGEAR'
  | 'MASTERSYSTEM'
  | 'SEGA_MEGACD'
  | 'GENESIS'
  | 'SEGA_MODEL_2'
  | 'SEGA_MODEL_3'
  | 'SEGA_NAOMI'
  | 'SEGA_NAOMI_2'
  | 'SEGA_NAOMI_GDROM'
  | 'SATURN'
  | 'SG_1000'
  | 'SHARP_MZ700'
  | 'SHARP_X68000'
  | 'ZX_SPECTRUM'
  | 'ZX81'
  | 'NEOGEO'
  | 'NEOGEO_CD'
  | 'NEOGEO_POCKET'
  | 'NEOGEO_POCKET_COLOR'
  | 'PS1'
  | 'PS2'
  | 'PS3'
  | 'PSP'
  | 'PS_VITA'
  | 'PS_MINIS'
  | 'TIC80'
  | 'TIGER'
  | 'SUPERVISION'
  | 'XBOX'
  | 'OTHER';

export type RomGenre =
  | 'Platformer'
  | 'Action'
  | 'Adventure'
  | 'RPG'
  | 'Action-Adventure'
  | 'Racing'
  | 'Fighting'
  | 'Puzzle'
  | 'Shoot \'em up'
  | 'Sports'
  | 'Strategy'
  | 'Simulation'
  | 'Stealth'
  | 'Survival Horror';

export interface DiscInfo {
  discNumber: number;
  totalDiscs?: number;
  discLabel: string; // e.g. "Disk 1", "Disc 2", "Side A", "CD1"
  rawMatch: string;
}

export interface MultiDiscSet {
  id: string;
  gameTitle: string;
  platform: PlatformCode;
  targetFolder: string;
  discs: RomFile[]; // Ordered by discNumber
  totalDiscs: number;
  m3uFilename: string; // e.g. "Secret of Monkey Island.m3u"
  m3uContent: string; // Contents for M3U playlist
  m3uSubfolderContent: string; // Contents when discs are placed in dedicated subfolder
}

export type EditionType = 'official' | 'translation' | 'romhack' | 'homebrew' | 'prototype';

export interface RomFile {
  id: string;
  filename: string;
  extension: string;
  originalPath: string; // e.g. "Roms/OldSnes/smw_v1.smc"
  size: number; // bytes
  lastModified: number;
  hash: string; // SHA-256 or fast hash
  platform: PlatformCode;
  canonicalTitle: string; // "Super Mario World"
  cleanFilename: string; // "Super Mario World (USA).sfc"
  targetFolder: string; // "SNES"
  genres: string[];
  region?: string; // "USA", "Europe", "Japan", etc.
  versionOrRevision?: string; // "Rev 1", "v1.1", "Beta"
  discInfo?: DiscInfo;
  isMultiDisc?: boolean;
  isBadDump?: boolean; // [b]
  isHackOrTranslation?: boolean; // [h], [t], Hack
  editionType?: EditionType; // 'official' | 'translation' | 'romhack' | 'homebrew' | 'prototype'
  translationLanguage?: string; // e.g. "Deutsch", "Englisch"
  hackDetails?: string; // e.g. "Kaizo", "Colorized", "Uncensored", "MSU-1"
  isVerifiedGood?: boolean; // [!]
  isArcadeRom?: boolean; // MAME/Arcade technical zip name protected from renaming
  isJunk?: boolean; // Cache file, .db, Thumbs.db, temp, logs, etc.
  junkReason?: string; // e.g. "Cache- / Datenbankdatei (.db)"
  isTop200: boolean;
  top200Rank?: number;
  isDuplicate: boolean;
  duplicateGroupId?: string;
  isExactHashDuplicate?: boolean;
  isCleanNamed: boolean;
  recommendedAction: 'keep' | 'delete' | 'rename' | 'move';
  fileHandle?: any; // FileSystemFileHandle if available
  parentDirHandle?: any; // FileSystemDirectoryHandle if available
}

export interface DuplicateGroup {
  id: string;
  canonicalTitle: string;
  platform: PlatformCode;
  isExactHashMatch: boolean;
  hash: string;
  files: RomFile[];
  recommendedKeepId: string;
  recommendationReason: string;
}

export interface TopRomEntry {
  rank: number;
  title: string;
  platform: PlatformCode;
  genre: RomGenre;
  year: number;
  searchKeywords: string[];
  description: string;
  matchedRomId?: string;
  isOwned?: boolean;
}

export interface PlatformMetadata {
  id: PlatformCode;
  name: string;
  shortCode: string;
  extensions: string[];
  targetFolder: string;
  accentColor: string;
  badgeBg: string;
}

export interface ScanFilters {
  selectedPlatforms: PlatformCode[];
  selectedGenres: string[];
  searchQuery: string;
  viewMode: 'all' | 'duplicates' | 'junk' | 'top200' | 'missing_top200' | 'unorganized' | 'multidisc' | 'translations_and_hacks';
  minSizeBytes: number;
  onlyVerifiedGood?: boolean;
  hideBadDumps?: boolean;
}

export interface OrganizeActionItem {
  id: string;
  rom: RomFile;
  currentPath: string;
  newPath: string;
  targetFolder: string;
  cleanFilename: string;
  type: 'rename_and_move' | 'move_only' | 'rename_only' | 'delete_duplicate';
  status: 'pending' | 'processing' | 'done' | 'failed' | 'skipped';
  error?: string;
  selected: boolean;
}

export interface AiAnalyzeResult {
  id: string;
  canonicalTitle: string;
  cleanNoIntroFilename: string;
  platform: PlatformCode;
  targetFolder: string;
  genres: string[];
  releaseYear?: number;
  isTop200Candidate: boolean;
  variantType: string;
  confidence: 'high' | 'medium' | 'low';
}

export type HandheldPresetId = 'standard' | 'batocera' | 'onion_os' | 'emudeck' | 'retropie' | 'garlicos';

export interface HandheldPreset {
  id: HandheldPresetId;
  name: string;
  subtitle: string;
  description: string;
  exampleFolder: string; // e.g. "Roms/AMIGA" or "roms/amiga"
}

export type RegionPreference = 'german_first' | 'europe_first' | 'usa_first' | 'japan_first';

export interface RollbackActionItem {
  romId: string;
  previousPath: string;
  previousFilename: string;
  appliedPath: string;
  appliedFilename: string;
  targetFolder: string;
}

export interface UndoSnapshot {
  id: string;
  timestamp: number;
  label: string;
  folderName: string;
  items: RollbackActionItem[];
}
