import { HandheldPreset, HandheldPresetId, PlatformCode, RomFile } from '../types';
import { getPlatformMetadata } from '../data/platformsData';

export const HANDHELD_PRESETS: HandheldPreset[] = [
  {
    id: 'standard',
    name: 'Standard (Klartext)',
    subtitle: 'PC, Mac, EmulationStation, Handkuratiert',
    description: 'Vollständige, gut lesbare Ordnernamen (z. B. "Commodore Amiga", "Nintendo NES", "Sony PlayStation")',
    exampleFolder: 'Commodore Amiga / Nintendo SNES',
  },
  {
    id: 'batocera',
    name: 'Batocera / Recalbox',
    subtitle: 'Batocera.linux, Steam Deck, RetroArch',
    description: 'Offizielle Batocera Ordnerstruktur in Kleinbuchstaben (z. B. "amiga", "snes", "nes", "megadrive", "psx")',
    exampleFolder: 'roms/amiga / roms/snes',
  },
  {
    id: 'onion_os',
    name: 'OnionOS / Miyoo Mini',
    subtitle: 'Miyoo Mini, Miyoo Mini Plus, TrimUI',
    description: 'OnionOS Ordnerkürzel in Großbuchstaben (z. B. "AMIGA", "FC", "SFC", "MD", "PS", "GBA")',
    exampleFolder: 'Roms/AMIGA / Roms/SFC',
  },
  {
    id: 'emudeck',
    name: 'EmuDeck / Steam Deck',
    subtitle: 'Steam Deck, ROG Ally, Legion Go, PC',
    description: 'Offizielle EmuDeck-Ordnerstruktur für Emulation/roms/ (z. B. "snes", "megadrive", "psx", "ps2", "amiga")',
    exampleFolder: 'Emulation/roms/snes / roms/psx',
  },
  {
    id: 'retropie',
    name: 'RetroPie',
    subtitle: 'Raspberry Pi 3/4/5, RetroPie OS',
    description: 'Standard RetroPie ROM-Verzeichnisse (z. B. "amiga", "nes", "snes", "megadrive", "psx")',
    exampleFolder: 'RetroPie/roms/amiga',
  },
  {
    id: 'garlicos',
    name: 'GarlicOS / Anbernic RG35XX',
    subtitle: 'RG35XX, RG35XX Plus, MinUI',
    description: 'GarlicOS SD-Karten-Verzeichnisse (z. B. "FC", "SFC", "MD", "PS", "AMIGA")',
    exampleFolder: 'Roms/SFC / Roms/AMIGA',
  },
];

// Mapping table for each preset
const PRESET_MAPPINGS: Record<HandheldPresetId, Partial<Record<PlatformCode, string>>> = {
  standard: {}, // Defaults to getPlatformMetadata(id).targetFolder

  batocera: {
    AMIGA: 'amiga',
    AMIGA_CD32: 'amigacd32',
    C64: 'c64',
    NES: 'nes',
    SNES: 'snes',
    N64: 'n64',
    GB: 'gb',
    GBC: 'gbc',
    GBA: 'gba',
    NDS: 'nds',
    GENESIS: 'megadrive',
    MASTERSYSTEM: 'mastersystem',
    GAMEGEAR: 'gamegear',
    DREAMCAST: 'dreamcast',
    SATURN: 'saturn',
    SEGA_CD: 'segacd',
    PS1: 'psx',
    PS2: 'ps2',
    PSP: 'psp',
    ARCADE: 'arcade',
    MAME: 'mame',
    NEOGEO: 'neogeo',
    ATARI2600: 'atari2600',
    ATARI_7800: 'atari7800',
    ATARI_ST: 'atarist',
    ZX_SPECTRUM: 'zxspectrum',
    AMSTRAD_CPC: 'amstradcpc',
    PCE: 'pcengine',
    PCE_CD: 'pcenginecd',
    WONDERSWAN: 'wonderswan',
    WONDERSWAN_COLOR: 'wsc',
    NEOGEO_POCKET: 'ngp',
    NEOGEO_POCKET_COLOR: 'ngpc',
    MSX: 'msx',
    VIRTUAL_BOY: 'virtualboy',
    MS_DOS: 'dos',
  },

  onion_os: {
    AMIGA: 'AMIGA',
    AMIGA_CD32: 'AMIGACD32',
    C64: 'COMMODORE',
    NES: 'FC',
    SNES: 'SFC',
    N64: 'N64',
    GB: 'GB',
    GBC: 'GBC',
    GBA: 'GBA',
    NDS: 'NDS',
    GENESIS: 'MD',
    MASTERSYSTEM: 'MS',
    GAMEGEAR: 'GG',
    SEGA_CD: 'SEGACD',
    SATURN: 'SATURN',
    PS1: 'PS',
    ARCADE: 'ARCADE',
    MAME: 'MAME',
    NEOGEO: 'NEOGEO',
    ATARI2600: 'ATARI',
    ATARI_7800: 'ATARI7800',
    ZX_SPECTRUM: 'ZX',
    PCE: 'PCE',
    PCE_CD: 'PCECD',
    WONDERSWAN: 'WS',
    WONDERSWAN_COLOR: 'WSC',
    NEOGEO_POCKET: 'NGP',
    NEOGEO_POCKET_COLOR: 'NGPC',
    MSX: 'MSX',
  },

  emudeck: {
    AMIGA: 'amiga',
    AMIGA_CD32: 'amigacd32',
    C64: 'c64',
    NES: 'nes',
    SNES: 'snes',
    N64: 'n64',
    GB: 'gb',
    GBC: 'gbc',
    GBA: 'gba',
    NDS: 'nds',
    GENESIS: 'megadrive',
    MASTERSYSTEM: 'mastersystem',
    GAMEGEAR: 'gamegear',
    DREAMCAST: 'dreamcast',
    SATURN: 'saturn',
    SEGA_CD: 'segacd',
    PS1: 'psx',
    PS2: 'ps2',
    PSP: 'psp',
    ARCADE: 'arcade',
    MAME: 'mame',
    NEOGEO: 'neogeo',
    ATARI2600: 'atari2600',
    ATARI_7800: 'atari7800',
    ATARI_ST: 'atarist',
    ZX_SPECTRUM: 'zxspectrum',
    AMSTRAD_CPC: 'amstradcpc',
    PCE: 'pcengine',
    PCE_CD: 'pcenginecd',
    WONDERSWAN: 'wonderswan',
    WONDERSWAN_COLOR: 'wonderswancolor',
    NEOGEO_POCKET: 'ngp',
    NEOGEO_POCKET_COLOR: 'ngpc',
    MSX: 'msx',
    VIRTUAL_BOY: 'virtualboy',
    MS_DOS: 'dos',
  },

  retropie: {
    AMIGA: 'amiga',
    AMIGA_CD32: 'amigacd32',
    C64: 'c64',
    NES: 'nes',
    SNES: 'snes',
    N64: 'n64',
    GB: 'gb',
    GBC: 'gbc',
    GBA: 'gba',
    NDS: 'nds',
    GENESIS: 'megadrive',
    MASTERSYSTEM: 'mastersystem',
    GAMEGEAR: 'gamegear',
    DREAMCAST: 'dreamcast',
    SATURN: 'saturn',
    SEGA_CD: 'segacd',
    PS1: 'psx',
    PS2: 'ps2',
    PSP: 'psp',
    ARCADE: 'arcade',
    MAME: 'mame-libretro',
    NEOGEO: 'neogeo',
    ATARI2600: 'atari2600',
    ATARI_7800: 'atari7800',
    ATARI_ST: 'atarist',
    ZX_SPECTRUM: 'zxspectrum',
    AMSTRAD_CPC: 'amstradcpc',
    PCE: 'pcengine',
    PCE_CD: 'pcenginecd',
    WONDERSWAN: 'wonderswan',
    WONDERSWAN_COLOR: 'wonderswancolor',
    NEOGEO_POCKET: 'ngp',
    NEOGEO_POCKET_COLOR: 'ngpc',
    MSX: 'msx',
    VIRTUAL_BOY: 'virtualboy',
    MS_DOS: 'pc',
  },

  garlicos: {
    AMIGA: 'AMIGA',
    C64: 'C64',
    NES: 'FC',
    SNES: 'SFC',
    GB: 'GB',
    GBC: 'GBC',
    GBA: 'GBA',
    GENESIS: 'MD',
    MASTERSYSTEM: 'MS',
    GAMEGEAR: 'GG',
    SEGA_CD: 'SEGACD',
    PS1: 'PS',
    ARCADE: 'ARCADE',
    NEOGEO: 'NEOGEO',
    ATARI2600: 'ATARI',
    PCE: 'PCE',
    WONDERSWAN: 'WS',
    NEOGEO_POCKET: 'NGP',
  },
};

/**
 * Resolves the appropriate target folder name for a given platform code and preset
 */
export function getTargetFolderForPlatform(
  platform: PlatformCode,
  presetId: HandheldPresetId = 'standard'
): string {
  const mapped = PRESET_MAPPINGS[presetId]?.[platform];
  if (mapped) return mapped;

  const meta = getPlatformMetadata(platform);
  return meta ? meta.targetFolder : platform;
}

/**
 * Updates a list of ROM files with new targetFolders according to the selected handheld preset
 */
export function applyHandheldPresetToRoms(
  roms: RomFile[],
  presetId: HandheldPresetId
): RomFile[] {
  return roms.map((rom) => {
    const newTargetFolder = getTargetFolderForPlatform(rom.platform, presetId);
    return {
      ...rom,
      targetFolder: newTargetFolder,
    };
  });
}
