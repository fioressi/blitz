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
  createBrettLink,
  type BrettItem,
} from '../../services/pdmApiService';
import { askIgorBoard } from '../../services/igorService';
import { BrettDetailPanel } from './BrettDetailPanel';
import './BlitzBrett.css';

// ── Drag & Drop helpers ───────────────────────────────────────────────────────

function isDraggable(et: string): boolean {
  return ['EMAIL', 'TASK', 'OBJECT', 'PROJECT', 'ORDER', 'FILE'].includes(et);
}

function isValidLink(source: BrettItem, target: BrettItem): boolean {
  if (source.id === target.id) return false;
  if (source.entityType === target.entityType) return false;
  const pair = new Set([source.entityType, target.entityType]);
  if (pair.has('OFFER') || pair.has('INVOICE')) return false;
  if (source.entityType === 'FILE' && source.entityId === 0) return false;
  if (pair.has('EMAIL')) return true;
  if (pair.has('TASK')) return ['OBJECT', 'ORDER', 'PROJECT', 'SUPPLIER'].some(t => pair.has(t));
  if (pair.has('OBJECT') && pair.has('PROJECT')) return true;
  if (pair.has('FILE')) {
    const other = source.entityType === 'FILE' ? target.entityType : source.entityType;
    return ['OBJECT', 'ORDER', 'PROJECT', 'TASK'].includes(other);
  }
  return false;
}

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

const BRETT_IGOR_SYSTEM = `BlitzBrett-Kontext: PDM-Cross-Filter-Board. Ausgewählte Entität + alle verknüpften Datensätze (Projekte, Bestellungen, Tasks, Objekte, Rechnungen, Dateien, Emails) aus Azure SQL.

Input-Format:
Ausgewähltes Element: <Typ> — "<Titel>"
  <optionaler Untertitel>
Verknüpfte Elemente im Board:
<Kategorie> (<Anzahl>):
  - <Titel> [<Untertitel>] (<Meta>)

Regeln: Deutsch. Keine Präambel. Nur aus dem Input — keine IDs erfinden. Fehlende Kategorien = keine Verknüpfung vorhanden.`;

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

  const [detailItem, setDetailItem] = useState<BrettItem | null>(null);
  const [dragging, setDragging]   = useState<BrettItem | null>(null);
  const [overItemId, setOverItemId] = useState<string | null>(null);
  const [linkFeedback, setLinkFeedback] = useState<Record<string, 'success' | 'error'>>({});
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
      const answer = await askIgorBoard({
        question: prompt,
        systemContext: BRETT_IGOR_SYSTEM,
        boardData: buildBrettContext(selection, lanes),
      });
      setIgorAnswer(answer);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('504') || msg.includes('502') || msg.includes('Timeout')) {
        setIgorAnswer('Igor hat länger gebraucht als erwartet — bitte nochmal versuchen.');
      } else {
        setIgorAnswer('Igor ist gerade nicht erreichbar.');
      }
    } finally {
      setIgorLoading(false);
    }
  }, [selection, lanes, igorLoading]);

  const handleDragStart = useCallback((item: BrettItem, e: React.DragEvent) => {
    setDragging(item);
    e.dataTransfer.effectAllowed = 'link';
    e.dataTransfer.setData('text/plain', item.id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragging(null);
    setOverItemId(null);
  }, []);

  const handleDragOver = useCallback((item: BrettItem, e: React.DragEvent) => {
    if (!dragging || !isValidLink(dragging, item)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'link';
    setOverItemId(item.id);
  }, [dragging]);

  const handleDrop = useCallback((target: BrettItem, e: React.DragEvent) => {
    e.preventDefault();
    setOverItemId(null);
    if (!dragging || !isValidLink(dragging, target)) return;
    const src = dragging;
    setDragging(null);
    createBrettLink(src, target, emails)
      .then(() => {
        setLinkFeedback(prev => ({ ...prev, [target.id]: 'success' }));
        setTimeout(() => setLinkFeedback(prev => { const n = { ...prev }; delete n[target.id]; return n; }), 2000);
      })
      .catch(() => {
        setLinkFeedback(prev => ({ ...prev, [target.id]: 'error' }));
        setTimeout(() => setLinkFeedback(prev => { const n = { ...prev }; delete n[target.id]; return n; }), 2000);
      });
  }, [dragging, emails]);

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
                    const isDropValid  = dragging && dragging.id !== item.id && overItemId === item.id && isValidLink(dragging, item);
                    const isDropTarget = dragging && dragging.id !== item.id && isValidLink(dragging, item);
                    const feedback = linkFeedback[item.id];
                    return (
                      <button
                        key={item.id}
                        draggable={isDraggable(item.entityType)}
                        className={[
                          'brett-card',
                          isSelected             ? 'brett-card--selected'    : '',
                          isDropValid            ? 'brett-card--drop-valid'  : '',
                          isDropTarget && !isDropValid ? 'brett-card--drop-target' : '',
                          dragging && dragging.id === item.id ? 'brett-card--dragging' : '',
                          feedback === 'success' ? 'brett-card--link-success' : '',
                          feedback === 'error'   ? 'brett-card--link-error'   : '',
                        ].filter(Boolean).join(' ')}
                        style={{ '--lane-color': lane.color } as React.CSSProperties}
                        onClick={() => handleSelect(item)}
                        onDragStart={e => handleDragStart(item, e)}
                        onDragEnd={handleDragEnd}
                        onDragOver={e => handleDragOver(item, e)}
                        onDragLeave={() => setOverItemId(null)}
                        onDrop={e => handleDrop(item, e)}
                      >
                        <div className="brett-card-inner">
                          <div className="brett-card-title">{item.title}</div>
                          {item.subtitle && <div className="brett-card-sub">{item.subtitle}</div>}
                          {item.meta && <div className="brett-card-meta">{item.meta}</div>}
                          {feedback === 'success' && <div className="brett-card-feedback">✓ Verknüpft</div>}
                          {feedback === 'error'   && <div className="brett-card-feedback brett-card-feedback--error">✗ Fehler</div>}
                        </div>
                        <div
                          className="brett-card-open"
                          role="button"
                          title="Details öffnen"
                          onPointerDown={e => e.stopPropagation()}
                          onClick={e => { e.stopPropagation(); setDetailItem(item); }}
                        >
                          ↗
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {detailItem && (
        <BrettDetailPanel
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onDeleted={deleted => {
            setDetailItem(null);
            setLanes(prev => {
              const lane = deleted.entityType;
              if (!prev[lane]) return prev;
              return { ...prev, [lane]: { ...prev[lane], items: prev[lane].items.filter(i => i.id !== deleted.id) } };
            });
          }}
        />
      )}
    </div>
  );
}
