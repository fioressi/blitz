import { useState, useEffect } from 'react';
import { loadContacts, type CrmContact } from '../../services/pdmApiService';

// Module-level cache — Kontakte werden nur einmal pro Session geladen
let _cache: CrmContact[] | null = null;
let _inflight: Promise<CrmContact[]> | null = null;

function getContacts(): Promise<CrmContact[]> {
  if (_cache) return Promise.resolve(_cache);
  if (_inflight) return _inflight;
  _inflight = loadContacts().then(c => {
    _cache = c;
    _inflight = null;
    return c;
  });
  return _inflight;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** CSS-Klasse für das <select>, damit es zum Kontext-Styling passt. */
  className?: string;
  /** Platzhalter-Text für die leere Auswahl. */
  placeholder?: string;
}

/**
 * Dropdown aller CRM-Kontakte für das "Zugewiesen an"-Feld.
 * Speichert den Kontaktnamen (label) als Wert — konsistent mit TASKS.AssignedTo.
 * Erlaubt auch einen bestehenden Freitext-Wert der (noch) nicht in der Liste ist.
 */
export function ContactSelect({ value, onChange, className, placeholder }: Props) {
  const [contacts, setContacts] = useState<CrmContact[]>(_cache ?? []);
  const [loading, setLoading] = useState(_cache === null);

  useEffect(() => {
    let alive = true;
    getContacts().then(c => {
      if (!alive) return;
      setContacts(c);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  // Bestehender Wert, der nicht in der Kontaktliste vorkommt (z.B. Freitext-Altbestand)
  const knownValue = contacts.some(c => c.label === value);

  return (
    <select
      className={className}
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={loading}
    >
      <option value="">{loading ? 'Lädt…' : (placeholder ?? '— Kontakt wählen —')}</option>
      {!knownValue && value && <option value={value}>{value} (manuell)</option>}
      {contacts.map(c => (
        <option key={c.id} value={c.label} title={c.subLabel}>
          {c.label}{c.subLabel ? ` · ${c.subLabel}` : ''}
        </option>
      ))}
    </select>
  );
}
