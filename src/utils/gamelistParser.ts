/**
 * Parser for EmulationStation / Batocera / RetroPie / OnionOS gamelist.xml
 * Extracts mapping between ROM filenames and target image/cover paths so that
 * generated 3D covers can be named exactly as the frontend expects.
 */

export interface GamelistEntry {
  romPath: string; // e.g. "./Super Mario World (USA).sfc" or "Super Mario World (USA).sfc"
  romFilename: string; // e.g. "Super Mario World (USA).sfc"
  romBaseName: string; // e.g. "Super Mario World (USA)"
  gameName: string; // e.g. "Super Mario World"
  imagePath?: string; // e.g. "./images/Super Mario World (USA)-image.png"
  imageFilename?: string; // e.g. "Super Mario World (USA)-image.png"
  thumbnailPath?: string; // e.g. "./covers/Super Mario World (USA).png"
  thumbnailFilename?: string; // e.g. "Super Mario World (USA).png"
}

export interface GamelistParseResult {
  entries: GamelistEntry[];
  romNameToImageMap: Map<string, string>; // lowercase rom name/basename -> expected image filename
  gameNameToImageMap: Map<string, string>; // lowercase game title -> expected image filename
  totalGames: number;
  totalWithImages: number;
  xmlFilename: string;
}

/**
 * Extracts filename from path (e.g. "./images/smw-image.png" -> "smw-image.png")
 */
function extractFilename(pathStr: string): string {
  const normalized = pathStr.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1] || '';
}

/**
 * Strips extension from filename
 */
function stripExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.slice(0, lastDot) : filename;
}

/**
 * Parses a gamelist.xml file content string.
 */
export function parseGamelistXml(xmlText: string, xmlFilename: string = 'gamelist.xml'): GamelistParseResult {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  const entries: GamelistEntry[] = [];
  const romNameToImageMap = new Map<string, string>();
  const gameNameToImageMap = new Map<string, string>();

  const gameNodes = xmlDoc.querySelectorAll('game');
  let totalWithImages = 0;

  gameNodes.forEach((node) => {
    const pathNode = node.querySelector('path');
    const nameNode = node.querySelector('name');
    const imageNode = node.querySelector('image');
    const thumbNode = node.querySelector('thumbnail');

    const romPath = pathNode?.textContent?.trim() || '';
    if (!romPath) return;

    const romFilename = extractFilename(romPath);
    const romBaseName = stripExtension(romFilename);
    const gameName = nameNode?.textContent?.trim() || romBaseName;

    const imagePath = imageNode?.textContent?.trim();
    const imageFilename = imagePath ? extractFilename(imagePath) : undefined;

    const thumbnailPath = thumbNode?.textContent?.trim();
    const thumbnailFilename = thumbnailPath ? extractFilename(thumbnailPath) : undefined;

    const targetImageName = imageFilename || thumbnailFilename;

    if (targetImageName) {
      totalWithImages++;
      // Map exact rom filename (e.g. "super mario world (usa).sfc")
      romNameToImageMap.set(romFilename.toLowerCase(), targetImageName);
      // Map rom basename (e.g. "super mario world (usa)")
      romNameToImageMap.set(romBaseName.toLowerCase(), targetImageName);
      // Map clean game name (e.g. "super mario world")
      if (gameName) {
        gameNameToImageMap.set(gameName.toLowerCase(), targetImageName);
      }
    }

    entries.push({
      romPath,
      romFilename,
      romBaseName,
      gameName,
      imagePath,
      imageFilename,
      thumbnailPath,
      thumbnailFilename,
    });
  });

  return {
    entries,
    romNameToImageMap,
    gameNameToImageMap,
    totalGames: entries.length,
    totalWithImages,
    xmlFilename,
  };
}

/**
 * Finds the expected cover image filename for a given cover or ROM from the parsed gamelist.
 */
export function resolveCoverFilenameFromGamelist(
  coverFilename: string,
  gamelist: GamelistParseResult | null
): string | null {
  if (!gamelist) return null;

  const baseName = stripExtension(coverFilename).toLowerCase();
  const lowerCover = coverFilename.toLowerCase();

  // 1. Direct match by ROM base name or exact filename
  if (gamelist.romNameToImageMap.has(lowerCover)) {
    return gamelist.romNameToImageMap.get(lowerCover)!;
  }
  if (gamelist.romNameToImageMap.has(baseName)) {
    return gamelist.romNameToImageMap.get(baseName)!;
  }

  // 2. Direct match by clean game title
  if (gamelist.gameNameToImageMap.has(baseName)) {
    return gamelist.gameNameToImageMap.get(baseName)!;
  }

  // 3. Match without region tags / brackets
  const cleanBase = baseName.replace(/\s*\([^)]*\)/g, '').replace(/\s*\[[^\]]*\]/g, '').trim();
  if (cleanBase && gamelist.gameNameToImageMap.has(cleanBase)) {
    return gamelist.gameNameToImageMap.get(cleanBase)!;
  }

  return null;
}
