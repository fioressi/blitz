import { useDroppable } from '@dnd-kit/core';
import type { Email } from '../../types/email';
import './ReplyTray.css';

interface Props {
  emails: Email[];
  onRemove: (emailId: string) => void;
  isEmailDragging?: boolean;
}

export function ReplyTray({ emails, onRemove, isEmailDragging }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: 'reply-tray' });

  return (
    <div
      ref={setNodeRef}
      className={`reply-tray ${isOver ? 'drag-over' : ''} ${isEmailDragging ? 'email-dragging' : ''}`}
    >
      <div className="reply-tray-header">
        <span className="reply-tray-icon">↩</span>
        <span className="reply-tray-title">Zu beantworten</span>
        {emails.length > 0 && (
          <span className="reply-tray-count">{emails.length}</span>
        )}
        {isEmailDragging && !isOver && (
          <span className="reply-tray-hint">← hier ablegen</span>
        )}
      </div>
      {emails.length === 0 && !isEmailDragging ? (
        <div className="reply-tray-empty">Email hierher ziehen</div>
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
