# Rudel-Chat — Technische Spezifikation

**Status:** Draft v0.1 — 2026-05-30  
**Scope:** Blitz-Integration, Igor-Orchestrierung, Herpert-Datenzugriff, lokale Terminal-KIs  
**Version:** V1 (minimaler erster Scope)

---

## 1. Überblick

Rudel-Chat ist ein KI-Arbeitsraum innerhalb von Blitz.  
Er ist kein einfaches Chatfenster, sondern ein kontextueller Begleit-Chat mit Zugriff auf die aktive Seite, sichtbare Daten und strukturierte PDM-Fakten.

### Rollen
| Rolle | Wer | Funktion |
|---|---|---|
| **Chef** | Igor | Orchestriert, entscheidet, fragt Herpert, lädt Teilnehmer ein |
| **Arbeitsoberfläche** | Blitz | Liefert UI-Kontext, zeigt den Raum |
| **Fachdaten-Tor** | Herpert / pdm-api | Liefert strukturierte PDM-Daten |
| **Gäste** | Lokale/externe KIs | Sichtbare oder stille Konsulenten |

### Grundregel
> Solange der Rudel-Drawer geschlossen ist, passiert **nichts**.  
> Keine Anfragen, keine Kosten, kein Hintergrundrauschen.

---

## 2. UI-Verhalten

### 2.1 Drawer

- Position: **rechts**, ausklappbar
- Standardzustand: **geschlossen**
- Öffnen per: Button in der Blitz-Toolbar (`banner-drawer` rechts) oder Tastenkürzel
- Breite: `360px` (Desktop), `100vw` (Mobile)

### 2.2 Drawer-Inhalt

```
┌─────────────────────────────────┐
│  Rudel                          │  ← Titel
│  Seite: orders · sichtbar: 12  │  ← Kontext-Zeile
│  ausgewählt: A12345             │
├─────────────────────────────────┤
│  Teilnehmer:                    │
│  ● Igor               [Chef]    │
│  ○ Claude Local    [+joinen]    │
│  ○ BrainB          [+joinen]    │
├─────────────────────────────────┤
│                                 │
│  [Chat-Verlauf]                 │
│                                 │
│  Igor: Von den sichtbaren…      │
│  meister: Was ist kritisch?     │
│                                 │
├─────────────────────────────────┤
│  [ Eingabe…           ] [Send]  │
│  [mit Herpert prüfen]           │
│  [BrainB intern]                │
└─────────────────────────────────┘
```

### 2.3 Verhalten beim Öffnen

1. Blitz erstellt **Context Snapshot** (→ 4.1)
2. Schickt Snapshot + ggf. bestehende History an Igor (`POST /api/rudel/chat`)
3. Igor initialisiert Raum, antwortet mit Begrüßung
4. Drawer zeigt Chat-Verlauf und Teilnehmerliste

### 2.4 Teilnehmer-Status

| Status | Anzeige | Bedeutung |
|---|---|---|
| `connected` | ● grün | aktiv im Raum |
| `off` | ○ grau | nicht verbunden |
| `consultant` | ◎ blau | intern für Igor, unsichtbar im Chat |

### 2.5 Schnellaktionen (Buttons unterhalb Eingabe)

| Button | Aktion |
|---|---|
| „mit Herpert prüfen" | Fügt `[herpert:check]` als Hinweis an Igor zur Nachricht |
| „BrainB intern" | Sendet mit `consultParticipant: brainb` |
| „nur Igor" | Entfernt alle aktiven Teilnehmer temporär |

---

## 3. Event-Flows

### 3.1 Drawer öffnen

```
Nutzer öffnet Drawer
  → Blitz: collectContextSnapshot()
  → Blitz: POST /api/rudel/chat
      { action: "open", context, history: [] }
  → Igor: initialisiert Raum, antwortet
  → Blitz: zeigt Antwort im Chat
```

### 3.2 Nachricht senden

```
Nutzer tippt + Send
  → Blitz: POST /api/rudel/chat
      { message, context, history }
  → Igor: verarbeitet, fragt ggf. Herpert
  → Igor: antwortet
  → Blitz: hängt Antwort an History an
```

### 3.3 Teilnehmer joinen (sichtbar)

```
Nutzer klickt „Claude Local hinzufügen"
  → Blitz: POST /api/rudel/join
      { participantId: "claude-local", roomId, mode: "participant" }
  → Igor: erstellt Join-Paket (→ 4.6)
  → Igor: sendet Join-Paket an Participant-Endpoint
  → Participant bestätigt
  → Blitz: zeigt „Claude Local ist da"
  → Folge-Nachrichten: participant kann sichtbar mitschreiben
```

### 3.4 Teilnehmer verlassen

```
Nutzer klickt „Claude raus" / Teilnehmer sendet Leave
  → Blitz: POST /api/rudel/leave
      { participantId: "claude-local", roomId }
  → Igor: entfernt Teilnehmer
  → Blitz: zeigt „Claude Local hat den Raum verlassen"
```

### 3.5 Stille Konsultation

```
Igor entscheidet intern: Zweitmeinung sinnvoll
  → Igor: POST /rudel/consult
      { participantId: "brainb", question, context, visibility: "internal" }
  → BrainB: antwortet
  → Igor: integriert Antwort in eigene sichtbare Antwort
  → Nutzer sieht nur Igors Zusammenfassung
```

### 3.6 Kontext-Update (Seitenwechsel)

```
Nutzer navigiert zu neuer Seite
  → Blitz: erkennt Seitenwechsel (pdmPath / workspaceView)
  → Falls Drawer offen: POST /api/rudel/chat
      { action: "context.update", context: newSnapshot }
  → Igor: notiert Kontextwechsel
  → Igor: sendet Bestätigung (z.B. „Kontext aktualisiert: Projekte")
```

### 3.7 Herpert-Abfrage durch Igor

```
Igor braucht PDM-Daten
  → Igor: ruft intern pdm-api auf
      GET /api/pdm-objects, /api/production-orders, etc.
  → Igor: integriert Fakten in Antwort
  → Nutzer sieht faktenbasierte Antwort
```

---

## 4. JSON-Schemas

### 4.1 Context Snapshot

```json
{
  "app": "blitz",
  "page": "orders",
  "view": "open-orders",
  "user": "meister",
  "timestamp": "2026-05-30T13:42:00+02:00",
  "filters": {
    "status": "open"
  },
  "sort": {
    "field": "dueDate",
    "direction": "asc"
  },
  "selected": {
    "orderId": "A12345"
  },
  "visible": {
    "orderIds": ["A12345", "A12346", "A12347"],
    "count": 12
  }
}
```

### 4.2 Chat Request (Blitz → Igor)

```json
{
  "action": "message",
  "roomId": "main",
  "message": "Was ist hier am kritischsten?",
  "context": { },
  "history": [
    { "role": "meister", "text": "…" },
    { "role": "igor", "text": "…" }
  ]
}
```

`action` Werte: `open` | `message` | `context.update`

### 4.3 Chat Response (Igor → Blitz)

```json
{
  "roomId": "main",
  "participantId": "igor",
  "role": "igor",
  "text": "Von den sichtbaren Bestellungen ist A12345 derzeit die kritischste.",
  "meta": {
    "herpertQueried": true,
    "queryKind": "orders.by_ids"
  }
}
```

### 4.4 Chat Message (im Verlauf gespeichert)

```json
{
  "id": "msg-001",
  "roomId": "main",
  "participantId": "igor",
  "role": "igor",
  "text": "…",
  "replyToMessageId": "msg-000",
  "createdAt": "2026-05-30T13:43:10+02:00",
  "meta": {
    "source": "rudel",
    "visibility": "visible"
  }
}
```

### 4.5 Participant

```json
{
  "id": "igor",
  "label": "Igor",
  "kind": "orchestrator",
  "mode": "participant",
  "status": "connected",
  "visible": true,
  "capabilities": {
    "canReadContext": true,
    "canQueryHerpert": true,
    "canConsultOthers": true,
    "canPostVisibleMessages": true,
    "canTakeExternalActions": false
  }
}
```

`kind` Werte: `orchestrator` | `terminal-agent` | `api-agent`  
`mode` Werte: `off` | `participant` | `consultant` | `on-demand`

### 4.6 Join Packet (Igor → Participant)

```json
{
  "roomId": "main",
  "participant": {
    "id": "claude-local",
    "label": "Claude Local",
    "kind": "terminal-agent",
    "mode": "participant"
  },
  "context": {
    "app": "blitz",
    "page": "orders",
    "selected": { "orderId": "A12345" },
    "visible": { "orderIds": ["A12345", "A12346"], "count": 12 }
  },
  "history": [
    { "role": "meister", "text": "Was ist kritisch?" },
    { "role": "igor", "text": "Ich prüfe die sichtbaren Bestellungen." }
  ],
  "rules": {
    "igorIsChief": true,
    "visibleChat": true,
    "noExternalActions": true,
    "speakWhenUseful": true
  }
}
```

### 4.7 Join / Leave Request

```json
{ "action": "joinParticipant",  "roomId": "main", "participantId": "claude-local", "mode": "participant" }
{ "action": "leaveParticipant", "roomId": "main", "participantId": "claude-local" }
```

### 4.8 Consultant Request

```json
{
  "action": "consultParticipant",
  "roomId": "main",
  "participantId": "brainb",
  "question": "Bewerte die Priorisierung der sichtbaren Bestellungen.",
  "context": { "page": "orders", "selected": { "orderId": "A12345" } },
  "visibility": "internal"
}
```

### 4.9 Context Update Event

```json
{
  "type": "context.update",
  "roomId": "main",
  "context": {
    "app": "blitz",
    "page": "projects",
    "view": "active-projects",
    "selected": { "projectId": "H22001" },
    "visible": { "projectIds": ["H22001", "H22002"] }
  },
  "updatedAt": "2026-05-30T13:45:00+02:00"
}
```

---

## 5. Seiten-Mapping (Blitz → Context Snapshot)

Für jede Blitz-Seite ist definiert, was in den Context Snapshot fließt.

| Blitz-Seite | `page` | `selected` | `visible` |
|---|---|---|---|
| Email Inbox | `emails.inbox` | `{ messageId }` | `{ messageIds[], count }` |
| Email Gelesen | `emails.read` | `{ messageId }` | `{ messageIds[], count }` |
| Email Beantworten | `emails.reply` | `{ messageId }` | `{ messageIds[], count }` |
| PDM Hauptmenü | `pdm.overview` | — | `{ sections[] }` |
| PDM Objekte | `pdm.objects` | `{ objectId, partId }` | `{ partIds[], count }` |
| PDM Stückliste | `pdm.bom` | `{ parentPartId }` | `{ positions[], count }` |
| PDM Fertigungsaufträge | `pdm.production-orders` | `{ productionOrderId }` | `{ orderIds[], count }` |
| PDM Produktionsübersicht | `pdm.production-dashboard` | `{ productionOrderId }` | `{ ampel: {rot, gelb, gruen} }` |
| PDM Auftragsübersicht | `pdm.orders` | `{ orderId }` | `{ orderIds[], count }` |
| PDM Bestellungen | `pdm.purchase-orders` | `{ orderId }` | `{ orderIds[], count }` |
| PDM Angebote | `pdm.supplier-quotes` | `{ supplierId }` | `{ supplierIds[], count }` |
| PDM Rechnungen | `pdm.invoices` | `{ invoiceId }` | `{ invoiceIds[], count }` |
| PDM Anfragen (RFQ) | `pdm.rfq` | `{ rfqId }` | `{ rfqIds[], count }` |
| PDM Wareneingang | `pdm.receiving` | `{ orderId }` | `{ orderIds[], count }` |
| PDM Prüfung & QS | `pdm.qc` | `{ orderId }` | `{ orderIds[], count }` |
| PDM Einlagern | `pdm.putaway` | `{ orderId }` | `{ orderIds[], count }` |
| PDM Beschaffungsvorbereitung | `pdm.readiness` | `{ productionOrderId }` | `{ orderIds[], count }` |
| PDM Kontakte | `pdm.contacts` | `{ contactId }` | `{ contactIds[], count }` |
| PDM Firmen | `pdm.companies` | `{ companyId }` | `{ companyIds[], count }` |
| PDM Projekte | `pdm.projects` | `{ projectId }` | `{ projectIds[], count }` |
| PDM Aufgaben | `pdm.tasks` | `{ taskId }` | `{ taskIds[], count }` |

### Snapshot-Erstellung in Blitz

```typescript
function collectContextSnapshot(
  workspaceView: 'emails' | 'pdm',
  pdmPath: string,
  emailView: string,
  selectedItem?: Record<string, unknown>,
  visibleItems?: { ids: string[]; count: number }
): ContextSnapshot
```

---

## 6. Herpert Query Registry

Definierte Query-Typen, die Igor über pdm-api aufrufen kann.  
Keine freie SQL-Freiheit — nur diese Typen.

| Query-Kind | pdm-api Endpoint | Parameter |
|---|---|---|
| `orders.by_ids` | `GET /purchase-orders-tracking` | `orderIds[]` |
| `orders.open` | `GET /purchase-orders-tracking?includeClosed=false` | `top?` |
| `objects.by_ids` | `GET /pdm-objects` | `objectIds[]` |
| `objects.search` | `GET /search?type=OBJECT&q=` | `q` |
| `projects.list` | `GET /search?type=PROJECT` | — |
| `projects.by_id` | `GET /projects/{id}` | `id` |
| `tasks.list` | `GET /tasks` | `top?`, `status?` |
| `tasks.by_project` | `GET /tasks?projectId=` | `projectId` |
| `production_orders.list` | `GET /production-orders` | `top?`, `projectId?` |
| `production_orders.dashboard` | `GET /production-dashboard/items` | `filter?` |
| `invoices.open` | `GET /invoices?status=OPEN` | `top?` |
| `rfq.list` | `GET /rfq-packages` | `top?`, `status?` |
| `contacts.by_company` | `GET /contacts?supplierId=` | `supplierId` |
| `suppliers.list` | `GET /suppliers` | `top?` |
| `bom.by_object` | `GET /bom?objectId=` | `objectId` |

### Query Request Schema (→ pdm-api intern)

```json
{
  "kind": "orders.by_ids",
  "input": {
    "orderIds": ["A12345", "A12346"]
  },
  "options": {
    "include": ["status", "dueDates", "projectRefs", "blocks"]
  }
}
```

---

## 7. Igor API-Endpunkte (V1)

Neue Endpunkte in `pdm-api` (`group-pdm/api/function_app.py`):

### `POST /api/rudel/chat`

Haupt-Endpunkt für Blitz.

**Request:**
```json
{
  "action": "open | message | context.update",
  "roomId": "main",
  "message": "Was ist kritisch?",
  "context": { },
  "history": [ ]
}
```

**Response:**
```json
{
  "roomId": "main",
  "participantId": "igor",
  "role": "igor",
  "text": "…",
  "meta": { "herpertQueried": false }
}
```

### `POST /api/rudel/join`

Teilnehmer in Raum holen.

### `POST /api/rudel/leave`

Teilnehmer aus Raum entfernen.

### `GET /api/rudel/room/{roomId}`

Aktuellen Raumzustand abrufen (Teilnehmer, letzte Nachrichten).

---

## 8. Lokale Terminal-KI (V1 Adapter-Protokoll)

Lokale KIs verbinden sich über HTTP-Polling gegen den Igor-Rudel-Service.

### Join

```bash
POST /api/rudel/terminal/join
{ "participantId": "claude-local", "roomId": "main", "callbackUrl": "http://localhost:7777/rudel" }
```

### Events empfangen

```bash
GET /api/rudel/terminal/events?participantId=claude-local&roomId=main&since=<timestamp>
```

Gibt neue Nachrichten + Kontext-Updates zurück.

### Antwort posten

```bash
POST /api/rudel/terminal/message
{ "participantId": "claude-local", "roomId": "main", "text": "Ich sehe A12345 als kritisch." }
```

---

## 9. V1 Implementierungsumfang

### ✅ V1 enthalten

| Baustein | Wo |
|---|---|
| RudelDrawer UI-Komponente | `src/components/RudelDrawer/` |
| Context Snapshot Collector | `src/utils/contextSnapshot.ts` |
| `POST /api/rudel/chat` Endpoint | `group-pdm/api/function_app.py` |
| Igor-Prompt mit Kontext + History | `group-pdm/api/function_app.py` |
| Herpert-Abfragen für orders, objects, tasks | via pdm-api intern |
| Basis-Teilnehmerliste (Igor + 1 lokal) | Blitz UI |

### ❌ V1 nicht enthalten

| Feature | Begründung |
|---|---|
| WebSocket / SSE | V1: request/response genügt |
| Echter Room-State (DB) | V1: History kommt vom Client |
| Stille Konsulenten automatisch | V1: nur auf expliziten Klick |
| Mehr als 1 externe KI gleichzeitig | V2 |
| Terminal-CLI-Tool | V2 |

---

## 10. Offene Fragen (vor Implementierung klären)

1. **Igor-Endpunkt**: Neuer Endpoint in `pdm-api` (proxied) oder direkt bei `igor.fioresi.cloud`?
2. **Room-State**: In-Memory (stateless) für V1 oder Redis/Azure Table Storage?
3. **Igor-Prompt**: Welche System-Instruktionen bekommt Igor für den Rudel-Modus?
4. **Teilnehmer V1**: Nur Igor + Claude-Local, oder auch BrainB?
5. **Terminal-Adapter**: Blitz-CLI (npm package) oder einfaches curl-Script?
