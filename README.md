<div align="center">

# 🕹️ Retro ROM Collection Manager & 3D Box Studio

**The ultimate browser-based curation suite for retro gaming enthusiasts, handheld emulators, and digital archivists.**  
Organize, clean, and enrich your entire ROM library with **1G1R curation**, **multi-disk M3U automation**, **No-Intro naming standards**, and a realistic **3D Box Art Studio** — powered by **React 19**, **Tailwind CSS v4**, and optional **Gemini 3.8 Flash** AI metadata cleansing.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.1-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Gemini API](https://img.shields.io/badge/Gemini_API-3.8_Flash-8E75B2?logo=google&logoColor=white)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)

[Features](#-key-features) • [Workflow](#-how-it-works) • [Supported Platforms](#-supported-platforms) • [3D Box Studio](#-3d-box-art-studio) • [Getting Started](#-getting-started) • [Privacy & Security](#-privacy--local-first)

---

</div>

## 🌟 Key Features

### 🛡️ 1. 1G1R (1 Game 1 ROM) Smart Curation
* **Region Hierarchy Engine**: Automatically filters out duplicate regional dumps based on your preferred order (e.g. `EUR (DE/EN) > USA > JPN`).
* **Revision Hierarchy**: Automatically selects the latest official revision (e.g. `v1.2` over `v1.0` or `Rev A` over standard release).
* **Fan-Translation & ROM Hack Shield**: Protects customized ROMs, fan translations, and prototypes from being mistakenly flagged as duplicates.
* **Non-Destructive Quarantine**: Duplicates are never permanently deleted; instead, they are moved safely into a designated `_Duplicates/` subfolder.

### 💿 2. Multi-Disk & Automatic `.m3u` Playlist Generator
* **Automatic Multi-Disk Detection**: Detects matching discs and disks across patterns like `(Disc 1)`, `(Disk 2 of 4)`, `(CD1)`, `_Disk1`, etc.
* **Clean Subfolder Isolation**: Moves multi-disk images into a clean subfolder (e.g., `/Final Fantasy VII (Disks)/`) to eliminate UI clutter on handheld devices.
* **Root `.m3u` Generation**: Automatically generates ready-to-run `.m3u` playlists at the console root, directly compatible with **RetroArch**, **Batocera**, **OnionOS**, **GarlicOS**, **MinUI**, and **ES-DE**.
* **Sidecar File Preservation**: Detects and bundles associated `.cue`, `.bin`, `.chd`, `.sbi`, `.sub`, `.ccd`, and `.gdi` files.

### 🧹 3. No-Intro & GoodTools Cleansing
* **Bracket & Dump Code Stripping**: Removes cluttered GoodTools tags like `[!]`, `[b1]`, `[t1]`, `(U)`, `(E)`, `(J)` while preserving clean canonical game titles.
* **Standardized Filenames**: Generates clean No-Intro-compliant filenames (e.g., `Super Mario World (Europe).sfc`).
* **Batch Renaming Preview**: Real-time diff preview shows original paths vs. proposed target names before anything is touched on disk.

### 🎨 4. Real-Time 3D Box Art Studio
* **Interactive 3D Viewport**: Render photorealistic 3D game covers directly in the browser with full orbital controls (rotate, pan, zoom).
* **Physical Materials & Lighting**: Customizable spine thickness, plastic sheen, matte finishes, corner bevels, edge highlights, and floor shadow reflections.
* **Platform Presets**: Tailored aspect ratios and casing models for **SNES**, **Genesis / Mega Drive**, **Game Boy / GBA**, **PS1 (Jewel & Double Cases)**, **Amiga Big Box**, and more.
* **Batch Export & 3D Downscaling**: Generate 3D box renders from 2D flat covers with single-click PNG/WebP exports and optional ZIP packaging.

### 🤖 5. AI-Assisted Metadata Enrichment (Gemini 3.8 Flash)
* **Unstructured ROM Identification**: Decodes obscure, abbreviated, or corrupt dump names that regular regex parsers fail to identify.
* **Platform & Genre Classification**: Detects target platforms, primary genres, and approximate release years.
* **Top 200 Classic Badging**: Tags recognized all-time retro classics for curated highlight lists and easy sorting.

### 🔒 6. 100% Local & Privacy-First
* **Client-Side File System Access**: Scans and renames files directly on your local drive or SD card via the HTML5 File System Access API.
* **Zero Uploads**: No game binaries or personal disk files are ever transmitted to any external server.

---

## 🚀 How It Works

```text
  [ ROM Folder / SD Card ]
             │
             ▼
   Local Client Scanner (Browser)
   ├── Platform & Extension Detection (60+ Consoles)
   ├── Companion File Pairing (.cue, .bin, .chd, .sbi)
   └── Multi-Disk Pattern Matching
             │
             ├──► 1G1R Curation Engine (Priority: Language > Revision > Dump Quality)
             │        └─► Isolates redundant dumps into `_Duplicates/`
             │
             ├──► Multi-Disk Automation
             │        ├─► Isolates Discs into `/<Game> (Disks)/`
             │        └─► Creates root `/<Game>.m3u`
             │
             ├──► No-Intro Clean Renamer
             │        └─► Strips tags [!], formats canonical titles
             │
             ├──► 3D Box Art Studio
             │        └─► Transforms 2D covers into realistic 3D box renders
             │
             └──► Gemini 3.8 Flash Metadata Assistant (Optional)
                      └─► Resolves messy hacks, genres & Top 200 tags
```

---

## 🎮 Supported Platforms

The manager includes dedicated detection profiles for **over 60 retro systems**:

| Category | Systems & Formats |
|---|---|
| **Nintendo** | NES (`.nes`, `.fds`), SNES (`.sfc`, `.smc`), N64 (`.z64`, `.n64`), Game Boy (`.gb`), Game Boy Color (`.gbc`), Game Boy Advance (`.gba`), Nintendo DS (`.nds`), Nintendo 3DS (`.3ds`, `.cia`), GameCube (`.iso`, `.rvz`, `.ciso`), Wii (`.wfs`, `.iso`), Virtual Boy (`.vb`), Pokemon Mini (`.min`) |
| **Sega** | Master System (`.sms`), SG-1000 (`.sg`), Mega Drive / Genesis (`.md`, `.gen`, `.smd`), Sega CD / Mega-CD (`.chd`, `.cue`, `.iso`), 32X (`.32x`), Game Gear (`.gg`), Saturn (`.chd`, `.cue`, `.iso`), Dreamcast (`.gdi`, `.chd`, `.cdi`), Naomi |
| **Sony** | PlayStation 1 (`.chd`, `.cue`, `.bin`, `.pbp`, `.iso`), PlayStation 2 (`.iso`, `.chd`, `.gz`), PlayStation Portable (`.iso`, `.cso`, `.pbp`), PS Vita (`.vpk`) |
| **Home Computers** | Commodore 64 (`.d64`, `.t64`, `.prg`, `.crt`), Amiga (`.adf`, `.ipf`, `.dms`, `.lha`, `.hdf`), Atari ST (`.st`, `.stx`, `.msa`), ZX Spectrum (`.tap`, `.tzx`, `.z80`, `.sna`), Amstrad CPC (`.dsk`, `.cpr`), MSX / MSX2 (`.rom`, `.dsk`), MS-DOS (`.exe`, `.com`, `.iso`), Sharp X68000 (`.dim`, `.xdf`) |
| **Arcade & Others** | MAME / FBNeo / FBA (`.zip`, `.7z`), Neo Geo (`.zip`, `.neo`), Neo Geo CD (`.chd`, `.cue`), Neo Geo Pocket / Color (`.ngp`, `.ngc`), PC Engine / TurboGrafx-16 (`.pce`), PC Engine CD (`.chd`, `.cue`), Atari 2600/5200/7800/Jaguar/Lynx, Wonderswan / Color, 3DO, ColecoVision, Vectrex, PICO-8 |

---

## 🎨 3D Box Art Studio

The integrated 3D Box Studio allows you to create authentic 3D box shots for emulators, frontends (ES-DE, Pegasus, Daijishō, RetroArch), and personal showcases:

* **Interactive Controls**: Drag to orbit, right-click to pan, scroll to zoom.
* **Spine & Side Profiles**: Realistic box depth simulation based on real-world console cartridge and CD jewel cases.
* **Lighting & Shaders**: Specular highlights, customizable environmental radiance, floor contact shadow, and ambient reflection.
* **Presets Included**:
  * 🎴 **Cartridge Boxes**: SNES (Horizontal), NES (Vertical), Genesis (Clamshell Plastic Grid), Game Boy / GBA (Square/Mini).
  * 💿 **Disc Jewel Cases**: Standard CD (Single & Multi-Disc Fatbox for PS1/Saturn), DVD keepcases (PS2/GameCube/Xbox).
  * 💾 **Classic Big Boxes**: Amiga & PC Big Box packaging with matte cardboard textures.
* **High-Resolution Rendering**: Export crisp transparent PNGs at 1x, 2x, or 4x scale.

---

## 💻 Tech Stack

* **Frontend Framework**: [React 19](https://react.dev/) + [TypeScript 5.8](https://www.typescriptlang.org/)
* **Build Tooling**: [Vite 6](https://vitejs.dev/) + [ESBuild](https://esbuild.github.io/)
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (modern CSS-first configuration, frosted glass aesthetic)
* **Animations & Icons**: [Motion](https://motion.dev/) & [Lucide React](https://lucide.dev/)
* **3D Graphics**: HTML5 Canvas & WebGL with custom perspective projection and lighting pipeline
* **Backend Server**: [Express](https://expressjs.com/) with native TypeScript bundling via `tsx`
* **AI Engine**: [@google/genai SDK](https://github.com/google-gemini/deprecations) with `gemini-3.8-flash`
* **Archive Utility**: [JSZip](https://stuk.github.io/jszip/) for client-side batch packaging

---

## 📦 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (version 18 or higher recommended)
* A modern browser with support for the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) (Chrome, Edge, Opera, or Chromium-based browsers)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/retro-rom-manager.git
   cd retro-rom-manager
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment (Optional for Gemini AI features):**
   Copy the example environment file and add your Google Gemini API key:
   ```bash
   cp .env.example .env
   ```
   Edit `.env`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   *(Note: The core curation, multi-disk bundling, 1G1R deduplication, and 3D Box Studio work 100% offline without an API key!)*

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000`.

5. **Build for Production:**
   ```bash
   npm run build
   npm start
   ```

---

## 📁 Output Folder Structure Example

When processing a multi-disk game or curated collection, the manager organizes files as follows:

```text
📁 /ROMS/PS1/
├── 📄 Final Fantasy VII.m3u              <-- Autogenerated root playlist (run in emulator)
├── 📁 Final Fantasy VII (Disks)/          <-- Disc images isolated in clean subfolder
│   ├── 💿 Final Fantasy VII (Disc 1).chd
│   ├── 💿 Final Fantasy VII (Disc 2).chd
│   └── 💿 Final Fantasy VII (Disc 3).chd
├── 🎮 Metal Gear Solid (Europe).chd      <-- Cleaned 1G1R canonical file
└── 📁 _Duplicates/                        <-- Safe quarantine (non-destructive)
    ├── Metal Gear Solid (USA) (Rev 1).chd
    └── Metal Gear Solid (Japan) [!].chd
```

---

## 🔒 Privacy & Local-First Guarantee

* **No ROM Uploads**: ROM image files (which can be hundreds of megabytes or gigabytes) are processed **entirely within your browser** using local file pointers.
* **Safe Operations**: Renaming operations can be dry-run tested with diff previews before execution.
* **Non-Destructive**: Redundant files are moved to `_Duplicates/` instead of being unrecoverably deleted.

---

## 🤝 Contributing

Contributions, feature requests, and bug reports are welcome!
Feel free to open an issue or submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<div align="center">
  <sub>Crafted with ❤️ for retro gaming collectors, handheld modders, and preservationists worldwide.</sub>
</div>
