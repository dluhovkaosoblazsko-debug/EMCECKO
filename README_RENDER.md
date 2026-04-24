# Nasazení na Render

Projekt je připravený jako Node web service:

- frontend: `index.html`
- backend: `server.js`
- ukládání dat: `data/app-state.json`

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

Server ukládá celý stav aplikace do souboru:

`/var/data/app-state.json`

Pokud server není dostupný, aplikace si nechá nouzovou kopii i v `localStorage`.

## 4. Gemini API klíč

Do Render služby nastavte v `Environment` tajnou proměnnou:

`GEMINI_API_KEY`

Frontend už klíč neobsahuje ani neukládá. AI návrhy jdou přes backend.

## 5. Důležité poznámky

- tato verze zatím nemá přihlášení uživatelů
- AI volání už běží přes backend
- JSON soubor je vhodný jako první verze; pro více uživatelů bude lepší databáze

## 6. Lokální spuštění

```powershell
npm install
npm start
```

Potom otevřít:

`http://localhost:3000`
