# Nasazení na Render

Projekt je připravený jako Node web service:

- frontend: `index.html`
- backend: `server.js`
- AI návrhy přes backend
- ukládání dat:
  - primárně `Google Sheets`, pokud jsou nastavené Google proměnné
  - fallback do `data/app-state.json`

## 1. Co nahrát do repozitáře

Do GitHub repozitáře nahrajte celý obsah složky:

- `index.html`
- `server.js`
- `package.json`
- `package-lock.json`
- `render.yaml`
- složku `data` s `.gitkeep`

## 2. Vytvoření služby v Render

V Render:

1. `New +`
2. `Blueprint`
3. připojit GitHub repozitář
4. Render načte `render.yaml`

Tím se vytvoří:

- `Web Service`
- persistentní disk připojený do `/var/data`

## 3. Jak to ukládá data

Server zkouší ukládat takto:

1. `Google Sheets`
2. pokud Google Sheets nejsou nastavené nebo selžou, tak fallback do:
   `/var/data/app-state.json`

Frontend si zároveň nechává nouzovou kopii i v `localStorage`.

## 4. Gemini API klíč

Do Render služby nastavte v `Environment` tajnou proměnnou:

`GEMINI_API_KEY`

Frontend už klíč neobsahuje ani neukládá. AI návrhy jdou přes backend.

## 5. Google Sheets nastavení

Do Render služby nastavte:

- `GOOGLE_SHEETS_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SHEETS_STATE_TAB=AppState`

Poznámka:

- `GOOGLE_PRIVATE_KEY` vložte celý, včetně `-----BEGIN PRIVATE KEY-----`
- pokud v Renderu zadáte víceřádkový klíč, backend si poradí i s variantou, kde jsou nové řádky uložené jako `\n`

## 6. Důležité poznámky

- tato verze zatím nemá přihlášení uživatelů
- AI volání běží přes backend
- ukládání do Google Sheets je levný mezikrok, ne ideální finální databáze

## 7. Lokální spuštění

```powershell
npm install
npm start
```

Potom otevřít:

`http://localhost:3000`
