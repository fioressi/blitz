# BLITZ — Claude Context

## Was ist Blitz?

PDM-fokussierter Email-Client (React Web-App) für das group-pdm Ökosystem.
Emails aus Microsoft 365 direkt im PDM-Kontext verwalten — Triage per Swipe/Button,
Verknüpfung zu Projekten/POs/Tasks per Drag & Drop, KI-Unterstützung via Igor,
geräteübergreifende State-Sync via DB.

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
| KI-Assistent | Igor (via pdm-api Proxy) |
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
│  PO-26000079    │  Beantworten/Merken/      │  Task 1        │
│  PO-26000078    │  Gesendet       ✉         │  Task 2    [↗] │
│  H22001     [↗] │                           │                │
│                 │  ┌─ Email-Karte ────────┐ │                │
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

Header enthält ✉ Button → öffnet ComposeModal (neue Email).

## Email-Lebenszyklus & Status

Jede Email hat einen Status: `'unread' | 'read' | 'deleted' | 'to-reply' | 'saved'`

| Aktion | Status | Tab |
|--------|--------|-----|
| Standard | `unread` | Posteingang |
| Button "Gelesen" / Swipe rechts | `read` | Gelesen |
| Button "Löschen" / Swipe links | gefiltert | nirgends |
| Button/Drag "Beantworten" | `to-reply` | Beantworten |
| Button "Merken" | `saved` | Merken |
| Antwort via ComposeModal gesendet | gespeichert in DB | Gesendet |

## State-Persistenz — Hybrid localStorage + DB

### User-Identifikation (WICHTIG)

**`userId = user.localAccountId`** — stabiles OID UUID aus Entra ID.
NICHT `user.username` (UPN) verwenden — dieser kann geräteabhängig variieren.

```typescript
const userId = user?.localAccountId;  // stabile UUID, identisch auf allen Geräten
```

Alle pdm-api-Aufrufe die einen User-Identifier benötigen verwenden `userId`.

### localStorage (schneller Cache, offline-fähig)

| Key | Inhalt | Zweck |
|-----|--------|-------|
| `blitz_dismissed` | `string[]` | Gelöschte Message-IDs |
| `blitz_read` | `string[]` | Gelesene Message-IDs |
| `blitz_saved` | `string[]` | Gemerkte Message-IDs |
| `blitz_reply` | `string[]` | Zu-beantworten Message-IDs |
| `blitz_links` | `Record<messageId, EmailLink[]>` | Attribut-Links pro Email |

### Datenbank (geräteübergreifend, autoritativ)

- `dbo.EMAIL_USER_STATES` — Status pro User+MessageId (DISMISSED/READ/SAVED/REPLY)
- `dbo.EMAILS` + `dbo.EMAIL_LINKS` — Email-Attribut-Verknüpfungen (geteilt, alle PDM-User)
- `dbo.EMAILS` — auch für Blitz-gesendete Antworten (`LinkedBy = userId`)

### Lade-Reihenfolge

1. localStorage sofort anwenden (schnelle erste Render)
2. Graph API + `GET /api/email-states?user={userId}` parallel fetchen
3. DB-States überschreiben localStorage (autoritativ, cross-device)

### State-Sync Pattern

```typescript
const handleSwipeLeft = (id: string) => {
  addStoredId(LS_DISMISSED, id);         // sofort lokal
  if (userId)
    setEmailState(id, 'DISMISSED', userId).catch(console.error); // async DB
  setEmails(prev => prev.filter(e => e.id !== id));
};
```

## pdm-api Endpunkte (alle genutzten)

Base URL: `https://pdm-api.azurewebsites.net/api`
Auth: `SKIP_AUTH=1` in Azure → kein Bearer Token nötig (Phase 1)
User-ID: `user` Parameter im Request-Body/-Query = `user.localAccountId` aus MSAL

| Methode | Pfad | Zweck |
|---------|------|-------|
| `GET` | `/search?type=PROJECT\|ORDER\|TASK` | Attribut-Panels befüllen |
| `POST` | `/emails` | Email + PDM-Link in DB anlegen (idempotent) |
| `GET` | `/emails/by-message?messageId=...` | Email-Detail + alle Links |
| `GET` | `/emails?user={userId}` | Blitz-gesendete Emails dieses Users |
| `POST` | `/tasks` | Neuen Task anlegen (SharePoint-Sync) |
| `POST` | `/projects` | Neues Projekt anlegen (H26xxx Code) |
| `GET` | `/email-states?user={userId}` | Alle User-States laden (cross-device) |
| `POST` | `/email-states` | Status setzen `{messageId, status, user}` |
| `DELETE` | `/email-states` | Status löschen `{messageId, user}` |
| `POST` | `/igor-ask` | Igor KI-Proxy (sicher, ohne API-Key im Frontend) |

## Igor KI-Integration

### Übersicht

Igor ist ein KI-Assistent der für group-pdm entwickelt wurde.
Blitz kommuniziert mit Igor **ausschließlich** über den pdm-api Proxy (`POST /api/igor-ask`).
Der Igor API Key wird als Azure-Umgebungsvariable `IGOR_API_KEY` in pdm-api gespeichert —
**niemals im Frontend-Bundle, niemals in Logs oder Commits.**

### Proxy-Flow

```
Frontend (igorService.ts)
  → POST /api/igor-ask { question, context?, input? }
  → pdm-api (function_app.py: igor_ask)
      → liest IGOR_API_KEY aus Azure App Settings
      → POST https://igor.fioresi.cloud/api/igor/ask
      → gibt { answer } zurück
  ← { answer: string }
```

### `src/services/igorService.ts`

Zentrale Schnittstelle für alle Igor-Aufrufe:

```typescript
// Basis-Call — alle anderen Funktionen bauen darauf auf
export async function askIgor(opts: {
  question: string;
  emailBody?: string;      // wird automatisch von HTML-Tags bereinigt (max 8000 Zeichen)
  emailSubject?: string;
  context?: string;        // überschreibt emailSubject als Kontext
}): Promise<string>

// Vordefinierte Prompts (vollständig ausformulierte Instruktionen)
export const IGOR_PROMPTS = {
  summarize,   // Zusammenfassung auf Deutsch (Worum/Bullets/Handlungsbedarf)
  translate,   // Vollständige Übersetzung auf Deutsch (kein Präambel)
  tasks,       // Nummerierte Aufgabenliste mit Verantwortlichem und Deadline
  draftReply,  // Antwort-Entwurf (gleiche Sprache, max 150 Wörter, nur Fließtext)
  improve,     // Sprach-/Stilverbesserung (nur verbesserter Text zurück)
}

// Entity-Suggestion: Igor analysiert Email und schlägt passende PDM-Entitäten vor
export async function suggestEntityLinks(opts: {
  emailBody: string;
  emailSubject: string;
  entities: EntitySuggestion[];  // alle geladenen Attribut-Karten als Kontext
}): Promise<EntitySuggestion[]>
// → gibt validierte Teilmenge der bekannten Entitäten zurück (keine Halluzinationen)
```

### Entity-Suggestion Sicherheit

Igor kann Entitäts-IDs halluzinieren. Schutz:
```typescript
const known = new Map(opts.entities.map(e => [`${e.type}:${e.id}`, e]));
return parsed
  .filter(s => s && known.has(`${s.type}:${s.id}`))  // nur bekannte IDs zulassen
  .map(s => known.get(`${s.type}:${s.id}`)!);
```

### EmailDetail AI-Panel

`🤖 KI` Button in der EmailDetail-Toolbar öffnet das AI-Panel (gelb, `#ffd166`):
- **Zusammenfassen / Übersetzen (DE) / Aufgaben / Antwort entwerfen** — Quick-Action Chips
- **Entitäten vorschlagen** — cyan Chip, lädt alle attributeGroups als Kontext → Igor-Analyse → validierte Vorschlag-Chips
- **Eigene Anfrage** — Freitext-Input
- **In Antwort einfügen** — öffnet ComposeModal mit Igor-Antwort als initialen Body

### ComposeModal AI-Toolbar

KI-Toolbar im Compose-Fenster:
- **Entwurf** (nur im Antwort-Modus) — Igor schreibt Antwort auf Basis der Original-Email
- **Übersetzen (DE)** — übersetzt aktuellen Textarea-Inhalt
- **Verbessern** — verbessert Stil/Grammatik des aktuellen Textes

## Email verfassen — ComposeModal

### Komponente: `src/components/ComposeModal/`

Props:
```typescript
interface Props {
  mode: 'new' | 'reply';
  originalEmail?: Email;
  initialBody?: string;          // z.B. Igor-Antwort aus EmailDetail
  instance: IPublicClientApplication;
  account: AccountInfo;
  onClose: () => void;
  onSent?: () => void;           // Callback nach erfolgreichem Senden
}
```

Features:
- An / CC / Betreff Felder, CC ausblendbar
- Textarea Body + AI-Toolbar
- Originalmail als HTML-Quote (bei Antwort)
- Senden via Graph API (`POST /me/sendMail`, `saveToSentItems: true`)
- HTML-Encoding von Plain-Text-Body vor dem Senden

### Gesendet-Tab

- 5. Tab "Gesendet" (erscheint neben Merken)
- Wird lazy-loaded beim ersten Klick
- Quelle: `GET /api/emails?user={userId}` — nur Blitz-gesendete Antworten aus DB
- Beim erfolgreichen Senden: `saveEmailRecord(original, userId)` speichert Original in DB

### Reply-Flow

```
EmailDetail.onReply(email, initialBody?)
  → ComposeModal öffnen (mode='reply', originalEmail, initialBody)
    → User sendet
      → POST /me/sendMail (Graph API)
      → saveEmailRecord(originalEmail, userId) → POST /api/emails (DB)
      → setEmailState(originalEmail.id, 'REPLY', userId) → DB
      → onSent() → Compose schließen
```

## Datenbank-Tabellen (PDM_db)

```sql
-- Email + Links (geteilt, alle PDM-User sehen das)
dbo.EMAILS       (EmailId, MessageId UNIQUE, Subject, FromAddr, SentAt, Kind, LinkedBy, LinkedAt)
dbo.EMAIL_LINKS  (EmailId FK, EntityType, EntityId) PK(EmailId, EntityType, EntityId)

-- Per-User Triage-Status (geräteübergreifende Sync)
dbo.EMAIL_USER_STATES (
    UserEmail   NVARCHAR(320),   -- localAccountId (Entra ID OID UUID)
    MessageId   NVARCHAR(998),
    Status      NVARCHAR(20) CHECK IN ('DISMISSED','READ','SAVED','REPLY'),
    UpdatedAt   DATETIME2,
    PK (UserEmail, MessageId)
)
```

**Hinweis:** `UserEmail` speichert tatsächlich die `localAccountId` (OID UUID), nicht die E-Mail-Adresse.
Der Spaltenname ist historisch und wurde nicht umbenannt.

## Frontend Komponenten (`src/components/`)

| Komponente | Zweck |
|------------|-------|
| `EmailCard/` | Swipeable Karte mit 4 Action-Buttons (Löschen/Gelesen/Beantworten/Merken) |
| `AttributePanel/` | Draggable Listen (Projekte/POs links, Tasks rechts) mit `+` und `↗` Button |
| `AttributeDetail/` | Detail-Modal beim Klick auf `↗` — zeigt Felder, erlaubt Bearbeiten |
| `ReplyTray/` | Unterer Drop-Balken, expandiert beim Drag, zeigt Reply-Emails als Pills |
| `EmailDetail/` | Modal beim Klick auf Email-Karte (HTML-Body, Anhänge, Links, Igor KI-Panel) |
| `ComposeModal/` | Fenster zum Verfassen/Beantworten von Emails mit Igor-Toolbar |
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
  --yellow: #ffd166;   /* KI/Igor Elemente */
  --red: #f87171;
}
body { background: radial-gradient(circle at top, #1e3350, var(--bg) 65%); }
```

Font: Inter (Google Fonts), backdrop-filter blur auf Panels.
Igor/KI-Elemente: `#ffd166` Gelb. Entity-Suggestion-Chips: Cyan.

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

### State-Sync Pattern (mit userId)

```typescript
const userId = user?.localAccountId;   // stabil, OID UUID

const handleSwipeLeft = (id: string) => {
  addStoredId(LS_DISMISSED, id);
  if (userId)
    setEmailState(id, 'DISMISSED', userId)
      .then(() => console.log('[blitz] DISMISSED saved to DB:', id))
      .catch(console.error);
  setEmails(prev => prev.filter(e => e.id !== id));
};
```

### AttributeDetail Modal

- Öffnet sich über `↗` Button auf Attribut-Karten (Button-Element umgeht dnd-kit)
- Fetcht `GET /api/projects/{id}` oder `/tasks/{id}` oder `/orders/{id}`
- Diese Endpunkte existieren noch NICHT in pdm-api → Modal zeigt was vorhanden, kein Crash
- **TODO:** Detail + Update Endpunkte in pdm-api (group-pdm) implementieren

## Azure Konfiguration (WICHTIG)

### IGOR_API_KEY

Der Igor API Key muss in Azure Portal als App Setting für die pdm-api Function App gesetzt werden:

```
Azure Portal → pdm-api → Konfiguration → Anwendungseinstellungen → + Neue Einstellung
Name:  IGOR_API_KEY
Wert:  [tatsächlicher Key — niemals in Code, Doku oder Commits schreiben]
```

`group-pdm/api/local.settings.json` enthält leeren Platzhalter für lokale Entwicklung.
Ohne gesetzten Key gibt `/api/igor-ask` HTTP 500 zurück.

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
  - `api/function_app.py` — alle pdm-api Endpunkte (inkl. `igor_ask`, `_list_emails_for_entity`)
  - `api/pdm_db.py` — DB-Verbindung (Azure Managed Identity)
  - `api/local.settings.json` — lokale Env-Vars (`PDM_SQL_SERVER`, `SKIP_AUTH=1`, `IGOR_API_KEY` leer)
- **Blitz:** `C:\Users\MatthaeusUnger\source\repos\blitz` (dieses Repo)

## Offene TODOs

1. **AttributeDetail API** — `GET/PUT /api/projects/{id}`, `GET/PUT /api/tasks/{id}`, `GET /api/orders/{id}` in pdm-api implementieren
2. **Email-Links cross-device** — Links sind in localStorage gecacht, Bulk-Endpunkt `GET /api/email-links-by-user?user=...` für anderen Browser/Gerät
3. **pdm-api Auth aktivieren** — `SKIP_AUTH=1` entfernen, Bearer Token vom MSAL-Frontend übergeben
4. **Attachment-Download** — Graph API Download-Link in Email-Detail
5. **IGOR_API_KEY setzen** — Azure Portal → pdm-api → Configuration → Application Settings
