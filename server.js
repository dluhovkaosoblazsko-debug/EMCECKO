const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;
const dataDir = process.env.DATA_DIR || path.join(__dirname, "data");
const dataFile = path.join(dataDir, "app-state.json");
const geminiApiKey = process.env.GEMINI_API_KEY || "";

fs.mkdirSync(dataDir, { recursive: true });

app.use(express.json({ limit: "10mb" }));
app.use(express.static(__dirname));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/state", (_req, res) => {
  try {
    if (!fs.existsSync(dataFile)) {
      return res.json({});
    }
    const raw = fs.readFileSync(dataFile, "utf8");
    return res.json(raw ? JSON.parse(raw) : {});
  } catch (error) {
    console.error("GET /api/state failed:", error);
    return res.status(500).json({ error: "Nepodařilo se načíst uložený stav." });
  }
});

app.put("/api/state", (req, res) => {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(req.body || {}, null, 2), "utf8");
    return res.json({ ok: true, savedAt: new Date().toISOString() });
  } catch (error) {
    console.error("PUT /api/state failed:", error);
    return res.status(500).json({ error: "Nepodařilo se uložit stav." });
  }
});

app.post("/api/ai/draft", async (req, res) => {
  try {
    if (!geminiApiKey) {
      return res.status(503).json({ error: "Na serveru není nastaven GEMINI_API_KEY." });
    }

    const prompt = String(req.body?.prompt || "").trim();
    const model = String(req.body?.model || "gemini-2.5-flash").trim() || "gemini-2.5-flash";

    if (!prompt) {
      return res.status(400).json({ error: "Chybí prompt pro AI návrh." });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 300
        }
      })
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("POST /api/ai/draft upstream failed:", response.status, body);
      return res.status(502).json({ error: "Gemini API vrátilo chybu." });
    }

    const data = await response.json();
    const text = (data?.candidates || [])
      .flatMap(candidate => candidate?.content?.parts || [])
      .map(part => String(part?.text || ""))
      .join(" ")
      .trim();

    return res.json({ text });
  } catch (error) {
    console.error("POST /api/ai/draft failed:", error);
    return res.status(500).json({ error: "Nepodařilo se získat AI návrh." });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, () => {
  console.log(`Mosty v rodině běží na portu ${port}`);
});
