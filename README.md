# ⚡ BLITZ

PDM-fokussierter Email-Client für das [group-pdm](https://github.com/fioressi/group-pdm) Ökosystem.

Emails aus Microsoft 365 / Exchange direkt im PDM-Kontext verwalten — Triage per Swipe und Action-Buttons, Verknüpfungen zu Tasks, Purchase Orders und Projekten per Drag & Drop, KI-Unterstützung via Igor, geräteübergreifende State-Sync via Azure SQL.

**Live:** https://victorious-bush-0a2200403.7.azurestaticapps.net

---

## Features

### Triage
- **Fünf Tabs** — Posteingang / Gelesen / Beantworten / Merken / Gesendet mit farbigen Badge-Counts
- **4 Action-Buttons** pro Email-Karte: 🗑 Löschen · ✓ Gelesen · ↩ Beantworten · ★ Merken
- **Swipe** links → Löschen, rechts → Gelesen (alternativ zu Buttons)
- **Kein Reload-Spam** — bereits verarbeitete Emails werden beim Laden herausgefiltert

### Email verfassen & Antworten
- **ComposeModal** — Fenster für neue Emails und Antworten (To / CC / Betreff / Body)
- **HTML-Zitat** — Originalmail bei Antworten mit Absender-Header als formatierter Quote
- **Graph API Senden** — direkt via `POST /me/sendMail`, speichert in Outlook SentItems
- **Gesendet-Tab** — zeigt ausschließlich mit Blitz gesendete Antworten (aus PDM_db)

### Igor KI-Assistent
- **AI-Panel** in der Email-Ansicht (gelber 🤖 Button in der Toolbar)
  - Zusammenfassen, Übersetzen (DE), Aufgaben extrahieren, Antwort entwerfen
  - Freier Prompt — eigene Anfragen an Igor
  - KI-Antwort direkt in Antwort-Fenster einfügen
- **Entitäten vorschlagen** — Igor analysiert die Email und schlägt passende Projekte/POs/Tasks vor
  - Validierung gegen bekannte Entitäts-IDs (keine falschen Vorschläge)
  - Ein-Klick-Verknüpfung der Vorschläge mit der Email
- **KI-Toolbar** im Compose-Fenster: Antwort entwerfen / Übersetzen / Verbessern
- **Sicher** — API-Key liegt server-seitig in Azure, nie im Frontend-Bundle

### PDM-Verknüpfung
- **Drag & Drop** — Projekte, POs, Tasks von Attribut-Panels auf Email-Karte ziehen
- **Gespeichert in DB** — `dbo.EMAILS + dbo.EMAIL_LINKS` via pdm-api (Azure Functions + Azure SQL)
- **Geteilt sichtbar** — verknüpfte Emails für alle PDM-User sichtbar (z.B. in Access-Forms)
- **Link-Tags** — Verknüpfte Objekte als Pills auf der Karte und im Detail-Modal
- **Links persistent** — nach Reload weiterhin sichtbar (localStorage-Cache + DB)

### Attribut-Detail
- **↗ Button** auf jeder Attribut-Karte → Detail-Modal (Projekt/PO/Task)
- Zeigt Name, Code, Status, Assignee, Beschreibung
- Edit-Formular für Projekte und Tasks (benötigt pdm-api Detail-Endpunkte)

### Erstellen
- **Neues Projekt** (linkes Panel `+`) — legt Eintrag in `dbo.PROJECTS` an, generiert Projektcode (H26xxx)
- **Neuer Task** (rechtes Panel `+`) — legt Eintrag in `dbo.TASKS` an, synct zu SharePoint PDM-Liste

### Geräteübergreifende Sync
- **Alle Triage-Status** (Löschen/Gelesen/Merken/Beantworten) werden in `dbo.EMAIL_USER_STATES` gespeichert
- **Stabile User-ID** — `localAccountId` (Entra ID OID UUID) statt Username für zuverlässige cross-device Identifikation
- **Hybrid-Persistenz** — localStorage als schneller Cache, DB als Quelle der Wahrheit
- Auf neuem Browser/Gerät: States werden beim Laden aus DB wiederhergestellt

### Design
- **HERPERT Design Language** — konsistent mit web-probe (group-pdm)
- Dunkles Theme, Glassmorphism-Panels, Inter Font, Cyan Accent `#66d9ef`
- **Responsive** — Attribut-Panels als Slide-in Drawer auf Mobile (< 768px)
- Email-Detail als Bottom Sheet auf Mobile

### Auth
- **Microsoft Login** — MSAL OAuth (PKCE, SPA) mit Entra ID
- Jeder User sieht nur sein eigenes Postfach (Graph API mit eigenem Token)

---

## Stack

| Schicht | Technologie |
|---------|-------------|
| Frontend | React 19 + TypeScript, Vite 8 |
| Animationen | framer-motion v12 (Swipe-Gesten) |
| Drag & Drop | @dnd-kit/core v6 (Attribut → Email-Karte) |
| Auth | @azure/msal-browser v5 + @azure/msal-react v5 |
| Email-Daten | Microsoft Graph API (direkt, kein Proxy) |
| KI-Assistent | Igor (via pdm-api Proxy, API-Key server-seitig) |
| PDM-Backend | pdm-api — Azure Functions Python v2 |
| Datenbank | Azure SQL `PDM_db` (via pdm-api) |
| Hosting | Azure Static Web Apps (Free Tier, GitHub Actions CI/CD) |

---

## Setup

### Voraussetzungen

- Node.js 20+
- Microsoft 365 Account im Tenant `02a50c76-4445-4435-89d3-e6e871f29342`

### Installation

```bash
git clone https://github.com/fioressi/blitz
cd blitz
npm install
```

### Konfiguration

`.env` Datei anlegen (Vorlage: `.env.example`):

```env
VITE_AAD_CLIENT_ID=a1627a40-18ee-4461-a75a-cca6a4608fd4
VITE_AAD_TENANT_ID=02a50c76-4445-4435-89d3-e6e871f29342
```

### Starten

```bash
npm run dev
# http://localhost:5173
```

---

## Architektur

```
Browser (React/TS)
  ├── Microsoft Graph API    → Emails laden + senden (Bearer Token des eingeloggten Users)
  ├── MSAL                   → Auth (Entra ID, PKCE)
  └── pdm-api (Azure Func)   → Attribute, Email-Links, User-States, Igor-Proxy
        ├── Azure SQL PDM_db → dbo.EMAILS, dbo.EMAIL_LINKS, dbo.EMAIL_USER_STATES,
        │                      dbo.TASKS, dbo.PROJECTS
        └── Igor KI          → igor.fioresi.cloud (API-Key in Azure App Settings)
```

Siehe [docs/architecture.md](docs/architecture.md) für Details.

---

## Deployment

Automatisches CI/CD via GitHub Actions (`.github/workflows/deploy.yml`):

```
Push auf master
  → npm run build (mit AAD-Secrets aus GitHub Secrets)
  → Azure Static Web Apps Deploy
  → https://victorious-bush-0a2200403.7.azurestaticapps.net
```

**GitHub Secrets benötigt:**
- `VITE_AAD_CLIENT_ID`
- `VITE_AAD_TENANT_ID`
- `AZURE_STATIC_WEB_APPS_API_TOKEN`

**pdm-api deployen** (manuell, kein CI/CD):
```powershell
cd ..\group-pdm\api
func azure functionapp publish pdm-api --python
```

**Azure App Settings (pdm-api):**
- `IGOR_API_KEY` — muss in Azure Portal → pdm-api → Konfiguration gesetzt werden

---

## Verwandte Projekte

- [group-pdm](https://github.com/fioressi/group-pdm) — PDM-Backend (pdm-api), Access-Forms, web-probe (HERPERT)
