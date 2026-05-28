import { useDroppable } from '@dnd-kit/core';
import type { Email } from '../../types/email';
import './ReplyTray.css';

interface Props {
  emails: Email[];
  onRemove: (emailId: string) => void;
}

export function ReplyTray({ emails, onRemove }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: 'reply-tray' });

  return (
    <div
      ref={setNodeRef}
      className={`reply-tray ${isOver ? 'drag-over' : ''} ${emails.length === 0 ? 'empty' : ''}`}
    >
      <div className="reply-tray-header">
        <span className="reply-tray-icon">📬</span>
        <span className="reply-tray-title">Zu beantworten</span>
        {emails.length > 0 && (
          <span className="reply-tray-count">{emails.length}</span>
        )}
      </div>
      {emails.length === 0 ? (
        <div className="reply-tray-empty">E-Mail hierher ziehen</div>
      ) : (
        <div className="reply-tray-items">
          {emails.map(email => (
            <div key={email.id} className="reply-tray-card">
              <div className="reply-tray-card-avatar">{email.from[0]}</div>
              <div className="reply-tray-card-content">
                <span className="reply-tray-card-from">{email.from}</span>
                <span className="reply-tray-card-subject">{email.subject}</span>
              </div>
              <button className="reply-tray-card-remove" onClick={() => onRemove(email.id)}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
