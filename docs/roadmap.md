# Blitz — Roadmap

## Phase 1 — Web Probe (aktiv)

Ziel: Funktionierender Prototyp mit echten Microsoft-Emails und PDM-Verknüpfung.

### Auth & Setup
- [x] Azure AD App Registration (blitz, Client ID: a1627a40-...)
- [x] MSAL loginRedirect / handleRedirectPromise
- [x] AuthGuard (Login-Screen wenn nicht eingeloggt)

### UI Grundstruktur
- [x] Drei-Spalten-Layout (Attribute links | Inbox Mitte | Attribute rechts)
- [x] Email-Karten mit elastischem Swipe links/rechts (framer-motion)
- [x] Attribut-Panels mit draggable Karten (@dnd-kit, DragOverlay)
- [x] Karten schweben frei über allen Containern während Drag
- [x] Reply-Tray (unterer Container — Email hierher ziehen)
- [x] Email-Detail Modal (HTML-Body, Anhang-Liste)

### Graph API Integration
- [x] Posteingang aus Graph API laden
- [x] Email-Detail mit vollständigem HTML-Body
- [x] Anhang-Metadaten (Name, Größe, Typ)
- [ ] Anhang-Download (direkter Link auf Graph API)

### PDM-Datenbank (pdm-api)
- [x] Attribut-Panels mit echten Daten aus `GET /api/search`
- [x] Drag Attribut → Email-Karte → `POST /api/emails` in dbo.EMAILS + dbo.EMAIL_LINKS
- [x] Links beim Öffnen einer Email aus `GET /api/emails/by-message` nachladen
- [ ] Swipe rechts ohne Attribut → Email ohne Target speichern

### Kontakte
- [ ] Kontakte aus Graph API laden
- [ ] Autovervollständigung beim Verfassen

### Email verfassen
- [ ] Compose-Fenster (Neu, Antworten, Weiterleiten)
- [ ] Anhang hinzufügen

---

## Phase 2 — PDM-Integration vertiefen

- Emails in Access-Forms sichtbar (Form_PdmObjekte, Form_AuftragsVerwaltung etc.)
- Email-Vorschau in PDM-Objekt-Detail
- Benachrichtigungen bei neuen Emails zu einem PDM-Objekt
- Link entfernen (DELETE /api/email-links aus UI)
- Swipe rechts → Email ohne Target speichern (pdm-api Erweiterung)

---

## Phase 3 — Mehrere Konten & Kalender

- Mehrere Microsoft-Accounts gleichzeitig
- Kalender-Ansicht (Meetings, Deadlines)
- Offline-Fähigkeit (lokaler Cache / Service Worker)
- Mobile-optimierte Ansicht

---

## Offene Fragen / Entscheidungen

- **Suche:** Graph API Search API vs. lokale Volltextsuche in PDM_db
- **Attachment-Storage:** Anhänge in SharePoint speichern (wie PDM-Thumbnails)?
- **Notifications:** Push-Benachrichtigungen über Graph Webhooks?
- **Multi-User-Inbox:** Geteilte Postfächer / Alias-Adressen?
- **Deploy:** Azure Static Web Apps oder eigenes Hosting?
