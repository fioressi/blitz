import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createTask, createProject } from '../../services/pdmApiService';
import './CreateModal.css';

interface Props {
  type: 'task' | 'project';
  onClose: () => void;
  onCreated: () => void;
}

const TASK_TYPES = [
  { value: 'OTHER',         label: 'Allgemein' },
  { value: 'CHANGE_OBJECT', label: 'Änderung' },
  { value: 'CREATE_OBJECT', label: 'Neues Objekt' },
  { value: 'ECN',           label: 'ECN' },
  { value: 'ISSUE',         label: 'Problem' },
  { value: 'PROCUREMENT',   label: 'Einkauf' },
  { value: 'PRODUCTION',    label: 'Produktion' },
  { value: 'QUALITY',       label: 'Qualität' },
  { value: 'APPROVAL',      label: 'Freigabe' },
  { value: 'FOLLOW_UP',     label: 'Follow-up' },
  { value: 'DOCUMENTATION', label: 'Dokumentation' },
];

export function CreateModal({ type, onClose, onCreated }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState('OTHER');
  const [priority, setPriority] = useState('NORMAL');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [description, setDescription] = useState('');

  const [projectName, setProjectName] = useState('');

  const isTask = type === 'task';
  const heading = isTask ? 'Neuer Task' : 'Neues Projekt';
  const submitLabel = isTask ? 'Task anlegen' : 'Projekt anlegen';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (isTask) {
        await createTask({
          title: title.trim(),
          taskType,
          priority,
          assignedTo: assignedTo.trim() || undefined,
          dueAt: dueAt || undefined,
          description: description.trim() || undefined,
        });
      } else {
        await createProject({
          projectName: projectName.trim(),
          description: description.trim() || undefined,
          assignedTo: assignedTo.trim() || undefined,
        });
      }
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = isTask ? title.trim().length > 0 : projectName.trim().length > 0;

  return (
    <AnimatePresence>
      <motion.div
        className="create-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="create-modal"
          initial={{ y: -20, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -20, opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="create-modal-header">
            <span className="create-modal-title">{heading}</span>
            <button className="create-modal-close" onClick={onClose}>✕</button>
          </div>

          <form className="create-modal-form" onSubmit={handleSubmit}>
            {isTask ? (
              <>
                <label className="cm-label">
                  Titel *
                  <input
                    className="cm-input"
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Task-Beschreibung"
                    autoFocus
                  />
                </label>

                <div className="cm-row">
                  <label className="cm-label">
                    Typ
                    <select className="cm-input" value={taskType} onChange={e => setTaskType(e.target.value)}>
                      {TASK_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="cm-label">
                    Priorität
                    <select className="cm-input" value={priority} onChange={e => setPriority(e.target.value)}>
                      <option value="LOW">Niedrig</option>
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">Hoch</option>
                      <option value="URGENT">Dringend</option>
                    </select>
                  </label>
                </div>

                <div className="cm-row">
                  <label className="cm-label">
                    Zugewiesen an
                    <input
                      className="cm-input"
                      type="text"
                      value={assignedTo}
                      onChange={e => setAssignedTo(e.target.value)}
                      placeholder="Name"
                    />
                  </label>
                  <label className="cm-label">
                    Fällig bis
                    <input
                      className="cm-input"
                      type="date"
                      value={dueAt}
                      onChange={e => setDueAt(e.target.value)}
                    />
                  </label>
                </div>
              </>
            ) : (
              <>
                <label className="cm-label">
                  Projektname *
                  <input
                    className="cm-input"
                    type="text"
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    placeholder="z.B. Neue Baugruppe 2026"
                    autoFocus
                  />
                </label>
                <label className="cm-label">
                  Projektleiter
                  <input
                    className="cm-input"
                    type="text"
                    value={assignedTo}
                    onChange={e => setAssignedTo(e.target.value)}
                    placeholder="Name"
                  />
                </label>
              </>
            )}

            <label className="cm-label">
              Beschreibung
              <textarea
                className="cm-input cm-textarea"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional…"
                rows={2}
              />
            </label>

            {error && <div className="cm-error">{error}</div>}

            <div className="cm-actions">
              <button type="button" className="cm-btn-cancel" onClick={onClose}>
                Abbrechen
              </button>
              <button
                type="submit"
                className="cm-btn-submit"
                disabled={!canSubmit || saving}
              >
                {saving ? 'Speichern…' : submitLabel}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
