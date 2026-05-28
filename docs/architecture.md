# Blitz — Architektur

## Übersicht

```
┌──────────────────────────────────────────────────────────────┐
│  Browser (React + TypeScript)                                │
│                                                              │
│  ┌──────────┬──────────────────────────────┬──────────┐     │
│  │Attribute │  Tabs: Inbox/Gelesen/         │Attribute │     │
│  │(Projekte,│  Beantworten/Merken/Gesendet  │(Tasks)   │     │
│  │POs) [+↗] │  Email-Karten + 4 Buttons    │      [+↗]│     │
│  │          │  EmailDetail + AI-Panel       │          │     │
│  └──────────┴──────────────────────────────┴──────────┘     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Reply-Tray  ↩ ZU BEANTWORTEN  (Drop-Zone)          │   │
│  └──────────────────────────────────────────────────────┘   │
└──────┬──────────────────────────┬────────────────────────────┘
       │                          │
       ▼                          ▼
Microsoft Graph API           pdm-api (Azure Functions Python v2)
(Emails laden, senden)        (Attribute, Email-Links, States, Igor-Proxy)
                                    │
                              Azure SQL PDM_db
                              (neutronzenker.database.windows.net)
                                          │
                                    ┌─────▼──────────────────┐
                                    │ Igor KI-Assistent       │
                                    │ igor.fioresi.cloud      │
                                    │ (API Key nur server-    │
                                    │  seitig in Azure Env)   │
                                    └────────────────────────┘
```

## Komponenten

### Frontend (`src/`)

| Ordner/Datei | Zweck |
|---|---|
| `auth/` | MSAL-Konfiguration, AuthGuard-Komponente |
| `components/EmailCard/` | Swipeable Email-Karte + 4 Action-Buttons + dnd-kit Drop-Zone |
| `components/AttributePanel/` | Draggable Attribut-Listen mit `+` Erstellen und `↗` Detail-Button |
| `components/AttributeDetail/` | Detail-Modal für Projekt/PO/Task mit Edit-Formular |
| `components/ReplyTray/` | Unterer Drop-Balken, expandiert beim Drag |
| `components/EmailDetail/` | Modal-Ansicht einer geöffneten Email + Igor KI-Panel |
| `components/ComposeModal/` | Fenster für neue/beantwortete Emails mit Igor-Toolbar |
| `components/CreateModal/` | Formular-Modal für neuen Task oder neues Projekt |
| `services/graphService.ts` | Microsoft Graph API (Posteingang laden, Email senden) |
| `services/pdmApiService.ts` | pdm-api Integration (alle Endpunkte, Email-States, Sent-Emails) |
| `services/igorService.ts` | Igor KI-Integration (askIgor, suggestEntityLinks, IGOR_PROMPTS) |
| `types/email.ts` | TypeScript-Interfaces (Email, Attribute, EmailLink, EntitySuggestion, ...) |

### Auth-Flow

```
Nutzer öffnet App
  → nicht eingeloggt → Login-Screen (AuthGuard)
  → loginRedirect() → Microsoft OAuth (Entra ID)
  → Redirect zurück → handleRedirectPromise() in main.tsx
  → MSAL speichert Token in sessionStorage
  → App lädt Emails über Graph API mit Bearer Token
  → userId = accounts[0].localAccountId  (stabiles OID UUID, cross-device)
```

**Registrierte Redirect URIs (SPA Platform):**
- `http://localhost:5173` (Entwicklung)
- `https://victorious-bush-0a2200403.7.azurestaticapps.net` (Produktion)

### Email-Lebenszyklus

```
Graph API → Posteingang (im Browser-State)
  │
  ├── Button "Löschen" / Swipe links
  │       → DISMISSED in localStorage + dbo.EMAIL_USER_STATES
  │       → beim nächsten Load herausgefiltert (dauerhaft weg)
  │
  ├── Button "Gelesen" / Swipe rechts
  │       → READ in localStorage + dbo.EMAIL_USER_STATES
  │       → sichtbar im "Gelesen"-Tab
  │
  ├── Button/Drag "Beantworten"
  │       → REPLY in localStorage + dbo.EMAIL_USER_STATES
  │       → sichtbar im "Beantworten"-Tab + Reply-Tray
  │
  ├── Button "Merken"
  │       → SAVED in localStorage + dbo.EMAIL_USER_STATES
  │       → sichtbar im "Merken"-Tab
  │
  ├── Attribut draufziehen → dbo.EMAILS + dbo.EMAIL_LINKS (pdm-api)
  │       → Link in localStorage blitz_links gecacht
  │       → verknüpfte Email für alle PDM-User sichtbar
  │
  ├── 🤖 KI Button → Igor AI-Panel öffnen
  │       → Zusammenfassen / Übersetzen / Aufgaben / Antwort entwerfen
  │       → Entitäten vorschlagen (alle Attribut-Karten als Kontext)
  │       → In Antwort einfügen → ComposeModal öffnen
  │
  ├── ↩ Antworten Button → ComposeModal öffnen (mode='reply')
  │       → Senden → POST /me/sendMail (Graph API)
  │       → saveEmailRecord → POST /api/emails (DB)
  │       → sichtbar im "Gesendet"-Tab
  │
  └── Klick → EmailDetail Modal (HTML-Body, Anhänge, Links, AI-Panel)
```

### State-Persistenz (Hybrid)

**User-Identifikation:** `user.localAccountId` — stabiles OID UUID aus Entra ID.
NICHT `user.username` (UPN) — dieser variiert geräteabhängig (z.B. je nach Tenant-Alias).

**Lade-Algorithmus:**
```
loadEmails():
  1. Promise.all([Graph API Inbox, GET /api/email-states?user={localAccountId}])
  2. localStorage als Startwert (schnelle erste Render, Offline-Fallback)
  3. DB-States überschreiben localStorage (autoritativ, cross-device)
  4. Emails filtern (dismissed raus) + Status setzen + Links aus Cache
```

**Write-Muster:** Alle Handler schreiben sofort in localStorage (UI reagiert sofort)
und rufen pdm-api fire-and-forget auf (async, Fehler werden nur geloggt).

### localStorage-Schlüssel

| Key | Inhalt | Zweck |
|-----|--------|-------|
| `blitz_dismissed` | `string[]` (max 2000) | Swipe-links / Löschen |
| `blitz_read` | `string[]` (max 2000) | Gelesen |
| `blitz_saved` | `string[]` (max 2000) | Gemerkt |
| `blitz_reply` | `string[]` (max 2000) | Zu beantworten |
| `blitz_links` | `Record<msgId, EmailLink[]>` | Attribut-Links pro Email |

### Igor KI-Architektur

```
Frontend (igorService.ts)
  → POST /api/igor-ask
    { question: string, context?: string, input?: string }
  
  pdm-api (function_app.py: igor_ask)
    → liest IGOR_API_KEY aus Azure Application Settings
    → POST https://igor.fioresi.cloud/api/igor/ask
      { question, user: "blitz", input?, context?, sessionTarget: "blitz" }
    → timeout: 45s
  
  ← { answer: string }
```

**Sicherheit:**
- API-Key niemals im Frontend-Bundle, niemals in Logs/Doku/Commits
- Key wird als Azure App Setting `IGOR_API_KEY` verwaltet
- Frontend sendet `question` + bereinigten Email-Text (max 8000 Zeichen, HTML-Tags entfernt)

**Entity-Suggestion-Flow:**
```
handleSuggestLinks():
  1. attributeGroups.items → EntitySuggestion[] (type, id, label, subLabel)
  2. buildEntityContext() → formatierte Liste aller PDM-Entitäten
  3. POST /api/igor-ask mit Email-Inhalt + Entitätsliste als Kontext
  4. Igor antwortet mit JSON-Array: [{ type, id, label }, ...]
  5. Regex /\[[\s\S]*?\]/ extrahiert JSON-Array (Igor kann Text darum schreiben)
  6. Validierung: nur IDs die in der bekannten Entitätsliste existieren werden behalten
  7. Chips in UI: Klick → onLinkAdded() → speichert Link in DB
```

### Drag & Drop Architektur

Zwei parallele Systeme — Konfliktlösung kritisch:

**1. framer-motion** `drag` auf `motion.div` — freies elastisches Drag für Swipe-Gesten

**2. @dnd-kit** `useDraggable` / `useDroppable` — für:
- Attribut-Karten → Email-Karten (Verknüpfung)
- Reply-Handle (Beantworten-Button) → Reply-Tray
- `DragOverlay` lässt Attribut-Karte frei über allen Containern schweben

**Konflikt 1 — Swipe vs. Beantworten-Drag:**
Der Beantworten-Button sitzt in einer `motion.div` mit `drag`. Fix:
- `onPointerDown stopPropagation` auf dem Button-Container
- `drag={isDndDragging ? false : true}` auf der motion.div

**Konflikt 2 — dnd-kit vs. onClick auf Attribut-Karten:**
dnd-kit's `PointerSensor` kappert `onPointerDown` → `onClick` auf demselben Element
feuert nicht. Fix: `<button>` Element für Detail-Aktion verwenden — dnd-kit erkennt
interaktive Elemente automatisch und überspringt Drag-Aktivierung für diese.

## Datenbank (PDM_db auf Azure SQL)

### dbo.EMAILS

```sql
EmailId        BIGINT IDENTITY PK
MessageId      NVARCHAR(998) UNIQUE  -- Graph API Message-Id
GraphItemId    NVARCHAR(998)
Subject        NVARCHAR(500)
FromAddr       NVARCHAR(320)
ToAddr         NVARCHAR(2000)
SentAt         DATETIME2
HasAttachments BIT
Kind           NVARCHAR(20)  -- CHECK: COMMUNICATION|RFQ|ECN|TODO|OFFER|ORDER|INVOICE|SHIPPING|SPEC
MimeContent    VARBINARY(MAX)  -- optional: vollständiges .eml
LinkedBy       NVARCHAR(320)   -- localAccountId (Entra ID OID UUID)
LinkedAt       DATETIME2
```

`GET /api/emails?user={localAccountId}` gibt Emails zurück wo `LinkedBy = user`.
Dies liefert genau die Emails die der User mit Blitz beantwortet hat (Gesendet-Tab).

### dbo.EMAIL_LINKS

```sql
EmailId    BIGINT NOT NULL  -- FK → dbo.EMAILS (ON DELETE CASCADE)
EntityType NVARCHAR(20)     -- OBJECT|ORDER|SUPPLIER|PROJECT|TASK
EntityId   BIGINT
PK (EmailId, EntityType, EntityId)
```

### dbo.EMAIL_USER_STATES

```sql
UserEmail  NVARCHAR(320)  -- localAccountId (Entra ID OID UUID) — Spaltenname historisch
MessageId  NVARCHAR(998)  -- Graph API Message-Id
Status     NVARCHAR(20)   -- CHECK: DISMISSED|READ|SAVED|REPLY
UpdatedAt  DATETIME2
PK (UserEmail, MessageId)  -- ein Status pro User+Email, mutually exclusive
```

Ein User hat pro Email **einen** Status. MERGE (Upsert) beim Schreiben.
Löschen = Status-Eintrag entfernen = zurück auf 'unread'.

## pdm-api Endpunkte (genutzt von Blitz)

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| `GET` | `/api/search?type=PROJECT\|ORDER\|TASK` | Attribute für Panels laden |
| `POST` | `/api/emails` | Email + 0..N PDM-Links anlegen (idempotent, targets optional) |
| `GET` | `/api/emails/by-message?messageId=...` | Email-Detail + alle Links |
| `GET` | `/api/emails?user={localAccountId}` | Blitz-gesendete Emails des Users |
| `POST` | `/api/tasks` | Neuen Task anlegen (synct zu SharePoint) |
| `POST` | `/api/projects` | Neues Projekt anlegen (generiert H26xxx Code) |
| `GET` | `/api/email-states?user={localAccountId}` | Alle Triage-States eines Users |
| `POST` | `/api/email-states` | Status setzen/aktualisieren (UPSERT) |
| `DELETE` | `/api/email-states` | Status-Eintrag löschen (= unread) |
| `POST` | `/api/igor-ask` | Igor KI-Proxy (API-Key server-seitig, timeout 45s) |

**Base URL:** `https://pdm-api.azurewebsites.net`
**Auth:** `SKIP_AUTH=1` in Azure → kein Bearer Token nötig (Phase 1)
**User-ID:** `user` Parameter im Body/Query = `accounts[0].localAccountId` aus MSAL

## Azure AD App Registration

- **App Name:** blitz
- **Client ID:** `a1627a40-18ee-4461-a75a-cca6a4608fd4`
- **Tenant ID:** `02a50c76-4445-4435-89d3-e6e871f29342`
- **Auth-Typ:** SPA Platform (PKCE, loginRedirect), kein Client Secret
- **Scopes:** `User.Read`, `Mail.Read`, `Mail.ReadWrite`, `Mail.Send`, `Contacts.Read`

## Deployment

- **Hosting:** Azure Static Web Apps (Free Tier)
- **URL:** `https://victorious-bush-0a2200403.7.azurestaticapps.net`
- **CI/CD:** GitHub Actions — Push auf `master` → Build → Deploy
- **SPA-Routing:** `public/staticwebapp.config.json`

**pdm-api deployen (kein CI/CD — manuell):**
```powershell
cd C:\Users\MatthaeusUnger\source\repos\group-pdm\api
func azure functionapp publish pdm-api --python
```

**Azure App Settings (pdm-api, manuell zu setzen):**
- `IGOR_API_KEY` — Igor API-Key (niemals in Code/Commits schreiben)

## Bibliotheken

| Bibliothek | Version | Zweck |
|------------|---------|-------|
| `@azure/msal-browser` | v5 | MSAL Auth (PKCE) |
| `@azure/msal-react` | v5 | React-Hooks für MSAL |
| `framer-motion` | v12 | Swipe-Animationen, Physics-Drag, Modal-Animationen |
| `@dnd-kit/core` | v6 | Drag & Drop (Attribut-Karten, Reply-Handle) |
| `vite` | v8 | Build-Tool |

## Technische Entscheidungen

### localAccountId statt username für User-Sync

`user.username` (UPN) variiert je nach Gerät/Browser wegen Tenant-Aliasing.
`user.localAccountId` ist das stabile OID UUID aus Entra ID — identisch auf allen Geräten.
Alle DB-Operationen (email-states, emails-by-user) verwenden `localAccountId`.

### Igor über pdm-api Proxy statt direkt

Direkter Igor-Aufruf würde den API-Key im Frontend-Bundle exponieren.
Der Proxy in pdm-api liest den Key aus Azure App Settings — nur serverseitig zugänglich.
Frontend sendet nur `question`, `context`, `input` — kein Auth-Credential.

### Hybrid localStorage + DB für State-Sync

localStorage allein = nur ein Browser/Gerät. DB allein = langsam (jede Aktion wartet auf API).
Hybrid: sofortige lokale Reaktion + async DB-Sync → optimal für UX und Cross-Device.

### Graph API direkt vom Frontend

Graph API unterstützt PKCE-SPA-Auth nativ. Kein Proxy nötig.
Emails fließen nie über pdm-api — nur PDM-Verknüpfungen und User-States.
`sendMail` (`POST /me/sendMail`) ebenfalls direkt, mit `saveToSentItems: true`.

### Warum framer-motion UND @dnd-kit?

Email-Karten brauchen physik-basierte Swipe-Gesten (framer-motion).
Attribut-Karten und Reply-Handle brauchen präzise Drop-Zonen (@dnd-kit).
`DragOverlay` ermöglicht freies Schweben der Attribut-Karte über allen Containern.
Der `stopPropagation`-Fix am Beantworten-Button verhindert den Systemkonflikt.

### HERPERT Design Language

Konsistent mit `web-probe` (group-pdm): `#101928` Hintergrund, radial-gradient,
glassmorphism Panels, Inter Font, Cyan `#66d9ef` als Accent.
Igor/KI-Elemente verwenden `#ffd166` Gelb zur visuellen Unterscheidung.
Alle CSS-Variablen in `src/index.css`.
