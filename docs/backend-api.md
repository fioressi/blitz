# pdm-api — Backend-Referenz

pdm-api ist das zentrale Backend des HERPERT PDM-Ökosystems: Azure Functions Python v2,
verbindet Blitz mit der PDM-Datenbank, SharePoint, Igor KI und Microsoft Graph.

**Live-URL:** `https://pdm-api.azurewebsites.net/api`  
**Repo:** `group-pdm/api/function_app.py`  
**Deploy:** manuell via `func azure functionapp publish pdm-api --python`  
**Kein CI/CD** — jede Änderung an `function_app.py` erfordert manuellen Re-Deploy.

---

## Architektur

```
Blitz (React SPA)
  ├─ Microsoft Graph API          ← Emails direkt laden/senden (kein Proxy)
  └─ pdm-api (Azure Functions)
       ├─ Azure SQL PDM_db        ← Projekte, Tasks, Orders, Emails, States
       ├─ SharePoint (MS Graph)   ← Tasks-Liste, Anhänge
       └─ Igor KI-Assistent       ← igor.fioresi.cloud
            ├─ /api/translate     ← Fast-Path (GPT direkt, kein Agent)
            ├─ /api/agent         ← Agent-Pfad (OpenClaw, Sessions, Tools)
            └─ /api/igor/ask      ← Legacy (Veraltet, noch aktiv)
```

---

## Authentication

Phase 1: `SKIP_AUTH=1` in Azure App Settings → alle Endpunkte akzeptieren Requests ohne Token.  
Bei `SKIP_AUTH` nicht gesetzt: Bearer-Token-Validierung gegen Entra ID (Tenant `02a50c76-...`).

Blitz übergibt den User via Body-/Query-Parameter `user` = `user.localAccountId` (Entra ID OID).
**Nicht** die E-Mail-Adresse — der Spaltenname `UserEmail` in der DB ist historisch.

---

## Endpunkte

### Health

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET` | `/health/live` | Liveness — immer 200 wenn Function läuft |
| `GET` | `/health/ready` | Readiness — prüft DB-Verbindung |
| `GET` | `/health/dependencies` | DB, SharePoint, Igor — vollständiger Dependency-Report |

---

### Emails & User-States

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET` | `/emails?user={userId}` | Blitz-gesendete Antworten dieses Users aus DB |
| `GET` | `/emails?entityType=X&entityId=Y` | Alle Emails die mit einer Entität verknüpft sind |
| `POST` | `/emails` | Email + PDM-Links in DB anlegen (idempotent per MessageId) |
| `GET` | `/emails/by-message?messageId={id}` | Email-Detail + alle verknüpften Entitäten |
| `GET` | `/emails/{id}/mime` | Originale MIME-Datei herunterladen |
| `DELETE` | `/emails/{id}` | Email-Datensatz löschen |
| `GET` | `/email-states?user={userId}` | Alle Triage-States dieses Users (cross-device Sync) |
| `POST` | `/email-states` | State setzen `{messageId, status, user}` — Status: `DISMISSED\|READ\|SAVED\|REPLY` |
| `DELETE` | `/email-states` | State löschen `{messageId, user}` |

**`POST /emails` Body:**
```json
{
  "messageId": "AAMkAGI...",
  "subject": "Betreff",
  "fromAddr": "absender@example.com",
  "sentAt": "2026-05-27T10:00:00Z",
  "kind": "SENT",
  "linkedBy": "oid-uuid",
  "links": [
    { "entityType": "PROJECT", "entityId": 42 }
  ]
}
```

---

### Projekte

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET` | `/projects?search=H26` | Volltextsuche, gibt Liste zurück |
| `POST` | `/projects` | Neues Projekt anlegen |
| `GET` | `/projects/{id}` | Einzel-Detail |
| `PATCH` | `/projects/{id}` | Felder aktualisieren |

---

### Tasks

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET` | `/tasks?search=X&projectId=Y&status=Z&lang=de` | Filtern + Volltextsuche |
| `POST` | `/tasks` | Neuen Task anlegen (wird zu SharePoint synchronisiert) |
| `GET` | `/tasks/{id}` | Einzel-Detail inkl. i18n-Felder |
| `PATCH` | `/tasks/{id}` | Felder aktualisieren (sync nach SharePoint) |
| `DELETE` | `/tasks/{id}` | Task löschen |
| `DELETE` | `/tasks/by-sp-item/{spItemId}` | Löschen per SharePoint-Item-ID (für SP-Webhooks) |
| `POST` | `/tasks/{id}/retranslate` | Übersetzungs-Job erneut auslösen |
| `PATCH` | `/tasks/{id}/translations` | Manuelle i18n-Korrekturen speichern |

**SharePoint-Sync:** Tasks werden bidirektional mit einer SP-Liste synchronisiert.  
Beim POST/PATCH wird `_sp_create_task` / `_sp_update_task` aufgerufen.

---

### Aufträge (Production Orders)

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET` | `/production-orders` | Alle Fertigungsaufträge |
| `GET` | `/production-dashboard/kpi` | KPI-Zusammenfassung (Zähler) |
| `GET` | `/production-dashboard/items` | Item-Liste mit Status/Fortschritt |

---

### Purchase Orders

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET` | `/purchase-orders-tracking` | PO-Liste mit Tracking-Status |
| `GET` | `/purchase-orders/{id}` | PO-Detail mit Positionen |

---

### PDM-Objekte (Teile/Baugruppen)

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET` | `/pdm-objects` | Liste mit Filterung |
| `POST` | `/pdm-objects` | Neues Objekt anlegen |
| `GET` | `/pdm-objects/{id}` | Einzel-Detail |
| `GET` | `/pdm-objects/filter-options` | Verfügbare Filter-Werte |
| `GET` | `/objects/{id}/ext-properties` | Erweiterte Klassen-Eigenschaften |
| `PATCH` | `/objects/{id}/ext-properties` | Erweiterte Eigenschaften speichern |
| `GET` | `/classes/{classCode}/properties` | Eigenschafts-Schema einer Klasse |

---

### Search (Blitz AttributePanel)

```
GET /search?type=PROJECT|ORDER|TASK|INVOICE|RFQ|...&q=suchbegriff&limit=25
```

Universelle Volltextsuche für Blitz-Attribut-Panels.  
Gibt je nach `type` gefilterte Listen zurück — gleiche Antwortstruktur für alle Typen.

---

### Entity-Links

```
POST  /entity-links  { sourceType, sourceId, targetType, targetId }
DELETE /entity-links { sourceType, sourceId, targetType, targetId }
```

Bidirektionale Links zwischen beliebigen PDM-Entitäten (Projekt ↔ Task, Email ↔ Order, …).

---

### Stückliste (BOM)

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET` | `/bom?objectId={id}` | Stückliste eines Objekts (flach) |
| `GET` | `/bom/detail?objectId={id}` | Stückliste mit Unterpositionen |

---

### RFQ / Anfragen

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET` | `/rfq-packages?objectId=X&projectId=Y` | Anfragepakete mit CRM-Firmendaten |

---

### Stammdaten (read-only)

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET` | `/suppliers` | Lieferantenliste |
| `GET` | `/contacts` | Kontaktliste |
| `GET` | `/companies` | — POST: Firma anlegen |
| `GET` | `/invoices` | Rechnungsliste |
| `GET` | `/work-instructions` | Arbeitsanweisungen |

---

### Anhänge

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET` | `/attachments?entityType=X&entityId=Y` | Anhänge einer Entität |
| `POST` | `/attachments` | Anhang hochladen (Multipart) → SharePoint |
| `GET` | `/attachments/{id}/download` | Download via SP-Redirect |
| `GET` | `/object-files/{id}/download` | PDM-Object-File Download |
| `DELETE` | `/attachment-links` | Anhang-Verknüpfung entfernen |

---

### Prompt-Jobs (Übersetzungs-Pipeline)

Tasks haben mehrsprachige Felder (DE/EN/HU). Die Übersetzung läuft asynchron als Job.

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `POST` | `/prompt-jobs` | Job manuell anlegen |
| `GET` | `/prompt-jobs/{jobId}` | Job-Status abfragen |
| `POST` | `/prompt-jobs/process` | Ausstehende Jobs manuell abarbeiten |
| `POST` | `/prompt-jobs/{jobId}/callback` | Igor-Callback bei Abschluss |

**Timer:** `prompt_jobs_timer` läuft jede Minute und verarbeitet bis zu 5 offene Jobs.  
**Watchdog:** `dependency_watchdog` läuft alle 5 Minuten und prüft DB/SP/Igor.

**Job-Flow:**
```
POST /tasks → _dispatch_task_translation()
  → _trigger_igor_task_translation_direct() (bevorzugt, kein Queue)
      → Igor /api/translate mit kind="translate"
      → _apply_task_translation_result() → DB UPDATE
  fallback → _queue_task_translation() → PROMPT_JOBS Tabelle
      → Timer leased den Job → _submit_job_to_provider() → Igor
      → Igor ruft /prompt-jobs/{id}/callback auf
```

---

### Setup-Endpunkte (intern / einmalig)

Nur mit speziellem Auth-Header erreichbar. Nicht für Blitz gedacht.

| Pfad | Zweck |
|------|-------|
| `/setup/sp-tasks-list` | SharePoint-Liste erstellen |
| `/setup/sp-add-columns` | Fehlende SP-Spalten nachträglich anlegen |
| `/setup/backfill-tasks` | Bestehende DB-Tasks nach SP exportieren |
| `/setup/backfill-project-names` | Projektnamen in Tasks nachfüllen |
| `/setup/test-sp-upload` | SP-Upload-Konnektivität prüfen |

---

## Igor KI-Integration

Drei Pfade zu Igor — alle gesichert hinter pdm-api (kein API-Key im Frontend):

### 1. `/api/igor-translate` — Fast-Path (Standard für Blitz)

```
Blitz igorService.ts → POST /api/igor-translate
  → _igor_proxy("https://igor.fioresi.cloud/api/translate", ...)
    x-api-key: IGOR_TRANSLATE_API_KEY || IGOR_API_KEY
    timeout: 30s, retries: 0
```

**Request-Body:**
```json
{
  "kind": "translate|summarize|extract|classify|transform",
  "instruction": "Übersetze auf Deutsch",
  "input": "Text to process",
  "context": "Optional domain context",
  "responseSchema": { "text": "string" }
}
```

**Response:**
```json
{ "status": "ok", "result": { "text": "..." }, "metadata": { "model": "...", "tokens": 0 } }
```

Dieser Pfad **umgeht OpenClaw** — kein Agent, keine Session, kein `openclaw`-Prozess.
Geeignet für: Zusammenfassen, Übersetzen, Aufgaben extrahieren, Antworten entwerfen.

### 2. `/api/igor-agent` — Agent-Pfad

```
POST /api/igor-agent
  → _igor_proxy("https://igor.fioresi.cloud/api/agent", ...)
    x-api-key: IGOR_API_KEY
    timeout: 120s, retries: 1
```

Nutzt OpenClaw auf dem Igor-Server — Sessions, Speicher, externe Tools.
Für komplexe Abfragen die mehr als einen LLM-Call brauchen.

### 3. `/api/igor-ask` — Legacy

```
POST /api/igor-ask { question, input?, context? }
  → _igor_proxy("https://igor.fioresi.cloud/api/igor/ask", ...)
    x-api-key: IGOR_API_KEY
    timeout: 60s, retries: 1
```

Alter Endpunkt — noch aktiv aber **veraltet**. Blitz nutzt seit dem Fast-Path-Umbau
nur noch `igor-translate` für alle einfachen KI-Aktionen.

### Key-Hierarchie

```
igor-translate  →  IGOR_TRANSLATE_API_KEY  ||  IGOR_API_KEY
igor-agent      →  IGOR_API_KEY
igor-ask        →  IGOR_API_KEY
```

`IGOR_TRANSLATE_API_KEY` existiert damit der Fast-Path einen separaten, rotierbaren Key
bekommt ohne den Agent-Key zu berühren.

---

## Azure App Settings (Pflichtfelder)

| Variable | Zweck |
|----------|-------|
| `PDM_SQL_SERVER` | Azure SQL Hostname (`neutronzenker.database.windows.net`) |
| `PDM_SQL_DATABASE` | Datenbankname (`PDM_db`) |
| `IGOR_API_KEY` | Igor API Key (Agent + Legacy-Ask) |
| `IGOR_TRANSLATE_API_KEY` | Igor Fast-Path Key (optional, fällt auf `IGOR_API_KEY` zurück) |
| `SKIP_AUTH` | `1` → Auth deaktiviert (Phase 1) |
| `SP_SITE_ID` | SharePoint-Site-ID für Tasks-Liste und Anhänge |
| `SP_TASKS_LIST_ID` | SharePoint-Listen-ID (Tasks) — gecacht in `_sp_tasks_list_id()` |
| `PROMPT_JOBS_SECRET` | HMAC-Secret für Prompt-Job Auth-Header |
| `CALLBACK_TOKEN_SECRET` | Token für Igor-Callbacks |

**Keys niemals in Code, Logs oder Commits.**  
Azure Portal → pdm-api → Konfiguration → Anwendungseinstellungen.

---

## Datenbank-Schema (relevante Tabellen)

```sql
-- Projekte
PDM_PROJEKTE (ProjektId, ProjektNr, Bezeichnung, Status, ...)

-- Tasks (mehrsprachig)
PDM_TASKS (
    TaskId, ProjektId, Titel, TitelEN, TitelHU,
    Beschreibung, BeschreibungEN, BeschreibungHU,
    Status, Prioritaet, Typ, SpItemId, ...
)

-- Emails + Verknüpfungen (geteilter PDM-Zustand, alle User)
dbo.EMAILS (EmailId, MessageId UNIQUE, Subject, FromAddr, SentAt, Kind, LinkedBy, LinkedAt)
dbo.EMAIL_LINKS (EmailId FK, EntityType, EntityId) PK(EmailId, EntityType, EntityId)

-- Per-User Triage-Status (geräteübergreifende Sync)
dbo.EMAIL_USER_STATES (
    UserEmail   NVARCHAR(320),   -- localAccountId (OID UUID), NICHT E-Mail-Adresse
    MessageId   NVARCHAR(998),
    Status      NVARCHAR(20) CHECK IN ('DISMISSED','READ','SAVED','REPLY'),
    UpdatedAt   DATETIME2,
    PK (UserEmail, MessageId)
)

-- Asynchrone KI-Jobs
PROMPT_JOBS (
    JobId, JobType, Status, Payload, Result,
    Attempts, MaxAttempts, CallbackToken,
    CreatedAt, UpdatedAt, LeasedUntil
)
```

**Hinweis `UserEmail`:** Spaltenname historisch — enthält `localAccountId` (OID UUID aus Entra ID), keine E-Mail.

---

## Deployment

```bash
# group-pdm Repo (lokal oder auf Prod-Server)
cd api
func azure functionapp publish pdm-api --python
```

Kein CI/CD — manuell nach jeder Änderung an `function_app.py`.

**Lokale Entwicklung:**
```bash
cp local.settings.json.example local.settings.json
# PDM_SQL_SERVER, IGOR_API_KEY etc. eintragen
func start
# → http://localhost:7071/api/
```

---

## Häufige Fehler

| HTTP | Ursache | Fix |
|------|---------|-----|
| `500 IGOR_TRANSLATE_API_KEY…` | Key fehlt in Azure App Settings | Im Portal setzen |
| `502 Igor Fehler: HTTP 429` | OpenAI-Guthaben erschöpft | Billing top-up: platform.openai.com/settings/billing |
| `502 Igor Fehler: HTTP 401` | Falscher/abgelaufener Igor-Key | Key rotieren |
| `504 Igor Timeout` | Igor-Server zu langsam | timeout in `_igor_proxy` anpassen oder Fast-Path verwenden |
| `500 DB-Verbindung` | SQL Firewall oder Managed Identity | Azure SQL Firewall + MI-Berechtigung prüfen |
