# Rudel-Chat — Vorschlag zur Gruppenabstimmung

**Datum:** 2026-05-30  
**Autor:** Matthäus Unger  
**Status:** Zur Diskussion

---

## Was ist das?

Rudel-Chat ist ein KI-Arbeitsraum direkt in Blitz.

Kein separates Tool. Kein neues Fenster. Ein aufklappbarer Chat-Bereich auf der rechten Seite von Blitz — der weiß, wo du gerade bist, und dir dabei hilft, die Arbeit zu verstehen.

Der entscheidende Unterschied zu einem normalen KI-Chat:

> Rudel kennt deine aktuelle Arbeitssituation. Er sieht, welche Seite offen ist, welche Einträge sichtbar sind, was ausgewählt ist. Er kann bei Bedarf echte PDM-Daten aus HERPERT holen. Und er kann andere KIs als weitere Stimmen in den Raum holen.

---

## Warum bauen wir das?

In der täglichen Arbeit passiert oft folgendes:

- Du siehst eine Liste offener Bestellungen und fragst dich: *Was ist hier am kritischsten?*
- Du hast eine E-Mail zu einem Projekt und fragst dich: *Welche Tasks hängen daran?*
- Du willst eine Entscheidung treffen und brauchst schnell eine Einschätzung

Heute gibt es dafür keinen Ort in Blitz. Du müsstest manuell suchen, kopieren, einfügen, nachdenken — oder einen externen Chat öffnen, dem du alles erst erklären musst.

Rudel macht das überflüssig. Der Kontext ist schon da.

---

## Wie sieht das aus?

Du bist auf der Seite *Offene Bestellungen*.

Du klappst Rudel auf.

Rudel weiß sofort: Seite = Bestellungen, 12 sichtbar, A12345 ausgewählt.

Du schreibst: **„Was ist hier am kritischsten?"**

Igor — der KI-Assistent im Kern von Rudel — schaut auf die sichtbaren Bestellungen, fragt ggf. kurz bei HERPERT nach (Status, Fälligkeit, Blockierungen), und antwortet.

Das war's. Kein Copy-Paste, kein Erklären.

---

## Wer ist Igor?

Igor ist der KI-Assistent, der Rudel führt.

Er ist bereits Teil von Blitz (für E-Mail-Zusammenfassungen, Antwort-Entwürfe etc.).

Im Rudel-Kontext übernimmt Igor eine erweiterte Rolle:
- Er empfängt den Blitz-Kontext
- Er holt bei Bedarf echte Daten aus HERPERT
- Er kann andere KIs intern konsultieren
- Er fasst alles zusammen und antwortet

**Igor trifft die Entscheidungen. Andere KIs sind Konsulenten, keine Gleichberechtigten.**

---

## Wer kann noch dabei sein?

Rudel ist so gebaut, dass weitere KIs dem Raum beitreten können — entweder sichtbar oder still.

### Sichtbar im Chat

Ein KI-Assistent kann bewusst in den Chat geholt werden und sichtbar mitschreiben.

Beispiel: Du klickst „Claude Local hinzufügen". Claude bekommt den aktuellen Kontext und den bisherigen Gesprächsverlauf, und kann sichtbar antworten.

Das ist gut für: Zweitmeinungen, andere Perspektiven, paralleles Denken.

### Still im Hintergrund

Eine KI kann Igor intern beraten, ohne im Chat aufzutauchen.

Du fragst Igor etwas. Igor konsultiert im Hintergrund „BrainB". BrainB antwortet nur Igor. Igor antwortet dir — informiert durch beide.

Das ist gut für: Gegenprüfung, Risikobewertung, leise Beratung.

### Lokale Terminal-KIs

KIs, die auf deinem Computer im Terminal laufen, können sich in denselben Raum einwählen — nicht über einen eigenen Kanal, sondern als gleichgestellte Teilnehmer in Rudel.

Das ist wichtig für: Modelle, die du lokal betreibst, experimentelle KIs, datenschutzsensible Situationen.

---

## Was weiß Rudel über HERPERT?

Rudel hat Lesezugriff auf definierte PDM-Daten:

| Was | Beispiel |
|---|---|
| Bestellungen | Status, Fälligkeit, Blockierungen |
| Objekte | Part-ID, Status, Klasse |
| Fertigungsaufträge | Status, Fehlteile, Termin |
| Projekte | Code, Status, verknüpfte Einträge |
| Tasks | Offene Aufgaben, Verantwortliche |

**Kein freier Datenbankzugriff.** Nur definierte, sichere Abfrage-Typen.

---

## Was passiert, wenn Rudel geschlossen ist?

Nichts.

Das ist eine Kerneigenschaft:

> Solange der Drawer geschlossen ist, werden keine KI-Anfragen gestartet, keine Daten abgefragt, keine Kosten verursacht.

Rudel lauscht nicht im Hintergrund. Es läuft nur, wenn du es aktiv öffnest.

---

## Was soll Version 1 können?

Für den ersten Wurf schlagen wir vor, nur das Wesentliche zu bauen:

| ✅ V1 | ❌ Nicht V1 |
|---|---|
| Rechter Drawer in Blitz | Echtzeit-Synchronisation mehrerer Geräte |
| Igor antwortet im Kontext | Automatische stille Konsulenten |
| HERPERT-Abfragen für Bestellungen, Objekte, Tasks | Volltextsuche in HERPERT |
| Kontext-Snapshot beim Öffnen | Persistenz über Sessions |
| Ein lokaler Teilnehmer (z.B. Claude Local) | Terminal-CLI-Paket |
| Teilnehmer join / leave | Mehr als 1 externer Teilnehmer |

Das ergibt eine vollständige, nutzbare erste Version ohne technischen Overengineering.

---

## Technische Heimat

| Baustein | Wo |
|---|---|
| Rudel-Drawer UI | Blitz (React, neues Component) |
| KI-Orchestrierung | pdm-api (neuer `/rudel/chat` Endpoint) |
| Igor-Logik | Igor (igor.fioresi.cloud) |
| Herpert-Abfragen | pdm-api (bestehende Endpoints) |
| Terminal-Adapter | Lokales Script (V2) |

Kein neues Repo, keine neue Infrastruktur. Alles baut auf dem, was schon läuft.

---

## Was müssen wir als Gruppe entscheiden?

Bevor wir anfangen, brauchen wir Einigkeit zu diesen Punkten:

### 1. Scope V1
Sind wir einig, dass V1 nur Igor + 1 lokaler Teilnehmer ist — ohne WebSocket, ohne Persistenz?

### 2. Herpert-Zugriff
Welche Abfrage-Typen soll Igor in V1 nutzen dürfen? Vorschlag: orders, objects, tasks, projects.

### 3. Igor als Chef
Sind wir einig, dass Igor die Konversation führt und andere KIs explizit eingeladen werden müssen — keine automatische Aktivierung?

### 4. Datenschutz
Was geht in den Kontext-Snapshot? Dürfen echte Eintrags-IDs an Igor gesendet werden, oder nur Typen/Zählungen?

### 5. Lokale KIs
Welche lokalen Modelle sollen in V1 unterstützt werden? Vorschlag: Claude Local (claude-code CLI).

---

## Nächste Schritte (nach Abstimmung)

1. Entscheidungen aus obiger Liste klären
2. Igor-Endpoint `POST /rudel/chat` in pdm-api bauen
3. RudelDrawer-Komponente in Blitz bauen
4. Ersten Test im lokalen Dev-Server
5. Deploy und echte Nutzung

---

*Die detaillierte technische Spezifikation (Schemas, Event-Flows, API-Definitionen) liegt in `docs/rudel-spec.md`.*
