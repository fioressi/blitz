window.HERPERT_PAGE_DATA = {
  "pages": [
    {
      "key": "bom",
      "file": "bom.html",
      "section": "engineering",
      "form": "Form_BomVerwaltung",
      "titles": {
        "de": "Stuckliste aufbauen",
        "en": "Build BOM",
        "hu": "Darabjegyzek epitese"
      },
      "summary": {
        "de": "BOM-Verwaltung mit Projekt, Baugruppe, Positionen und Teile-Eigenschaften nach Access-Vorbild.",
        "en": "BOM management with project, assembly, positions, and part properties following the Access form.",
        "hu": "BOM kezeles projekt, szerelveny, poziciok es alkatresz-tulajdonsagok szerint."
      },
      "filters": [
        "Projekt",
        "Baugruppe",
        "Teil hinzu",
        "Menge",
        "Position"
      ],
      "fields": [
        "Object-ID",
        "Part-ID",
        "Status",
        "Klasse",
        "Erstellt",
        "Bezeichnung",
        "Part Name",
        "Revision",
        "Make/Buy",
        "Typ",
        "Descr DE",
        "Descr EN",
        "Descr HU",
        "Kunden-PNo",
        "Ersatz fuer",
        "Subkategorie",
        "Dateiname",
        "Lieferanten"
      ],
      "actions": [
        "Hinzufuegen",
        "Zeile loeschen",
        "Menge aendern",
        "Position aendern",
        "Neue BOM",
        "Neue Teile9000 BOM",
        "MasterBOM",
        "Excel importieren",
        "Teile-Eigenschaften"
      ]
    },
    {
      "key": "production-order",
      "file": "production-order.html",
      "section": "planung",
      "form": "Form_ProductionOrder",
      "titles": {
        "de": "Fertigungsauftrag",
        "en": "Production Order",
        "hu": "Gyartasi megbizas"
      },
      "summary": {
        "de": "Neuen Produktionsauftrag mit Projekt, MasterBOM, Menge und Planterminen anlegen.",
        "en": "Create a production order with project, master BOM, quantity, and planning dates.",
        "hu": "Gyartasi megbizas letrehozasa projekttel, master BOM-mal, mennyiseggel es datumokkal."
      },
      "filters": [
        "Projekt",
        "MasterBOM"
      ],
      "fields": [
        "Produktionsauftrag",
        "Auftragstitel",
        "Menge",
        "Wunsch-Termin",
        "Planstart",
        "Planende",
        "Notizen"
      ],
      "actions": [
        "Anlegen",
        "Abbrechen"
      ]
    },
    {
      "key": "orders",
      "file": "orders.html",
      "section": "planung",
      "form": "Form_AuftragsVerwaltung",
      "titles": {
        "de": "Auftragsubersicht",
        "en": "Order Overview",
        "hu": "Rendeles attekintes"
      },
      "summary": {
        "de": "Bestehende Auftraege, Status, Material-Verfuegbarkeit, BOM-Zuordnung und Readiness-Check.",
        "en": "Existing orders, status, material availability, BOM assignment, and readiness check.",
        "hu": "Meglevo rendelesek, statusz, anyagelerhetoseg, BOM hozzarendeles es readiness ellenorzes."
      },
      "filters": [
        "Bestehende Auftraege",
        "Status"
      ],
      "fields": [
        "Auftragsnr.",
        "Titel",
        "Status",
        "MasterBOM",
        "Menge",
        "Wunsch-Termin",
        "Planstart",
        "Planende",
        "Notizen",
        "Material-Verfuegbarkeit",
        "Bedarfsliste",
        "MasterBOM-Abgleich"
      ],
      "actions": [
        "Status aendern",
        "Loeschen",
        "Excel Export",
        "Bericht",
        "Speichern",
        "Material reservieren",
        "PO-Zuordnung",
        "Readiness-Check"
      ]
    },
    {
      "key": "readiness",
      "file": "readiness.html",
      "section": "planung",
      "form": "Form_ReadinessWorkbench",
      "titles": {
        "de": "Beschaffungsvorbereitung",
        "en": "Readiness Workbench",
        "hu": "Beszerzesi elokeszites"
      },
      "summary": {
        "de": "Material-Readiness vorbereiten, rote Positionen markieren und RFQ-Pakete aus Auswahl erzeugen.",
        "en": "Prepare material readiness, mark red items, and create RFQ packages from selection.",
        "hu": "Anyag-readiness elokeszitese, piros tetelek jelolese es RFQ csomag keszitese."
      },
      "filters": [
        "Production Order",
        "RFQ an",
        "Frist"
      ],
      "fields": [
        "Materialstatus",
        "Auswahl",
        "Beschaffungsbedarf",
        "Lieferant",
        "Bericht"
      ],
      "actions": [
        "Alle ROT ankreuzen",
        "Auswahl leeren",
        "Aktualisieren",
        "Excel-Export",
        "RFQ-Paket aus Auswahl",
        "Bericht PDF"
      ]
    },
    {
      "key": "purchase-order",
      "file": "purchase-order.html",
      "section": "einkauf",
      "form": "Form_PurchaseOrder",
      "titles": {
        "de": "Bestellungen",
        "en": "Purchase Orders",
        "hu": "Beszerzesek"
      },
      "summary": {
        "de": "Purchase Order anlegen, Auftrag laden und Positionen mit Menge, Preis, Fracht und Zoll bearbeiten.",
        "en": "Create purchase orders, load an order, and edit lines with quantity, price, freight, and customs.",
        "hu": "Beszerzes letrehozasa, rendeles betoltese es sorok szerkesztese mennyiseggel, arral, fuvarral, vammal."
      },
      "filters": [
        "Auftrag",
        "Projekt",
        "Lieferant",
        "BOM"
      ],
      "fields": [
        "Anzahl",
        "Beschreibung",
        "Menge",
        "Preis",
        "Zeilenwaehr",
        "Fracht",
        "Zoll",
        "Pos"
      ],
      "actions": [
        "Laden",
        "Zeile speichern",
        "Neu Freipos",
        "Zeile loeschen",
        "BESTELLEN"
      ]
    },
    {
      "key": "supplier-quotes",
      "file": "supplier-quotes.html",
      "section": "einkauf",
      "form": "Form_SupplierQuotes",
      "titles": {
        "de": "Angebote",
        "en": "Supplier Quotes",
        "hu": "Beszallitoi ajanlatok"
      },
      "summary": {
        "de": "Lieferanten-Angebote mit Status, Projekt, Quote-Nummer, Gueltigkeit, Waehrung und Linien pflegen.",
        "en": "Maintain supplier quotes with status, project, quote number, validity, currency, and lines.",
        "hu": "Beszallitoi ajanlatok kezelese statusszal, projekttel, ajanlatszammal, ervenyesseggel, penznemmel es sorokkal."
      },
      "filters": [
        "Lieferant",
        "Status"
      ],
      "fields": [
        "Lieferant",
        "Projekt",
        "Quote-Nr",
        "Erhalten",
        "Gueltig bis",
        "Waehrung",
        "Status",
        "Notizen",
        "Linien"
      ],
      "actions": [
        "Filter",
        "Neu",
        "Speichern",
        "Loeschen",
        "+",
        "-"
      ]
    },
    {
      "key": "supplier-invoices",
      "file": "supplier-invoices.html",
      "section": "einkauf",
      "form": "Form_SupplierInvoices",
      "titles": {
        "de": "Rechnungen",
        "en": "Supplier Invoices",
        "hu": "Beszallitoi szamlak"
      },
      "summary": {
        "de": "Lieferanten-Rechnungen mit PO, Rechnungsnummer, Faelligkeit, Zahlung und Summen erfassen.",
        "en": "Record supplier invoices with PO, invoice number, due date, payment, and totals.",
        "hu": "Beszallitoi szamlak rogzitese PO-val, szamlaszammal, hataridovel, fizetessel es osszegekkel."
      },
      "filters": [
        "Lieferant",
        "Status"
      ],
      "fields": [
        "Lieferant",
        "PO",
        "Rechn-Nr",
        "Datum",
        "Faellig",
        "Bezahlt",
        "Waehrung",
        "Status",
        "Netto",
        "MwSt",
        "Fracht",
        "Zoll",
        "Total",
        "Notizen",
        "Linien"
      ],
      "actions": [
        "Filter",
        "Neu",
        "Speichern",
        "Loeschen",
        "+",
        "-"
      ]
    },
    {
      "key": "rfq",
      "file": "rfq.html",
      "section": "einkauf",
      "form": "Form_RfqVerwaltung",
      "titles": {
        "de": "Anfragen",
        "en": "RFQ Management",
        "hu": "Ajanlatkeresek"
      },
      "summary": {
        "de": "RFQ-Pakete, Status-Workflow, Anfrage-Zeilen, Preise, Notizen und E-Mail-Vorlage.",
        "en": "RFQ packages, status workflow, request lines, prices, notes, and email template.",
        "hu": "RFQ csomagok, statusz-folyamat, keresesi sorok, arak, jegyzetek es email sablon."
      },
      "filters": [
        "RFQ-Pakete",
        "Status"
      ],
      "fields": [
        "Anfrage-Zeilen",
        "Preis",
        "Datum",
        "Notizen",
        "E-Mail-Vorlage"
      ],
      "actions": [
        "Neu",
        "Als SENT markieren",
        "Angebot erhalten",
        "Abschliessen",
        "Preis speichern",
        "Notizen speichern",
        "Vorlage generieren"
      ]
    },
    {
      "key": "receiving",
      "file": "receiving.html",
      "section": "lager",
      "form": "Form_Wareneingang",
      "titles": {
        "de": "Wareneingang",
        "en": "Goods Receiving",
        "hu": "Aruatvetel"
      },
      "summary": {
        "de": "Lieferschein-Match gegen Bestellung mit Soll-Mengen, Annahme, Teilannahme und Beanstandung.",
        "en": "Delivery-note matching against purchase order with expected quantities, accept, partial accept, and reject.",
        "hu": "Szallito-level egyeztetese beszerzessel, vart mennyisegek, atvetel, reszatvetel es kifogas."
      },
      "filters": [
        "Bestellung",
        "Lieferant",
        "Datum",
        "Lieferschein-Nr"
      ],
      "fields": [
        "PO-Info",
        "Notizen",
        "Soll-Mengen aus PO",
        "Reject-Grund"
      ],
      "actions": [
        "Annehmen",
        "Teilannahme",
        "Beanstanden"
      ]
    },
    {
      "key": "qc",
      "file": "qc.html",
      "section": "lager",
      "form": "Form_InspektionQC",
      "titles": {
        "de": "Prufung und QS",
        "en": "Inspection and QC",
        "hu": "Ellenorzes es QC"
      },
      "summary": {
        "de": "Wareneingang inspizieren, Messungen erfassen und QC-Entscheid PASS oder FAIL dokumentieren.",
        "en": "Inspect receipt, record measurements, and document QC decision PASS or FAIL.",
        "hu": "Aruatvetel ellenorzese, meresek rogzitese es PASS vagy FAIL QC dontes dokumentalasa."
      },
      "filters": [
        "Wareneingang"
      ],
      "fields": [
        "Notizen Inspektion",
        "Zeile",
        "Merkmal",
        "Sollwert",
        "Istwert",
        "Toleranz",
        "Ergebnis",
        "Erfasste Messungen",
        "Begruendung FAIL"
      ],
      "actions": [
        "Inspektion starten",
        "Messung speichern",
        "PASS Freigabe zur Einlagerung",
        "FAIL Claims anlegen"
      ]
    },
    {
      "key": "putaway",
      "file": "putaway.html",
      "section": "lager",
      "form": "Form_Einlagern",
      "titles": {
        "de": "Einlagern",
        "en": "Putaway",
        "hu": "Betarolas"
      },
      "summary": {
        "de": "Freigegebene Wareneingaenge in Lagerbestand uebernehmen, Losnummer und Lagerplatz erfassen.",
        "en": "Move approved receipts into stock, recording lot number and storage location.",
        "hu": "Jovahagyott aruatvetelek keszletre vetele, tetelszam es tarhely rogzitese."
      },
      "filters": [
        "Wareneingang"
      ],
      "fields": [
        "Los-Nummer",
        "Lagerplatz",
        "Aktueller Lagerbestand"
      ],
      "actions": [
        "Einlagern Putaway"
      ]
    },
    {
      "key": "companies",
      "file": "companies.html",
      "section": "prozesse",
      "form": "Form_CrmUnternehmen",
      "titles": {
        "de": "Firmen",
        "en": "Companies",
        "hu": "Cegek"
      },
      "summary": {
        "de": "CRM-Unternehmen mit Typ, Adresse, Kontaktwegen, E-Mails und Tasks pflegen.",
        "en": "Maintain CRM companies with type, address, contact channels, emails, and tasks.",
        "hu": "CRM cegek kezelese tipussal, cimmel, kapcsolati adatokkal, emailekkel es feladatokkal."
      },
      "filters": [
        "Firmenname",
        "Typ"
      ],
      "fields": [
        "Firmenname",
        "Typ",
        "Strasse",
        "Ort",
        "PLZ",
        "Land",
        "Telefon",
        "Email",
        "Website",
        "Notizen",
        "E-Mails",
        "Tasks"
      ],
      "actions": [
        "Neu",
        "Aendern",
        "Speichern",
        "Loeschen",
        "Oeffnen",
        "Neuer Task",
        "Bearbeiten"
      ]
    },
    {
      "key": "contacts",
      "file": "contacts.html",
      "section": "admin",
      "form": "Form_CrmKontakte",
      "titles": {
        "de": "Kontakte",
        "en": "Contacts",
        "hu": "Kapcsolatok"
      },
      "summary": {
        "de": "CRM-Kontakte nach Firma filtern und mit Rolle, E-Mail, Telefon, Mobil und Notizen pflegen.",
        "en": "Filter CRM contacts by company and maintain role, email, phone, mobile, and notes.",
        "hu": "CRM kapcsolatok szurese ceg szerint, szerep, email, telefon, mobil es jegyzetek kezelese."
      },
      "filters": [
        "Filter Firma"
      ],
      "fields": [
        "Vorname",
        "Nachname",
        "Firma",
        "Jobtitel",
        "Email",
        "Telefon",
        "Mobil",
        "Notizen"
      ],
      "actions": [
        "Neu",
        "Speichern",
        "Loeschen"
      ]
    },
    {
      "key": "projects",
      "file": "projects.html",
      "section": "admin",
      "form": "Form_ProjektVerwaltung",
      "titles": {
        "de": "Projekte",
        "en": "Projects",
        "hu": "Projektek"
      },
      "summary": {
        "de": "Projektverwaltung mit Firma, Alias, Verantwortlichem, Kunde, Statusfreigaben, E-Mails und Tasks.",
        "en": "Project management with company, alias, owner, customer, status approvals, emails, and tasks.",
        "hu": "Projektkezeles ceggel, aliasszal, felelossel, ugyfellel, statusz-jovahagyassal, emailekkel es feladatokkal."
      },
      "filters": [
        "Firma",
        "Kunde",
        "Status"
      ],
      "fields": [
        "Projektname",
        "Alias",
        "Zustaendig",
        "Kunde",
        "Status",
        "Freigegebene Statuswerte",
        "E-Mails",
        "Tasks"
      ],
      "actions": [
        "Neu",
        "Speichern",
        "Loeschen",
        "Status freigeben",
        "Oeffnen",
        "Neuer Task",
        "Bearbeiten"
      ]
    }
  ],
  "existing": [
    {
      "file": "new-object.html",
      "section": "engineering",
      "titles": {
        "de": "Objekt anlegen",
        "en": "Create Object",
        "hu": "Objektum letrehozasa"
      },
      "summary": {
        "de": "Mobile Objektanlage mit Foto und Thumbnail.",
        "en": "Mobile object creation with photo and thumbnail.",
        "hu": "Mobil objektumletrehozas fotoval es miniaturral."
      },
      "state": "live"
    },
    {
      "file": "tasks.html",
      "section": "admin",
      "titles": {
        "de": "Aufgaben",
        "en": "Tasks",
        "hu": "Feladatok"
      },
      "summary": {
        "de": "Task Board fur PDM-Aufgaben.",
        "en": "Task board for PDM work.",
        "hu": "Feladattabla PDM munkakhoz."
      },
      "state": "live"
    },
    {
      "file": "po-tracking.html",
      "section": "einkauf",
      "titles": {
        "de": "Bestellverfolgung",
        "en": "PO Tracking",
        "hu": "Beszerzes kovetes"
      },
      "summary": {
        "de": "Mobile Einkaufs- und Bestellverfolgung.",
        "en": "Mobile purchasing and PO tracking.",
        "hu": "Mobil beszerzesi es PO kovetes."
      },
      "state": "live"
    }
  ],
  "groups": [
    {
      "key": "engineering",
      "titles": {
        "de": "Entwicklung",
        "en": "Engineering",
        "hu": "Fejlesztes"
      }
    },
    {
      "key": "planung",
      "titles": {
        "de": "Planung",
        "en": "Planning",
        "hu": "Tervezes"
      }
    },
    {
      "key": "einkauf",
      "titles": {
        "de": "Einkauf",
        "en": "Purchasing",
        "hu": "Beszerzes"
      }
    },
    {
      "key": "lager",
      "titles": {
        "de": "Lager",
        "en": "Warehouse",
        "hu": "Raktar"
      }
    },
    {
      "key": "prozesse",
      "titles": {
        "de": "Prozesse",
        "en": "Processes",
        "hu": "Folyamatok"
      }
    },
    {
      "key": "admin",
      "titles": {
        "de": "Admin",
        "en": "Admin",
        "hu": "Admin"
      }
    }
  ],
  "i18n": {
    "de": {
      "home": "Hauptmenu",
      "source": "Access-Quelle",
      "filters": "Filter",
      "details": "Details",
      "lines": "Liste / Positionen",
      "actions": "Aktionen",
      "prepared": "UI vorbereitet",
      "preparedText": "Diese Seite spiegelt die Access-Maske. Schreibende Aktionen sind erst aktiv, wenn die passende API verdrahtet ist.",
      "search": "Suchen",
      "choose": "Auswahlen",
      "enter": "Eingeben",
      "notes": "Notizen",
      "status": "Status",
      "live": "Live",
      "preparedBadge": "Vorbereitet"
    },
    "en": {
      "home": "Main Menu",
      "source": "Access source",
      "filters": "Filters",
      "details": "Details",
      "lines": "List / lines",
      "actions": "Actions",
      "prepared": "UI prepared",
      "preparedText": "This page mirrors the Access form. Write actions stay inactive until the matching API is connected.",
      "search": "Search",
      "choose": "Select",
      "enter": "Enter",
      "notes": "Notes",
      "status": "Status",
      "live": "Live",
      "preparedBadge": "Prepared"
    },
    "hu": {
      "home": "Fomenu",
      "source": "Access forras",
      "filters": "Szurok",
      "details": "Reszletek",
      "lines": "Lista / sorok",
      "actions": "Muveletek",
      "prepared": "UI elokeszitve",
      "preparedText": "Ez az oldal az Access urlapot tukrozi. Az iro muveletek csak a megfelelo API bekotese utan aktivak.",
      "search": "Kereses",
      "choose": "Valasztas",
      "enter": "Beiras",
      "notes": "Jegyzetek",
      "status": "Statusz",
      "live": "Elo",
      "preparedBadge": "Elokeszitve"
    }
  }
};
