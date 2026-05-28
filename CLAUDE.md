# BLITZ — Claude Context

## Was ist Blitz?

Blitz ist ein PDM-fokussierter Email-Client (Web-App) für das group-pdm Ökosystem.
Emails werden über Microsoft Graph API geladen und können direkt mit PDM-Objekten
(Tasks, POs, Projekte) verknüpft werden.

**Repo:** `C:\Users\MatthaeusUnger\source\repos\blitz`
**GitHub:** `https://github.com/fioressi/blitz`
**Dev-Server:** `npm run dev` → `http://localhost:5173`

## Stack

- **Frontend:** React 19 + TypeScript (Vite 8)
- **Animationen:** framer-motion v12 (Swipe-Gesten)
- **Drag & Drop:** @dnd-kit/core v6 (Attribut-Karten → Email-Karten)
- **Auth:** @azure/msal-browser v5 + @azure/msal-react v5
- **Email-Backend:** Microsoft Graph API (direkt vom Frontend, kein Proxy)
- **PDM-Backend:** pdm-api Azure Functions (`https://pdm-api.azurewebsites.net`)
- **Datenbank:** Azure SQL `neutronzenker.database.windows.net / PDM_db` (via pdm-api)

## Azure AD App Registration

- **App Name:** blitz
- **Client ID:** `a1627a40-18ee-4461-a75a-cca6a4608fd4`
- **Tenant ID:** `02a50c76-4445-4435-89d3-e6e871f29342`
- **Auth-Typ:** loginRedirect (PKCE SPA), kein Client Secret
- **Redirect URI:** `http://localhost:5173`
- **Scopes:** `User.Read`, `Mail.Read`, `Mail.ReadWrite`, `Mail.Send`, `Contacts.Read`

## Kern-UX-Konzept

Drei-Spalten-Layout:
- **Links:** Attribut-Panels (Projekte, Purchase Orders) — per Drag & Drop auf Email-Karten ziehen
- **Mitte:** Email-Karten (Posteingang)
  - Swipe links → als gelöscht markieren (nicht in DB)
  - Swipe rechts → als gelesen markieren (noch nicht in DB — kein Target)
  - Drag Attribut auf Karte → verknüpfen + in dbo.EMAILS/dbo.EMAIL_LINKS speichern
  - Klick → Detail-Ansicht (Modal)
- **Rechts:** Attribut-Panels (Tasks)
- **Unten:** Reply-Tray (Email hierher ziehen → als "zu beantworten" markieren)

### Drag & Drop Architektur

Zwei parallele Systeme:
1. **framer-motion** auf `motion.div` — freies elastisches Drag für Swipe-Gesten
2. **@dnd-kit** — Drop-Zonen auf Email-Karten + Drag-Handle im Reply-Tray + `DragOverlay`

`DragOverlay` von @dnd-kit sorgt dafür, dass Attribut-Karten frei über allen Containern
schweben. CSS-Klasse `.card-dragging` setzt `overflow: visible` auf alle Panels wenn eine
Email-Karte gezogen wird.

## pdm-api Endpunkte

| Methode | Pfad | Zweck |
|---------|------|-------|
| `GET` | `/api/search?type=PROJECT\|ORDER\|TASK` | Attribut-Panels befüllen |
| `POST` | `/api/emails` | Email + Link in DB anlegen |
| `GET` | `/api/emails/by-message?messageId=...` | Bestehende Links beim Öffnen laden |

`SKIP_AUTH=1` ist in Azure gesetzt → kein Bearer Token nötig in Phase 1.

## Datenmodell in PDM_db

```sql
dbo.EMAILS       -- MessageId, Subject, FromAddr, SentAt, Kind, LinkedBy, LinkedAt
dbo.EMAIL_LINKS  -- EmailId, EntityType (PROJECT|ORDER|TASK|...), EntityId
```

## Lokaler Start

```powershell
cd C:\Users\MatthaeusUnger\source\repos\blitz
cp .env.example .env   # wenn noch nicht vorhanden
npm install
npm run dev
# Öffne http://localhost:5173
```

## Env-Variablen (.env)

```
VITE_AAD_CLIENT_ID=a1627a40-18ee-4461-a75a-cca6a4608fd4
VITE_AAD_TENANT_ID=02a50c76-4445-4435-89d3-e6e871f29342
```

## Verwandte Repos

- **group-pdm:** `C:\Users\MatthaeusUnger\source\repos\group-pdm` — PDM-Backend (pdm-api) + Access-Forms
- **Honey Badger:** `C:\Users\MatthaeusUnger\source\repos\fioressi\honey-badger`
