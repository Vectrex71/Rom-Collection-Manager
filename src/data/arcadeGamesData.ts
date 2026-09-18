/**
 * Arcade & MAME Protection Dataset & Helpers
 * Maps technical 8-character Arcade/MAME ROM filenames (e.g. sf2.zip, tmnt.zip)
 * to human-readable game titles, while strictly protecting the technical zip filename
 * so that Arcade emulators (MAME, FinalBurn Neo, FB Alpha) can load the ROMs without errors.
 */

export const ARCADE_ROM_MAP: Record<string, string> = {
  // Capcom Play System (CPS1, CPS2, CPS3)
  sf2: 'Street Fighter II: The World Warrior',
  sf2ce: "Street Fighter II': Champion Edition",
  sf2hf: "Street Fighter II' Turbo: Hyper Fighting",
  ssf2: 'Super Street Fighter II: The New Challengers',
  ssf2t: 'Super Street Fighter II Turbo',
  sfa: 'Street Fighter Alpha: Warriors’ Dreams',
  sfa2: 'Street Fighter Alpha 2',
  sfa3: 'Street Fighter Alpha 3',
  sfiii: 'Street Fighter III: New Generation',
  sfiii2: 'Street Fighter III 2nd Impact: Giant Attack',
  sfiii3: 'Street Fighter III 3rd Strike: Fight for the Future',
  captcomm: 'Captain Commando',
  ffight: 'Final Fight',
  kod: 'The King of Dragons',
  knights: 'Knights of the Round',
  wof: 'Warriors of Fate',
  punisher: 'The Punisher',
  cadillacs: 'Cadillacs and Dinosaurs',
  dndsom: 'Dungeons & Dragons: Shadow over Mystara',
  dndtod: 'Dungeons & Dragons: Tower of Doom',
  avsp: 'Alien vs. Predator',
  armwar: 'Armored Warriors',
  cybots: 'Cyberbots: Fullmetal Madness',
  ringdest: 'Ring of Destruction: Slammasters II',
  slammast: 'Saturday Night Slam Masters',
  megaman: 'Mega Man: The Power Battle',
  megaman2: 'Mega Man 2: The Power Fighters',
  msh: 'Marvel Super Heroes',
  mshvsf: 'Marvel Super Heroes vs. Street Fighter',
  mvc: 'Marvel vs. Capcom: Clash of Super Heroes',
  mvsc: 'Marvel vs. Capcom: Clash of Super Heroes',
  xmvsf: 'X-Men vs. Street Fighter',
  xmcota: 'X-Men: Children of the Atom',
  vampj: 'Vampire: The Night Warriors',
  vsav: 'Vampire Savior: The Lord of Vampire',
  vsav2: 'Vampire Savior 2: The Lord of Vampire',
  vhunt2: 'Vampire Hunter 2: Darkstalkers Revenge',
  nwarr: 'Night Warriors: Darkstalkers’ Revenge',
  strider: 'Strider',
  ghouls: "Ghouls 'n Ghosts",
  daimakai: "Dai Makai-Mura (Ghouls 'n Ghosts)",
  mercs: 'Mercs',
  willow: 'Willow',
  unsquad: 'U.N. Squadron (Area 88)',
  varth: 'Varth: Operation Thunderstorm',
  progear: 'Progear',
  gigawing: 'Giga Wing',
  marsmatr: 'Mars Matrix: Hyper Solid Shooting',
  dimahoo: 'Dimahoo',
  '1941': '1941: Counter Attack',
  '1944': '1944: The Loop Master',
  '19xx': '19XX: The War Against Destiny',

  // Konami Classics & Brawlers
  tmnt: 'Teenage Mutant Ninja Turtles',
  tmnt2: 'Teenage Mutant Ninja Turtles: Turtles in Time',
  simpsons: 'The Simpsons',
  xmen: 'X-Men (4 Players)',
  sunsetbl: 'Sunset Riders',
  cowboys: 'Wild West C.O.W.-Boys of Moo Mesa',
  aliens: 'Aliens',
  bucky: "Bucky O'Hare",
  contra: 'Contra',
  scontra: 'Super Contra',
  vendetta: 'Vendetta (Crime Fighters 2)',
  crimfght: 'Crime Fighters',
  mystwarr: 'Mystic Warriors',
  parodius: 'Parodius DA!',
  gradius: 'Gradius',
  gradius2: 'Gradius II: GOFER no Yabou',
  gradius3: 'Gradius III',
  salamand: 'Salamander (Life Force)',
  gberet: 'Green Beret',
  yiear: 'Yie Ar Kung-Fu',
  trackfld: 'Track & Field',
  hyperath: 'Hyper Athletic',

  // SNK Neo Geo Classics
  mslug: 'Metal Slug: Super Vehicle-001',
  mslug2: 'Metal Slug 2',
  mslugx: 'Metal Slug X',
  mslug3: 'Metal Slug 3',
  mslug4: 'Metal Slug 4',
  mslug5: 'Metal Slug 5',
  kof94: 'The King of Fighters ’94',
  kof95: 'The King of Fighters ’95',
  kof96: 'The King of Fighters ’96',
  kof97: 'The King of Fighters ’97',
  kof98: 'The King of Fighters ’98: The Slugfest',
  kof99: 'The King of Fighters ’99: Millennium Battle',
  kof2000: 'The King of Fighters 2000',
  kof2001: 'The King of Fighters 2001',
  kof2002: 'The King of Fighters 2002: Challenge to Ultimate Battle',
  kof2003: 'The King of Fighters 2003',
  samsho: 'Samurai Shodown',
  samsho2: 'Samurai Shodown II',
  samsho3: 'Samurai Shodown III',
  samsho4: 'Samurai Shodown IV: Amakusa’s Revenge',
  samsho5: 'Samurai Shodown V',
  samsh5sp: 'Samurai Shodown V Special',
  fatfursp: 'Fatal Fury Special',
  rbffspec: 'Real Bout Fatal Fury Special',
  garou: 'Garou: Mark of the Wolves',
  lastblad: 'The Last Blade',
  lastbld2: 'The Last Blade 2',
  aof: 'Art of Fighting',
  aof2: 'Art of Fighting 2',
  aof3: 'Art of Fighting 3: The Path of the Warrior',
  neobombe: 'Neo Bomberman',
  pbobblen: 'Puzzle Bobble (Bust-A-Move)',
  magdrop2: 'Magical Drop II',
  magdrop3: 'Magical Drop III',
  shocktro: 'Shock Troopers',
  shocktr2: 'Shock Troopers: 2nd Squad',
  blazstar: 'Blazing Star',
  pulstar: 'Pulstar',
  twinklestar: 'Twinkle Star Sprites',
  spinmast: 'Spin Master',
  windjams: 'Windjammers (Flying Power Disc)',

  // Midway / Atari / Taito / Namco / Sega Golden Age
  pacman: 'Pac-Man',
  mspacman: 'Ms. Pac-Man',
  galaga: 'Galaga',
  galagan: 'Galaga ’88',
  dkong: 'Donkey Kong',
  dkongjr: 'Donkey Kong Junior',
  dkong3: 'Donkey Kong 3',
  mario: 'Mario Bros.',
  frogger: 'Frogger',
  digdug: 'Dig Dug',
  digdug2: 'Dig Dug II',
  qbert: 'Q*bert',
  centiped: 'Centipede',
  milliped: 'Millipede',
  defender: 'Defender',
  joust: 'Joust',
  robotron: 'Robotron: 2084',
  sinistar: 'Sinistar',
  burgertime: 'BurgerTime',
  mk: 'Mortal Kombat',
  mk2: 'Mortal Kombat II',
  mk3: 'Mortal Kombat 3',
  umk3: 'Ultimate Mortal Kombat 3',
  nbajam: 'NBA Jam',
  nbajamte: 'NBA Jam Tournament Edition',
  rampage: 'Rampage',
  smashw: 'Smash TV',
  paperboy: 'Paperboy',
  gauntlet: 'Gauntlet',
  gaunt2: 'Gauntlet II',
  marble: 'Marble Madness',
  outrun: 'Out Zone / OutRun',
  goldnaxe: 'Golden Axe',
  shinobi: 'Shinobi',
  shadoww: 'Shadow Dancer',
  spacehar: 'Space Harrier',
  hangon: 'Hang-On',
  afterbnd: 'After Burner',
  afterbnd2: 'After Burner II',
  ddragon: 'Double Dragon',
  ddragon2: 'Double Dragon II: The Revenge',
  ddragon3: 'Double Dragon 3: The Rosetta Stone',
  bublbobl: 'Bubble Bobble',
  rainbow: 'Rainbow Islands',
  parasol: 'Parasol Stars',
  elevatob: 'Elevator Action',
  elevatrb: 'Elevator Action Returns',
  snowbros: 'Snow Bros.: Nick & Tom',
  snowbro2: 'Snow Bros. 2: With New Elves',
  raiden: 'Raiden',
  raiden2: 'Raiden II',
  raidenx: 'Raiden DX',
  '1942': '1942',
  '1943': '1943: The Battle of Midway',
  '1943kai': '1943 Kai: Midway Kaisen',
};

/**
 * Checks if a platform is an Arcade/MAME system where filenames must NEVER be renamed.
 */
export function isArcadePlatform(platform: string): boolean {
  const p = platform.toUpperCase();
  return (
    p === 'ARCADE' ||
    p === 'MAME' ||
    p === 'FB_NEO' ||
    p === 'FB_ALPHA' ||
    p === 'CPS1' ||
    p === 'CPS2' ||
    p === 'CPS3' ||
    p === 'CPS' ||
    p === 'NEOGEO' ||
    p === 'NEOGEO_CD'
  );
}

/**
 * Looks up human-readable title for an arcade ROM basename (e.g. "sf2" -> "Street Fighter II").
 */
export function getArcadeTitle(romBasename: string): string | null {
  const clean = romBasename.toLowerCase().replace(/\.zip$/i, '').trim();
  if (ARCADE_ROM_MAP[clean]) {
    return ARCADE_ROM_MAP[clean];
  }
  // Try matching stripped clones (e.g. sf2ceua -> sf2ce)
  for (const [key, title] of Object.entries(ARCADE_ROM_MAP)) {
    if (clean.startsWith(key) && clean.length <= key.length + 3) {
      return title;
    }
  }
  return null;
}
