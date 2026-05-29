import { useState, useEffect } from 'react';
import { ContactSelect } from '../../components/ContactSelect/ContactSelect';
import type { BrettItem } from '../../services/pdmApiService';

const PDM_API = 'https://pdm-api.azurewebsites.net/api';

function fileDownloadUrl(item: BrettItem): string | null {
  if (item.entityType !== 'FILE') return null;
  if (item.entityId > 0) return `${PDM_API}/attachments/${item.entityId}/download`;
  const m = item.id.match(/^FILE:OBJ:(\d+)$/);
  if (m) return `${PDM_API}/object-files/${m[1]}/download`;
  return null;
}
import {
  fetchBrettEntityDetail,
  updateBrettEntity,
  deleteBrettEntity,
} from '../../services/pdmApiService';
import './BrettDetailPanel.css';

interface Props {
  item: BrettItem;
  onClose: () => void;
  onDeleted: (item: BrettItem) => void;
}

const LANE_ICON: Record<string, string> = {
  PROJECT: '📁', EMAIL: '✉️', TASK: '📋', ORDER: '🛒',
  INVOICE: '🧾', OFFER: '📄', OBJECT: '⚙️', FILE: '📎',
};

const STATUS_COLORS: Record<string, string> = {
  'NEW': 'new', 'NOT STARTED': 'not-started', 'NOT_STARTED': 'not-started',
  'STARTED': 'started', 'IN_PROGRESS': 'in-progress', 'IN PROGRESS': 'in-progress',
  'ORDERED': 'ordered', 'SHIPPING': 'started', 'ARRIVED': 'done', 'STOCKED': 'done',
  'DONE': 'done', 'COMPLETED': 'completed',
  'BLOCKED': 'blocked', 'CANCELLED': 'cancelled', 'OPEN': 'new',
};

const TASK_STATUSES  = ['NEW', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'];
const TASK_TYPES     = ['OTHER', 'CREATE_OBJECT', 'CHANGE_OBJECT', 'ECN', 'PURCHASE', 'DEVELOPMENT', 'DESIGN', 'PRODUCTION'];
const TASK_PRIOS     = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
const PROJ_STATUSES  = ['NOT STARTED', 'STARTED', 'ON HOLD', 'COMPLETED', 'CANCELLED'];

function Badge({ value }: { value: string }) {
  const cls = `bdp-badge bdp-badge--${STATUS_COLORS[value] ?? value.toLowerCase().replace(/[\s_]/g, '-')}`;
  return <span className={cls}>{value}</span>;
}

// ── PROJECT ───────────────────────────────────────────────────────────────────

function ProjectDetail({ d, editing, form, set }: {
  d: Record<string, unknown>; editing: boolean;
  form: Record<string, string>; set: (k: string, v: string) => void;
}) {
  return (
    <>
      <div className="bdp-row">
        <div className="bdp-field">
          <span className="bdp-label">Code</span>
          <span className="bdp-value">{String(d.ProjectCode ?? '—')}</span>
        </div>
        <div className="bdp-field">
          <span className="bdp-label">Status</span>
          {editing
            ? <select className="bdp-select" value={form.projectStatus ?? ''} onChange={e => set('projectStatus', e.target.value)}>
                {PROJ_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            : <Badge value={String(d.ProjectStatus ?? '')} />}
        </div>
      </div>
      <div className="bdp-field">
        <span className="bdp-label">Name</span>
        {editing
          ? <input className="bdp-input" value={form.projectName ?? ''} onChange={e => set('projectName', e.target.value)} />
          : <span className="bdp-value">{String(d.ProjectName ?? '—')}</span>}
      </div>
      <div className="bdp-field">
        <span className="bdp-label">Beschreibung</span>
        {editing
          ? <textarea className="bdp-textarea" value={form.description ?? ''} onChange={e => set('description', e.target.value)} />
          : <span className="bdp-value">{String(d.Description || '') || <em className="bdp-value--muted">—</em>}</span>}
      </div>
      {d.AssignedTo && (
        <div className="bdp-field">
          <span className="bdp-label">Zugewiesen</span>
          <span className="bdp-value">{String(d.AssignedTo)}</span>
        </div>
      )}
    </>
  );
}

// ── TASK ──────────────────────────────────────────────────────────────────────

function TaskDetail({ d, editing, form, set }: {
  d: Record<string, unknown>; editing: boolean;
  form: Record<string, string>; set: (k: string, v: string) => void;
}) {
  return (
    <>
      <div className="bdp-field">
        <span className="bdp-label">Titel</span>
        {editing
          ? <input className="bdp-input" value={form.title ?? ''} onChange={e => set('title', e.target.value)} />
          : <span className="bdp-value">{String(d.TitleDe || d.Title || '—')}</span>}
      </div>
      <div className="bdp-row">
        <div className="bdp-field">
          <span className="bdp-label">Status</span>
          {editing
            ? <select className="bdp-select" value={form.status ?? ''} onChange={e => set('status', e.target.value)}>
                {TASK_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            : <Badge value={String(d.Status ?? '')} />}
        </div>
        <div className="bdp-field">
          <span className="bdp-label">Priorität</span>
          {editing
            ? <select className="bdp-select" value={form.priority ?? ''} onChange={e => set('priority', e.target.value)}>
                {TASK_PRIOS.map(p => <option key={p}>{p}</option>)}
              </select>
            : <span className="bdp-value">{String(d.Priority ?? '—')}</span>}
        </div>
      </div>
      <div className="bdp-row">
        <div className="bdp-field">
          <span className="bdp-label">Typ</span>
          {editing
            ? <select className="bdp-select" value={form.taskType ?? ''} onChange={e => set('taskType', e.target.value)}>
                {TASK_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            : <span className="bdp-value">{String(d.TaskType ?? '—')}</span>}
        </div>
        <div className="bdp-field">
          <span className="bdp-label">Fällig am</span>
          {editing
            ? <input type="date" className="bdp-input" value={(form.dueAt ?? '').slice(0, 10)} onChange={e => set('dueAt', e.target.value)} />
            : <span className="bdp-value">{d.DueAt ? new Date(String(d.DueAt)).toLocaleDateString('de-AT') : '—'}</span>}
        </div>
      </div>
      <div className="bdp-field">
        <span className="bdp-label">Zugewiesen an</span>
        {editing
          ? <ContactSelect className="bdp-select" value={form.assignedTo ?? ''} onChange={v => set('assignedTo', v)} />
          : <span className="bdp-value">{String(d.AssignedTo || '—')}</span>}
      </div>
      {(editing || d.DescriptionDe || d.Description) && (
        <div className="bdp-field">
          <span className="bdp-label">Beschreibung</span>
          {editing
            ? <textarea className="bdp-textarea" value={form.description ?? ''} onChange={e => set('description', e.target.value)} />
            : <span className="bdp-value">{String(d.DescriptionDe || d.Description || '—')}</span>}
        </div>
      )}
    </>
  );
}

// ── ORDER ─────────────────────────────────────────────────────────────────────

function OrderDetail({ d }: { d: Record<string, unknown> }) {
  const lines = Array.isArray(d.lines) ? d.lines as Record<string, unknown>[] : [];
  return (
    <>
      <div className="bdp-row">
        <div className="bdp-field">
          <span className="bdp-label">Lieferant</span>
          <span className="bdp-value">{String(d.SupplierName || d.supplier_name || '—')}</span>
        </div>
        <div className="bdp-field">
          <span className="bdp-label">Status</span>
          <Badge value={String(d.Status ?? '')} />
        </div>
      </div>
      {d.OrderName && (
        <div className="bdp-field">
          <span className="bdp-label">Bezeichnung</span>
          <span className="bdp-value">{String(d.OrderName)}</span>
        </div>
      )}
      {d.Description && (
        <div className="bdp-field">
          <span className="bdp-label">Beschreibung</span>
          <span className="bdp-value">{String(d.Description)}</span>
        </div>
      )}
      {lines.length > 0 && (
        <div className="bdp-lines">
          <div className="bdp-lines-title">Positionen ({lines.length})</div>
          {lines.map((l, i) => (
            <div key={i} className="bdp-line">
              <span className="bdp-line-pos">{String(l.Position ?? i + 1)}.</span>
              <span className="bdp-line-part">{String(l.PartId || '—')}</span>
              <span className="bdp-line-name">{String(l.PartName || '')}</span>
              <span className="bdp-line-qty">×{String(l.Quantity ?? 1)}</span>
              <span className="bdp-line-price">
                {l.OrderedPrice != null ? `${Number(l.OrderedPrice).toLocaleString('de-AT', { maximumFractionDigits: 2 })} ${l.Currency ?? ''}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── OBJECT ────────────────────────────────────────────────────────────────────

function ObjectDetail({ d }: { d: Record<string, unknown> }) {
  const obj = (d.object as Record<string, unknown>) ?? d;
  return (
    <>
      <div className="bdp-row">
        <div className="bdp-field">
          <span className="bdp-label">Part-ID</span>
          <span className="bdp-value">{String(obj.PartId ?? '—')}</span>
        </div>
        <div className="bdp-field">
          <span className="bdp-label">Status</span>
          <span className="bdp-value">{String(obj.StatusCode ?? '—')}</span>
        </div>
      </div>
      {obj.part_name && (
        <div className="bdp-field">
          <span className="bdp-label">Bezeichnung</span>
          <span className="bdp-value">{String(obj.part_name)}</span>
        </div>
      )}
      {obj.Description && (
        <div className="bdp-field">
          <span className="bdp-label">Beschreibung</span>
          <span className="bdp-value">{String(obj.Description)}</span>
        </div>
      )}
      <div className="bdp-row">
        {!!obj.ClassCode && (
          <div className="bdp-field">
            <span className="bdp-label">Klasse</span>
            <span className="bdp-value">{String(obj.ClassCode)}</span>
          </div>
        )}
        {!!obj.file_name && (
          <div className="bdp-field">
            <span className="bdp-label">CAD-Datei</span>
            <span className="bdp-value">🔩 {String(obj.file_name)}</span>
          </div>
        )}
      </div>
    </>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export function BrettDetailPanel({ item, onClose, onDeleted }: Props) {
  const [detail, setDetail]   = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canEdit   = ['PROJECT', 'TASK'].includes(item.entityType);
  const canDelete = item.entityType === 'TASK';
  const needsFetch = ['PROJECT', 'TASK', 'ORDER', 'OBJECT'].includes(item.entityType);

  useEffect(() => {
    if (!needsFetch) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    fetchBrettEntityDetail(item.entityType, item.entityId)
      .then(d => {
        setDetail(d);
        if (d) {
          const obj = (d.object as Record<string, unknown>) ?? d;
          setForm({
            title:         String(d.TitleDe ?? d.Title ?? ''),
            taskType:      String(d.TaskType ?? ''),
            status:        String(d.Status ?? ''),
            priority:      String(d.Priority ?? ''),
            assignedTo:    String(d.AssignedTo ?? ''),
            dueAt:         String(d.DueAt ?? '').slice(0, 10),
            description:   String(d.DescriptionDe ?? d.Description ?? ''),
            projectName:   String(d.ProjectName ?? obj.ProjectName ?? ''),
            projectStatus: String(d.ProjectStatus ?? obj.ProjectStatus ?? ''),
          });
        }
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Ladefehler'))
      .finally(() => setLoading(false));
  }, [item.entityId, item.entityType]);

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const fields: Record<string, unknown> = {};
      if (item.entityType === 'TASK') {
        Object.assign(fields, {
          title: form.title, taskType: form.taskType, status: form.status,
          priority: form.priority, assignedTo: form.assignedTo || null,
          dueAt: form.dueAt || null, description: form.description,
        });
      } else if (item.entityType === 'PROJECT') {
        Object.assign(fields, {
          projectName: form.projectName, projectStatus: form.projectStatus,
          description: form.description, assignedTo: form.assignedTo || null,
        });
      }
      await updateBrettEntity(item.entityType, item.entityId, fields);
      setDetail(prev => prev ? { ...prev, ...fields } : prev);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Speicherfehler');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteBrettEntity(item.entityType, item.entityId);
      onDeleted(item);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Löschfehler');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const code  = String(detail?.ProjectCode ?? item.entityId);
  const title = String(detail?.ProjectName ?? detail?.TitleDe ?? detail?.Title
    ?? (detail?.object as Record<string, unknown>)?.PartId ?? item.title);

  return (
    <div className="bdp-backdrop" onClick={onClose}>
      <div className="bdp-panel" onClick={e => e.stopPropagation()}>
        <div className="bdp-header">
          <span className="bdp-type-icon">{LANE_ICON[item.entityType] ?? '📄'}</span>
          <div className="bdp-title-block">
            {needsFetch && !loading && <div className="bdp-code">{code}</div>}
            <div className="bdp-name">{title}</div>
          </div>
          <div className="bdp-header-actions">
            {canDelete && !editing && (
              <button className="bdp-btn bdp-btn--danger" onClick={() => setConfirmDelete(c => !c)}>
                Löschen
              </button>
            )}
            {canEdit && !editing && (
              <button className="bdp-btn bdp-btn--primary" onClick={() => setEditing(true)}>
                Bearbeiten
              </button>
            )}
            {editing && (
              <>
                <button className="bdp-btn" onClick={() => setEditing(false)}>Abbrechen</button>
                <button className="bdp-btn bdp-btn--primary" onClick={handleSave} disabled={saving}>
                  {saving ? '…' : 'Speichern'}
                </button>
              </>
            )}
            <button className="bdp-close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="bdp-body">
          {error && <div className="bdp-error">{error}</div>}

          {confirmDelete && (
            <div className="bdp-confirm">
              <span>Diesen Eintrag wirklich löschen?</span>
              <button className="bdp-btn" onClick={() => setConfirmDelete(false)}>Nein</button>
              <button className="bdp-btn bdp-btn--danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? '…' : 'Ja, löschen'}
              </button>
            </div>
          )}

          {loading ? (
            <div className="bdp-loading">Lädt…</div>
          ) : !needsFetch ? (
            // EMAIL / FILE / INVOICE — show BrettItem data directly
            <>
              {item.subtitle && (
                <div className="bdp-field">
                  <span className="bdp-label">{item.entityType === 'EMAIL' ? 'Von' : 'Typ'}</span>
                  <span className="bdp-value">{item.subtitle}</span>
                </div>
              )}
              {item.meta && (
                <div className="bdp-field">
                  <span className="bdp-label">{item.entityType === 'EMAIL' ? 'Datum' : 'Größe'}</span>
                  <span className="bdp-value">{item.meta}</span>
                </div>
              )}
              {item.entityType === 'FILE' && (() => {
                const dl = fileDownloadUrl(item);
                return dl ? (
                  <a
                    href={dl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bdp-btn bdp-btn--primary bdp-download-btn"
                  >
                    ⬇ Öffnen / Download
                  </a>
                ) : (
                  <div className="bdp-value bdp-value--muted" style={{ fontSize: 12 }}>
                    Kein direkter Download verfügbar — Datei im PDM-System öffnen.
                  </div>
                );
              })()}
              {item.entityType === 'INVOICE' && (
                <div className="bdp-field">
                  <span className="bdp-label">Status</span>
                  <Badge value={item.subtitle?.split(' · ')[0] ?? ''} />
                </div>
              )}
            </>
          ) : detail ? (
            <>
              {item.entityType === 'PROJECT' && (
                <ProjectDetail d={detail} editing={editing} form={form} set={set} />
              )}
              {item.entityType === 'TASK' && (
                <TaskDetail d={detail} editing={editing} form={form} set={set} />
              )}
              {item.entityType === 'ORDER' && (
                <OrderDetail d={detail} />
              )}
              {item.entityType === 'OBJECT' && (
                <ObjectDetail d={detail} />
              )}
            </>
          ) : (
            <div className="bdp-loading">Keine Daten verfügbar.</div>
          )}
        </div>
      </div>
    </div>
  );
}
