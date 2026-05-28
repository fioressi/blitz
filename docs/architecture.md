# Blitz — Architektur

## Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React + TypeScript)                               │
│                                                             │
│  ┌───────────┬───────────────────────────┬───────────┐     │
│  │ Attribute │  Tabs: Inbox/Gelesen/Reply │ Attribute │     │
│  │ (links)   │  Email-Karten             │ (rechts)  │     │
│  └───────────┴───────────────────────────┴───────────┘     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Reply-Tray (zu beantworten — Drop-Zone)             │   │
│  └──────────────────────────────────────────────────────┘   │
└───────┬──────────────────────────┬───────────────────────────┘
        │                          │
        ▼                          ▼
Microsoft Graph API           pdm-api (Azure Functions)
(Emails, Kontakte)            (Attribute, Email-Links, Tasks, Projekte)
                                    │
                              Azure SQL PDM_db
```

## Komponenten

### Frontend (`src/`)

| Ordner | Zweck |
|--------|-------|
| `auth/` | MSAL-Konfiguration, AuthGuard-Komponente |
| `components/EmailCard/` | Swipeable Email-Karte mit dnd-kit Drop-Zone + Reply-Handle |
| `components/AttributePanel/` | Draggable Attribut-Listen (links/rechts) mit `+` Erstellen-Button |
| `components/ReplyTray/` | Unterer Drop-Balken für "zu beantworten", expandiert beim Drag |
| `components/EmailDetail/` | Modal-Ansicht einer geöffneten Email |
| `components/CreateModal/` | Formular-Modal für neuen Task oder neues Projekt |
| `data/` | Fallback Mock-Daten (werden durch pdm-api-Daten ersetzt) |
| `services/graphService.ts` | Microsoft Graph API Integration (Posteingang, Detail) |
| `services/pdmApiService.ts` | pdm-api Integration (Attribute, Email-Links, createTask, createProject) |
| `types/` | TypeScript-Interfaces |

### Auth-Flow

```
Nutzer öffnet App
  → nicht eingeloggt → Login-Screen (AuthGuard)
  → loginRedirect() → Microsoft OAuth (Entra ID)
  → Redirect zurück → handleRedirectPromise() in main.tsx
  → MSAL speichert Token in sessionStorage
  → App lädt Emails über Graph API mit Bearer Token
```

**Registrierte Redirect URIs (SPA Platform):**
- `http://localhost:5173` (Entwicklung)
- `https://victorious-bush-0a2200403.7.azurestaticapps.net` (Produktion)

### Email-Lebenszyklus

```
Graph API → Posteingang (im Browser-State)
  │
  ├── Swipe links   → ID in localStorage "blitz_dismissed"
  │                   → beim nächsten Load herausgefiltert (dauerhaft weg)
  │
  ├── Swipe rechts  → ID in localStorage "blitz_read"
  │                   → beim nächsten Load als status: 'read' geladen
  │                   → sichtbar im "Gelesen"-Tab
  │
  ├── Attribut draufziehen → dbo.EMAILS + dbo.EMAIL_LINKS (pdm-api)
  │                          → verknüpfte Email für alle PDM-User sichtbar
  │
  └── Reply-Handle drag → status: 'to-reply'
                           → sichtbar im "Beantworten"-Tab + Reply-Tray
```

### localStorage-Schlüssel

| Key | Inhalt | Zweck |
|-----|--------|-------|
| `blitz_dismissed` | `string[]` (max 2000 IDs) | Swipe-links Emails permanent ausblenden |
| `blitz_read` | `string[]` (max 2000 IDs) | Swipe-rechts Emails als "gelesen" markieren |

### Drag & Drop Architektur

Zwei parallele Systeme:

1. **framer-motion** `drag` auf `motion.div` — freies elastisches Drag für Swipe-Gesten (links/rechts)
2. **@dnd-kit** `useDraggable` / `useDroppable` — für:
   - Attribut-Karten → Email-Karten (Verknüpfung)
   - Reply-Handle → Reply-Tray (zu beantworten markieren)
   - `DragOverlay` lässt Attribut-Karten frei über allen Containern schweben

**Konflikt-Vermeidung:** Der Reply-Handle hat `onPointerDown stopPropagation`, damit framer-motion nicht gleichzeitig einen Swipe startet. Wenn dnd-kit aktiv ist (`isDragging: true`), wird framer-motion `drag` auf `false` gesetzt.

## Datenbank (PDM_db auf Azure SQL)

Nur Emails die mit einem PDM-Attribut verknüpft werden, landen in der DB.

### dbo.EMAILS

```sql
MessageId      NVARCHAR(998)   -- Graph API Message ID (unique)
GraphItemId    NVARCHAR(998)   -- Graph API Item ID
Subject        NVARCHAR(998)
FromAddr       NVARCHAR(320)
ToAddr         NVARCHAR(2000)
SentAt         DATETIME2
HasAttachments BIT
Kind           NVARCHAR(64)    -- 'COMMUNICATION' | 'RFQ' | 'ORDER' | ...
MimeContent    VARBINARY(MAX)  -- optional: vollständiges .eml
LinkedBy       NVARCHAR(320)   -- Entra-ID preferred_username
LinkedAt       DATETIME2
```

### dbo.EMAIL_LINKS

```sql
EmailId    INT            -- FK → dbo.EMAILS
EntityType NVARCHAR(64)   -- 'PROJECT' | 'ORDER' | 'TASK' | 'OBJECT' | ...
EntityId   INT
```

## pdm-api Endpunkte (genutzt von Blitz)

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| `GET` | `/api/search?type=PROJECT\|ORDER\|TASK` | Attribute für Panels laden |
| `POST` | `/api/emails` | Email + 1..N PDM-Links anlegen (idempotent) |
| `GET` | `/api/emails/by-message?messageId=...` | Email-Detail + alle Links |
| `POST` | `/api/tasks` | Neuen Task anlegen (synct zu SharePoint) |
| `POST` | `/api/projects` | Neues Projekt anlegen (generiert H26xxx Code) |

**Base URL:** `https://pdm-api.azurewebsites.net`  
**Auth:** `SKIP_AUTH=1` in Azure gesetzt → kein Bearer Token nötig (Phase 1)

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
- **SPA-Routing:** `public/staticwebapp.config.json` leitet alle Pfade auf `index.html`

## Bibliotheken

| Bibliothek | Version | Zweck |
|------------|---------|-------|
| `@azure/msal-browser` | v5 | MSAL Auth (PKCE) |
| `@azure/msal-react` | v5 | React-Hooks für MSAL |
| `framer-motion` | v12 | Swipe-Animationen, Physics-Drag |
| `@dnd-kit/core` | v6 | Drag & Drop für Attribut-Karten + Reply-Handle |
| `vite` | v8 | Build-Tool |

## Technische Entscheidungen

### Graph API direkt vom Frontend

Graph API unterstützt PKCE-SPA-Auth nativ. Ein Proxy-Backend würde keinen Sicherheitsgewinn bringen und die Latenz erhöhen. Emails werden nie über pdm-api geleitet — nur PDM-Verknüpfungen.

### localStorage für Dismissed/Read

Server-seitige Persistenz wäre möglich, aber unnötig aufwendig für Phase 1. localStorage reicht für bis zu 2000 IDs pro Key. Nachteil: gilt pro Browser, nicht geräteübergreifend.

### Warum framer-motion UND @dnd-kit?

Email-Karten brauchen physik-basierte Swipe-Gesten (framer-motion). Attribut-Karten und Reply-Handle brauchen präzise Drop-Zonen (@dnd-kit). `DragOverlay` ermöglicht freies Schweben der Attribut-Karte. Der `stopPropagation`-Fix am Reply-Handle verhindert den Konflikt zwischen beiden Systemen.

### HERPERT Design Language

Konsistent mit `web-probe` (group-pdm): `#101928` Hintergrund, radial-gradient, glassmorphism Panels (`rgba + backdrop-filter`), Inter Font, Cyan `#66d9ef` als Accent. Alle CSS-Variablen in `src/index.css`.
