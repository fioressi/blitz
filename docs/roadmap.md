# Blitz — Roadmap

## Phase 1 — Aktiver Stand (Mai 2026)

### Auth & Deployment
- [x] Azure AD App Registration (blitz, PKCE SPA)
- [x] MSAL loginRedirect / handleRedirectPromise
- [x] AuthGuard (Login-Screen wenn nicht eingeloggt)
- [x] Azure Static Web Apps Deployment (`victorious-bush-0a2200403.7.azurestaticapps.net`)
- [x] GitHub Actions CI/CD (Push → Build → Deploy)
- [x] SPA-Routing via `staticwebapp.config.json`
- [x] **Cross-device Sync** — `user.localAccountId` (stabiles OID UUID) statt `user.username` für alle DB-Calls

### UI Grundstruktur
- [x] Drei-Spalten-Layout (Attribute links | Inbox Mitte | Attribute rechts)
- [x] Fünf Tabs: Posteingang / Gelesen / Beantworten / Merken / **Gesendet** mit Badge-Counts
- [x] Email-Karten mit elastischem Swipe links/rechts (framer-motion)
- [x] Attribut-Panels mit draggable Karten (@dnd-kit, DragOverlay)
- [x] Karten schweben frei über allen Containern während Drag
- [x] Reply-Tray (unterer Drop-Balken, expandiert beim Drag)
- [x] Email-Detail Modal (HTML-Body, Anhang-Liste, Igor KI-Panel)
- [x] Responsive Layout — Attribut-Panels als Slide-in Drawer (Mobile < 768px)
- [x] Email-Detail als Bottom Sheet auf Mobile
- [x] HERPERT Design Language (Inter, glassmorphism, cyan accent)

### Triage — Action Buttons & Status
- [x] 4 Action-Buttons pro Email-Karte: 🗑 Löschen · ✓ Gelesen · ↩ Beantworten · ★ Merken
- [x] Swipe links → dauerhaft ausblenden (DISMISSED)
- [x] Swipe rechts → als gelesen markieren (READ)
- [x] Button "Beantworten" oder Drag auf Reply-Tray → zu-beantworten (REPLY)
- [x] Button "Merken" → gespeichert/gemerkt (SAVED)
- [x] Kein Reload-Spam — verarbeitete Emails werden beim Laden herausgefiltert
- [x] Reply-Drag-Konflikt behoben (`onPointerDown stopPropagation`, dnd-kit/framer-motion)

### State-Persistenz (geräteübergreifend)
- [x] localStorage als schneller Cache (5 Keys: dismissed/read/saved/reply/links)
- [x] `dbo.EMAIL_USER_STATES` Tabelle in PDM_db
- [x] `GET/POST/DELETE /api/email-states` Endpunkte in pdm-api
- [x] Beim Laden: localStorage sofort + DB parallel → DB überschreibt Cache (cross-device)
- [x] Alle State-Änderungen: sofort in localStorage + fire-and-forget an DB
- [x] **Cross-device Fix** — Sync verwendet `localAccountId` (OID UUID), nicht `username`

### Graph API Integration
- [x] Posteingang aus Graph API laden
- [x] Email-Detail mit vollständigem HTML-Body
- [x] Anhang-Metadaten (Name, Größe, Typ)
- [x] **Email senden** — `POST /me/sendMail` mit HTML-Body, `saveToSentItems: true`
- [ ] Anhang-Download (direkter Link auf Graph API)

### PDM-Datenbank (pdm-api)
- [x] Attribut-Panels mit echten Daten aus `GET /api/search`
- [x] Drag Attribut → Email-Karte → `POST /api/emails` (idempotent, targets optional)
- [x] Links beim Öffnen einer Email aus `GET /api/emails/by-message` nachladen
- [x] Email-Links in localStorage gecacht (`blitz_links`) → nach Reload sichtbar
- [x] `+` Button im Projekte-Panel → Neues Projekt anlegen (`POST /api/projects`)
- [x] `+` Button im Tasks-Panel → Neuer Task anlegen (`POST /api/tasks`, SharePoint-Sync)
- [x] `↗` Button auf Attribut-Karten → Detail-Modal (AttributeDetail Komponente)
- [x] **Gesendet-Tab** — `GET /api/emails?user={localAccountId}` lädt Blitz-gesendete Emails

---

## Phase 2 — Email verfassen (Mai 2026, abgeschlossen)

- [x] **ComposeModal** — Fenster für neue Emails und Antworten
  - To / CC / Betreff Felder (CC ausblendbar)
  - Textarea Body mit HTML-Encoding
  - HTML-Zitat der Originalmail bei Antworten (cyan border-left)
  - Senden via Graph API (`POST /me/sendMail`)
- [x] **Reply-Flow** — EmailDetail → ComposeModal → Senden → DB speichern → Gesendet-Tab
- [x] **DB-Ablage bei Senden** — `saveEmailRecord` speichert Original in `dbo.EMAILS` mit `LinkedBy = localAccountId`
- [x] **Gesendet-Tab** — zeigt nur Blitz-gesendete Antworten (nicht alle Graph SentItems)
- [ ] Anhang hinzufügen
- [ ] Autovervollständigung für Empfänger (Graph Contacts API)
- [ ] Weiterleiten (mode='forward')

---

## Phase 3 — Igor KI-Integration (Mai 2026, abgeschlossen)

- [x] **pdm-api Igor-Proxy** — `POST /api/igor-ask` (API-Key in Azure App Settings, nie im Frontend)
- [x] **igorService.ts** — zentrale Igor-Schnittstelle mit `askIgor`, `suggestEntityLinks`, `IGOR_PROMPTS`
- [x] **KI-Panel in EmailDetail** — Zusammenfassen / Übersetzen / Aufgaben / Antwort entwerfen
- [x] **Entitäten vorschlagen** — Igor analysiert Email + lädt alle Attribut-Karten als Kontext
  - JSON-Array Antwort mit Regex extrahiert (Igor kann Umgebungstext schreiben)
  - Validierung gegen bekannte Entitäts-IDs (keine Halluzinationen)
  - Vorschlag-Chips → Klick verknüpft direkt mit DB
- [x] **In Antwort einfügen** — Igor-Antwort als initialBody in ComposeModal
- [x] **KI-Toolbar in ComposeModal** — Entwurf / Übersetzen / Verbessern
  - "Entwurf" verwendet Original-Email als Quelle
  - "Übersetzen" / "Verbessern" verwenden aktuellen Textarea-Inhalt

---

## Phase 4 — PDM-Integration vertiefen

- [ ] **AttributeDetail API** — `GET/PUT /api/projects/{id}`, `/tasks/{id}`, `/orders/{id}` in pdm-api
- [ ] **Email-Links cross-device** — Bulk-Endpunkt `GET /api/email-links-by-user?user=...`
- [ ] **pdm-api Auth aktivieren** — `SKIP_AUTH=1` entfernen, Bearer Token vom Frontend
- [ ] Attachment-Download (Graph API Download-Link in Email-Detail)
- [ ] Link entfernen aus UI (DELETE `/api/email-links`)
- [ ] Emails in Access-Forms sichtbar (Form_PdmObjekte, Form_AuftragsVerwaltung etc.)
- [ ] Email-Vorschau in PDM-Objekt-Detail

---

## Phase 5 — Mehrere Konten & Benachrichtigungen

- [ ] Mehrere Microsoft-Accounts gleichzeitig
- [ ] Push-Benachrichtigungen über Graph Webhooks
- [ ] Kalender-Ansicht (Meetings, Deadlines)
- [ ] Offline-Fähigkeit (Service Worker)

---

## Offene Fragen

- **Suche:** Graph API Search API vs. lokale Volltextsuche in PDM_db?
- **Attachment-Storage:** Anhänge direkt in SharePoint speichern (wie PDM-Thumbnails)?
- **Multi-User-Inbox:** Geteilte Postfächer / Alias-Adressen?
- **Igor Erweiterung:** Email-Kategorisierung (Kind-Feld) automatisch vorschlagen?
