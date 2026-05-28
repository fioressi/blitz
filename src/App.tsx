import { useState, useEffect, useCallback } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type { Attribute } from './types/email';
import { useMsal } from '@azure/msal-react';
import type { Email, EmailLink, AttributeGroup } from './types/email';
import { mockAttributeGroups } from './data/mockData';
import { getInboxMessages, getMessageDetail } from './services/graphService';
import { loadAttributeGroups, saveEmailWithLink, loadEmailLinks, loadEmailUserStates, setEmailState, clearEmailState, saveEmailRecord, loadBlitzSentEmails } from './services/pdmApiService';
import { AttributePanel } from './components/AttributePanel/AttributePanel';
import { EmailCard } from './components/EmailCard/EmailCard';
import { ReplyTray } from './components/ReplyTray/ReplyTray';
import { EmailDetail } from './components/EmailDetail/EmailDetail';
import { CreateModal } from './components/CreateModal/CreateModal';
import { AttributeDetail } from './components/AttributeDetail/AttributeDetail';
import { ComposeModal } from './components/ComposeModal/ComposeModal';
import { AuthGuard } from './auth/AuthGuard';
import './App.css';

// ── localStorage helpers ──────────────────────────────────────────────────────

const LS_DISMISSED = 'blitz_dismissed';
const LS_READ      = 'blitz_read';
const LS_SAVED     = 'blitz_saved';
const LS_REPLY     = 'blitz_reply';
const LS_LINKS     = 'blitz_links';

function getStoredIds(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); }
  catch { return new Set(); }
}

function addStoredId(key: string, id: string) {
  const next = [...getStoredIds(key), id].slice(-2000);
  localStorage.setItem(key, JSON.stringify(next));
}

function removeStoredId(key: string, id: string) {
  const next = [...getStoredIds(key)].filter(v => v !== id);
  localStorage.setItem(key, JSON.stringify(next));
}

function getStoredLinks(): Record<string, EmailLink[]> {
  try { return JSON.parse(localStorage.getItem(LS_LINKS) || '{}'); }
  catch { return {}; }
}

function addStoredLink(messageId: string, link: EmailLink) {
  const all = getStoredLinks();
  const existing = all[messageId] || [];
  if (existing.some(l => l.attributeId === link.attributeId)) return;
  all[messageId] = [...existing, link];
  localStorage.setItem(LS_LINKS, JSON.stringify(all));
}

// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'inbox' | 'read' | 'reply' | 'saved' | 'sent';

export default function App() {
  const { instance, accounts } = useMsal();
  const user = accounts[0];
  const userId = user?.localAccountId; // stable UUID (OID), same on every device/browser

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
  const [sentEmails, setSentEmails] = useState<Email[]>([]);
  const [sentLoading, setSentLoading] = useState(false);
  const [sentLoaded, setSentLoaded] = useState(false);
  const [composeState, setComposeState] = useState<
    { mode: 'new' } | { mode: 'reply'; email: Email; initialBody?: string } | null
  >(null);

  const leftGroups = attributeGroups.filter(g => g.side === 'left');
  const rightGroups = attributeGroups.filter(g => g.side === 'right');

  const inboxEmails = emails.filter(e => e.status === 'unread');
  const readEmails  = emails.filter(e => e.status === 'read');
  const toReply     = emails.filter(e => e.status === 'to-reply');
  const savedEmails = emails.filter(e => e.status === 'saved');

  const tabEmails = activeTab === 'inbox' ? inboxEmails
    : activeTab === 'read'  ? readEmails
    : activeTab === 'reply' ? toReply
    : activeTab === 'saved' ? savedEmails
    : sentEmails;

  const handleSelectTab = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'sent' && !sentLoaded && userId) {
      setSentLoading(true);
      loadBlitzSentEmails(userId)
        .then(msgs => { setSentEmails(msgs); setSentLoaded(true); })
        .catch(err => console.error('Sent load failed:', err))
        .finally(() => setSentLoading(false));
    }
  };

  const loadEmails = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    console.log('[blitz] loadEmails — userId:', userId, '| username:', user.username, '| homeAccountId:', user.homeAccountId);
    try {
      const [msgs, apiStates] = await Promise.all([
        getInboxMessages(instance, user),
        userId ? loadEmailUserStates(userId) : Promise.resolve([]),
      ]);
      console.log('[blitz] apiStates from DB:', apiStates.length, apiStates);

      // Start with localStorage cache (fast / offline fallback)
      const dismissed = getStoredIds(LS_DISMISSED);
      const readIds   = getStoredIds(LS_READ);
      const savedIds  = getStoredIds(LS_SAVED);
      const replyIds  = getStoredIds(LS_REPLY);

      // Override with DB states (authoritative, cross-device)
      for (const s of apiStates) {
        const id = s.messageId;
        switch (s.status) {
          case 'DISMISSED': dismissed.add(id); addStoredId(LS_DISMISSED, id); break;
          case 'READ':      readIds.add(id);   addStoredId(LS_READ, id);      break;
          case 'SAVED':     savedIds.add(id);  addStoredId(LS_SAVED, id);     break;
          case 'REPLY':     replyIds.add(id);  addStoredId(LS_REPLY, id);     break;
        }
      }

      const storedLinks = getStoredLinks();
      const filtered = msgs
        .filter(m => !dismissed.has(m.id))
        .map(m => {
          let em: Email = readIds.has(m.id)  ? { ...m, status: 'read'     as const }
                        : savedIds.has(m.id) ? { ...m, status: 'saved'    as const }
                        : replyIds.has(m.id) ? { ...m, status: 'to-reply' as const }
                        : m;
          const cached = storedLinks[m.id];
          if (cached && cached.length > 0) em = { ...em, links: cached };
          return em;
        });
      setEmails(filtered);
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
    removeStoredId(LS_REPLY, id);
    if (userId) setEmailState(id, 'DISMISSED', userId).then(() => console.log('[blitz] DISMISSED saved to DB:', id)).catch(e => console.error('[blitz] DB write failed:', e));
    setEmails(prev => prev.filter(e => e.id !== id));
    setReplyEmails(prev => prev.filter(e => e.id !== id));
  };

  const handleSwipeRight = (id: string) => {
    addStoredId(LS_READ, id);
    removeStoredId(LS_REPLY, id);
    if (userId) setEmailState(id, 'READ', userId).then(() => console.log('[blitz] READ saved to DB:', id)).catch(e => console.error('[blitz] DB write failed:', e));
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
      addStoredId(LS_REPLY, email.id);
      if (userId) setEmailState(email.id, 'REPLY', userId).catch(console.error);
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

    addStoredLink(emailId, link);

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
    if (userId) setEmailState(id, 'SAVED', userId).catch(console.error);
    setEmails(prev => prev.map(e => e.id === id ? { ...e, status: 'saved' } : e));
  };

  const handleRemoveFromReplyTray = (emailId: string) => {
    removeStoredId(LS_REPLY, emailId);
    if (userId) clearEmailState(emailId, userId).catch(console.error);
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
            {user && <span className="app-user" title={`id: ${userId}`}>{user.name}</span>}
            <button className="app-compose-btn" onClick={() => setComposeState({ mode: 'new' })} title="Neue E-Mail">✉</button>
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
                onClick={() => handleSelectTab('inbox')}
              >
                Posteingang
                {inboxEmails.length > 0 && <span className="inbox-tab-count">{inboxEmails.length}</span>}
              </button>
              <button
                className={`inbox-tab ${activeTab === 'read' ? 'active' : ''}`}
                onClick={() => handleSelectTab('read')}
              >
                Gelesen
                {readEmails.length > 0 && <span className="inbox-tab-count inbox-tab-count--muted">{readEmails.length}</span>}
              </button>
              <button
                className={`inbox-tab ${activeTab === 'reply' ? 'active' : ''}`}
                onClick={() => handleSelectTab('reply')}
              >
                Beantworten
                {toReply.length > 0 && <span className="inbox-tab-count inbox-tab-count--reply">{toReply.length}</span>}
              </button>
              <button
                className={`inbox-tab ${activeTab === 'saved' ? 'active' : ''}`}
                onClick={() => handleSelectTab('saved')}
              >
                Merken
                {savedEmails.length > 0 && <span className="inbox-tab-count inbox-tab-count--saved">{savedEmails.length}</span>}
              </button>
              <button
                className={`inbox-tab ${activeTab === 'sent' ? 'active' : ''}`}
                onClick={() => handleSelectTab('sent')}
              >
                Gesendet
              </button>
            </div>

            <div className="inbox-list">
              {(loading && activeTab !== 'sent') || (sentLoading && activeTab === 'sent') ? (
                <div className="inbox-loading">Emails werden geladen…</div>
              ) : loadError && activeTab !== 'sent' ? (
                <div className="inbox-error">Fehler: {loadError}</div>
              ) : tabEmails.length === 0 ? (
                <div className="inbox-empty">
                  {activeTab === 'inbox' ? 'Posteingang leer ✓'
                    : activeTab === 'read'  ? 'Keine gelesenen Emails'
                    : activeTab === 'reply' ? 'Keine offenen Antworten'
                    : activeTab === 'saved' ? 'Keine gemerkten Emails'
                    : 'Keine gesendeten Emails'}
                </div>
              ) : (
                tabEmails.map(email => (
                  <EmailCard
                    key={email.id}
                    email={email}
                    onSwipeLeft={activeTab !== 'sent' ? handleSwipeLeft : () => {}}
                    onSwipeRight={activeTab !== 'sent' ? handleSwipeRight : () => {}}
                    onClick={handleOpenEmail}
                    onDragStart={() => setIsDraggingCard(true)}
                    onDragEnd={() => setIsDraggingCard(false)}
                    showReplyHandle={activeTab === 'inbox'}
                    onMarkReply={activeTab === 'inbox' ? (id) => {
                      const em = emails.find(e => e.id === id);
                      if (!em) return;
                      addStoredId(LS_REPLY, id);
                      if (userId) setEmailState(id, 'REPLY', userId).catch(console.error);
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
          onReply={(email, initialBody) => setComposeState({ mode: 'reply', email, initialBody })}
        />

        {selectedAttribute && (
          <AttributeDetail
            attribute={selectedAttribute}
            onClose={() => setSelectedAttribute(null)}
          />
        )}

        {composeState && user && (
          <ComposeModal
            mode={composeState.mode}
            originalEmail={composeState.mode === 'reply' ? composeState.email : undefined}
            initialBody={composeState.mode === 'reply' ? composeState.initialBody : undefined}
            instance={instance}
            account={user}
            onClose={() => setComposeState(null)}
            onSent={() => {
              if (composeState.mode === 'reply') {
                const original = composeState.email;
                // Mark as replied in state + DB
                addStoredId(LS_REPLY, original.id);
                if (userId) setEmailState(original.id, 'REPLY', userId).catch(console.error);
                setEmails(prev => prev.map(e => e.id === original.id ? { ...e, status: 'to-reply' } : e));
                // Save original email to PDM_db (LinkedBy = userId)
                if (userId) saveEmailRecord(original, userId).catch(e => console.error('[blitz] saveEmailRecord failed:', e));
              }
              setComposeState(null);
              // Reload sent tab if currently open
              setSentLoaded(false);
              if (activeTab === 'sent') {
                setSentEmails([]);
                handleSelectTab('sent');
              }
            }}
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
