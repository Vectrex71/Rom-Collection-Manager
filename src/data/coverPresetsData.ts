/**
 * Predefined 3D Box Presets for iconic retro gaming consoles & handhelds.
 * Ensures identical angle, spine depth, sheen, and aspect ratios across sessions,
 * even when adding new covers months later.
 */

import { Cover3dStyle, Cover3dDirection, SpineMode, SpineColorType } from '../utils/cover3dRenderer';

export interface CoverPreset {
  id: string;
  name: string;
  system: string;
  description: string;
  icon: string;
  style: Cover3dStyle;
  direction: Cover3dDirection;
  angle: number; // 12 to 45
  spineWidthRatio: number; // 0.08 to 0.25
  glossOpacity: number; // 0.0 to 0.6
  shadowOpacity: number; // 0.0 to 0.8
  spineMode: SpineMode;
  spineColorType: SpineColorType;
  spineAccent?: 'auto' | 'dark' | 'light' | 'snes' | 'megadrive' | 'ps1';
  targetWidth?: number;
  targetHeight?: number;
  isCustom?: boolean;
}

export const SYSTEM_COVER_PRESETS: CoverPreset[] = [
  // 1. Die 6 primären Visual Design Presets (Mockup-Stile)
  {
    id: 'box_standard',
    name: 'Schlanke 3D Box',
    system: 'Standard 3D Box',
    description: 'Schlanke, aufrecht stehende 3D-Spielehülle mit Buchrücken, dynamischer Perspektive und dezentem Glanz.',
    icon: '📦',
    style: 'standard',
    direction: 'left',
    angle: 25,
    spineWidthRatio: 0.065,
    glossOpacity: 0.24,
    shadowOpacity: 0.44,
    spineMode: 'stretch',
    spineColorType: 'auto',
  },
  {
    id: 'box_with_cd',
    name: '3D Box mit CD-ROM',
    system: 'Box + CD dezent im Vordergrund',
    description: 'Schlanke 3D-Hülle mit realistisch dimensionierter CD-Disc im Vordergrund, ohne das Cover zu verdecken.',
    icon: '💿',
    style: 'box_with_cd',
    direction: 'left',
    angle: 25,
    spineWidthRatio: 0.065,
    glossOpacity: 0.25,
    shadowOpacity: 0.46,
    spineMode: 'stretch',
    spineColorType: 'auto',
  },
  {
    id: 'cartridge_gb',
    name: 'GameBoy Modul',
    system: 'Graues Cartridge (Quadratisch)',
    description: 'Graues Retro-Modul mit Griffmulde und ungestrecktem Cover als Original-Etikett.',
    icon: '🎮',
    style: 'cartridge_gb',
    direction: 'left',
    angle: 22,
    spineWidthRatio: 0.08,
    glossOpacity: 0.28,
    shadowOpacity: 0.48,
    spineMode: 'stretch',
    spineColorType: 'auto',
  },
  {
    id: 'cartridge_md',
    name: 'Mega Drive Modul',
    system: 'Schwarzes Cartridge (Breit)',
    description: 'Breites schwarzes Modul mit gerundeten Ecken, Greifrillen und ungestrecktem Cover-Sticker.',
    icon: '🕹️',
    style: 'cartridge_md',
    direction: 'left',
    angle: 22,
    spineWidthRatio: 0.08,
    glossOpacity: 0.30,
    shadowOpacity: 0.50,
    spineMode: 'stretch',
    spineAccent: 'megadrive',
    spineColorType: 'dark',
  },
  {
    id: 'cartridge_snes',
    name: 'SNES Modul',
    system: 'Graues Breit-Cartridge',
    description: 'Breites hellgraues Modul mit Stufenkanten und ungestrecktem Cover-Sticker.',
    icon: '👾',
    style: 'cartridge_snes',
    direction: 'left',
    angle: 22,
    spineWidthRatio: 0.08,
    glossOpacity: 0.26,
    shadowOpacity: 0.46,
    spineMode: 'stretch',
    spineAccent: 'snes',
    spineColorType: 'auto',
  },
  {
    id: 'ps1_jewel',
    name: 'CD Jewel Case',
    system: 'Transparente Klarsicht-CD-Hülle',
    description: 'Kristallklare CD-Hülle mit geripptem schwarzem Tray, Klipslaschen, Scharnieren und Glasreflexen.',
    icon: '💎',
    style: 'jewel',
    direction: 'left',
    angle: 22,
    spineWidthRatio: 0.05,
    glossOpacity: 0.36,
    shadowOpacity: 0.42,
    spineMode: 'color',
    spineAccent: 'ps1',
    spineColorType: 'black',
  },

  // 2. Spezifische Konsolen-Profile (Feinabstimmungen)
  {
    id: 'snes_eu_jp',
    name: 'SNES / Super Famicom (EU/JP)',
    system: 'SNES Box',
    description: 'Klassisches Hochformat mit schwarzem/farbigem Spine & typischem Nintendo-Karton-Glanz.',
    icon: '📦',
    style: 'standard',
    direction: 'left',
    angle: 28,
    spineWidthRatio: 0.15,
    glossOpacity: 0.22,
    shadowOpacity: 0.48,
    spineMode: 'stretch',
    spineAccent: 'snes',
    spineColorType: 'auto',
  },
  {
    id: 'snes_us',
    name: 'SNES US (Querformat)',
    system: 'SNES US Box',
    description: 'Amerikanische breite Kartonhülle mit markantem Quer-Spine.',
    icon: '📼',
    style: 'standard',
    direction: 'left',
    angle: 23,
    spineWidthRatio: 0.18,
    glossOpacity: 0.18,
    shadowOpacity: 0.44,
    spineMode: 'stretch',
    spineColorType: 'auto',
  },
  {
    id: 'gb_gbc',
    name: 'Game Boy / Color (Karton-Box)',
    system: 'GB / GBC Box',
    description: 'Kompakte, dicke Karton-Box mit charakteristischem Grau/Farb-Rücken.',
    icon: '📦',
    style: 'standard',
    direction: 'left',
    angle: 25,
    spineWidthRatio: 0.18,
    glossOpacity: 0.16,
    shadowOpacity: 0.46,
    spineMode: 'stretch',
    spineColorType: 'auto',
  },
  {
    id: 'gba',
    name: 'Game Boy Advance (GBA)',
    system: 'GBA Box',
    description: 'Kompaktes GBA-Format mit dezentem Spine und Hochglanz-Optik.',
    icon: '🔋',
    style: 'standard',
    direction: 'left',
    angle: 26,
    spineWidthRatio: 0.16,
    glossOpacity: 0.20,
    shadowOpacity: 0.45,
    spineMode: 'stretch',
    spineColorType: 'auto',
  },
  {
    id: 'megadrive_genesis',
    name: 'Sega Mega Drive / Genesis',
    system: 'Mega Drive',
    description: 'Klassische schwarze Kunststoffhülle mit Rastermuster und Plastikglanz.',
    icon: '⚡',
    style: 'standard',
    direction: 'left',
    angle: 30,
    spineWidthRatio: 0.14,
    glossOpacity: 0.28,
    shadowOpacity: 0.50,
    spineMode: 'stretch',
    spineAccent: 'megadrive',
    spineColorType: 'dark',
  },
  {
    id: 'ps1_jewel',
    name: 'PlayStation 1 (Jewel Case)',
    system: 'PS1',
    description: 'Gläserne CD-Hülle mit transparentem Plastik-Tray und Kanten-Lichtreflexen.',
    icon: '💿',
    style: 'jewel',
    direction: 'left',
    angle: 22,
    spineWidthRatio: 0.10,
    glossOpacity: 0.36,
    shadowOpacity: 0.42,
    spineMode: 'color',
    spineAccent: 'ps1',
    spineColorType: 'black',
  },
  {
    id: 'ps2_dvd',
    name: 'PlayStation 2 / DVD Keep Case',
    system: 'PS2',
    description: 'Schlanke, hohe DVD-Hülle mit mattschwarzem Kunststoff-Look.',
    icon: '📀',
    style: 'standard',
    direction: 'left',
    angle: 25,
    spineWidthRatio: 0.12,
    glossOpacity: 0.26,
    shadowOpacity: 0.46,
    spineMode: 'stretch',
    spineColorType: 'dark',
  },
  {
    id: 'nds_3ds',
    name: 'Nintendo DS / 3DS',
    system: 'NDS / 3DS',
    description: 'Kompakte, dicke Kunststoffhülle mit charakteristischem Spine.',
    icon: '📱',
    style: 'standard',
    direction: 'left',
    angle: 24,
    spineWidthRatio: 0.16,
    glossOpacity: 0.22,
    shadowOpacity: 0.45,
    spineMode: 'stretch',
    spineColorType: 'auto',
  },
  {
    id: 'nintendo_switch',
    name: 'Nintendo Switch',
    system: 'Switch',
    description: 'Moderne, ultra-schlanke transparente Translucent-Box.',
    icon: '🔴',
    style: 'standard',
    direction: 'left',
    angle: 24,
    spineWidthRatio: 0.10,
    glossOpacity: 0.27,
    shadowOpacity: 0.40,
    spineMode: 'stretch',
    spineColorType: 'auto',
  },
];

const STORAGE_KEY_CUSTOM_PRESETS = 'cover3d_custom_presets_v1';

/**
 * Loads user-saved custom presets from local storage.
 */
export function getSavedCustomPresets(): CoverPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_PRESETS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed reading custom presets from localStorage', err);
    return [];
  }
}

/**
 * Saves a new custom preset or updates an existing one.
 */
export function saveCustomPreset(preset: CoverPreset): CoverPreset[] {
  const existing = getSavedCustomPresets();
  const filtered = existing.filter((p) => p.id !== preset.id);
  const updated = [...filtered, { ...preset, isCustom: true }];
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_PRESETS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed storing custom preset', err);
  }
  return updated;
}

/**
 * Deletes a custom preset.
 */
export function deleteCustomPreset(presetId: string): CoverPreset[] {
  const existing = getSavedCustomPresets();
  const updated = existing.filter((p) => p.id !== presetId);
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_PRESETS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed deleting custom preset', err);
  }
  return updated;
}
