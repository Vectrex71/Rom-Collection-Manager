import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY ist auf dem Server nicht konfiguriert.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
    });
  });

  // AI analysis endpoint for messy/unidentified ROM names
  app.post("/api/ai/analyze-roms", async (req, res) => {
    try {
      const rawRoms = req.body?.roms;

      if (!rawRoms || !Array.isArray(rawRoms) || rawRoms.length === 0) {
        return res.status(400).json({ error: "Keine ROM-Dateien zur Analyse übergeben." });
      }

      // Normalize input rom entries (handle filename or rawFilename)
      const roms = rawRoms.map((r: any, idx: number) => ({
        id: String(r.id || `rom_${idx}`),
        filename: String(r.filename || r.rawFilename || "Unknown_ROM"),
        currentPlatform: String(r.currentPlatform || r.platform || "unknown"),
      }));

      const ai = getAIClient();

      const prompt = `You are an expert retro video game archivist and ROM cataloging specialist adhering to No-Intro and GoodTools naming conventions.
Analyze the following list of ${roms.length} ROM file entries (which may contain messy dumps, hacks, abbreviations, dump codes like [!], (U), (E), (J), v1.1, etc.).

ROM entries to analyze:
${JSON.stringify(roms.map((r, i) => ({ index: i, id: r.id, filename: r.filename, platform: r.currentPlatform || "unknown" })), null, 2)}

For each ROM, provide:
1. "id": the matching input id
2. "canonicalTitle": The official, recognizable game title without region codes or file extensions (e.g., "Super Mario World", "Chrono Trigger")
3. "cleanNoIntroFilename": The standardized clean No-Intro filename with standard region and revision (e.g. "Super Mario World (USA).sfc" or "The Legend of Zelda - A Link to the Past (USA).sfc")
4. "platform": The canonical platform code ("AMSTRAD_CPC", "C64", "AMIGA", "ZX_SPECTRUM", "ATARI_ST", "MSX", "SNES", "NES", "N64", "GBA", "GBC", "GB", "GENESIS", "MASTERSYSTEM", "GAMEGEAR", "PS1", "PS2", "PSP", "NDS", "GAMECUBE", "SATURN", "DREAMCAST", "PCE", "NEOGEO", "MAME", or "OTHER")
5. "targetFolder": Suggested clean folder name (e.g. "SNES", "Sega Genesis", "Game Boy Advance")
6. "genres": Array of 1 to 3 genre tags (e.g., ["Platformer", "Adventure"], ["RPG"])
7. "releaseYear": approximate release year (number or null)
8. "isTop200Candidate": boolean (true if widely regarded as an all-time classic or top 200 retro game candidate)
9. "variantType": "Official Release" | "Revision" | "Beta/Prototype" | "ROM Hack/Translation" | "Bad Dump" | "Unknown"
10. "confidence": "high" | "medium" | "low"

Respond with ONLY valid, parseable JSON matching this schema:
{
  "results": [
    {
      "id": "...",
      "canonicalTitle": "...",
      "cleanNoIntroFilename": "...",
      "platform": "...",
      "targetFolder": "...",
      "genres": ["..."],
      "releaseYear": 1992,
      "isTop200Candidate": true,
      "variantType": "Official Release",
      "confidence": "high"
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const text = response.text || "{}";
      const parsed = JSON.parse(text);
      const rawResults = Array.isArray(parsed.results) ? parsed.results : [];

      // Normalize results so both cleanFilename and cleanNoIntroFilename exist
      const enrichedResults = rawResults.map((item: any) => {
        const matchingInput = roms.find((r) => r.id === item.id);
        const cleanName = item.cleanNoIntroFilename || item.cleanFilename || item.canonicalTitle || "";
        return {
          ...item,
          rawFilename: matchingInput?.filename || item.rawFilename || "",
          cleanFilename: cleanName,
          cleanNoIntroFilename: cleanName,
        };
      });

      res.json({
        success: true,
        results: enrichedResults,
        analyzed: enrichedResults,
      });
    } catch (err: any) {
      console.error("Error analyzing ROMs with Gemini:", err);
      const isKeyMissing = !process.env.GEMINI_API_KEY;
      res.status(isKeyMissing ? 503 : 500).json({
        error: isKeyMissing
          ? "GEMINI_API_KEY ist auf dem Server nicht konfiguriert."
          : err.message || "Fehler bei der KI-Analyse",
      });
    }
  });

  // AI custom Top ROM search and suggestion endpoint
  app.post("/api/ai/suggest-top-list", async (req, res) => {
    try {
      const { platform, count = 20 } = req.body as { platform?: string; count?: number };
      const ai = getAIClient();

      const prompt = `Provide an authoritative list of top retro video games ${platform ? `for ${platform}` : "across all 8-bit to 32/64-bit retro consoles"} (up to ${Math.min(count, 50)} items).
For each game include:
- "rank": 1-based ranking
- "title": Standard canonical title
- "platform": Console code (SNES, NES, N64, GBA, GBC, GB, GENESIS, PS1, NDS)
- "genre": primary genre
- "year": release year
- "searchKeywords": array of alternative titles, acronyms, or regional titles (e.g. ["smw", "super mario 4", "super mario world"])
- "description": 1 concise sentence explaining why it's iconic.

Respond with ONLY valid JSON:
{
  "topGames": [
    {
      "rank": 1,
      "title": "...",
      "platform": "...",
      "genre": "...",
      "year": 1995,
      "searchKeywords": ["..."],
      "description": "..."
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });

      const text = response.text || "{}";
      res.json(JSON.parse(text));
    } catch (err: any) {
      console.error("Error generating top list with Gemini:", err);
      res.status(500).json({
        error: err.message || "Failed to generate top list",
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ROM Collection Manager server running on http://localhost:${PORT}`);
  });
}

startServer();
