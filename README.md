# ⚡ BLITZ

PDM-fokussierter Email-Client für das [group-pdm](https://github.com/fioressi/group-pdm) Ökosystem.

Emails aus Microsoft 365 / Exchange direkt im PDM-Kontext verwalten — Verknüpfungen zu Tasks, Purchase Orders und Projekten per Drag & Drop.

## Features (Phase 1)

- **Posteingang** — Emails aus Microsoft Graph API
- **Swipe-Triage** — Links löschen, rechts behalten (wird in DB gespeichert)
- **Attribut-Verknüpfung** — Drag & Drop von Projekten, POs, Tasks auf Email-Karten
- **Geteilte Sichtbarkeit** — Verknüpfte Emails für alle PDM-User sichtbar
- **Reply-Tray** — Emails als "zu beantworten" markieren
- **Microsoft Login** — MSAL OAuth mit Entra ID

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

`.env` Datei anlegen:

```
VITE_AAD_CLIENT_ID=a1627a40-18ee-4461-a75a-cca6a4608fd4
VITE_AAD_TENANT_ID=02a50c76-4445-4435-89d3-e6e871f29342
```

### Starten

```bash
npm run dev
# http://localhost:5173
```

## Architektur

```
Browser (React/TS)
  ├── Microsoft Graph API    → Emails, Kontakte
  ├── MSAL                   → Auth (Entra ID)
  └── pdm-api (Azure Func)   → Email-Links in PDM_db speichern
```

Siehe [docs/architecture.md](docs/architecture.md) für Details.

## Roadmap

Siehe [docs/roadmap.md](docs/roadmap.md).

## Verwandte Projekte

- [group-pdm](../group-pdm) — PDM-Backend, Access-Forms, Azure SQL
