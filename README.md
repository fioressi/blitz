# ⚡ BLITZ

PDM-fokussierter Email-Client für das [group-pdm](https://github.com/fioressi/group-pdm) Ökosystem.

Emails aus Microsoft 365 / Exchange direkt im PDM-Kontext verwalten — Verknüpfungen zu Tasks, Purchase Orders und Projekten per Drag & Drop.

**Live:** https://victorious-bush-0a2200403.7.azurestaticapps.net

---

## Features

### Triage
- **Drei Tabs** — Posteingang / Gelesen / Beantworten mit Badge-Counts
- **Swipe links** → Email dauerhaft ausblenden (ID in `localStorage`)
- **Swipe rechts** → als gelesen markieren (bleibt im Gelesen-Tab auch nach Reload)
- **Kein Reload-Spam** — bereits verarbeitete Emails werden beim erneuten Laden herausgefiltert

### PDM-Verknüpfung
- **Drag & Drop** — Projekte, POs, Tasks von Attribut-Panels auf Email-Karte ziehen
- **Gespeichert in DB** — `dbo.EMAILS + dbo.EMAIL_LINKS` via pdm-api (Azure Functions + Azure SQL)
- **Geteilt sichtbar** — verknüpfte Emails für alle PDM-User sichtbar (z.B. in Access-Forms)
- **Link-Tags** — Verknüpfte Objekte als Pills auf der Karte und im Detail-Modal

### Erstellen
- **Neues Projekt** (linkes Panel `+`) — legt Eintrag in `dbo.PROJECTS` an, generiert Projektcode (H26xxx)
- **Neuer Task** (rechtes Panel `+`) — legt Eintrag in `dbo.TASKS` an, synct zu SharePoint PDM-Liste

### Beantworten
- **Reply-Tray** — Email per Drag auf den unteren Balken → markiert als "zu beantworten"
- **Beantworten-Tab** — Übersicht aller noch offenen Reply-Emails als volle Karten

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
  ├── Microsoft Graph API    → Emails laden (Bearer Token des eingeloggten Users)
  ├── MSAL                   → Auth (Entra ID, PKCE)
  └── pdm-api (Azure Func)   → Attribute laden, Email-Links speichern
        └── Azure SQL PDM_db → dbo.EMAILS, dbo.EMAIL_LINKS, dbo.TASKS, dbo.PROJECTS
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

---

## Verwandte Projekte

- [group-pdm](https://github.com/fioressi/group-pdm) — PDM-Backend (pdm-api), Access-Forms, web-probe (HERPERT)
