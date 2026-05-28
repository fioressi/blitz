import { motion, AnimatePresence } from 'framer-motion';
import type { Email } from '../../types/email';
import './EmailDetail.css';

interface Props {
  email: Email | null;
  loading?: boolean;
  onClose: () => void;
  onSwipeLeft: (id: string) => void;
  onSwipeRight: (id: string) => void;
  onReply?: (email: Email) => void;
}

export function EmailDetail({ email, loading, onClose, onSwipeLeft, onSwipeRight, onReply }: Props) {
  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('de-AT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
