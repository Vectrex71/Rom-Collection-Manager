import JSZip from 'jszip';
import { BIOS_DATABASE, BiosRequirement } from '../data/biosDatabase';

// ==================== FAST MD5 IN PURE TYPESCRIPT ====================
// Standard RFC 1321 MD5 Implementation optimized for browser ArrayBuffers

function safeAdd(x: number, y: number): number {
  const lsw = (x & 0xffff) + (y & 0xffff);
  const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xffff);
}

function bitRotateLeft(num: number, cnt: number): number {
  return (num << cnt) | (num >>> (32 - cnt));
}

function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
  return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
}

function md5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return md5cmn((b & c) | (~b & d), a, b, x, s, t);
}

function md5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
}

function md5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return md5cmn(b ^ c ^ d, a, b, x, s, t);
}

function md5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return md5cmn(c ^ (b | ~d), a, b, x, s, t);
}

export function computeMD5(bytes: Uint8Array): string {
  const n = bytes.length;
  const wordsLength = (((n + 8) >> 6) + 1) * 16;
  const words = new Int32Array(wordsLength);

  for (let i = 0; i < n; i++) {
    words[i >> 2] |= bytes[i] << ((i % 4) * 8);
  }
  words[n >> 2] |= 0x80 << ((n % 4) * 8);
  words[wordsLength - 2] = n * 8;

  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;

  for (let i = 0; i < wordsLength; i += 16) {
    const olda = a;
    const oldb = b;
    const oldc = c;
    const oldd = d;

    a = md5ff(a, b, c, d, words[i + 0], 7, -680876936);
    d = md5ff(d, a, b, c, words[i + 1], 12, -389564586);
    c = md5ff(c, d, a, b, words[i + 2], 17, 606105819);
    b = md5ff(b, c, d, a, words[i + 3], 22, -1044525330);
    a = md5ff(a, b, c, d, words[i + 4], 7, -176418897);
    d = md5ff(d, a, b, c, words[i + 5], 12, 1200080426);
    c = md5ff(c, d, a, b, words[i + 6], 17, -1473231341);
    b = md5ff(b, c, d, a, words[i + 7], 22, -45705983);
    a = md5ff(a, b, c, d, words[i + 8], 7, 1770035416);
    d = md5ff(d, a, b, c, words[i + 9], 12, -1958414417);
    c = md5ff(c, d, a, b, words[i + 10], 17, -42063);
    b = md5ff(b, c, d, a, words[i + 11], 22, -1990404162);
    a = md5ff(a, b, c, d, words[i + 12], 7, 1804603682);
    d = md5ff(d, a, b, c, words[i + 13], 12, -40341101);
    c = md5ff(c, d, a, b, words[i + 14], 17, -1502002290);
    b = md5ff(b, c, d, a, words[i + 15], 22, 1236535329);

    a = md5gg(a, b, c, d, words[i + 1], 5, -165796510);
    d = md5gg(d, a, b, c, words[i + 6], 9, -1069501632);
    c = md5gg(c, d, a, b, words[i + 11], 14, 643717713);
    b = md5gg(b, c, d, a, words[i + 0], 20, -373897302);
    a = md5gg(a, b, c, d, words[i + 5], 5, -701558691);
    d = md5gg(d, a, b, c, words[i + 10], 9, 38016083);
    c = md5gg(c, d, a, b, words[i + 15], 14, -660478335);
    b = md5gg(b, c, d, a, words[i + 4], 20, -405537848);
    a = md5gg(a, b, c, d, words[i + 9], 5, 568446438);
    d = md5gg(d, a, b, c, words[i + 14], 9, -1019803690);
    c = md5gg(c, d, a, b, words[i + 3], 14, -187363961);
    b = md5gg(b, c, d, a, words[i + 8], 20, 1163531501);
    a = md5gg(a, b, c, d, words[i + 13], 5, -1444681467);
    d = md5gg(d, a, b, c, words[i + 2], 9, -51403784);
    c = md5gg(c, d, a, b, words[i + 7], 14, 1735328473);
    b = md5gg(b, c, d, a, words[i + 12], 20, -1926607734);

    a = md5hh(a, b, c, d, words[i + 5], 4, -378558);
    d = md5hh(d, a, b, c, words[i + 8], 11, -2022574463);
    c = md5hh(c, d, a, b, words[i + 11], 16, 1839030562);
    b = md5hh(b, c, d, a, words[i + 14], 23, -35309556);
    a = md5hh(a, b, c, d, words[i + 1], 4, -1530992060);
    d = md5hh(d, a, b, c, words[i + 4], 11, 1272893353);
    c = md5hh(c, d, a, b, words[i + 7], 16, -155497632);
    b = md5hh(b, c, d, a, words[i + 10], 23, -1094730640);
    a = md5hh(a, b, c, d, words[i + 13], 4, 681279174);
    d = md5hh(d, a, b, c, words[i + 0], 11, -358537222);
    c = md5hh(c, d, a, b, words[i + 3], 16, -722521979);
    b = md5hh(b, c, d, a, words[i + 6], 23, 76029189);
    a = md5hh(a, b, c, d, words[i + 9], 4, -640364487);
    d = md5hh(d, a, b, c, words[i + 12], 11, -421815835);
    c = md5hh(c, d, a, b, words[i + 15], 16, 530742520);
    b = md5hh(b, c, d, a, words[i + 2], 23, -995338651);

    a = md5ii(a, b, c, d, words[i + 0], 6, -198630844);
    d = md5ii(d, a, b, c, words[i + 7], 10, 1126891415);
    c = md5ii(c, d, a, b, words[i + 14], 15, -1416354905);
    b = md5ii(b, c, d, a, words[i + 5], 21, -57434055);
    a = md5ii(a, b, c, d, words[i + 12], 6, 1700485571);
    d = md5ii(d, a, b, c, words[i + 3], 10, -1894986606);
    c = md5ii(c, d, a, b, words[i + 10], 15, -1051523);
    b = md5ii(b, c, d, a, words[i + 1], 21, -2054922799);
    a = md5ii(a, b, c, d, words[i + 8], 6, 1873313359);
    d = md5ii(d, a, b, c, words[i + 15], 10, -30611744);
    c = md5ii(c, d, a, b, words[i + 6], 15, -1560198380);
    b = md5ii(b, c, d, a, words[i + 13], 21, 1309151649);
    a = md5ii(a, b, c, d, words[i + 4], 6, -145523070);
    d = md5ii(d, a, b, c, words[i + 11], 10, -1120210379);
    c = md5ii(c, d, a, b, words[i + 2], 15, 718787259);
    b = md5ii(b, c, d, a, words[i + 9], 21, -343485551);

    a = safeAdd(a, olda);
    b = safeAdd(b, oldb);
    c = safeAdd(c, oldc);
    d = safeAdd(d, oldd);
  }

  const hexChars = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 4; i++) {
    const word = i === 0 ? a : i === 1 ? b : i === 2 ? c : d;
    for (let j = 0; j < 4; j++) {
      const byte = (word >>> (j * 8)) & 0xff;
      out += hexChars.charAt((byte >>> 4) & 0x0f) + hexChars.charAt(byte & 0x0f);
    }
  }
  return out;
}

// ==================== TYPES & INTERFACES ====================

export type BiosMatchStatus =
  | 'verified_exact' // Both MD5 and target filename matched 100%
  | 'needs_rename' // MD5 matched, or high-confidence match, but filename needs correction
  | 'size_name_match' // Known alternate / regional variant
  | 'unknown_extra' // Unique additional BIOS / ROM dump (preserved cleanly in _extra_bios/)
  | 'duplicate'; // Exact duplicate of another file in the collection (omitted on clean export)

export interface ScannedBiosFile {
  id: string;
  sourceFile: File;
  sourceFilename: string;
  sourceRelativePath: string;
  size: number;
  md5: string;
  status: BiosMatchStatus;
  requirement?: BiosRequirement;
  targetPath: string; // e.g. "dc/dc_boot.bin", "scph5501.bin", or "_extra_bios/Amiga/..."
  targetFilename: string; // e.g. "dc_boot.bin"
  inferredCategory: string; // "Sony", "Commodore", "Sega", etc.
  inferredSystem: string; // "Commodore Amiga", "PlayStation", etc.
  isDuplicateOf?: string; // id or target of canonical file
  duplicateReason?: string; // e.g. "Identischer MD5 wie scph5501.bin" or "Doppelte Datei im Unterordner"
}

export interface SystemReadiness {
  system: string;
  systemName: string;
  category: string;
  totalRequired: number;
  foundCount: number;
  verifiedCount: number;
  percentage: number;
  status: 'complete' | 'partial' | 'missing';
  requirements: {
    req: BiosRequirement;
    foundFile?: ScannedBiosFile;
  }[];
}

export interface BiosExportOptions {
  includeExtras?: boolean; // false = only clean official system bios; true = include clean _extra_bios/
  onlyExtras?: boolean; // true = export ONLY unclassified extras/supplementary files
  removeDuplicates?: boolean; // default true: filter out all duplicates
  language?: 'de' | 'en';
}

// ==================== INTELLIGENT HEURISTICS & PATTERN MATCHING ====================

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Detects system category and friendly system name from any file name / path
 */
function inferSystemFromPath(name: string, path: string): { category: string; system: string } {
  const lower = (path + '/' + name).toLowerCase();

  if (lower.includes('amiga') || lower.includes('kickstart') || lower.includes('kick') || lower.includes('cd32') || lower.includes('cdtv')) {
    return { category: 'Commodore', system: 'Commodore Amiga' };
  }
  if (
    lower.includes('c64') ||
    lower.includes('c128') ||
    lower.includes('vic20') ||
    lower.includes('vice') ||
    lower.includes('1541') ||
    lower.includes('kernal') ||
    lower.includes('chargen') ||
    lower.includes('commodore')
  ) {
    return { category: 'Commodore', system: 'Commodore 64' };
  }
  if (lower.includes('psx') || lower.includes('ps1') || lower.includes('scph') || lower.includes('playstation')) {
    if (lower.includes('ps2') || lower.includes('scph-3') || lower.includes('scph-7') || lower.includes('scph-10000')) {
      return { category: 'Sony', system: 'Sony PlayStation 2' };
    }
    return { category: 'Sony', system: 'Sony PlayStation 1' };
  }
  if (lower.includes('ps2') || lower.includes('pcsx2')) {
    return { category: 'Sony', system: 'Sony PlayStation 2' };
  }
  if (lower.includes('psp') || lower.includes('ppsspp')) {
    return { category: 'Sony', system: 'Sony PlayStation Portable' };
  }
  if (lower.includes('dreamcast') || lower.includes('/dc/') || lower.includes('dc_') || lower.includes('flycast') || lower.includes('redream')) {
    return { category: 'Sega', system: 'Sega Dreamcast' };
  }
  if (
    lower.includes('saturn') ||
    lower.includes('mpr-') ||
    lower.includes('yabause') ||
    lower.includes('kronos') ||
    lower.includes('sega_10')
  ) {
    return { category: 'Sega', system: 'Sega Saturn' };
  }
  if (lower.includes('segacd') || lower.includes('megacd') || lower.includes('bios_cd_') || lower.includes('mcd')) {
    return { category: 'Sega', system: 'Sega Mega-CD' };
  }
  if (lower.includes('32x')) {
    return { category: 'Sega', system: 'Sega 32X' };
  }
  if (lower.includes('wiiu') || lower.includes('cemu')) {
    return { category: 'Nintendo', system: 'Nintendo Wii U' };
  }
  if (lower.includes('wii') || lower.includes('dolphin')) {
    return { category: 'Nintendo', system: 'Nintendo Wii' };
  }
  if (lower.includes('gamecube') || lower.includes('gc_ipl') || (lower.includes('ipl.bin') && lower.includes('gc'))) {
    return { category: 'Nintendo', system: 'Nintendo GameCube' };
  }
  if (lower.includes('switch') || lower.includes('yuzu') || lower.includes('ryujinx') || lower.includes('prod.keys')) {
    return { category: 'Nintendo', system: 'Nintendo Switch' };
  }
  if (lower.includes('3ds') || lower.includes('citra')) {
    return { category: 'Nintendo', system: 'Nintendo 3DS' };
  }
  if (lower.includes('gba') || lower.includes('game boy advance') || lower.includes('mgba')) {
    return { category: 'Nintendo', system: 'Nintendo Game Boy Advance' };
  }
  if (lower.includes('gbc') || lower.includes('game boy color')) {
    return { category: 'Nintendo', system: 'Nintendo Game Boy Color' };
  }
  if (lower.includes('gb_bios') || lower.includes('dmg_boot') || lower.includes('game boy')) {
    return { category: 'Nintendo', system: 'Nintendo Game Boy' };
  }
  if (lower.includes('nds') || lower.includes('bios7') || lower.includes('bios9') || lower.includes('melonds') || lower.includes('desmume')) {
    return { category: 'Nintendo', system: 'Nintendo DS' };
  }
  if (lower.includes('fds') || lower.includes('disksys')) {
    return { category: 'Nintendo', system: 'Nintendo FDS' };
  }
  if (lower.includes('neogeo') || lower.includes('uni-bios') || lower.includes('unibios')) {
    return { category: 'SNK', system: 'SNK Neo Geo' };
  }
  if (lower.includes('naomi') || lower.includes('awbios') || lower.includes('atomiswave') || lower.includes('arcade') || lower.includes('mame') || lower.includes('fbneo')) {
    return { category: 'Arcade', system: 'Arcade Boards' };
  }
  if (lower.includes('pce') || lower.includes('syscard') || lower.includes('pc-fx') || lower.includes('pcfx') || lower.includes('turbografx')) {
    return { category: 'NEC', system: 'NEC PC Engine / PC-FX' };
  }
  if (lower.includes('pc98') || lower.includes('np2kai')) {
    return { category: 'NEC', system: 'NEC PC-9801' };
  }
  if (lower.includes('jaguar') || lower.includes('jagboot') || lower.includes('jagcd')) {
    return { category: 'Atari', system: 'Atari Jaguar' };
  }
  if (lower.includes('atari') || lower.includes('tos') || lower.includes('lynx') || lower.includes('5200') || lower.includes('7800')) {
    return { category: 'Atari', system: 'Atari Systems' };
  }
  if (lower.includes('x68000') || lower.includes('keropi') || lower.includes('iplrom')) {
    return { category: 'Sharp', system: 'Sharp X68000' };
  }
  if (lower.includes('xbox') || lower.includes('xemu') || lower.includes('mcpx')) {
    return { category: 'Microsoft', system: 'Microsoft Xbox' };
  }
  if (lower.includes('ps3') || lower.includes('rpcs3')) {
    return { category: 'Sony', system: 'Sony PlayStation 3' };
  }
  if (lower.includes('64dd') || lower.includes('ipl.n64')) {
    return { category: 'Nintendo', system: 'Nintendo 64DD' };
  }
  if (lower.includes('fmtowns') || lower.includes('marty')) {
    return { category: 'Fujitsu', system: 'Fujitsu FM Towns / Marty' };
  }
  if (lower.includes('supervision') || lower.includes('svsample')) {
    return { category: 'Other', system: 'Watara Supervision' };
  }
  if (lower.includes('megaduck') || lower.includes('cougar boy')) {
    return { category: 'Other', system: 'Mega Duck' };
  }
  if (lower.includes('pokemini') || lower.includes('pokemon mini')) {
    return { category: 'Nintendo', system: 'Pokemon Mini' };
  }
  if (lower.includes('gamegear') || lower.includes('game gear') || lower.includes('bios.gg')) {
    return { category: 'Sega', system: 'Sega Game Gear' };
  }
  if (lower.includes('mastersystem') || lower.includes('master system') || lower.includes('bios_e.sms')) {
    return { category: 'Sega', system: 'Sega Master System' };
  }
  if (lower.includes('ngpc') || lower.includes('neo geo pocket color') || lower.includes('neopop')) {
    return { category: 'SNK', system: 'SNK Neo Geo Pocket Color' };
  }
  if (lower.includes('ngp') || lower.includes('neo geo pocket')) {
    return { category: 'SNK', system: 'SNK Neo Geo Pocket' };
  }
  if (lower.includes('pippin')) {
    return { category: 'Apple', system: 'Apple Bandai Pippin' };
  }
  if (lower.includes('apple2')) {
    return { category: 'Apple', system: 'Apple IIe' };
  }
  if (
    lower.includes('quadra') ||
    lower.includes('basilisk') ||
    lower.includes('sheepshaver') ||
    lower.includes('vmac') ||
    (lower.includes('mac') && lower.includes('rom'))
  ) {
    return { category: 'Apple', system: 'Apple Macintosh' };
  }
  if (lower.includes('msx')) {
    return { category: 'Microsoft', system: 'Microsoft MSX' };
  }
  if (lower.includes('3do') || lower.includes('panafz') || lower.includes('goldstar')) {
    return { category: '3DO', system: 'Panasonic 3DO' };
  }
  if (lower.includes('mt32') || lower.includes('cm32l') || lower.includes('scummvm') || lower.includes('roland')) {
    return { category: 'Other', system: 'ScummVM / Synthesizers' };
  }

  return { category: 'Other', system: 'Sonstige BIOS-Dateien' };
}

/**
 * Intelligent pattern matching for files named via TOSEC, No-Intro, or GoodBIOS standards
 */
function matchBySmartHeuristics(filename: string, size: number, path: string): BiosRequirement | undefined {
  const lower = filename.toLowerCase();
  const lowerPath = (path + '/' + filename).toLowerCase();

  // 1. Amiga Kickstarts
  if (lower.includes('kick') || lower.includes('amiga-os-')) {
    if (lower.includes('1.3') || lower.includes('34005') || lower.includes('34.5') || lower.includes('130')) {
      if (lower.includes('cdtv')) {
        return lower.includes('ext')
          ? BIOS_DATABASE.find((r) => r.id === 'amiga_cdtv_ext')
          : BIOS_DATABASE.find((r) => r.id === 'amiga_cdtv_bios');
      }
      return BIOS_DATABASE.find((r) => r.id === 'amiga_kick13');
    }
    if (lower.includes('3.1') || lower.includes('40068') || lower.includes('40.68') || lower.includes('310')) {
      if (lower.includes('cd32')) {
        return lower.includes('ext')
          ? BIOS_DATABASE.find((r) => r.id === 'amiga_cd32_ext')
          : BIOS_DATABASE.find((r) => r.id === 'amiga_cd32_bios');
      }
      if (lower.includes('4000') || lower.includes('a4000')) {
        return BIOS_DATABASE.find((r) => r.id === 'amiga_kick31_4000');
      }
      if (lower.includes('600') || lower.includes('a600')) {
        return BIOS_DATABASE.find((r) => r.id === 'amiga_kick31_600');
      }
      return BIOS_DATABASE.find((r) => r.id === 'amiga_kick31_1200');
    }
    if (lower.includes('1.2') || lower.includes('33180') || lower.includes('120')) {
      return BIOS_DATABASE.find((r) => r.id === 'amiga_kick12');
    }
    if (lower.includes('2.04') || lower.includes('37175') || lower.includes('204')) {
      return BIOS_DATABASE.find((r) => r.id === 'amiga_kick204');
    }
    if (lower.includes('2.05') || lower.includes('37350') || lower.includes('205')) {
      return BIOS_DATABASE.find((r) => r.id === 'amiga_kick205');
    }
    if (lower.includes('3.0') || lower.includes('39106') || lower.includes('300')) {
      return BIOS_DATABASE.find((r) => r.id === 'amiga_kick30_1200');
    }
    if (lower.includes('cd32')) {
      return lower.includes('ext')
        ? BIOS_DATABASE.find((r) => r.id === 'amiga_cd32_ext')
        : BIOS_DATABASE.find((r) => r.id === 'amiga_cd32_bios');
    }
  }

  // 2. PlayStation 1
  if (lower.includes('scph') || (lower.includes('ps1') && lower.includes('bios')) || lower.includes('psx')) {
    if (lower.includes('5501') || lower.includes('1001') || lower.includes('7001')) {
      return BIOS_DATABASE.find((r) => r.id === 'ps1_us_5501');
    }
    if (lower.includes('5502') || lower.includes('1002') || lower.includes('7502') || lower.includes('9002')) {
      return BIOS_DATABASE.find((r) => r.id === 'ps1_eu_5502');
    }
    if (lower.includes('5500') || lower.includes('1000') || lower.includes('7000')) {
      return BIOS_DATABASE.find((r) => r.id === 'ps1_jp_5500');
    }
    if (lower.includes('pops') || lower.includes('psxonpsp')) {
      return BIOS_DATABASE.find((r) => r.id === 'ps1_psp_psxonpsp');
    }
  }

  // 3. PlayStation 2
  if (lower.includes('scph') && (lower.includes('39001') || lower.includes('39004') || lower.includes('70004') || lower.includes('10000'))) {
    if (lower.includes('39001')) return BIOS_DATABASE.find((r) => r.id === 'ps2_us_39001');
    if (lower.includes('39004')) return BIOS_DATABASE.find((r) => r.id === 'ps2_eu_39004');
    if (lower.includes('70004')) return BIOS_DATABASE.find((r) => r.id === 'ps2_eu_70004');
    if (lower.includes('70012')) return BIOS_DATABASE.find((r) => r.id === 'ps2_us_70012');
  }

  // 4. Sega Saturn
  if (
    lower.includes('saturn') ||
    lower.includes('mpr-17933') ||
    lower.includes('mpr-18811') ||
    lower.includes('sega_10') ||
    lowerPath.includes('saturn')
  ) {
    if (lower.includes('jp') || lower.includes('japan') || lower.includes('101') || lower.includes('100')) {
      return BIOS_DATABASE.find((r) => r.id === 'saturn_jp') || BIOS_DATABASE.find((r) => r.id === 'saturn_eu_us');
    }
    return BIOS_DATABASE.find((r) => r.id === 'saturn_eu_us');
  }

  // 5. Atari Jaguar & Jaguar CD
  if (
    lower.includes('jaguar') ||
    lower.includes('jagboot') ||
    lower.includes('jagcd') ||
    lower.includes('jag_boot') ||
    lower.includes('jag_cd') ||
    lowerPath.includes('jaguar')
  ) {
    if (lower.includes('cd') || size >= 200000) {
      return BIOS_DATABASE.find((r) => r.id === 'jaguar_cd_boot');
    }
    return BIOS_DATABASE.find((r) => r.id === 'jaguar_boot');
  }

  // 6. Commodore 64 / 1541
  if (
    lower.includes('c64') ||
    lowerPath.includes('c64') ||
    lowerPath.includes('vice') ||
    lower.includes('kernal') ||
    lower.includes('chargen') ||
    lower.includes('1541') ||
    lower.includes('basic')
  ) {
    if (lower.includes('kernal') || (size === 8192 && lower.includes('kern'))) {
      return BIOS_DATABASE.find((r) => r.id === 'c64_kernal');
    }
    if (lower.includes('chargen') || lower.includes('characters') || (size === 4096 && lower.includes('char'))) {
      return BIOS_DATABASE.find((r) => r.id === 'c64_chargen');
    }
    if (lower === 'basic' || lower.startsWith('basic.') || lower.startsWith('basic-') || (size === 8192 && lower.includes('basic'))) {
      return BIOS_DATABASE.find((r) => r.id === 'c64_basic');
    }
    if (lower.includes('1541') || lower.includes('d1541')) {
      return BIOS_DATABASE.find((r) => r.id === 'c64_d1541');
    }
  }

  // 7. Nintendo Wii & Wii U & GameCube & Switch & 3DS
  if (lower.includes('dsp_coef')) {
    return BIOS_DATABASE.find((r) => r.id === 'wii_dsp_coef');
  }
  if (lower.includes('dsp_rom')) {
    return BIOS_DATABASE.find((r) => r.id === 'wii_dsp_rom');
  }
  if (lower.includes('rvt-r.pem') || lower.includes('client.pem')) {
    return BIOS_DATABASE.find((r) => r.id === 'wii_certs');
  }
  if ((lower.includes('otp.bin') || lower.includes('wiiu_otp')) && (size === 1024 || size === 0)) {
    return BIOS_DATABASE.find((r) => r.id === 'wiiu_otp');
  }
  if ((lower.includes('seeprom.bin') || lower.includes('wiiu_seeprom')) && (size === 512 || size === 0)) {
    return BIOS_DATABASE.find((r) => r.id === 'wiiu_seeprom');
  }
  if (lower.includes('prod.keys') || (lower.includes('keys') && lowerPath.includes('switch'))) {
    return BIOS_DATABASE.find((r) => r.id === 'switch_prod_keys');
  }
  if (lower.includes('title.keys')) {
    return BIOS_DATABASE.find((r) => r.id === 'switch_title_keys');
  }
  if (lower.includes('boot9.bin') || lower.includes('boot9_prot')) {
    return BIOS_DATABASE.find((r) => r.id === '3ds_boot9');
  }
  if (lower.includes('boot11.bin')) {
    return BIOS_DATABASE.find((r) => r.id === '3ds_boot11');
  }
  if (lower.includes('aes_keys.txt') || (lower.includes('keys.txt') && lowerPath.includes('citra'))) {
    return BIOS_DATABASE.find((r) => r.id === '3ds_aes_keys');
  }
  if (lower.includes('gc_ipl') || (lower.includes('ipl.bin') && (lowerPath.includes('gc') || lowerPath.includes('dolphin') || lowerPath.includes('gamecube')))) {
    return BIOS_DATABASE.find((r) => r.id === 'gamecube_ipl');
  }

  // 8. Sega CD
  if (lower.includes('mcd') || lower.includes('scd') || lower.includes('segacd') || lower.includes('megacd')) {
    if (lower.includes('eu') || lower.includes('pal') || lower.includes('europe') || lower.includes('_e.')) {
      return BIOS_DATABASE.find((r) => r.id === 'segacd_eu');
    }
    if (lower.includes('us') || lower.includes('usa') || lower.includes('ntsc-u') || lower.includes('_u.')) {
      return BIOS_DATABASE.find((r) => r.id === 'segacd_us');
    }
    if (lower.includes('jp') || lower.includes('japan') || lower.includes('_j.')) {
      return BIOS_DATABASE.find((r) => r.id === 'segacd_jp');
    }
  }

  // 9. Dreamcast
  if (lower.includes('dc_boot') || lower.includes('dc_bios') || (lower.includes('boot.bin') && lowerPath.includes('dc'))) {
    return BIOS_DATABASE.find((r) => r.id === 'dc_boot');
  }
  if (lower.includes('dc_flash') || (lower.includes('flash.bin') && lowerPath.includes('dc'))) {
    return BIOS_DATABASE.find((r) => r.id === 'dc_flash');
  }

  // 10. GBA
  if (lower.includes('gba') && (lower.includes('bios') || lower.includes('boot') || size === 16384)) {
    return BIOS_DATABASE.find((r) => r.id === 'gba_bios');
  }

  // 11. FDS
  if (lower.includes('disksys') || lower.includes('fds_bios') || lower.includes('famicom disk')) {
    return BIOS_DATABASE.find((r) => r.id === 'fds_bios');
  }

  // 12. PC Engine CD
  if (lower.includes('syscard') || lower.includes('system card')) {
    if (lower.includes('2')) return BIOS_DATABASE.find((r) => r.id === 'pce_syscard2');
    return BIOS_DATABASE.find((r) => r.id === 'pce_syscard3');
  }

  // 13. Neo Geo
  if (lower === 'neogeo.zip' || lower.includes('neogeo')) {
    return BIOS_DATABASE.find((r) => r.id === 'neogeo_zip');
  }

  // 14. PS2 Auxiliary & PS3
  if (lower === 'erom.bin' || lower.endsWith('.erom')) {
    return BIOS_DATABASE.find((r) => r.id === 'ps2_erom');
  }
  if (lower === 'rom1.bin' || lower.endsWith('.rom1')) {
    return BIOS_DATABASE.find((r) => r.id === 'ps2_rom1');
  }
  if (lower === 'rom2.bin' || lower.endsWith('.rom2')) {
    return BIOS_DATABASE.find((r) => r.id === 'ps2_rom2');
  }
  if (lower.includes('ps3updat')) {
    return BIOS_DATABASE.find((r) => r.id === 'ps3_firmware');
  }

  // 15. Microsoft Xbox
  if (lower.includes('mcpx') || lower === 'mcpx_1.0.bin') {
    return BIOS_DATABASE.find((r) => r.id === 'xbox_mcpx');
  }
  if (
    lower.includes('complex_4627') ||
    lower === 'cerbios.bin' ||
    ((lower.includes('xbox') || lowerPath.includes('xbox') || lowerPath.includes('xemu')) && (lower.includes('bios') || size === 1048576))
  ) {
    return BIOS_DATABASE.find((r) => r.id === 'xbox_bios');
  }

  // 16. Nintendo 64DD
  if (lower === 'ipl.n64' || lower.includes('64dd_ipl') || (lower.includes('64dd') && (lower.endsWith('.n64') || lower.endsWith('.bin')))) {
    return BIOS_DATABASE.find((r) => r.id === 'n64dd_ipl');
  }

  // 17. Fujitsu FM Towns Marty
  if (lower.includes('fmtowns') || lower.includes('marty.zip') || lower === 'fmt_sys.rom') {
    return BIOS_DATABASE.find((r) => r.id === 'fmtowns_marty');
  }

  // 18. Apple Macintosh & Apple II
  if (lower === 'macii.rom' || lower === 'mac.rom' || lower === 'quadra650.rom' || lower === 'vmac.rom' || (size === 1048576 && lowerPath.includes('mac'))) {
    return BIOS_DATABASE.find((r) => r.id === 'mac_boot_rom');
  }
  if (lower.includes('apple2e') || (lower.includes('apple2') && size === 32768)) {
    return BIOS_DATABASE.find((r) => r.id === 'apple2e_rom');
  }

  // 19. Apple Bandai Pippin
  if (lower.includes('pippin') || (lower.startsWith('pippin') && (size === 4194304 || size === 1048576 || size === 2097152))) {
    return BIOS_DATABASE.find((r) => r.id === 'apple_pippin');
  }

  // 20. Handhelds: Neo Geo Pocket / Color, Game Gear, Master System, Pokemon Mini, Supervision, Mega Duck
  if (lower === 'ngpc.rom' || lower.includes('ngpc_bios') || (lower.includes('ngpc') && size === 65536)) {
    return BIOS_DATABASE.find((r) => r.id === 'ngpc_bios');
  }
  if (lower === 'ngp.rom' || lower.includes('ngp_bios') || (lower.includes('ngp') && size === 65536)) {
    return BIOS_DATABASE.find((r) => r.id === 'ngp_bios');
  }
  if (lower === 'bios.gg' || lower.includes('gamegear') || (lower.includes('gg_bios') && size === 1024)) {
    return BIOS_DATABASE.find((r) => r.id === 'gg_bios');
  }
  if (lower.startsWith('bios_') && lower.endsWith('.sms')) {
    return BIOS_DATABASE.find((r) => r.id === 'sms_bios');
  }
  if (lower === 'bios.min' || lower.includes('pokemini') || (lower.includes('poke') && size === 4096)) {
    return BIOS_DATABASE.find((r) => r.id === 'pokemini_bios');
  }
  if (lower === 'svsample.bin' || lower.includes('supervision')) {
    return BIOS_DATABASE.find((r) => r.id === 'supervision_sample');
  }
  if (lower === 'megaduck.bin' || lower.includes('megaduck') || lower.includes('cougarboy')) {
    return BIOS_DATABASE.find((r) => r.id === 'megaduck_bios');
  }

  return undefined;
}

// ==================== CORE ANALYZER ====================

export async function analyzeBiosFiles(
  files: { file: File; relativePath: string }[],
  onProgress?: (current: number, total: number, filename: string) => void
): Promise<{
  scannedFiles: ScannedBiosFile[];
  systemsReadiness: SystemReadiness[];
  stats: {
    totalFiles: number;
    verifiedCount: number;
    needsRenameCount: number;
    duplicateCount: number;
    unknownCount: number;
    readySystemsCount: number;
    totalSystemsCount: number;
  };
}> {
  const initialFiles: ScannedBiosFile[] = [];

  for (let i = 0; i < files.length; i++) {
    const { file, relativePath } = files[i];
    if (onProgress) {
      onProgress(i + 1, files.length, file.name);
    }

    // Skip operating system junk (.DS_Store, Thumbs.db, etc.)
    if (
      file.name.startsWith('.') ||
      file.name.toLowerCase() === 'thumbs.db' ||
      file.name.toLowerCase() === 'desktop.ini'
    ) {
      continue;
    }

    // Fast Hashing (skip full hash for gigantic files > 32MB to prevent browser freeze)
    let md5 = '';
    let unheaderedMd5 = '';

    if (file.size <= 33554432) {
      try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        md5 = computeMD5(bytes);

        // Check for 11-byte Cloanto Kickstart header or 512-byte SMC/A26 header
        if (bytes.length > 512) {
          if (bytes[0] === 0x41 && bytes[1] === 0x4d && bytes[2] === 0x49) {
            // 'AMI' Cloanto header (11 bytes)
            unheaderedMd5 = computeMD5(bytes.slice(11));
          } else if (file.size % 1024 === 512) {
            // 512-byte headered dump
            unheaderedMd5 = computeMD5(bytes.slice(512));
          }
        }
      } catch (e) {
        console.warn('Could not hash file', file.name, e);
      }
    }

    const lowerFilename = file.name.toLowerCase();
    const cleanNormName = normalizeName(file.name);

    let matchedReq: BiosRequirement | undefined;
    let status: BiosMatchStatus = 'unknown_extra';

    // Priority 1: Exact MD5 match (standard or unheadered, across primary and known alternate hashes)
    if (md5) {
      const targetMd5 = md5.toLowerCase();
      const unhead = unheaderedMd5 ? unheaderedMd5.toLowerCase() : '';
      matchedReq = BIOS_DATABASE.find((req) => {
        const matchHash = (h: string) => {
          const l = h.toLowerCase();
          return l === targetMd5 || (unhead && l === unhead);
        };
        if (req.md5 && matchHash(req.md5)) return true;
        if (req.knownMd5s && req.knownMd5s.some((k) => matchHash(k))) return true;
        return false;
      });

      if (matchedReq) {
        status =
          lowerFilename === matchedReq.filename.toLowerCase()
            ? 'verified_exact'
            : 'needs_rename';
      }
    }

    // Priority 2: Match by exact filename and size tolerance
    if (!matchedReq) {
      matchedReq = BIOS_DATABASE.find((req) => {
        const matchesName =
          lowerFilename === req.filename.toLowerCase() ||
          req.altNames.some(
            (alt) =>
              lowerFilename === alt.toLowerCase() ||
              cleanNormName === normalizeName(alt) ||
              cleanNormName === normalizeName(alt).replace(/rom$|bin$/, '') ||
              lowerFilename.startsWith(normalizeName(alt))
          );
        if (!matchesName) return false;
        if (req.expectedSize === 0) return true;
        return Math.abs(file.size - req.expectedSize) <= 512;
      });

      if (matchedReq) {
        const isExactHash =
          (matchedReq.md5 && md5 && matchedReq.md5.toLowerCase() === md5.toLowerCase()) ||
          (matchedReq.knownMd5s && md5 && matchedReq.knownMd5s.some((k) => k.toLowerCase() === md5.toLowerCase()));

        if (isExactHash) {
          status =
            lowerFilename === matchedReq.filename.toLowerCase()
              ? 'verified_exact'
              : 'needs_rename';
        } else {
          status =
            lowerFilename === matchedReq.filename.toLowerCase()
              ? 'size_name_match'
              : 'needs_rename';
        }
      }
    }

    // Priority 3: Intelligent Heuristics (TOSEC names, No-Intro keywords)
    if (!matchedReq) {
      matchedReq = matchBySmartHeuristics(file.name, file.size, relativePath);
      if (matchedReq) {
        const isExactHash =
          (matchedReq.md5 && md5 && matchedReq.md5.toLowerCase() === md5.toLowerCase()) ||
          (matchedReq.knownMd5s && md5 && matchedReq.knownMd5s.some((k) => k.toLowerCase() === md5.toLowerCase()));

        if (isExactHash) {
          status =
            lowerFilename === matchedReq.filename.toLowerCase()
              ? 'verified_exact'
              : 'needs_rename';
        } else {
          status =
            lowerFilename === matchedReq.filename.toLowerCase()
              ? 'size_name_match'
              : 'needs_rename';
        }
      }
    }

    const inferred = inferSystemFromPath(file.name, relativePath);

    initialFiles.push({
      id: `${relativePath}_${file.size}_${file.lastModified}`,
      sourceFile: file,
      sourceFilename: file.name,
      sourceRelativePath: relativePath,
      size: file.size,
      md5,
      status,
      requirement: matchedReq,
      targetPath: '',
      targetFilename: matchedReq ? matchedReq.filename : file.name,
      inferredCategory: matchedReq ? matchedReq.systemCategory : inferred.category,
      inferredSystem: matchedReq ? matchedReq.systemName : inferred.system,
    });
  }

  // ==================== DEDUPLICATION & CANONICAL PATH RESOLUTION ====================

  // Phase 1: Group files matching curated requirements and pick the single best canonical file
  const reqGroups = new Map<string, ScannedBiosFile[]>();
  for (const item of initialFiles) {
    if (item.requirement) {
      const list = reqGroups.get(item.requirement.id) || [];
      list.push(item);
      reqGroups.set(item.requirement.id, list);
    }
  }

  const canonicalWinners = new Set<string>();

  for (const [, candidates] of reqGroups.entries()) {
    // Rank candidates: exact verified > needs rename > size match
    candidates.sort((a, b) => {
      const getScore = (f: ScannedBiosFile) => {
        let score = 0;
        if (f.status === 'verified_exact') score += 1000;
        else if (f.status === 'needs_rename') score += 800;
        else if (f.status === 'size_name_match') score += 500;
        else score += 100;

        if (f.sourceFilename.toLowerCase() === f.requirement!.filename.toLowerCase()) {
          score += 150;
        }
        // Prefer files that were already closer to root or standard location
        const depth = f.sourceRelativePath.split('/').length;
        score += Math.max(0, 50 - depth * 5);
        return score;
      };
      return getScore(b) - getScore(a);
    });

    const winner = candidates[0];
    canonicalWinners.add(winner.id);

    const req = winner.requirement!;
    winner.targetPath = req.targetSubpath ? `${req.targetSubpath}${req.filename}` : req.filename;
    winner.targetFilename = req.filename;

    // All other candidates for this requirement are duplicates
    for (let c = 1; c < candidates.length; c++) {
      const dup = candidates[c];
      dup.status = 'duplicate';
      dup.isDuplicateOf = winner.id;
      dup.duplicateReason = `Doppelte Version für ${winner.targetPath} (aus ${dup.sourceRelativePath})`;
      dup.targetPath = '';
    }
  }

  // Phase 2: Binary Hash Deduplication across all files
  // If ANY file in the collection has the identical MD5 hash as an accepted canonical system BIOS,
  // or identical to another previously encountered file, eliminate the redundant duplicate!
  const knownMd5Map = new Map<string, ScannedBiosFile>();

  // Register canonical winners first
  for (const item of initialFiles) {
    if (canonicalWinners.has(item.id) && item.md5) {
      knownMd5Map.set(item.md5.toLowerCase(), item);
    }
  }

  // Check remaining files
  for (const item of initialFiles) {
    if (canonicalWinners.has(item.id)) continue;
    if (item.status === 'duplicate') continue;

    if (item.md5 && knownMd5Map.has(item.md5.toLowerCase())) {
      const original = knownMd5Map.get(item.md5.toLowerCase())!;
      item.status = 'duplicate';
      item.isDuplicateOf = original.id;
      item.duplicateReason = original.requirement
        ? `Identischer MD5-Hash wie System-BIOS "${original.targetPath}" (Original: ${original.sourceFilename})`
        : `Identischer MD5-Hash wie "${original.sourceFilename}"`;
      item.targetPath = '';
      continue;
    }

    if (item.md5) {
      knownMd5Map.set(item.md5.toLowerCase(), item);
    }
  }

  // Phase 3: Assign clean, flat, organized target paths for UNIQUE extras (NO 5-level nested deep subfolders!)
  const usedExtraTargetPaths = new Set<string>();

  for (const item of initialFiles) {
    if (item.status === 'duplicate' || item.requirement) continue;

    const cat = item.inferredCategory || 'Sonstige';
    const cleanCat = cat.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeFilename = item.sourceFilename.replace(/[/\\?%*:|"<>]/g, '_');

    let candidateTargetPath = `_extra_bios/${cleanCat}/${safeFilename}`;

    // Disambiguate if multiple unique files in the same category happen to share a filename (e.g. bios.bin)
    if (usedExtraTargetPaths.has(candidateTargetPath.toLowerCase())) {
      const dotIdx = safeFilename.lastIndexOf('.');
      const base = dotIdx > -1 ? safeFilename.substring(0, dotIdx) : safeFilename;
      const ext = dotIdx > -1 ? safeFilename.substring(dotIdx) : '';
      const hashSuffix = item.md5 ? item.md5.substring(0, 6) : Math.random().toString(36).substring(2, 6);
      candidateTargetPath = `_extra_bios/${cleanCat}/${base}_${hashSuffix}${ext}`;
    }

    usedExtraTargetPaths.add(candidateTargetPath.toLowerCase());
    item.targetPath = candidateTargetPath;
    item.targetFilename = safeFilename;
  }

  const scannedFiles = initialFiles;

  // Calculate System Readiness Breakdown based ONLY on canonical winners
  const systemsMap = new Map<string, SystemReadiness>();

  for (const req of BIOS_DATABASE) {
    if (!systemsMap.has(req.system)) {
      systemsMap.set(req.system, {
        system: req.system,
        systemName: req.systemName,
        category: req.systemCategory,
        totalRequired: 0,
        foundCount: 0,
        verifiedCount: 0,
        percentage: 0,
        status: 'missing',
        requirements: [],
      });
    }

    const sys = systemsMap.get(req.system)!;
    if (req.importance === 'essential') {
      sys.totalRequired++;
    }

    const found = scannedFiles.find(
      (f) => f.requirement?.id === req.id && f.status !== 'duplicate' && !f.isDuplicateOf
    );
    if (found) {
      sys.foundCount++;
      if (found.status === 'verified_exact') {
        sys.verifiedCount++;
      }
    }

    sys.requirements.push({
      req,
      foundFile: found,
    });
  }

  const systemsReadiness: SystemReadiness[] = Array.from(systemsMap.values()).map((sys) => {
    const total = sys.requirements.length;
    const essentialTotal = sys.requirements.filter((r) => r.req.importance === 'essential').length;
    const essentialFound = sys.requirements.filter(
      (r) => r.req.importance === 'essential' && r.foundFile
    ).length;

    const percentage = total > 0 ? Math.round((sys.foundCount / total) * 100) : 0;
    let status: 'complete' | 'partial' | 'missing' = 'missing';

    if (essentialTotal > 0 ? essentialFound === essentialTotal : percentage === 100) {
      status = 'complete';
    } else if (sys.foundCount > 0) {
      status = 'partial';
    }

    return {
      ...sys,
      percentage,
      status,
    };
  });

  const verifiedCount = scannedFiles.filter((f) => f.status === 'verified_exact').length;
  const needsRenameCount = scannedFiles.filter(
    (f) => f.status === 'needs_rename' || f.status === 'size_name_match'
  ).length;
  const duplicateCount = scannedFiles.filter((f) => f.status === 'duplicate').length;
  const unknownCount = scannedFiles.filter((f) => f.status === 'unknown_extra').length;
  const readySystemsCount = systemsReadiness.filter((s) => s.status === 'complete').length;

  return {
    scannedFiles,
    systemsReadiness,
    stats: {
      totalFiles: scannedFiles.length,
      verifiedCount,
      needsRenameCount,
      duplicateCount,
      unknownCount,
      readySystemsCount,
      totalSystemsCount: systemsReadiness.length,
    },
  };
}

// ==================== EXPORT UTILITIES (CLEAN, DEDUPLICATED, NO MESSY NESTED SUBFOLDERS) ====================

function generateReadmeReport(files: ScannedBiosFile[], options: BiosExportOptions): string {
  const isDe = options.language === 'de';
  const verified = files.filter((f) => f.status === 'verified_exact');
  const renamed = files.filter((f) => f.status === 'needs_rename' || f.status === 'size_name_match');
  const duplicates = files.filter((f) => f.status === 'duplicate');
  const extras = files.filter((f) => f.status === 'unknown_extra');

  let report = '===================================================\n';
  report += isDe
    ? '       SAUBERER BIOS-SAMMLUNGSBERICHT              \n'
    : '       CLEAN BIOS COLLECTION REPORT               \n';
  report += ' Generated by ROM Collection Manager BIOS Studio   \n';
  report += '===================================================\n\n';

  if (isDe) {
    report += `Gesamte Dateien im Scan:  ${files.length}\n`;
    report += `Offizielle System-BIOS:    ${verified.length + renamed.length} (${verified.length} exakt verifiziert, ${renamed.length} genormt)\n`;
    report += `Entfernte Duplikate:      ${duplicates.length} (redundante Kopien & identische Hashes übersprungen)\n`;
    report += `Verworfene Extras:        ${extras.length} (im Export übersprungen für ein 100% sauberes Emulator-Set)\n\n`;

    report += '---------------------------------------------------\n';
    report += 'BEREINIGTE & GENORMTE SYSTEM-BIOS DATEIEN:\n';
    report += '---------------------------------------------------\n';
  } else {
    report += `Total files scanned:      ${files.length}\n`;
    report += `Official System BIOS:     ${verified.length + renamed.length} (${verified.length} exact match, ${renamed.length} standardized)\n`;
    report += `Eliminated duplicates:    ${duplicates.length} (redundant copies & identical hashes skipped)\n`;
    report += `Discarded extras/junk:    ${extras.length} (skipped for a 100% clean, lean emulator set)\n\n`;

    report += '---------------------------------------------------\n';
    report += 'CLEAN & STANDARDIZED SYSTEM BIOS FILES:\n';
    report += '---------------------------------------------------\n';
  }

  for (const f of files.filter((item) => item.requirement && item.status !== 'duplicate' && !item.isDuplicateOf)) {
    report += `[OK] ${f.targetPath.padEnd(28)} <- ${f.sourceFilename}\n`;
    report += `     System: ${f.requirement?.systemName} (${f.requirement?.region})\n`;
  }

  if (duplicates.length > 0) {
    report += '\n---------------------------------------------------\n';
    report += isDe
      ? `ENTFERNTE DUPLIKATE (${duplicates.length} redundante Dateien übersprungen):\n`
      : `ELIMINATED DUPLICATES (${duplicates.length} redundant files skipped):\n`;
    report += '---------------------------------------------------\n';
    for (const f of duplicates.slice(0, 150)) {
      report += `[-] ${f.sourceRelativePath}\n`;
      report += `    ${isDe ? 'Grund' : 'Reason'}: ${f.duplicateReason || (isDe ? 'Duplikat' : 'Duplicate')}\n`;
    }
    if (duplicates.length > 150) {
      report += isDe
        ? `... und ${duplicates.length - 150} weitere Duplikate.\n`
        : `... and ${duplicates.length - 150} more duplicates.\n`;
    }
  }

  if (extras.length > 0) {
    report += '\n---------------------------------------------------\n';
    report += isDe
      ? `VERWORFENE EXTRAS & BEIFANG (${extras.length} Dateien beim Export ignoriert):\n`
      : `DISCARDED EXTRAS & NON-BIOS (${extras.length} files ignored on export):\n`;
    report += '---------------------------------------------------\n';
    for (const f of extras.slice(0, 100)) {
      report += `[x] ${f.sourceFilename} (${(f.size / 1024).toFixed(1)} KB) - ${f.inferredSystem}\n`;
    }
    if (extras.length > 100) {
      report += isDe
        ? `... und ${extras.length - 100} weitere Dateien ignoriert.\n`
        : `... and ${extras.length - 100} more non-BIOS files ignored.\n`;
    }
  }

  return report;
}

/**
 * Copies BIOS files to a new directory.
 * Deduplicates files and prevents messy nested directory cloning.
 */
export async function exportBiosToDirectory(
  files: ScannedBiosFile[],
  targetDirHandle: any,
  options: BiosExportOptions = { includeExtras: false, removeDuplicates: true },
  onProgress?: (current: number, total: number, path: string) => void
): Promise<{ copiedCount: number; errors: string[] }> {
  let copiedCount = 0;
  const errors: string[] = [];

  const removeDups = options.removeDuplicates !== false;
  const filesToExport = files.filter((f) => {
    if (removeDups && (f.status === 'duplicate' || f.isDuplicateOf)) {
      return false;
    }
    if (options.onlyExtras) {
      return !f.requirement && Boolean(f.targetPath);
    }
    if (!options.includeExtras) {
      return Boolean(f.requirement);
    }
    return Boolean(f.targetPath);
  });

  for (let i = 0; i < filesToExport.length; i++) {
    const item = filesToExport[i];
    if (onProgress) {
      onProgress(i + 1, filesToExport.length, item.targetPath);
    }

    try {
      let destDirHandle = targetDirHandle;

      // Handle standard target subpaths (e.g. "dc/dc_boot.bin" or "_extra_bios/Sony/...")
      const parts = item.targetPath.split('/');
      const filename = parts.pop()!;

      for (const dirName of parts) {
        if (dirName) {
          destDirHandle = await destDirHandle.getDirectoryHandle(dirName, { create: true });
        }
      }

      // Write target file
      const newFileHandle = await destDirHandle.getFileHandle(filename, { create: true });
      const writable = await newFileHandle.createWritable();
      const arrayBuffer = await item.sourceFile.arrayBuffer();
      await writable.write(arrayBuffer);
      await writable.close();
      copiedCount++;
    } catch (err: any) {
      console.error('Failed to copy BIOS file', item.targetPath, err);
      errors.push(`${item.targetPath}: ${err.message || 'Error writing file'}`);
    }
  }

  // Create README report in root
  try {
    const readmeHandle = await targetDirHandle.getFileHandle('README_BIOS.txt', { create: true });
    const writable = await readmeHandle.createWritable();
    await writable.write(generateReadmeReport(files, options));
    await writable.close();
  } catch (e) {
    // Non-fatal
  }

  return { copiedCount, errors };
}

/**
 * Generates a clean, portable ZIP archive of deduplicated files.
 * Uses STORE compression (no memory-heavy DEFLATE loop) and skips giant files > 80MB in browser.
 */
export async function exportBiosToZip(
  files: ScannedBiosFile[],
  options: BiosExportOptions = { includeExtras: false, removeDuplicates: true },
  onProgress?: (percent: number, currentFile: string) => void
): Promise<{ blob: Blob; skippedLargeFiles: string[] }> {
  const zip = new JSZip();

  const removeDups = options.removeDuplicates !== false;
  const filesToExport = files.filter((f) => {
    if (removeDups && (f.status === 'duplicate' || f.isDuplicateOf)) {
      return false;
    }
    if (options.onlyExtras) {
      return !f.requirement && Boolean(f.targetPath);
    }
    if (!options.includeExtras) {
      return Boolean(f.requirement);
    }
    return Boolean(f.targetPath);
  });

  // Calculate total size to prevent V8 out-of-memory crash
  const MAX_BROWSER_ZIP_TOTAL = 500 * 1024 * 1024; // 500 MB safe limit
  const MAX_SINGLE_FILE_SIZE = 80 * 1024 * 1024; // 80 MB per file limit

  let totalSize = 0;
  for (const f of filesToExport) {
    totalSize += f.size;
  }

  const isDe = options.language === 'de';

  if (totalSize > MAX_BROWSER_ZIP_TOTAL) {
    throw new Error(
      isDe
        ? `Die ausgewählte Sammlung ist mit ca. ${Math.round(totalSize / 1048576)} MB zu groß für den Browser-Arbeitsspeicher (Chrome-Tab-Limit ~1.5 GB). Bitte nutze das 1-Klick-Batch-Skript (.bat) direkt auf deiner Festplatte!`
        : `The selected collection is too large (~${Math.round(totalSize / 1048576)} MB) for browser memory limits. Please use the 1-Click Batch script (.bat) directly on disk!`
    );
  }

  const skippedLargeFiles: string[] = [];

  for (let i = 0; i < filesToExport.length; i++) {
    const item = filesToExport[i];
    if (onProgress) {
      const pct = Math.round(((i + 1) / filesToExport.length) * 75);
      onProgress(pct, item.targetPath);
    }

    // Skip individual giant files (e.g. CD images, full 200MB PS3 updates) that would crash JSZip
    if (item.size > MAX_SINGLE_FILE_SIZE) {
      skippedLargeFiles.push(`${item.targetPath} (${Math.round(item.size / 1048576)} MB)`);
      continue;
    }

    try {
      const arrayBuffer = await item.sourceFile.arrayBuffer();
      zip.file(item.targetPath, arrayBuffer);
    } catch (e) {
      console.warn('Could not read file for zip', item.sourceFilename, e);
    }
  }

  let readmeText = generateReadmeReport(files, options);
  if (skippedLargeFiles.length > 0) {
    readmeText += `\n\n=======================================================\n`;
    readmeText += isDe
      ? `HINWEIS: FOLGENDE RIESIGE DATEIEN (>80 MB) WURDEN IM BROWSER-ZIP ÜBERSPRUNGEN\n(Bitte nutze für diese Dateien das 1-Klick-Kopierskript):\n`
      : `NOTICE: THE FOLLOWING MASSIVE FILES (>80 MB) WERE SKIPPED IN BROWSER ZIP\n(Please use the 1-Click script to copy these files):\n`;
    for (const s of skippedLargeFiles) {
      readmeText += `- ${s}\n`;
    }
    readmeText += `=======================================================\n`;
  }

  zip.file('README_BIOS.txt', readmeText);

  // Use compression STORE to avoid double-buffering and heavy CPU/memory load in browser
  const blob = await zip.generateAsync(
    { type: 'blob', compression: 'STORE' },
    (metadata) => {
      if (onProgress) {
        const finalizeMsg = isDe ? 'Finalisiere sauberes ZIP-Archiv...' : 'Finalizing clean ZIP archive...';
        onProgress(75 + Math.round(metadata.percent * 0.25), finalizeMsg);
      }
    }
  );

  return { blob, skippedLargeFiles };
}

/**
 * Generates command line script for Windows or Linux/macOS
 */
export function generateBiosScript(
  files: ScannedBiosFile[],
  platform: 'windows' | 'unix',
  options: BiosExportOptions = { includeExtras: false, removeDuplicates: true }
): string {
  const isDe = options.language === 'de';
  const removeDups = options.removeDuplicates !== false;
  const filesToExport = files.filter((f) => {
    if (removeDups && (f.status === 'duplicate' || f.isDuplicateOf)) {
      return false;
    }
    if (options.onlyExtras) {
      return !f.requirement && Boolean(f.targetPath);
    }
    if (!options.includeExtras) {
      return Boolean(f.requirement);
    }
    return Boolean(f.targetPath);
  });

  const isWin = platform === 'windows';

  let script = '';
  if (isWin) {
    script += '@echo off\n';
    script += 'chcp 65001 >nul\n';
    script += 'echo ==================================================\n';
    script += 'echo      RetroArch / Batocera Clean BIOS Organizer   \n';
    script += 'echo ==================================================\n\n';
    script += 'set DEST=Clean_BIOS\n';
    script += 'if not exist "%DEST%" mkdir "%DEST%"\n\n';

    for (const f of filesToExport) {
      const destPath = f.targetPath.replace(/\//g, '\\');
      const lastSlash = destPath.lastIndexOf('\\');
      if (lastSlash > -1) {
        const sub = destPath.substring(0, lastSlash);
        script += `if not exist "%DEST%\\${sub}" mkdir "%DEST%\\${sub}"\n`;
      }
      script += `copy "${f.sourceRelativePath.replace(/\//g, '\\')}" "%DEST%\\${destPath}" /Y >nul\n`;
    }

    const doneMsg = isDe
      ? 'Fertig! Saubere BIOS-Dateien wurden nach %DEST% kopiert (Duplikate & Extras entfernt).'
      : 'Done! Clean BIOS files copied to %DEST% (duplicates & extras removed).';
    script += `\necho ${doneMsg}\npause\n`;
  } else {
    script += '#!/usr/bin/env bash\n';
    script += '# RetroArch / Batocera Clean BIOS Organizer\nset -e\n\n';
    script += 'DEST="Clean_BIOS"\nmkdir -p "$DEST"\n\n';

    for (const f of filesToExport) {
      const parts = f.targetPath.split('/');
      parts.pop();
      if (parts.length > 0) {
        script += `mkdir -p "$DEST/${parts.join('/')}"\n`;
      }
      script += `cp "${f.sourceRelativePath}" "$DEST/${f.targetPath}"\n`;
    }

    const doneMsg = isDe
      ? 'Fertig! Saubere BIOS-Dateien wurden nach $DEST kopiert (Duplikate & Extras entfernt).'
      : 'Done! Clean BIOS files copied to $DEST (duplicates & extras removed).';
    script += `\necho "${doneMsg}"\n`;
  }

  return script;
}
