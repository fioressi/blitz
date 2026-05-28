import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Email, AttributeGroup, EmailLink } from '../../types/email';
import { askIgor, IGOR_PROMPTS, suggestEntityLinks, type EntitySuggestion } from '../../services/igorService';
import './EmailDetail.css';

interface Props {
  email: Email | null;
  loading?: boolean;
  onClose: () => void;
  onSwipeLeft: (id: string) => void;
  onSwipeRight: (id: string) => void;
  onReply?: (email: Email, initialBody?: string) => void;
  attributeGroups?: AttributeGroup[];
  onLinkAdded?: (emailId: string, link: EmailLink) => void;
}

export function EmailDetail({ email, loading, onClose, onSwipeLeft, onSwipeRight, onReply, attributeGroups, onLinkAdded }: Props) {
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [suggestions, setSuggestions] = useState<EntitySuggestion[] | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());
  const promptRef = useRef<HTMLInputElement>(null);

  const formatDate = (iso: string) => new Date(iso).toLocaleString('de-AT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const runIgor = async (question: string) => {
    if (!email) return;
    setAiLoading(true);
    setAiResponse(null);
    try {
      const answer = await askIgor({
        question,
        emailBody: email.body || email.preview,
        emailSubject: email.subject,
      });
      setAiResponse(answer);
    } catch (err) {
      setAiResponse(`Fehler: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCustomPrompt = () => {
    const q = aiPrompt.trim();
    if (!q) return;
    setAiPrompt('');
    runIgor(q);
  };

  const handleInsertIntoReply = () => {
    if (!email || !aiResponse) return;
    onReply?.(email, aiResponse);
    onClose();
  };

  const handleToggleAi = () => {
    setAiOpen(o => !o);
    setAiResponse(null);
    setSuggestions(null);
  };

  const handleSuggestLinks = async () => {
    if (!email || !attributeGroups) return;
    setSuggestionsLoading(true);
    setSuggestions(null);
    try {
      const entities: EntitySuggestion[] = attributeGroups.flatMap(g =>
        g.items.map(attr => ({
          type: attr.entityType?.toUpperCase() ?? attr.type.toUpperCase(),
          id: attr.entityId ?? Number(attr.id),
          label: attr.label,
          subLabel: attr.subLabel,
        })),
      );
      const results = await suggestEntityLinks({
        emailBody: email.body || email.preview,
        emailSubject: email.subject,
        entities,
      });
      setSuggestions(results);
    } catch (err) {
      setSuggestions([]);
      setAiResponse(`Fehler: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleLinkSuggestion = (suggestion: EntitySuggestion) => {
    if (!email || !onLinkAdded) return;
    const key = `${suggestion.type}:${suggestion.id}`;
    if (linkedIds.has(key)) return;
    const typeMap: Record<string, EmailLink['attributeType']> = {
      PROJECT: 'project', ORDER: 'purchase-order', TASK: 'task',
    };
    const link: EmailLink = {
      attributeId: key,
      attributeType: typeMap[suggestion.type] ?? 'tag',
      label: suggestion.label,
      entityType: suggestion.type,
      entityId: suggestion.id,
    };
    onLinkAdded(email.id, link);
    setLinkedIds(prev => new Set([...prev, key]));
  };

  return (
    <AnimatePresence>
      {email && (
        <motion.div
          className="email-detail-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="email-detail-panel"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="email-detail-toolbar">
              <button className="detail-action delete" onClick={() => { onSwipeLeft(email.id); onClose(); }}>
                🗑 Löschen
              </button>
              <button className="detail-action read" onClick={() => { onSwipeRight(email.id); onClose(); }}>
                ✓ Gelesen
              </button>
              <button className="detail-action reply" onClick={() => { onReply?.(email); onClose(); }}>
                ↩ Antworten
              </button>
              <button
                className={`detail-action ai ${aiOpen ? 'ai-active' : ''}`}
                onClick={handleToggleAi}
                title="KI-Assistent"
              >
                🤖 KI
              </button>
              <div style={{ flex: 1 }} />
              <button className="detail-close" onClick={onClose}>✕</button>
            </div>

            <div className="email-detail-header">
              <div className="email-detail-avatar">{email.from[0]}</div>
              <div className="email-detail-meta">
                <div className="email-detail-from">{email.from}</div>
                <div className="email-detail-email">{email.fromEmail}</div>
                <div className="email-detail-date">{formatDate(email.receivedAt)}</div>
              </div>
            </div>

            <div className="email-detail-subject">{email.subject}</div>

            {email.links.length > 0 && (
              <div className="email-detail-links">
                {email.links.map((link, i) => (
                  <span key={i} className={`email-link-tag link-type-${link.attributeType}`}>
                    {link.label}
                  </span>
                ))}
              </div>
            )}

            {loading ? (
              <div className="email-detail-loading">Inhalt wird geladen…</div>
            ) : email.bodyIsHtml ? (
              <div
                className="email-detail-body email-detail-body--html"
                dangerouslySetInnerHTML={{ __html: email.body }}
              />
            ) : (
              <div className="email-detail-body">{email.body || email.preview}</div>
            )}

            {email.attachments.length > 0 && (
              <div className="email-detail-attachments">
                <div className="attachments-title">Anhänge</div>
                {email.attachments.map(att => (
                  <div key={att.id} className="attachment-item">
                    <span className="attachment-icon">📎</span>
                    <span className="attachment-name">{att.name}</span>
                    <span className="attachment-size">{formatSize(att.size)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── AI Panel ── */}
            <AnimatePresence>
              {aiOpen && (
                <motion.div
                  className="ai-panel"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="ai-panel-title">🤖 Igor KI-Assistent</div>

                  <div className="ai-quick-actions">
                    <button className="ai-chip" onClick={() => runIgor(IGOR_PROMPTS.summarize)} disabled={aiLoading || suggestionsLoading}>
                      Zusammenfassen
                    </button>
                    <button className="ai-chip" onClick={() => runIgor(IGOR_PROMPTS.translate)} disabled={aiLoading || suggestionsLoading}>
                      Übersetzen (DE)
                    </button>
                    <button className="ai-chip" onClick={() => runIgor(IGOR_PROMPTS.tasks)} disabled={aiLoading || suggestionsLoading}>
                      Aufgaben
                    </button>
                    <button className="ai-chip" onClick={() => runIgor(IGOR_PROMPTS.draftReply)} disabled={aiLoading || suggestionsLoading}>
                      Antwort entwerfen
                    </button>
                    {attributeGroups && onLinkAdded && (
                      <button
                        className="ai-chip ai-chip--link"
                        onClick={handleSuggestLinks}
                        disabled={aiLoading || suggestionsLoading}
                      >
                        🔗 Entitäten vorschlagen
                      </button>
                    )}
                  </div>

                  {suggestionsLoading && (
                    <div className="ai-loading">
                      <span className="ai-loading-dot" />
                      <span className="ai-loading-dot" />
                      <span className="ai-loading-dot" />
                      Igor analysiert Entitäten…
                    </div>
                  )}

                  {suggestions !== null && !suggestionsLoading && (
                    <div className="ai-suggestions">
                      <div className="ai-suggestions-label">
                        {suggestions.length === 0
                          ? 'Keine passenden Entitäten gefunden.'
                          : 'Vorgeschlagene Verknüpfungen:'}
                      </div>
                      <div className="ai-suggestions-chips">
                        {suggestions.map(s => {
                          const key = `${s.type}:${s.id}`;
                          const linked = linkedIds.has(key);
                          return (
                            <button
                              key={key}
                              className={`ai-suggestion-chip ${linked ? 'linked' : ''}`}
                              onClick={() => handleLinkSuggestion(s)}
                              disabled={linked}
                            >
                              <span className="suggestion-type-badge">{s.type}</span>
                              {s.label}
                              {s.subLabel && <span className="suggestion-sublabel">{s.subLabel}</span>}
                              <span className="suggestion-link-icon">{linked ? '✓' : '+'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="ai-input-row">
                    <input
                      ref={promptRef}
                      className="ai-input"
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCustomPrompt()}
                      placeholder="Eigene Anfrage an Igor…"
                      disabled={aiLoading}
                    />
                    <button className="ai-send-btn" onClick={handleCustomPrompt} disabled={aiLoading || !aiPrompt.trim()}>
                      ▶
                    </button>
                  </div>

                  {aiLoading && (
                    <div className="ai-loading">
                      <span className="ai-loading-dot" />
                      <span className="ai-loading-dot" />
                      <span className="ai-loading-dot" />
                      Igor denkt…
                    </div>
                  )}

                  {aiResponse && !aiLoading && (
                    <div className="ai-response">
                      <div className="ai-response-text">{aiResponse}</div>
                      {onReply && (
                        <button className="ai-insert-btn" onClick={handleInsertIntoReply}>
                          ↩ In Antwort einfügen
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
