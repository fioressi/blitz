import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { IPublicClientApplication, AccountInfo } from '@azure/msal-browser';
import type { Email } from '../../types/email';
import { sendMail } from '../../services/graphService';
import './ComposeModal.css';

interface Props {
  mode: 'new' | 'reply';
  originalEmail?: Email;
  instance: IPublicClientApplication;
  account: AccountInfo;
  onClose: () => void;
  onSent?: () => void;
}

function buildQuotedHtml(email: Email): string {
  const date = new Date(email.receivedAt).toLocaleString('de-AT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const header = `
    <p style="color:#aab8ca;margin:0 0 6px">
      <strong>Von:</strong> ${email.from} &lt;${email.fromEmail}&gt;<br>
      <strong>Datum:</strong> ${date}<br>
      <strong>Betreff:</strong> ${email.subject}
    </p>`;
  const body = email.bodyIsHtml
    ? email.body
    : `<pre style="white-space:pre-wrap;font-family:inherit">${email.body}</pre>`;
  return `
    <br><br>
    <hr style="border:none;border-top:1px solid #66d9ef44;margin:0 0 10px">
    <div style="border-left:3px solid #66d9ef;padding-left:12px">
      ${header}
      <div style="color:#aab8ca">${body}</div>
    </div>`;
}

function textToHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

export function ComposeModal({ mode, originalEmail, instance, account, onClose, onSent }: Props) {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (mode === 'reply' && originalEmail) {
      setTo(originalEmail.fromEmail);
      setSubject(
        originalEmail.subject.toLowerCase().startsWith('re:')
          ? originalEmail.subject
          : `Re: ${originalEmail.subject}`,
      );
    }
    setTimeout(() => bodyRef.current?.focus(), 100);
  }, [mode, originalEmail]);

  const handleSend = async () => {
    const toList = to.split(',').map(s => s.trim()).filter(Boolean);
    if (toList.length === 0) { setError('Bitte mindestens einen Empfänger eingeben.'); return; }
    if (!subject.trim()) { setError('Bitte einen Betreff eingeben.'); return; }

    setSending(true);
    setError(null);
    try {
      const ccList = showCc ? cc.split(',').map(s => s.trim()).filter(Boolean) : [];
      const htmlBody = textToHtml(body) + (originalEmail ? buildQuotedHtml(originalEmail) : '');
      await sendMail(instance, account, {
        to: toList,
        ...(ccList.length ? { cc: ccList } : {}),
        subject: subject.trim(),
        htmlBody,
      });
      onSent?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Senden.');
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="compose-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        onKeyDown={handleKey}
      >
        <motion.div
          className="compose-panel"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="compose-header">
            <span className="compose-title">
              {mode === 'reply' ? `↩ Antworten` : '✉ Neue E-Mail'}
            </span>
            {mode === 'reply' && originalEmail && (
              <span className="compose-original-subject">{originalEmail.subject}</span>
            )}
            <button className="compose-close" onClick={onClose}>✕</button>
          </div>

          <div className="compose-fields">
            <div className="compose-row">
              <label className="compose-label">An</label>
              <input
                className="compose-input"
                value={to}
                onChange={e => setTo(e.target.value)}
                placeholder="empfaenger@beispiel.com, ..."
                autoComplete="email"
              />
              {!showCc && (
                <button className="compose-cc-btn" onClick={() => setShowCc(true)}>+ CC</button>
              )}
            </div>

            {showCc && (
              <div className="compose-row">
                <label className="compose-label">CC</label>
                <input
                  className="compose-input"
                  value={cc}
                  onChange={e => setCc(e.target.value)}
                  placeholder="kopie@beispiel.com"
                  autoComplete="email"
                />
              </div>
            )}

            <div className="compose-row">
              <label className="compose-label">Betreff</label>
              <input
                className="compose-input"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Betreff..."
              />
            </div>
          </div>

          <textarea
            ref={bodyRef}
            className="compose-body"
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Nachricht schreiben…"
          />

          {mode === 'reply' && originalEmail && (
            <div className="compose-quote">
              <div className="compose-quote-header">
                <strong>Von:</strong> {originalEmail.from} &lt;{originalEmail.fromEmail}&gt;
                &nbsp;·&nbsp;
                <strong>Betreff:</strong> {originalEmail.subject}
              </div>
              <div
                className="compose-quote-body"
                dangerouslySetInnerHTML={{
                  __html: originalEmail.bodyIsHtml
                    ? originalEmail.body
                    : `<pre>${originalEmail.body}</pre>`,
                }}
              />
            </div>
          )}

          {error && <div className="compose-error">{error}</div>}

          <div className="compose-footer">
            <button className="compose-btn-cancel" onClick={onClose} disabled={sending}>
              Abbrechen
            </button>
            <button className="compose-btn-send" onClick={handleSend} disabled={sending}>
              {sending ? 'Wird gesendet…' : '✉ Senden'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
