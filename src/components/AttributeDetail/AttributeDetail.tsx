import { useState, useEffect } from 'react';
import type { Attribute } from '../../types/email';
import { fetchAttributeDetail, updateAttributeDetail, loadContacts } from '../../services/pdmApiService';
import type { AttributeDetailData, CrmContact } from '../../services/pdmApiService';
import './AttributeDetail.css';

interface Props {
  attribute: Attribute;
  onClose: () => void;
}

const TYPE_ICON: Record<string, string> = {
  project: '📁',
  'purchase-order': '🛒',
  task: '📋',
};

const TYPE_LABEL: Record<string, string> = {
  project: 'Projekt',
  'purchase-order': 'Purchase Order',
  task: 'Task',
};

const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUS_TASK_OPTIONS = ['NEW', 'IN_PROGRESS', 'BLOCKED', 'DONE'];
const TASK_TYPE_OPTIONS = ['DEVELOPMENT', 'DESIGN', 'PURCHASE', 'PRODUCTION', 'OTHER'];

export function AttributeDetail({ attribute, onClose }: Props) {
  const [detail, setDetail] = useState<AttributeDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<AttributeDetailData>>({});

  useEffect(() => {
    if (!attribute.entityType || attribute.entityId == null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchAttributeDetail(attribute.entityType, attribute.entityId)
      .then(d => {
        setDetail(d);
        if (d) setForm(d);
      })
      .finally(() => setLoading(false));
  }, [attribute]);

  const handleSave = async () => {
    if (!attribute.entityType || attribute.entityId == null) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateAttributeDetail(attribute.entityType, attribute.entityId, form);
      setDetail(prev => prev ? { ...prev, ...form } : (form as AttributeDetailData));
      setEditing(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const displayName = detail?.projectName || detail?.title || detail?.orderNumber || attribute.label;
  const displayCode = detail?.projectCode || (attribute.entityId ? `#${attribute.entityId}` : '');

  return (
    <div className="attr-detail-backdrop" onClick={onClose}>
      <div className="attr-detail-modal" onClick={e => e.stopPropagation()}>

        <div className="attr-detail-header">
          <div className="attr-detail-type">
            <span className="attr-detail-icon">{TYPE_ICON[attribute.type] ?? '📄'}</span>
            <span className="attr-detail-type-label">{TYPE_LABEL[attribute.type] ?? attribute.type}</span>
            {displayCode && <span className="attr-detail-code">{displayCode}</span>}
          </div>
          <div className="attr-detail-header-actions">
            {!editing && !loading && (
              <button className="attr-detail-edit-btn" onClick={() => setEditing(true)}>
                Bearbeiten
              </button>
            )}
            <button className="attr-detail-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {loading ? (
          <div className="attr-detail-loading">Lädt…</div>
        ) : (
          <div className="attr-detail-body">

            <h2 className="attr-detail-name">{displayName}</h2>
            {attribute.subLabel && !detail && (
              <p className="attr-detail-sublabel">{attribute.subLabel}</p>
            )}

            {detail && !editing && <DetailView detail={detail} type={attribute.type} />}
            {!detail && !editing && (
              <p className="attr-detail-no-detail">
                Keine weiteren Details verfügbar. API-Endpunkt für {TYPE_LABEL[attribute.type]} noch nicht implementiert.
              </p>
            )}

            {editing && (
              <EditForm
                type={attribute.type}
                form={form}
                onChange={set}
                onSave={handleSave}
                onCancel={() => { setEditing(false); setSaveError(null); if (detail) setForm(detail); }}
                saving={saving}
                error={saveError}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailView({ detail, type }: { detail: AttributeDetailData; type: string }) {
  return (
    <div className="attr-detail-fields">
      {type === 'project' && (
        <>
          {detail.status && <Field label="Status" value={detail.status} />}
          {detail.assignedTo && <Field label="Zugewiesen" value={detail.assignedTo} />}
          {detail.description && <Field label="Beschreibung" value={detail.description} multiline />}
          {detail.createdAt && <Field label="Erstellt" value={new Date(detail.createdAt).toLocaleDateString('de-AT')} />}
        </>
      )}
      {type === 'task' && (
        <>
          {detail.status && <Field label="Status" value={detail.status} badge />}
          {detail.priority && <Field label="Priorität" value={detail.priority} badge />}
          {detail.taskType && <Field label="Typ" value={detail.taskType} />}
          {detail.assignedTo && <Field label="Zugewiesen" value={detail.assignedTo} />}
          {detail.dueAt && <Field label="Fällig" value={new Date(detail.dueAt).toLocaleDateString('de-AT')} />}
          {detail.description && <Field label="Beschreibung" value={detail.description} multiline />}
        </>
      )}
      {type === 'purchase-order' && (
        <>
          {detail.status && <Field label="Status" value={detail.status} badge />}
          {detail.supplierName && <Field label="Lieferant" value={detail.supplierName} />}
          {detail.amount != null && <Field label="Betrag" value={`€ ${detail.amount.toLocaleString('de-AT')}`} />}
          {detail.description && <Field label="Beschreibung" value={detail.description} multiline />}
        </>
      )}
    </div>
  );
}

function Field({ label, value, multiline, badge }: { label: string; value: string; multiline?: boolean; badge?: boolean }) {
  return (
    <div className="attr-detail-field">
      <span className="attr-detail-field-label">{label}</span>
      {badge
        ? <span className={`attr-detail-badge attr-badge-${value.toLowerCase()}`}>{value}</span>
        : multiline
        ? <p className="attr-detail-field-value multiline">{value}</p>
        : <span className="attr-detail-field-value">{value}</span>
      }
    </div>
  );
}

interface EditFormProps {
  type: string;
  form: Partial<AttributeDetailData>;
  onChange: (key: string, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}

function EditForm({ type, form, onChange, onSave, onCancel, saving, error }: EditFormProps) {
  return (
    <div className="attr-edit-form">
      {type === 'project' && (
        <>
          <FormField label="Name" value={form.projectName || ''} onChange={v => onChange('projectName', v)} />
          <FormField label="Beschreibung" value={form.description || ''} onChange={v => onChange('description', v)} multiline />
          <ContactSelect value={form.assignedTo || ''} onChange={v => onChange('assignedTo', v)} />
        </>
      )}
      {type === 'task' && (
        <>
          <FormField label="Titel" value={form.title || ''} onChange={v => onChange('title', v)} />
          <FormSelect label="Typ" value={form.taskType || ''} options={TASK_TYPE_OPTIONS} onChange={v => onChange('taskType', v)} />
          <FormSelect label="Priorität" value={form.priority || ''} options={PRIORITY_OPTIONS} onChange={v => onChange('priority', v)} />
          <FormSelect label="Status" value={form.status || ''} options={STATUS_TASK_OPTIONS} onChange={v => onChange('status', v)} />
          <ContactSelect value={form.assignedTo || ''} onChange={v => onChange('assignedTo', v)} />
          <FormField label="Fällig" value={form.dueAt ? form.dueAt.slice(0, 10) : ''} onChange={v => onChange('dueAt', v)} type="date" />
          <FormField label="Beschreibung" value={form.description || ''} onChange={v => onChange('description', v)} multiline />
        </>
      )}
      {type === 'purchase-order' && (
        <p className="attr-detail-no-detail">Purchase Orders können hier nicht bearbeitet werden.</p>
      )}

      {error && <p className="attr-edit-error">{error}</p>}

      <div className="attr-edit-actions">
        <button className="attr-edit-cancel" onClick={onCancel}>Abbrechen</button>
        <button className="attr-edit-save" onClick={onSave} disabled={saving}>
          {saving ? 'Speichert…' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}

function ContactSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts().then(c => { setContacts(c); setLoading(false); });
  }, []);

  return (
    <div className="attr-form-field">
      <label className="attr-form-label">Zugewiesen</label>
      <select
        className="attr-form-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={loading}
      >
        <option value="">{loading ? 'Lädt…' : '— wählen —'}</option>
        {contacts.map(c => (
          <option key={c.id} value={c.label} title={c.subLabel}>
            {c.label}{c.subLabel ? ` · ${c.subLabel}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

function FormField({ label, value, onChange, multiline, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean; type?: string;
}) {
  return (
    <div className="attr-form-field">
      <label className="attr-form-label">{label}</label>
      {multiline
        ? <textarea className="attr-form-input" value={value} onChange={e => onChange(e.target.value)} rows={3} />
        : <input className="attr-form-input" type={type} value={value} onChange={e => onChange(e.target.value)} />
      }
    </div>
  );
}

function FormSelect({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div className="attr-form-field">
      <label className="attr-form-label">{label}</label>
      <select className="attr-form-input" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">— wählen —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
