import { useState, useEffect, useCallback } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type { Attribute } from './types/email';
import { useMsal } from '@azure/msal-react';
import type { Email, EmailLink, AttributeGroup } from './types/email';
import { mockAttributeGroups } from './data/mockData';
import { getInboxMessages, getMessageDetail } from './services/graphService';
import { loadAttributeGroups, saveEmailWithLink, loadEmailLinks } from './services/pdmApiService';
import { AttributePanel } from './components/AttributePanel/AttributePanel';
import { EmailCard } from './components/EmailCard/EmailCard';
import { ReplyTray } from './components/ReplyTray/ReplyTray';
import { EmailDetail } from './components/EmailDetail/EmailDetail';
import { CreateModal } from './components/CreateModal/CreateModal';
import { AttributeDetail } from './components/AttributeDetail/AttributeDetail';
import { AuthGuard } from './auth/AuthGuard';
import './App.css';

// ── localStorage helpers ──────────────────────────────────────────────────────

const LS_DISMISSED = 'blitz_dismissed';
const LS_READ      = 'blitz_read';
const LS_SAVED     = 'blitz_saved';

function getStoredIds(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); }
  catch { return new Set(); }
}

function addStoredId(key: string, id: string) {
  const next = [...getStoredIds(key), id].slice(-2000);
  localStorage.setItem(key, JSON.stringify(next));
}

// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'inbox' | 'read' | 'reply' | 'saved';

export default function App() {
  const { instance, accounts } = useMsal();
  const user = accounts[0];

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 6 },
  }));

  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [replyEmails, setReplyEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [attributeGroups, setAttributeGroups] = useState<AttributeGroup[]>(mockAttributeGroups);
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const [isDraggingEmailForReply, setIsDraggingEmailForReply] = useState(false);
  const [activeAttribute, setActiveAttribute] = useState<Attribute | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<'left' | 'right' | null>(null);
  const [createModal, setCreateModal] = useState<'task' | 'project' | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('inbox');
  const [selectedAttribute, setSelectedAttribute] = useState<Attribute | null>(null);

  const leftGroups = attributeGroups.filter(g => g.side === 'left');
  const rightGroups = attributeGroups.filter(g => g.side === 'right');

  const inboxEmails = emails.filter(e => e.status === 'unread');
  const readEmails  = emails.filter(e => e.status === 'read');
  const toReply     = emails.filter(e => e.status === 'to-reply');
  const savedEmails = emails.filter(e => e.status === 'saved');

  const tabEmails = activeTab === 'inbox' ? inboxEmails
    : activeTab === 'read'  ? readEmails
    : activeTab === 'reply' ? toReply
    : savedEmails;

  const loadEmails = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    try {
      const msgs = await getInboxMessages(instance, user);
      const dismissed = getStoredIds(LS_DISMISSED);
      const readIds   = getStoredIds(LS_READ);
      const savedIds  = getStoredIds(LS_SAVED);
      const filtered = msgs
        .filter(m => !dismissed.has(m.id))
        .map(m => readIds.has(m.id)  ? { ...m, status: 'read'  as const }
                : savedIds.has(m.id) ? { ...m, status: 'saved' as const }
                : m);
      setEmails(filtered);
      // restore reply tray from local state
      setReplyEmails(filtered.filter(e => e.status === 'to-reply'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Fehler beim Laden der Emails:', err);
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, [instance, user]);

  useEffect(() => {
    loadEmails();
    loadAttributeGroups()
      .then(groups => setAttributeGroups(groups))
      .catch(err => console.error('Attribute konnten nicht geladen werden:', err));
  }, [loadEmails]);

  const handleOpenEmail = async (email: Email) => {
    setSelectedEmail(email);
    setLoadingDetail(true);
    try {
      const [detail, dbLinks] = await Promise.all([
        !email.body && user ? getMessageDetail(instance, user, email.id) : Promise.resolve(email),
        loadEmailLinks(email.id),
      ]);
      const pdmLinks: EmailLink[] = dbLinks.map(l => ({
        attributeId: `${l.entityType}:${l.entityId}`,
        attributeType: l.entityType.toLowerCase() === 'order' ? 'purchase-order'
          : l.entityType.toLowerCase() === 'project' ? 'project' : 'task',
        label: l.entityLabel,
      }));
      const merged = { ...detail, links: pdmLinks };
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, ...merged } : e));
      setSelectedEmail(merged);
    } catch (err) {
      console.error('Fehler beim Laden der Email-Details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSwipeLeft = (id: string) => {
    addStoredId(LS_DISMISSED, id);
    setEmails(prev => prev.filter(e => e.id !== id));
    setReplyEmails(prev => prev.filter(e => e.id !== id));
  };

  const handleSwipeRight = (id: string) => {
    addStoredId(LS_READ, id);
    setEmails(prev => prev.map(e => e.id === id ? { ...e, status: 'read' } : e));
    setReplyEmails(prev => prev.filter(e => e.id !== id));
  };

  const handleDndDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.isEmail) {
      setIsDraggingEmailForReply(true);
    } else if (data && !data.isEmail) {
      setActiveAttribute(data as Attribute);
    }
  };

  const handleDndDragEnd = (event: DragEndEvent) => {
    setActiveAttribute(null);
    setIsDraggingEmailForReply(false);
    const { active, over } = event;
    if (!over) return;

    const data = active.data.current;

    // Email → Reply Tray
    if (data?.isEmail && over.id === 'reply-tray') {
      const email = emails.find(e => e.id === data.emailId);
      if (!email) return;
      setReplyEmails(prev => prev.some(e => e.id === email.id) ? prev : [...prev, email]);
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, status: 'to-reply' } : e));
      return;
    }

    // Attribut → Email Karte
    if (data && !data.isEmail && String(over.id).startsWith('email-')) {
      const emailId = String(over.id).replace('email-', '');
      const link: EmailLink = {
        attributeId: String(data.id),
        attributeType: data.type as EmailLink['attributeType'],
        label: String(data.label),
        entityType: data.entityType as string | undefined,
        entityId: data.entityId as number | undefined,
      };
      handleLinkAdded(emailId, link);
    }
  };

  const handleLinkAdded = async (emailId: string, link: EmailLink) => {
    setEmails(prev => prev.map(e => {
      if (e.id !== emailId) return e;
      const alreadyLinked = e.links.some(l => l.attributeId === link.attributeId);
      if (alreadyLinked) return e;
      return { ...e, links: [...e.links, link] };
    }));

    if (link.entityType && link.entityId != null) {
      const email = emails.find(e => e.id === emailId);
      if (email) {
        try {
          await saveEmailWithLink(email, link.entityType, link.entityId);
        } catch (err) {
          console.error('Fehler beim Speichern des Links in pdm-api:', err);
        }
      }
    }
  };

  const handleMarkSaved = (id: string) => {
    addStoredId(LS_SAVED, id);
    setEmails(prev => prev.map(e => e.id === id ? { ...e, status: 'saved' } : e));
  };

  const handleRemoveFromReplyTray = (emailId: string) => {
    setReplyEmails(prev => prev.filter(e => e.id !== emailId));
    setEmails(prev => prev.map(e => e.id === emailId ? { ...e, status: 'unread' } : e));
  };

  return (
    <AuthGuard>
      <DndContext sensors={sensors} onDragStart={handleDndDragStart} onDragEnd={handleDndDragEnd}>
      <div className="app">
        <header className="app-header">
          <button className="app-drawer-btn" onClick={() => setDrawerOpen(d => d === 'left' ? null : 'left')}>📁</button>
          <div className="app-logo">⚡ BLITZ</div>
          <div className="app-header-right">
            {user && <span className="app-user">{user.name}</span>}
            <button className="app-refresh" onClick={loadEmails} title="Aktualisieren">↻</button>
            <button className="app-drawer-btn" onClick={() => setDrawerOpen(d => d === 'right' ? null : 'right')}>📋</button>
            <button className="app-logout" onClick={() => instance.logoutRedirect()}>Abmelden</button>
          </div>
        </header>

        <div className={`app-body ${isDraggingCard ? 'card-dragging' : ''}`}>
          {drawerOpen && <div className="drawer-overlay" onClick={() => setDrawerOpen(null)} />}
          <aside className={`panel-left ${drawerOpen === 'left' ? 'drawer-open' : ''}`}>
            <AttributePanel groups={leftGroups} onNew={type => setCreateModal(type)} onItemClick={setSelectedAttribute} />
          </aside>

          <main className="inbox">
            <div className="inbox-tabs">
              <button
                className={`inbox-tab ${activeTab === 'inbox' ? 'active' : ''}`}
                onClick={() => setActiveTab('inbox')}
              >
                Posteingang
                {inboxEmails.length > 0 && <span className="inbox-tab-count">{inboxEmails.length}</span>}
              </button>
              <button
                className={`inbox-tab ${activeTab === 'read' ? 'active' : ''}`}
                onClick={() => setActiveTab('read')}
              >
                Gelesen
                {readEmails.length > 0 && <span className="inbox-tab-count inbox-tab-count--muted">{readEmails.length}</span>}
              </button>
              <button
                className={`inbox-tab ${activeTab === 'reply' ? 'active' : ''}`}
                onClick={() => setActiveTab('reply')}
              >
                Beantworten
                {toReply.length > 0 && <span className="inbox-tab-count inbox-tab-count--reply">{toReply.length}</span>}
              </button>
              <button
                className={`inbox-tab ${activeTab === 'saved' ? 'active' : ''}`}
                onClick={() => setActiveTab('saved')}
              >
                Merken
                {savedEmails.length > 0 && <span className="inbox-tab-count inbox-tab-count--saved">{savedEmails.length}</span>}
              </button>
            </div>

            <div className="inbox-list">
              {loading ? (
                <div className="inbox-loading">Emails werden geladen…</div>
              ) : loadError ? (
                <div className="inbox-error">Fehler: {loadError}</div>
              ) : tabEmails.length === 0 ? (
                <div className="inbox-empty">
                  {activeTab === 'inbox' ? 'Posteingang leer ✓'
                    : activeTab === 'read'  ? 'Keine gelesenen Emails'
                    : activeTab === 'reply' ? 'Keine offenen Antworten'
                    : 'Keine gemerkten Emails'}
                </div>
              ) : (
                tabEmails.map(email => (
                  <EmailCard
                    key={email.id}
                    email={email}
                    onSwipeLeft={handleSwipeLeft}
                    onSwipeRight={handleSwipeRight}
                    onClick={handleOpenEmail}
                    onDragStart={() => setIsDraggingCard(true)}
                    onDragEnd={() => setIsDraggingCard(false)}
                    showReplyHandle={activeTab === 'inbox'}
                    onMarkReply={activeTab === 'inbox' ? (id) => {
                      const em = emails.find(e => e.id === id);
                      if (!em) return;
                      setReplyEmails(prev => prev.some(e => e.id === id) ? prev : [...prev, em]);
                      setEmails(prev => prev.map(e => e.id === id ? { ...e, status: 'to-reply' } : e));
                    } : undefined}
                    onMarkSaved={activeTab === 'inbox' ? handleMarkSaved : undefined}
                  />
                ))
              )}
            </div>
          </main>

          <aside className={`panel-right ${drawerOpen === 'right' ? 'drawer-open' : ''}`}>
            <AttributePanel groups={rightGroups} onNew={type => setCreateModal(type)} onItemClick={setSelectedAttribute} />
          </aside>
        </div>

        <ReplyTray
          emails={replyEmails}
          onRemove={handleRemoveFromReplyTray}
          isEmailDragging={isDraggingEmailForReply}
        />

        <EmailDetail
          email={selectedEmail}
          loading={loadingDetail}
          onClose={() => setSelectedEmail(null)}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
        />

        {selectedAttribute && (
          <AttributeDetail
            attribute={selectedAttribute}
            onClose={() => setSelectedAttribute(null)}
          />
        )}

        {createModal && (
          <CreateModal
            type={createModal}
            onClose={() => setCreateModal(null)}
            onCreated={() => {
              loadAttributeGroups()
                .then(groups => setAttributeGroups(groups))
                .catch(err => console.error('Attribute konnten nicht geladen werden:', err));
            }}
          />
        )}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
        {activeAttribute && (
          <div className="attribute-item attribute-drag-overlay" style={{ borderLeftColor: activeAttribute.color }}>
            <span className="attribute-item-label">{activeAttribute.label}</span>
            {activeAttribute.subLabel && (
              <span className="attribute-item-sublabel">{activeAttribute.subLabel}</span>
            )}
          </div>
        )}
      </DragOverlay>
      </DndContext>
    </AuthGuard>
  );
}
