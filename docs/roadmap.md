# Blitz — Roadmap

## Phase 1 — Aktiver Stand (Mai 2026)

### Auth & Deployment
- [x] Azure AD App Registration (blitz, PKCE SPA)
- [x] MSAL loginRedirect / handleRedirectPromise
- [x] AuthGuard (Login-Screen wenn nicht eingeloggt)
- [x] Azure Static Web Apps Deployment (`victorious-bush-0a2200403.7.azurestaticapps.net`)
- [x] GitHub Actions CI/CD (Push → Build → Deploy)
- [x] SPA-Routing via `staticwebapp.config.json`

### UI Grundstruktur
- [x] Drei-Spalten-Layout (Attribute links | Inbox Mitte | Attribute rechts)
- [x] Drei Tabs: Posteingang / Gelesen / Beantworten mit Badge-Counts
- [x] Email-Karten mit elastischem Swipe links/rechts (framer-motion)
- [x] Attribut-Panels mit draggable Karten (@dnd-kit, DragOverlay)
- [x] Karten schweben frei über allen Containern während Drag
- [x] Reply-Tray (unterer Drop-Balken, expandiert beim Drag)
- [x] Email-Detail Modal (HTML-Body, Anhang-Liste)
- [x] Responsive Layout — Attribut-Panels als Slide-in Drawer (Mobile < 768px)
- [x] Email-Detail als Bottom Sheet auf Mobile
- [x] HERPERT Design Language (Inter, glassmorphism, cyan accent)

### Graph API Integration
- [x] Posteingang aus Graph API laden
- [x] Email-Detail mit vollständigem HTML-Body
- [x] Anhang-Metadaten (Name, Größe, Typ)
- [ ] Anhang-Download (direkter Link auf Graph API)

### Triage & Persistenz
- [x] Swipe links → dauerhaft ausblenden (`localStorage blitz_dismissed`)
- [x] Swipe rechts → als gelesen markieren (`localStorage blitz_read`, bleibt nach Reload)
- [x] Kein Reload-Spam — verarbeitete Emails werden beim Laden herausgefiltert
- [x] Reply-Drag-Konflikt behoben (`onPointerDown stopPropagation`, dnd-kit/framer-motion)

### PDM-Datenbank (pdm-api)
- [x] Attribut-Panels mit echten Daten aus `GET /api/search`
- [x] Drag Attribut → Email-Karte → `POST /api/emails` (idempotent)
- [x] Links beim Öffnen einer Email aus `GET /api/emails/by-message` nachladen
- [x] `+` Button im Projekte-Panel → Neues Projekt anlegen (`POST /api/projects`)
- [x] `+` Button im Tasks-Panel → Neuer Task anlegen (`POST /api/tasks`, SharePoint-Sync)

---

## Phase 2 — PDM-Integration vertiefen

- [ ] Email ohne Attribut speichern (pdm-api: `targets` optional machen)
- [ ] Link entfernen aus UI (DELETE `/api/email-links`)
- [ ] Attachment-Download (Graph API Download-Link in Email-Detail)
- [ ] Emails in Access-Forms sichtbar (Form_PdmObjekte, Form_AuftragsVerwaltung etc.)
- [ ] Email-Vorschau in PDM-Objekt-Detail
- [ ] pdm-api Auth aktivieren (SKIP_AUTH=1 entfernen, Bearer Token vom Frontend)

---

## Phase 3 — Email verfassen

- [ ] Compose-Fenster (Neu, Antworten, Weiterleiten)
- [ ] Anhang hinzufügen
- [ ] Autovervollständigung für Empfänger (Graph Contacts API)

---

## Phase 4 — Mehrere Konten & Benachrichtigungen

- [ ] Mehrere Microsoft-Accounts gleichzeitig
- [ ] Push-Benachrichtigungen über Graph Webhooks
- [ ] Kalender-Ansicht (Meetings, Deadlines)
- [ ] Offline-Fähigkeit (Service Worker)

---

## Offene Fragen

- **Suche:** Graph API Search API vs. lokale Volltextsuche in PDM_db?
- **Attachment-Storage:** Anhänge direkt in SharePoint speichern (wie PDM-Thumbnails)?
- **Multi-User-Inbox:** Geteilte Postfächer / Alias-Adressen?
- **localStorage → Server:** Dismissed/Read IDs auf Server migrieren für geräteübergreifende Sync?
