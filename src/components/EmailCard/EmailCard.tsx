import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import type { Email } from '../../types/email';
import './EmailCard.css';

interface Props {
  email: Email;
  onSwipeLeft: (id: string) => void;
  onSwipeRight: (id: string) => void;
  onClick: (email: Email) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  showReplyHandle?: boolean;
}

export function EmailCard({ email, onSwipeLeft, onSwipeRight, onClick, onDragStart, onDragEnd: onDragEndProp, showReplyHandle = true }: Props) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const controls = useAnimation();

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `email-${email.id}` });

  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging: isDndDragging } = useDraggable({
    id: `drag-email-${email.id}`,
    data: { emailId: email.id, isEmail: true },
  });

  const rotate = useTransform(x, [-300, 0, 300], [-18, 0, 18]);
  const deleteOpacity = useTransform(x, [-120, -30, 0], [1, 0.4, 0]);
  const readOpacity = useTransform(x, [0, 30, 120], [0, 0.4, 1]);
  const cardOpacity = useTransform(x, [-280, -180, 0, 180, 280], [0, 1, 1, 1, 0]);

  const handleDragEnd = async (_: unknown, info: { offset: { x: number } }) => {
    onDragEndProp?.();
    const threshold = 150;
    if (info.offset.x < -threshold) {
      await controls.start({ x: -600, opacity: 0, transition: { duration: 0.25 } });
      onSwipeLeft(email.id);
    } else if (info.offset.x > threshold) {
      await controls.start({ x: 600, opacity: 0, transition: { duration: 0.25 } });
      onSwipeRight(email.id);
    } else {
      controls.start({
        x: 0, y: 0,
        transition: { type: 'spring', stiffness: 200, damping: 18, mass: 1.2 },
      });
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="email-card-wrapper" ref={setDropRef}>
      <motion.div className="swipe-indicator delete">
        <motion.span style={{ opacity: deleteOpacity }}>🗑 Löschen</motion.span>
      </motion.div>
      <motion.div className="swipe-indicator read">
        <motion.span style={{ opacity: readOpacity }}>✓ Gelesen</motion.span>
      </motion.div>

      <motion.div
        className={`email-card ${isOver ? 'drag-over' : ''} ${isDndDragging ? 'is-dragging' : ''}`}
        style={{ x, y, rotate, opacity: cardOpacity }}
        animate={controls}
        drag={isDndDragging ? false : true}
        dragConstraints={false}
        dragElastic={1}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        onClick={() => onClick(email)}
        onDragStart={onDragStart}
        whileDrag={{ scale: 1.03, zIndex: 1000, boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="email-card-header">
          <div className="email-from-avatar">{email.from[0]}</div>
          <div className="email-meta">
            <span className="email-from">{email.from}</span>
            <span className="email-time">{formatTime(email.receivedAt)}</span>
          </div>
          {email.hasAttachment && <span className="attachment-icon">📎</span>}
        </div>

        <div className="email-subject">{email.subject}</div>
        <div className="email-preview">{email.preview}</div>

        {email.links.length > 0 && (
          <div className="email-links">
            {email.links.map((link, i) => (
              <span key={i} className={`email-link-tag link-type-${link.attributeType}`}>
                {link.label}
              </span>
            ))}
          </div>
        )}

        {isOver && <div className="drop-hint">Hier ablegen zum Verknüpfen</div>}

        {showReplyHandle && (
          <div
            ref={setDragRef}
            className="reply-drag-handle"
            style={{ transform: CSS.Translate.toString(transform) }}
            {...listeners}
            {...attributes}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            ↩ Zu beantworten ziehen
          </div>
        )}
      </motion.div>
    </div>
  );
}
