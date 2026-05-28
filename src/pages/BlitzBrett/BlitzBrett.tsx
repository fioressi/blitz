import { useState, useEffect, useCallback } from 'react';
import type { Email } from '../../types/email';
import {
  loadBrettItems,
  loadPurchaseOrders,
  loadObjectsForProject,
  loadTasksForEntity,
  loadAttachmentsForEntity,
  loadEmailsForEntity,
  type BrettItem,
} from '../../services/pdmApiService';
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
  { id: 'ORDER',   title: 'Purchase Orders', icon: '🛒', color: '#10b981' },
  { id: 'INVOICE', title: 'Invoices',        icon: '🧾', color: '#8b5cf6' },
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

export function BlitzBrett({ emails }: Props) {
  const [lanes, setLanes] = useState<Record<string, LaneState>>(() =>
    Object.fromEntries(LANES.map(l => [l.id, { items: [], loading: true }])),
  );
  const [selection, setSelection] = useState<BrettItem | null>(null);

  const setLane = useCallback((id: string, update: Partial<LaneState>) => {
    setLanes(prev => ({ ...prev, [id]: { ...prev[id], ...update } }));
  }, []);

  // ── Initial load ────────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      await Promise.all([
        loadBrettItems('PROJECT').then(items => setLane('PROJECT', { items, loading: false })),
        loadBrettItems('TASK').then(items => setLane('TASK', { items, loading: false })),
        loadPurchaseOrders().then(items => setLane('ORDER', { items, loading: false })),
        loadObjectsForProject().then(items => setLane('OBJECT', { items, loading: false })),
        Promise.resolve(emailsToBrettItems(emails)).then(items => setLane('EMAIL', { items, loading: false })),
        Promise.resolve([]).then(items => setLane('INVOICE', { items, loading: false })),
        Promise.resolve([]).then(items => setLane('OFFER', { items, loading: false })),
        Promise.resolve([]).then(items => setLane('FILE', { items, loading: false })),
      ]);
    }
    init();
  }, []);

  // ── Selection → filtered loads ───────────────────────────────────────────────

  const handleSelect = useCallback(async (item: BrettItem) => {
    if (selection?.id === item.id && selection?.entityType === item.entityType) {
      handleClear();
      return;
    }
    setSelection(item);

    const et = item.entityType;
    const eid = item.entityId;

    type FilterJob = [string, () => Promise<BrettItem[]>];
    const jobs: FilterJob[] = [];

    if (et !== 'EMAIL') {
      jobs.push(['EMAIL', async () => {
        const mails = await loadEmailsForEntity(et, eid);
        return emailsToBrettItems(mails);
      }]);
    }

    if (['PROJECT', 'OBJECT', 'ORDER'].includes(et)) {
      jobs.push(['TASK', () => loadTasksForEntity(et, eid)]);
    }

    if (et === 'PROJECT') {
      jobs.push(['OBJECT', () => loadObjectsForProject(eid)]);
    }

    if (['PROJECT', 'TASK', 'ORDER', 'OBJECT'].includes(et)) {
      jobs.push(['FILE', () => loadAttachmentsForEntity(et, eid)]);
    }

    // Mark as loading
    jobs.forEach(([id]) => setLane(id, { loading: true }));

    await Promise.all(
      jobs.map(async ([id, load]) => {
        const items = await load();
        setLane(id, { items, loading: false });
      }),
    );
  }, [selection, setLane]);

  const handleClear = useCallback(() => {
    setSelection(null);
    setLane('EMAIL', { items: emailsToBrettItems(emails), loading: false });
    setLane('FILE', { items: [], loading: false });
    loadBrettItems('TASK').then(items => setLane('TASK', { items, loading: false }));
    loadObjectsForProject().then(items => setLane('OBJECT', { items, loading: false }));
  }, [emails, setLane]);

  return (
    <div className="brett-root">
      {selection && (
        <div className="brett-filter-bar">
          <span className="brett-filter-label">
            {LANES.find(l => l.id === selection.entityType)?.icon} {selection.title}
          </span>
          {selection.subtitle && <span className="brett-filter-sub">{selection.subtitle}</span>}
          <button className="brett-filter-clear" onClick={handleClear}>× Filter aufheben</button>
        </div>
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
                ) : lane.id === 'INVOICE' || lane.id === 'OFFER' ? (
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
