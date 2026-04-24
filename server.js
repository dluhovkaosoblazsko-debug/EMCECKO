const express = require("express");
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const app = express();
const port = process.env.PORT || 3000;
const dataDir = process.env.DATA_DIR || path.join(__dirname, "data");
const dataFile = path.join(dataDir, "app-state.json");
const geminiApiKey = process.env.GEMINI_API_KEY || "";

const sheetsId = process.env.GOOGLE_SHEETS_ID || "";
const sheetsTab = process.env.GOOGLE_SHEETS_STATE_TAB || "AppState";
const googleClientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
const googlePrivateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

fs.mkdirSync(dataDir, { recursive: true });

app.use(express.json({ limit: "10mb" }));
app.use(express.static(__dirname));

function isSheetsConfigured() {
  return Boolean(sheetsId && googleClientEmail && googlePrivateKey);
}

function getGoogleAuth() {
  return new google.auth.JWT({
    email: googleClientEmail,
    key: googlePrivateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
}

function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getGoogleAuth() });
}

async function ensureStateSheet() {
  const sheets = getSheetsClient();
  const metadata = await sheets.spreadsheets.get({ spreadsheetId: sheetsId });
  const exists = (metadata.data.sheets || []).some(
    sheet => sheet.properties?.title === sheetsTab
  );

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetsId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetsTab
              }
            }
          }
        ]
      }
    });
  }

  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetsId,
    range: `${sheetsTab}!A1:B2`
  }).catch(() => ({ data: { values: [] } }));

  const rows = headerResponse.data.values || [];
  const firstRow = rows[0] || [];
  const secondRow = rows[1] || [];

  if (!firstRow[0] || !firstRow[1] || !secondRow[0]) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetsId,
      range: `${sheetsTab}!A1:B2`,
      valueInputOption: "RAW",
      requestBody: {
        values: [
          ["key", "value"],
          ["appState", secondRow[1] || ""]
        ]
      }
    });
  }
}

async function readStateFromSheets() {
  await ensureStateSheet();
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetsId,
    range: `${sheetsTab}!A2:B2`
  });

  const row = response.data.values?.[0] || [];
  const raw = row[1] || "";
  return raw ? JSON.parse(raw) : {};
}

async function writeStateToSheets(state) {
  await ensureStateSheet();
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetsId,
    range: `${sheetsTab}!A2:B2`,
    valueInputOption: "RAW",
    requestBody: {
      values: [["appState", JSON.stringify(state || {})]]
    }
  });
}

function readStateFromFile() {
  if (!fs.existsSync(dataFile)) {
    return {};
  }
  const raw = fs.readFileSync(dataFile, "utf8");
  return raw ? JSON.parse(raw) : {};
}

function writeStateToFile(state) {
  fs.writeFileSync(dataFile, JSON.stringify(state || {}, null, 2), "utf8");
}

async function readState() {
  if (isSheetsConfigured()) {
    try {
      return await readStateFromSheets();
    } catch (error) {
      console.error("Sheets read failed, falling back to file storage:", error);
    }
  }
  return readStateFromFile();
}

async function writeState(state) {
  if (isSheetsConfigured()) {
    try {
      await writeStateToSheets(state);
      return { backend: "google-sheets" };
    } catch (error) {
      console.error("Sheets write failed, falling back to file storage:", error);
    }
  }
  writeStateToFile(state);
  return { backend: "file" };
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    storage: isSheetsConfigured() ? "google-sheets" : "file"
  });
});

app.get("/api/state", async (_req, res) => {
  try {
    const state = await readState();
    return res.json(state);
  } catch (error) {
    console.error("GET /api/state failed:", error);
    return res.status(500).json({ error: "Nepodařilo se načíst uložený stav." });
  }
});

app.put("/api/state", async (req, res) => {
  try {
    const result = await writeState(req.body || {});
    return res.json({ ok: true, savedAt: new Date().toISOString(), backend: result.backend });
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
