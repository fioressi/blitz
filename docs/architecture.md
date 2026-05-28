# Blitz — Architektur

## Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React + TypeScript)                               │
│                                                             │
│  ┌──────────────┬──────────────────────┬──────────────┐    │
│  │ Attribute    │   Email-Karten       │ Attribute    │    │
│  │ (links)      │   (Posteingang)      │ (rechts)     │    │
│  └──────────────┴──────────────────────┴──────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Reply-Tray (zu beantworten)                        │    │
│  └─────────────────────────────────────────────────────┘    │
└───────┬──────────────────────────┬──────────────────────────┘
        │                          │
        ▼                          ▼
Microsoft Graph API           pdm-api (Azure Functions)
(Emails, Kontakte)            (Email-Links in PDM_db)
```

## Komponenten

### Frontend (`src/`)

| Ordner | Zweck |
|--------|-------|
| `auth/` | MSAL-Konfiguration, AuthGuard-Komponente |
| `components/EmailCard/` | Swipeable Email-Karte mit Drag & Drop Drop-Zone |
| `components/AttributePanel/` | Draggable Attribut-Listen (links/rechts) |
| `components/ReplyTray/` | Unterer Container für "zu beantworten" |
| `components/EmailDetail/` | Modal-Ansicht einer geöffneten Email |
| `data/` | Fallback Mock-Daten |
| `services/graphService.ts` | Microsoft Graph API Integration |
| `services/pdmApiService.ts` | pdm-api Integration (Attribute + Email-Links) |
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

### Email-Lebenszyklus

```
Graph API → Posteingang (nur im Browser, nicht in DB)
  │
  ├── Swipe links        → als gelöscht markiert (nicht in DB)
  ├── Swipe rechts       → als gelesen markiert (nicht in DB*)
  ├── Attribut draufziehen → dbo.EMAILS + dbo.EMAIL_LINKS (pdm-api)
  └── Reply-Tray         → Status "to-reply" (lokal)
```

*) Swipe rechts ohne Attribut speichert noch nicht in DB — pdm-api erfordert
   mindestens ein Target. Geplant für Phase 2.

## Datenbank (PDM_db auf Azure SQL)

Nur Emails die mit einem PDM-Attribut verknüpft werden, landen in der DB.
Die DB ist **kein Postfach-Spiegel** — sie speichert PDM-relevante Emails.

Tabellen sind Teil des bestehenden `pdm-api` Schemas:

### dbo.EMAILS

```sql
-- Felder (Auswahl):
MessageId     NVARCHAR(998)  -- Graph API Message ID (unique)
GraphItemId   NVARCHAR(998)  -- Graph API Item ID
Subject       NVARCHAR(998)
FromAddr      NVARCHAR(320)
SentAt        DATETIME2
HasAttachments BIT
Kind          NVARCHAR(64)   -- 'COMMUNICATION' | 'RFQ' | 'ORDER' | ...
LinkedBy      NVARCHAR(320)  -- Entra-ID preferred_username
LinkedAt      DATETIME2
```

### dbo.EMAIL_LINKS

```sql
-- Felder:
EmailId       INT            -- FK → dbo.EMAILS
EntityType    NVARCHAR(64)   -- 'PROJECT' | 'ORDER' | 'TASK' | 'OBJECT' | ...
EntityId      INT
```

## pdm-api Endpunkte

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| `GET` | `/api/search?type=PROJECT\|ORDER\|TASK` | Attribute für die Panels laden |
| `POST` | `/api/emails` | Email + 1..N PDM-Links anlegen (idempotent via MessageId) |
| `GET` | `/api/emails/by-message?messageId=...` | Email-Detail + alle Links abrufen |
| `PATCH` | `/api/emails/{id}` | Kind ändern oder weitere Links hinzufügen |
| `DELETE` | `/api/email-links` | Einzelne Verknüpfung löschen |

**Base URL:** `https://pdm-api.azurewebsites.net`

## Azure AD

- **App:** blitz (`a1627a40-18ee-4461-a75a-cca6a4608fd4`)
- **Tenant:** `02a50c76-4445-4435-89d3-e6e871f29342`
- **Auth-Typ:** SPA (PKCE, loginRedirect), kein Client Secret
- **Scopes:** `User.Read`, `Mail.Read`, `Mail.ReadWrite`, `Mail.Send`, `Contacts.Read`
- **Redirect URI:** `http://localhost:5173` (dev), produktions-URL noch nicht konfiguriert

## Bibliotheken

| Bibliothek | Version | Zweck |
|------------|---------|-------|
| `@azure/msal-browser` | v5 | MSAL Auth (PKCE) |
| `@azure/msal-react` | v5 | React-Hooks für MSAL |
| `framer-motion` | v12 | Swipe-Animationen, Physics-Drag |
| `@dnd-kit/core` | v6 | Drag & Drop für Attribut-Karten |
| `vite` | v8 | Build-Tool |

## Technische Entscheidungen

### Warum Graph API direkt vom Frontend?

Graph API unterstützt PKCE-basierte SPA-Auth nativ.
Ein Backend-Proxy würde keinen Sicherheitsgewinn bringen und die Latenz erhöhen.
Emails werden nicht über pdm-api geleitet — nur die PDM-Verknüpfungen.

### Warum Teil von pdm-api statt eigenem Backend?

Blitz ist in Phase 1 ein PDM-Tool. Auth, DB-Verbindung und Deployment
sind bereits vorhanden. Bei wachsendem Scope (mehrere Accounts, externe Nutzer)
wird ein eigenes Backend evaluiert.

### Warum framer-motion UND @dnd-kit?

Email-Karten brauchen physik-basierte Swipe-Gesten (framer-motion).
Attribut-Karten brauchen präzises Drag & Drop mit Drop-Zonen (@dnd-kit).
Beide Systeme koexistieren: framer-motion auf `motion.div` für Swipe,
@dnd-kit mit `useDraggable`/`useDroppable` für Attribut-Verknüpfung.
`DragOverlay` von @dnd-kit ermöglicht das freie Schweben der Attribut-Karte
über allen Containern während des Drags.

### Warum loginRedirect statt loginPopup?

Browser blockieren Popups aus Sicherheitsgründen in bestimmten Kontexten.
`loginRedirect` ist zuverlässiger und erfordert `handleRedirectPromise()`
in `main.tsx` vor dem ersten Render.
