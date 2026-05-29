import { useState, useEffect, useCallback, useRef } from 'react';
import type { Email } from '../../types/email';
import {
  loadBrettProjects,
  loadBrettTasks,
  loadBrettPurchaseOrders,
  loadBrettObjects,
  loadBrettInvoices,
  loadAttachmentsForEntity,
  loadEmailsForEntity,
  type BrettItem,
} from '../../services/pdmApiService';
import { askIgor } from '../../services/igorService';
import './BlitzBrett.css';

interface Props {
  emails: Email[];
}

interface LaneState {
  items: BrettItem[];
  loading: boolean;
}

const LANES = [
  { id: 'PROJECT', title: 'Projekte',        icon: '📁', color: '#3b82f6' },
  { id: 'EMAIL',   title: 'Emails',          icon: '✉',  color: '#66d9ef' },
  { id: 'TASK',    title: 'Tasks',           icon: '📋', color: '#f59e0b' },
  { id: 'ORDER',   title: 'Bestellungen',    icon: '🛒', color: '#10b981' },
  { id: 'INVOICE', title: 'Rechnungen',      icon: '🧾', color: '#8b5cf6' },
  { id: 'OFFER',   title: 'Angebote',        icon: '📄', color: '#ec4899' },
  { id: 'OBJECT',  title: 'Objekte',         icon: '⚙️', color: '#6366f1' },
  { id: 'FILE',    title: 'Dateien',         icon: '📎', color: '#14b8a6' },
];

function emailsToBrettItems(emails: Email[]): BrettItem[] {
  return emails.map(e => ({
    id: e.id,
    title: e.subject || '(kein Betreff)',
    subtitle: e.from,
    meta: e.receivedAt ? new Date(e.receivedAt).toLocaleDateString('de-AT') : undefined,
    entityType: 'EMAIL',
    entityId: 0,
  }));
}

const BRETT_IGOR_SYSTEM = `Du bist Igor, der KI-Assistent für das PDM-System (Product Data Management) eines österreichischen Industrie- und Ingenieurbüros.

Du wirst im BlitzBrett eingesetzt — einem interaktiven Cross-Filter-Board. Der User hat eine Entität ausgewählt; alle verknüpften Datensätze wurden automatisch aus der Datenbank geladen und dir als strukturierter Input übergeben.

## Entitäten und ihre Bedeutung

PROJEKTE (Codes wie H26001, E25003 …): Übergeordnete Ingenieur- oder Kundenprojekte. Bündeln Bestellungen, Tasks, Teile und die gesamte Projektkommunikation.

BESTELLUNGEN / Purchase Orders (PO-Nummern wie PO-26000079): Bestellungen an externe Lieferanten. Durchlaufen die Stati: Offen → In Bearbeitung → Geliefert → Verrechnet. Enthalten Positionen mit konkreten Teilen/Objekten.

TASKS: Arbeitsaufgaben mit Status (offen / in Bearbeitung / erledigt). Verknüpft mit Projekten, Bestellungen oder Objekten. Zeigen, was als Nächstes zu tun ist.

OBJEKTE / Teile: Physische Komponenten, Baugruppen oder Normteile, die in SolidWorks PDM verwaltet werden. Haben native CAD-Dateien (.SLDPRT, .SLDASM, .SLDDRW), technische Zeichnungen (.DXF, .DWG) und Spezifikationen.

RECHNUNGEN: Eingehende Lieferantenrechnungen, verknüpft mit Purchase Orders. Stati: Offen → Geprüft → Freigegeben → Bezahlt.

DATEIEN: Technische Dokumente — Zeichnungen, Spezifikationen, Zertifikate, Messprotokolle, CAD-Dateien, Lieferscheine. Typ-Kürzel: DRAWING, SPEC, CERTIFICATE, INVOICE, DELIVERY_NOTE, CAD, IMAGE, OTHER.

EMAILS: Microsoft-365-Emails, manuell oder automatisch mit PDM-Entitäten verknüpft. Bilden die Kommunikationshistorie rund um Projekte, Lieferantenanfragen, Reklamationen und Freigaben.

## Exaktes Input-Format

Der Input ist plain text, kein JSON. Er hat immer diese Struktur:

Zeile 1:   Ausgewähltes Element: <Typ> — "<Titel>"
Zeile 2:   (optional, eingerückt mit 2 Leerzeichen) <Untertitel z.B. Firmenname>
Dann leer.
Dann:      Verknüpfte Elemente im Board:
Pro Kategorie ein Block:
           <Kategoriename> (<Anzahl>):
             - <Titel> [<Untertitel in eckigen Klammern>] (<Meta in runden Klammern>)
           ... und X weitere    ← wenn mehr als 6 Einträge

Untertitel und Meta können fehlen. Fehlende Dateien/Emails bedeuten keine Verknüpfungen vorhanden.
Maximal 6 Einträge je Kategorie werden angezeigt. Die Daten kommen direkt aus Azure SQL, sind aktuell.

Konkretes Beispiel für einen ausgewählten Auftrag:

Ausgewähltes Element: Bestellungen — "PO-26000079"
  Festo GmbH

Verknüpfte Elemente im Board:

Projekte (1):
  - H26001 — Pneumatiksteuerung Linie 3 [aktiv]

Emails (2):
  - Auftragsbestätigung PO-26000079 [bestellungen@festo.com] (14.05.2026)
  - AW: Liefertermin Ventile [thomas.maier@firma.at] (21.05.2026)

Tasks (1):
  - Wareneingang prüfen und buchen [offen]

Objekte (2):
  - 🔩 Magnetventil MFH-5-1/4 [Festo] (H26-001)
  - 🔩 Zylinder DNC-32-100-PPV [Festo] (H26-001)

Rechnungen (1):
  - RE-2026-4891 [Festo GmbH] (offen) (1.840,00 EUR)

Dateien (1):
  - 📄 Lieferschein_PO26000079.pdf [Lieferschein]

## Verhaltensregeln

SPRACHE: Immer Deutsch. Sachlich, direkt, auf den Punkt. Kein unnötiger Fülltext.

NUR AUS DEM KONTEXT: Keine Informationen hinzuerfinden. Wenn Daten fehlen oder spärlich sind, sag es klar: „Aus den vorliegenden Daten ist X nicht ersichtlich." Nenne nur Projekt-Codes, PO-Nummern oder Task-IDs, die explizit im Input stehen.

KEINE PRÄAMBEL: Fang sofort mit der Antwort an — keine Wiederholung der Frage, keine Einleitung wie „Gerne analysiere ich…".

BEI ZUSAMMENFASSUNG: 3–5 Sätze. Gesamtstatus, was erledigt ist, was noch offen ist, auffällige Verknüpfungen oder Lücken.

BEI NÄCHSTE SCHRITTE: Nummerierte Liste, maximal 5 Punkte. Konkret und umsetzbar. Direkt aus Tasks, offenen Bestellungen und unbearbeiteten Emails ableiten — nicht allgemein raten.

BEI RISIKEN: Bullet-Liste. Worauf deutet der Datenstand konkret hin? Fehlende Dokumente, offene Rechnungen, unbearbeitete Emails, Tasks ohne Fortschritt, fehlende CAD-Dateien oder Zeichnungen.

BEI FREIEN FRAGEN: Direkte Antwort. Wenn die Frage über den verfügbaren Kontext hinausgeht, weise darauf hin und gib die bestmögliche Einschätzung auf Basis der vorhandenen Daten.`;

const IGOR_QUICK: Array<{ label: string; prompt: string }> = [
  {
    label: '📋 Zusammenfassung',
    prompt: 'Fasse den aktuellen Stand zusammen: Gesamtstatus, was ist erledigt, was ist offen, auffällige Lücken oder Verknüpfungen.',
  },
  {
    label: '➡️ Nächste Schritte',
    prompt: 'Was sind die nächsten konkreten Schritte? Leite sie direkt aus den vorhandenen Tasks, offenen Bestellungen und unbearbeiteten Emails ab.',
  },
  {
    label: '⚠️ Risiken',
    prompt: 'Welche Risiken oder Probleme sind erkennbar? Fehlende Dokumente, offene Rechnungen, überfällige Tasks, unbearbeitete Emails — was fällt auf?',
  },
];

function buildBrettContext(selection: BrettItem, lanes: Record<string, LaneState>): string {
  const laneLabel: Record<string, string> = {
    PROJECT: 'Projekte', EMAIL: 'Emails', TASK: 'Tasks', ORDER: 'Bestellungen',
    INVOICE: 'Rechnungen', OBJECT: 'Objekte', FILE: 'Dateien',
  };
  const lines: string[] = [
    `Ausgewähltes Element: ${laneLabel[selection.entityType] ?? selection.entityType} — "${selection.title}"`,
    selection.subtitle ? `  ${selection.subtitle}` : '',
    '',
    'Verknüpfte Elemente im Board:',
  ];
  for (const lane of LANES) {
    if (lane.id === 'OFFER') continue;
    const state = lanes[lane.id];
    if (!state || state.loading || state.items.length === 0) continue;
    lines.push(`\n${laneLabel[lane.id] ?? lane.id} (${state.items.length}):`);
    for (const item of state.items.slice(0, 6)) {
      const parts = [item.title];
      if (item.subtitle) parts.push(`[${item.subtitle}]`);
      if (item.meta) parts.push(`(${item.meta})`);
      lines.push(`  - ${parts.join(' ')}`);
    }
    if (state.items.length > 6) lines.push(`  ... und ${state.items.length - 6} weitere`);
  }
  return lines.filter(l => l !== '').join('\n');
}

export function BlitzBrett({ emails }: Props) {
  const [lanes, setLanes] = useState<Record<string, LaneState>>(() =>
    Object.fromEntries(LANES.map(l => [l.id, { items: [], loading: true }])),
  );
  const [selection, setSelection] = useState<BrettItem | null>(null);

  const [igorOpen, setIgorOpen]       = useState(false);
  const [igorLoading, setIgorLoading] = useState(false);
  const [igorAnswer, setIgorAnswer]   = useState('');
  const [igorInput, setIgorInput]     = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const setLane = useCallback((id: string, update: Partial<LaneState>) => {
    setLanes(prev => ({ ...prev, [id]: { ...prev[id], ...update } }));
  }, []);

  // ── Initial load ─────────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      await Promise.all([
        loadBrettProjects().then(items => setLane('PROJECT', { items, loading: false })),
        Promise.resolve(emailsToBrettItems(emails)).then(items => setLane('EMAIL', { items, loading: false })),
        loadBrettTasks().then(items => setLane('TASK', { items, loading: false })),
        loadBrettPurchaseOrders().then(items => setLane('ORDER', { items, loading: false })),
        loadBrettInvoices().then(items => setLane('INVOICE', { items, loading: false })),
        Promise.resolve([]).then(items => setLane('OFFER', { items, loading: false })),
        loadBrettObjects().then(items => setLane('OBJECT', { items, loading: false })),
        Promise.resolve([]).then(items => setLane('FILE', { items, loading: false })),
      ]);
    }
    init();
  }, []);

  // ── Selection → cross-filter all connected lanes ──────────────────────────────

  const handleSelect = useCallback(async (item: BrettItem) => {
    if (selection?.id === item.id && selection?.entityType === item.entityType) {
      handleClear();
      return;
    }
    setSelection(item);

    const et  = item.entityType;
    const eid = item.entityId;
    const mid = item.id; // for EMAIL items: this IS the Outlook MessageId

    type FilterJob = [string, () => Promise<BrettItem[]>];
    const jobs: FilterJob[] = [];

    // ── EMAIL lane ────────────────────────────────────────────────────────────
    if (et !== 'EMAIL') {
      const canFilterEmails = ['PROJECT', 'TASK', 'ORDER', 'OBJECT'].includes(et);
      if (canFilterEmails) {
        jobs.push(['EMAIL', async () => emailsToBrettItems(await loadEmailsForEntity(et, eid))]);
      }
    }

    // ── PROJECT lane (reverse lookup) ─────────────────────────────────────────
    if (et !== 'PROJECT') {
      if (et === 'ORDER')   jobs.push(['PROJECT', () => loadBrettProjects({ orderId: eid })]);
      if (et === 'OBJECT')  jobs.push(['PROJECT', () => loadBrettProjects({ objectId: eid })]);
      if (et === 'TASK')    jobs.push(['PROJECT', () => loadBrettProjects({ taskId: eid })]);
      if (et === 'EMAIL')   jobs.push(['PROJECT', () => loadBrettProjects({ messageId: mid })]);
      if (et === 'FILE')    jobs.push(['PROJECT', () => loadBrettProjects({ attachmentId: eid })]);
    }

    // ── TASK lane ─────────────────────────────────────────────────────────────
    if (et !== 'TASK') {
      if (['PROJECT', 'OBJECT', 'ORDER'].includes(et)) {
        jobs.push(['TASK', () => loadBrettTasks({ entityType: et, entityId: eid })]);
      }
      if (et === 'EMAIL') jobs.push(['TASK', () => loadBrettTasks({ messageId: mid })]);
      if (et === 'FILE')  jobs.push(['TASK', () => loadBrettTasks({ attachmentId: eid })]);
    }

    // ── ORDER lane ────────────────────────────────────────────────────────────
    if (et !== 'ORDER') {
      if (et === 'PROJECT') jobs.push(['ORDER', () => loadBrettPurchaseOrders({ projectId: eid })]);
      if (et === 'OBJECT')  jobs.push(['ORDER', () => loadBrettPurchaseOrders({ objectId: eid })]);
      if (et === 'TASK')    jobs.push(['ORDER', () => loadBrettPurchaseOrders({ taskId: eid })]);
      if (et === 'EMAIL')   jobs.push(['ORDER', () => loadBrettPurchaseOrders({ messageId: mid })]);
      if (et === 'FILE')    jobs.push(['ORDER', () => loadBrettPurchaseOrders({ attachmentId: eid })]);
    }

    // ── OBJECT lane ───────────────────────────────────────────────────────────
    if (et !== 'OBJECT') {
      if (et === 'PROJECT') jobs.push(['OBJECT', () => loadBrettObjects({ projectId: eid })]);
      if (et === 'ORDER')   jobs.push(['OBJECT', () => loadBrettObjects({ orderId: eid })]);
      if (et === 'TASK')    jobs.push(['OBJECT', () => loadBrettObjects({ taskId: eid })]);
      if (et === 'EMAIL')   jobs.push(['OBJECT', () => loadBrettObjects({ messageId: mid })]);
      if (et === 'FILE')    jobs.push(['OBJECT', () => loadBrettObjects({ attachmentId: eid })]);
    }

    // ── INVOICE lane ──────────────────────────────────────────────────────────
    if (et !== 'INVOICE') {
      if (et === 'PROJECT') jobs.push(['INVOICE', () => loadBrettInvoices({ projectId: eid })]);
      if (et === 'ORDER')   jobs.push(['INVOICE', () => loadBrettInvoices({ poId: eid })]);
      if (et === 'OBJECT')  jobs.push(['INVOICE', () => loadBrettInvoices({ objectId: eid })]);
    }

    // ── FILE lane ────────────────────────────────────────────────────────────
    if (et !== 'FILE') {
      const fileEntityType = ['PROJECT', 'TASK', 'ORDER', 'OBJECT'].includes(et) ? et : null;
      if (fileEntityType) {
        jobs.push(['FILE', () => loadAttachmentsForEntity(fileEntityType, eid)]);
      }
    }

    // Mark loading, then run all in parallel
    jobs.forEach(([id]) => setLane(id, { loading: true }));
    await Promise.all(
      jobs.map(async ([id, load]) => {
        const items = await load();
        setLane(id, { items, loading: false });
      }),
    );
  }, [selection, setLane, emails]);

  const handleClear = useCallback(() => {
    setSelection(null);
    setIgorOpen(false);
    setIgorAnswer('');
    setIgorInput('');
    setLane('EMAIL',   { items: emailsToBrettItems(emails), loading: false });
    setLane('FILE',    { items: [], loading: false });
    loadBrettProjects().then(items => setLane('PROJECT', { items, loading: false }));
    loadBrettTasks().then(items => setLane('TASK', { items, loading: false }));
    loadBrettPurchaseOrders().then(items => setLane('ORDER', { items, loading: false }));
    loadBrettObjects().then(items => setLane('OBJECT', { items, loading: false }));
    loadBrettInvoices().then(items => setLane('INVOICE', { items, loading: false }));
  }, [emails, setLane]);

  const handleIgorAsk = useCallback(async (prompt: string) => {
    if (!selection || igorLoading) return;
    setIgorOpen(true);
    setIgorLoading(true);
    setIgorAnswer('');
    try {
      const answer = await askIgor({
        question: prompt,
        context: BRETT_IGOR_SYSTEM,
        input: buildBrettContext(selection, lanes),
      });
      setIgorAnswer(answer);
    } catch (e) {
      setIgorAnswer('Igor ist gerade nicht erreichbar.');
    } finally {
      setIgorLoading(false);
    }
  }, [selection, lanes, igorLoading]);

  return (
    <div className="brett-root">
      {selection && (
        <>
          <div className="brett-filter-bar">
            <span className="brett-filter-label">
              {LANES.find(l => l.id === selection.entityType)?.icon} {selection.title}
            </span>
            {selection.subtitle && <span className="brett-filter-sub">{selection.subtitle}</span>}
            <button
              className={`brett-igor-btn ${igorOpen ? 'brett-igor-btn--active' : ''}`}
              onClick={() => setIgorOpen(o => !o)}
              title="Igor KI-Assistent"
            >
              🤖 Igor
            </button>
            <button className="brett-filter-clear" onClick={handleClear}>× Filter aufheben</button>
          </div>

          {igorOpen && (
            <div className="brett-igor-panel">
              <div className="brett-igor-chips">
                {IGOR_QUICK.map(q => (
                  <button
                    key={q.label}
                    className="brett-igor-chip"
                    onClick={() => handleIgorAsk(q.prompt)}
                    disabled={igorLoading}
                  >
                    {q.label}
                  </button>
                ))}
              </div>

              {igorLoading && (
                <div className="brett-igor-loading">
                  <span className="brett-dot" /><span className="brett-dot" /><span className="brett-dot" />
                  <span className="brett-igor-thinking">Igor denkt nach…</span>
                </div>
              )}

              {igorAnswer && !igorLoading && (
                <div className="brett-igor-answer">{igorAnswer}</div>
              )}

              <div className="brett-igor-input-row">
                <input
                  ref={inputRef}
                  className="brett-igor-input"
                  placeholder="Eigene Frage stellen…"
                  value={igorInput}
                  onChange={e => setIgorInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && igorInput.trim()) {
                      handleIgorAsk(igorInput.trim());
                      setIgorInput('');
                    }
                  }}
                  disabled={igorLoading}
                />
                <button
                  className="brett-igor-send"
                  disabled={igorLoading || !igorInput.trim()}
                  onClick={() => {
                    if (igorInput.trim()) {
                      handleIgorAsk(igorInput.trim());
                      setIgorInput('');
                    }
                  }}
                >
                  →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="brett-board">
        {LANES.map(lane => {
          const state = lanes[lane.id];
          return (
            <div key={lane.id} className="brett-lane">
              <div className="brett-lane-header" style={{ borderTopColor: lane.color }}>
                <span className="brett-lane-icon">{lane.icon}</span>
                <span className="brett-lane-title">{lane.title}</span>
                {!state.loading && (
                  <span className="brett-lane-count" style={{ color: lane.color }}>
                    {state.items.length}
                  </span>
                )}
              </div>

              <div className="brett-lane-cards">
                {state.loading ? (
                  <div className="brett-lane-loading">
                    <span className="brett-dot" />
                    <span className="brett-dot" />
                    <span className="brett-dot" />
                  </div>
                ) : lane.id === 'OFFER' ? (
                  <div className="brett-placeholder">Demnächst verfügbar</div>
                ) : lane.id === 'FILE' && !selection && state.items.length === 0 ? (
                  <div className="brett-placeholder">Karte auswählen um Dateien zu laden</div>
                ) : state.items.length === 0 ? (
                  <div className="brett-empty">
                    {selection ? 'Keine Einträge für diese Auswahl' : 'Keine Einträge'}
                  </div>
                ) : (
                  state.items.map(item => {
                    const isSelected = selection?.id === item.id && selection?.entityType === item.entityType;
                    return (
                      <button
                        key={item.id}
                        className={`brett-card ${isSelected ? 'brett-card--selected' : ''}`}
                        style={{ '--lane-color': lane.color } as React.CSSProperties}
                        onClick={() => handleSelect(item)}
                      >
                        <div className="brett-card-title">{item.title}</div>
                        {item.subtitle && <div className="brett-card-sub">{item.subtitle}</div>}
                        {item.meta && <div className="brett-card-meta">{item.meta}</div>}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
