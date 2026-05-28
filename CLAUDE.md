# BLITZ — Claude Context

## Was ist Blitz?

PDM-fokussierter Email-Client (React Web-App) für das group-pdm Ökosystem.
Emails aus Microsoft 365 direkt im PDM-Kontext verwalten — Triage per Swipe/Button,
Verknüpfung zu Projekten/POs/Tasks per Drag & Drop, geräteübergreifende State-Sync via DB.

**Repo (lokal):** `C:\Users\MatthaeusUnger\source\repos\blitz`
**GitHub:** `https://github.com/fioressi/blitz`
**Live:** `https://victorious-bush-0a2200403.7.azurestaticapps.net`
**Dev-Server:** `npm run dev` → `http://localhost:5173`
**CI/CD:** Push auf `master` → GitHub Actions → Azure Static Web Apps

## Stack

| Schicht | Technologie |
|---------|-------------|
| Frontend | React 19 + TypeScript, Vite 8 |
| Animationen | framer-motion v12 (Swipe-Gesten) |
| Drag & Drop | @dnd-kit/core v6 |
| Auth | @azure/msal-browser v5 + @azure/msal-react v5 |
| Email-Daten | Microsoft Graph API (direkt, kein Proxy) |
| PDM-Backend | pdm-api — Azure Functions Python v2 |
| Datenbank | Azure SQL `neutronzenker.database.windows.net / PDM_db` |
| Hosting | Azure Static Web Apps (Free Tier) |

## Azure AD App Registration

- **Client ID:** `a1627a40-18ee-4461-a75a-cca6a4608fd4`
- **Tenant ID:** `02a50c76-4445-4435-89d3-e6e871f29342`
- **Auth-Typ:** SPA Platform, loginRedirect (PKCE), kein Client Secret
- **Redirect URIs:** `http://localhost:5173`, `https://victorious-bush-0a2200403.7.azurestaticapps.net`
- **Scopes:** `User.Read`, `Mail.Read`, `Mail.ReadWrite`, `Mail.Send`, `Contacts.Read`

## Kern-UX — Drei-Spalten-Layout

```
┌─────────────────┬──────────────────────────┬────────────────┐
│  PROJEKTE  [+]  │  Tabs: Inbox/Gelesen/     │  TASKS    [+]  │
│  PO-26000079    │  Beantworten/Merken       │  Task 1        │
│  PO-26000078    │                           │  Task 2    [↗] │
│  H22001     [↗] │  ┌─ Email-Karte ────────┐ │                │
│                 │  │ Fabian Eberwein       │ │                │
│                 │  │ Betreff...            │ │                │
│                 │  │ Preview...            │ │                │
│                 │  │ [Löschen][Gelesen]    │ │                │
│                 │  │ [Beantworten][Merken] │ │                │
│                 │  └───────────────────────┘ │                │
├─────────────────┴──────────────────────────┴────────────────┤
│  ↩ ZU BEANTWORTEN   (Drop-Zone + Reply-Tray)                │
└──────────────────────────────────────────────────────────────┘
```

## Email-Lebenszyklus & Status

Jede Email hat einen Status: `'unread' | 'read' | 'deleted' | 'to-reply' | 'saved'`

| Aktion | Status | Tabs |
|--------|--------|------|
| Standard | `unread` | Posteingang |
| Button "Gelesen" / Swipe rechts | `read` | Gelesen |
| Button "Löschen" / Swipe links | gefiltert | nirgends |
| Button/Drag "Beantworten" | `to-reply` | Beantworten |
| Button "Merken" | `saved` | Merken |

## State-Persistenz — Hybrid localStorage + DB

**localStorage** (schneller Cache, offline-fähig):

| Key | Inhalt | Zweck |
|-----|--------|-------|
| `blitz_dismissed` | `string[]` | Gelöschte Message-IDs |
| `blitz_read` | `string[]` | Gelesene Message-IDs |
| `blitz_saved` | `string[]` | Gemerkte Message-IDs |
| `blitz_reply` | `string[]` | Zu-beantworten Message-IDs |
| `blitz_links` | `Record<messageId, EmailLink[]>` | Attribut-Links pro Email |

**Datenbank** (geräteübergreifend, autoritativ):
- `dbo.EMAIL_USER_STATES` — Status pro User+MessageId (DISMISSED/READ/SAVED/REPLY)
- `dbo.EMAILS` + `dbo.EMAIL_LINKS` — Email-Attribut-Verknüpfungen (geteilt, alle PDM-User)

**Lade-Reihenfolge:**
1. localStorage sofort anwenden (schnelle erste Render)
2. Graph API + `GET /api/email-states` parallel fetchen
3. DB-States überschreiben localStorage (autoritativ, cross-device)

## pdm-api Endpunkte (alle genutzten)

Base URL: `https://pdm-api.azurewebsites.net/api`
Auth: `SKIP_AUTH=1` in Azure → kein Bearer Token nötig (Phase 1)
User-Identifikation: `user` Parameter im Request-Body/-Query (MSAL `accounts[0].username`)

| Methode | Pfad | Zweck |
|---------|------|-------|
| `GET` | `/search?type=PROJECT\|ORDER\|TASK` | Attribut-Panels befüllen |
| `POST` | `/emails` | Email + PDM-Link in DB anlegen (idempotent) |
| `GET` | `/emails/by-message?messageId=...` | Email-Detail + alle Links |
| `POST` | `/tasks` | Neuen Task anlegen (SharePoint-Sync) |
| `POST` | `/projects` | Neues Projekt anlegen (H26xxx Code) |
| `GET` | `/email-states?user={email}` | Alle User-States laden (cross-device) |
| `POST` | `/email-states` | Status setzen `{messageId, status, user}` |
| `DELETE` | `/email-states` | Status löschen `{messageId, user}` |

## Datenbank-Tabellen (PDM_db)

```sql
-- Email + Links (geteilt, alle PDM-User sehen das)
dbo.EMAILS       (EmailId, MessageId UNIQUE, Subject, FromAddr, SentAt, Kind, LinkedBy, LinkedAt)
dbo.EMAIL_LINKS  (EmailId FK, EntityType, EntityId) PK(EmailId, EntityType, EntityId)

-- Per-User Triage-Status (geräteübergreifende Sync)
dbo.EMAIL_USER_STATES (
    UserEmail   NVARCHAR(320),
    MessageId   NVARCHAR(998),
    Status      NVARCHAR(20) CHECK IN ('DISMISSED','READ','SAVED','REPLY'),
    UpdatedAt   DATETIME2,
    PK (UserEmail, MessageId)  -- ein Status pro User+Email, mutually exclusive
)
```

## Frontend Komponenten (`src/components/`)

| Komponente | Zweck |
|------------|-------|
| `EmailCard/` | Swipeable Karte mit 4 Action-Buttons (Löschen/Gelesen/Beantworten/Merken) |
| `AttributePanel/` | Draggable Listen (Projekte/POs links, Tasks rechts) mit `+` und `↗` Button |
| `AttributeDetail/` | Detail-Modal beim Klick auf `↗` — zeigt Felder, erlaubt Bearbeiten |
| `ReplyTray/` | Unterer Drop-Balken, expandiert beim Drag, zeigt Reply-Emails als Pills |
| `EmailDetail/` | Modal beim Klick auf Email-Karte (HTML-Body, Anhänge, Links) |
| `CreateModal/` | Formular für neuen Task oder neues Projekt |

## Drag & Drop Architektur (WICHTIG)

**Zwei parallele Systeme — Konfliktlösung kritisch:**

1. **framer-motion** `drag` auf `motion.div` — Swipe-Gesten (links/rechts) auf Email-Karten
2. **@dnd-kit** `useDraggable/useDroppable` — Attribut-Karten → Email-Karten, Reply-Handle → Tray

**Konflikt-Fix 1 (Swipe vs. Reply-Handle):**
- Reply/Beantworten-Button im EmailCard: `onPointerDown stopPropagation` verhindert framer-motion Swipe
- Wenn dnd-kit aktiv (`isDndDragging === true`): framer-motion `drag={false}` gesetzt

**Konflikt-Fix 2 (dnd-kit vs. onClick auf Attribut-Karten):**
- dnd-kit `PointerSensor` kappert `onPointerDown` → `onClick` auf demselben Element feuert nicht
- Fix: `<button>` Element für Detail-Aktion verwenden — dnd-kit erkennt interaktive Elemente
  und überspringt Drag-Aktivierung wenn Ziel ein `<button>` ist
- Resultat: kleiner `↗` Button erscheint beim Hover, öffnet `AttributeDetail` Modal

**dnd-kit Sensor-Konfiguration:**
```typescript
useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
```

## Design System — HERPERT

Konsistent mit `web-probe` (group-pdm):

```css
:root {
  --bg: #101928;
  --panel: rgba(255,255,255,.07);       /* Glassmorphism */
  --panel-hover: rgba(255,255,255,.11);
  --line: rgba(255,255,255,.13);
  --text: #edf4ff;
  --muted: #aab8ca;
  --accent: #66d9ef;   /* Cyan */
  --green: #8ee28e;
  --yellow: #ffd166;
  --red: #f87171;
}
body { background: radial-gradient(circle at top, #1e3350, var(--bg) 65%); }
```

Font: Inter (Google Fonts), backdrop-filter blur auf Panels.

## Wichtige Implementierungsdetails

### localStorage Helpers (App.tsx)

```typescript
const LS_DISMISSED = 'blitz_dismissed'; // string[] IDs
const LS_READ      = 'blitz_read';
const LS_SAVED     = 'blitz_saved';
const LS_REPLY     = 'blitz_reply';
const LS_LINKS     = 'blitz_links';     // Record<msgId, EmailLink[]>

function getStoredIds(key): Set<string>
function addStoredId(key, id)
function removeStoredId(key, id)
function getStoredLinks(): Record<string, EmailLink[]>
function addStoredLink(messageId, link: EmailLink)
```

### State-Sync Pattern

Alle Handler schreiben sofort lokal (UI reagiert sofort) und rufen API fire-and-forget:
```typescript
const handleSwipeLeft = (id: string) => {
  addStoredId(LS_DISMISSED, id);           // sofort lokal
  if (user?.username)
    setEmailState(id, 'DISMISSED', user.username).catch(console.error); // async DB
  setEmails(prev => prev.filter(e => e.id !== id));
};
```

### AttributeDetail Modal

- Öffnet sich über `↗` Button auf Attribut-Karten (Button-Element umgeht dnd-kit)
- Fetcht `GET /api/projects/{id}` oder `/tasks/{id}` oder `/orders/{id}`
- Diese Endpunkte existieren noch NICHT in pdm-api → Modal zeigt was vorhanden, kein Crash
- Edit-Form ruft `PUT /api/projects/{id}` / `PUT /api/tasks/{id}` — ebenfalls noch nicht implementiert
- **TODO:** Detail + Update Endpunkte in pdm-api (group-pdm) implementieren

## Lokaler Start

```powershell
cd C:\Users\MatthaeusUnger\source\repos\blitz
npm install
npm run dev   # → http://localhost:5173
```

`.env` (Vorlage: `.env.example`):
```
VITE_AAD_CLIENT_ID=a1627a40-18ee-4461-a75a-cca6a4608fd4
VITE_AAD_TENANT_ID=02a50c76-4445-4435-89d3-e6e871f29342
```

## pdm-api deployen (group-pdm Repo)

```powershell
cd C:\Users\MatthaeusUnger\source\repos\group-pdm\api
func azure functionapp publish pdm-api --python
```

**Kein CI/CD** für group-pdm — manuell deployen nach Änderungen an `function_app.py`.

## Migrations-Skripte (group-pdm Root)

```powershell
cd C:\Users\MatthaeusUnger\source\repos\group-pdm
$env:PDM_SQL_SERVER   = "neutronzenker.database.windows.net"
$env:PDM_SQL_DATABASE = "PDM_db"
& "api\.venv\Scripts\python.exe" add_email_user_states_table.py  # bereits ausgeführt
```

## Verwandte Repos

- **group-pdm:** `C:\Users\MatthaeusUnger\source\repos\group-pdm`
  - `api/function_app.py` — alle pdm-api Endpunkte
  - `api/pdm_db.py` — DB-Verbindung (Azure Managed Identity)
  - `api/local.settings.json` — lokale Env-Vars (PDM_SQL_SERVER, SKIP_AUTH=1)
- **Blitz:** `C:\Users\MatthaeusUnger\source\repos\blitz` (dieses Repo)

## Offene TODOs

1. **AttributeDetail API** — `GET/PUT /api/projects/{id}`, `GET/PUT /api/tasks/{id}`, `GET /api/orders/{id}` in pdm-api implementieren
2. **Email-Links cross-device** — Links sind in localStorage gecacht, aber anderer Browser sieht sie erst beim Email-Öffnen (loadEmailLinks). Bulk-Endpunkt `GET /api/email-links-by-user?user=...` wäre die Lösung
3. **pdm-api Auth aktivieren** — `SKIP_AUTH=1` entfernen, Bearer Token vom MSAL-Frontend übergeben
4. **Attachment-Download** — Graph API Download-Link in Email-Detail
5. **Email verfassen** — Compose-Fenster (Antworten, Neu, Weiterleiten)
