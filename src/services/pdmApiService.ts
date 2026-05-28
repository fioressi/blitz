import type { AttributeGroup, Attribute, Email } from '../types/email';

const PDM_API = 'https://pdm-api.azurewebsites.net/api';

interface SearchResult {
  type: string;
  id: number;
  label: string;
  subLabel?: string;
}

async function pdmFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${PDM_API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`pdm-api error: ${res.status} ${path}`);
  return res.json();
}

export async function loadAttributeGroups(): Promise<AttributeGroup[]> {
  const [projects, orders, tasks] = await Promise.all([
    pdmFetch<SearchResult[]>('/search?type=PROJECT').catch(e => { console.error('PROJECT fetch failed:', e); return []; }),
    pdmFetch<SearchResult[]>('/search?type=ORDER').catch(e => { console.error('ORDER fetch failed:', e); return []; }),
    pdmFetch<SearchResult[]>('/search?type=TASK').catch(e => { console.error('TASK fetch failed:', e); return []; }),
  ]);

  const toAttr = (r: SearchResult, color: string): Attribute => ({
    id: String(r.id),
    type: r.type.toLowerCase() === 'order' ? 'purchase-order'
        : r.type.toLowerCase() === 'project' ? 'project'
        : 'task',
    label: r.label,
    subLabel: r.subLabel,
    color,
    entityType: r.type,
    entityId: r.id,
  });

  return [
    {
      id: 'projects',
      title: 'Projekte',
      icon: '📁',
      side: 'left',
      createType: 'project' as const,
      items: projects.slice(0, 20).map(r => toAttr(r, '#3b82f6')),
    },
    {
      id: 'orders',
      title: 'Purchase Orders',
      icon: '🛒',
      side: 'left',
      items: orders.slice(0, 20).map(r => toAttr(r, '#10b981')),
    },
    {
      id: 'tasks',
      title: 'Tasks',
      icon: '📋',
      side: 'right',
      createType: 'task' as const,
      items: tasks.slice(0, 20).map(r => toAttr(r, '#f59e0b')),
    },
  ];
}

export async function saveEmailWithLink(
  email: Email,
  entityType: string,
  entityId: number,
): Promise<void> {
  await pdmFetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
      messageId: email.id,
      graphItemId: email.id,
      subject: email.subject,
      from: `${email.from} <${email.fromEmail}>`,
      sentAt: email.receivedAt,
      hasAttachments: email.hasAttachment,
      kind: 'COMMUNICATION',
      targets: [{ type: entityType, id: entityId }],
    }),
  });
}

export async function saveEmail(email: Email): Promise<void> {
  // Swipe rechts ohne Attribut — mit OBJECT als Platzhalter ist nicht möglich.
  // Wir speichern erst wenn ein Attribut zugewiesen wird.
  // Diese Funktion ist ein No-op bis die API ein "save without target" unterstützt.
  console.log('saveEmail (kein Target) — noch nicht implementiert', email.id);
}

interface EmailLink {
  entityType: string;
  entityId: number;
  entityLabel: string;
}

export async function createTask(fields: {
  title: string;
  taskType?: string;
  priority?: string;
  assignedTo?: string;
  dueAt?: string;
  description?: string;
}): Promise<{ taskId: number }> {
  return pdmFetch('/tasks', {
    method: 'POST',
    body: JSON.stringify(fields),
  });
}

export async function createProject(fields: {
  projectName: string;
  description?: string;
  assignedTo?: string;
}): Promise<{ projectId: number; projectCode: string }> {
  return pdmFetch('/projects', {
    method: 'POST',
    body: JSON.stringify(fields),
  });
}

export interface AttributeDetailData {
  id: number;
  entityType: string;
  // Project
  projectCode?: string;
  projectName?: string;
  // Task
  title?: string;
  taskType?: string;
  priority?: string;
  status?: string;
  // Order
  orderNumber?: string;
  supplierName?: string;
  amount?: number;
  // Common
  description?: string;
  assignedTo?: string;
  dueAt?: string;
  createdAt?: string;
}

export async function fetchAttributeDetail(entityType: string, entityId: number): Promise<AttributeDetailData | null> {
  const segment = entityType === 'PROJECT' ? 'projects'
                : entityType === 'TASK'    ? 'tasks'
                : 'orders';
  try {
    return await pdmFetch<AttributeDetailData>(`/${segment}/${entityId}`);
  } catch {
    return null;
  }
}

export async function updateAttributeDetail(entityType: string, entityId: number, fields: Partial<AttributeDetailData>): Promise<void> {
  const segment = entityType === 'PROJECT' ? 'projects'
                : entityType === 'TASK'    ? 'tasks'
                : 'orders';
  await pdmFetch(`/${segment}/${entityId}`, {
    method: 'PUT',
    body: JSON.stringify(fields),
  });
}

export type EmailStateStatus = 'DISMISSED' | 'READ' | 'SAVED' | 'REPLY';

export interface UserEmailState {
  messageId: string;
  status: EmailStateStatus;
}

export async function loadEmailUserStates(userEmail: string): Promise<UserEmailState[]> {
  try {
    const data = await pdmFetch<{ states: UserEmailState[] }>(
      `/email-states?user=${encodeURIComponent(userEmail)}`
    );
    return data.states || [];
  } catch {
    return [];
  }
}

export async function setEmailState(
  messageId: string,
  status: EmailStateStatus,
  userEmail: string,
): Promise<void> {
  await pdmFetch('/email-states', {
    method: 'POST',
    body: JSON.stringify({ messageId, status, user: userEmail }),
  });
}

export async function clearEmailState(messageId: string, userEmail: string): Promise<void> {
  await pdmFetch('/email-states', {
    method: 'DELETE',
    body: JSON.stringify({ messageId, user: userEmail }),
  });
}

function textFromEmail(email: Email): string | undefined {
  const raw = email.body || email.preview || '';
  if (!raw) return undefined;
  const plain = email.bodyIsHtml
    ? raw
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
    : raw;
  return plain.slice(0, 4000) || undefined;
}

export async function saveEmailRecord(email: Email, userId: string): Promise<void> {
  const bodyText = textFromEmail(email);
  await pdmFetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
      messageId: email.id,
      subject: email.subject,
      from: email.fromEmail || email.from,
      to: email.toEmail || email.to || '',
      sentAt: email.receivedAt,
      hasAttachments: email.hasAttachment,
      kind: 'COMMUNICATION',
      user: userId,
      targets: [],
      ...(bodyText ? { comments: bodyText } : {}),
    }),
  });
}

interface DbEmailRow {
  MessageId: string;
  Subject: string;
  FromAddr: string;
  ToAddr: string | null;
  SentAt: string;
  Kind: string;
  LinkedAt: string;
}

export async function loadBlitzSentEmails(userId: string): Promise<Email[]> {
  try {
    const rows = await pdmFetch<DbEmailRow[]>(
      `/emails?user=${encodeURIComponent(userId)}`,
    );
    return rows.map(r => ({
      id: r.MessageId,
      from: r.FromAddr,
      fromEmail: r.FromAddr,
      to: r.ToAddr || undefined,
      toEmail: r.ToAddr || undefined,
      subject: r.Subject,
      preview: '',
      body: '',
      receivedAt: r.LinkedAt || r.SentAt,
      hasAttachment: false,
      attachments: [],
      links: [],
      status: 'read' as const,
      isSent: true,
    }));
  } catch {
    return [];
  }
}

export interface CrmContact {
  id: number;
  label: string;
  subLabel?: string;
}

export async function loadContacts(): Promise<CrmContact[]> {
  try {
    const data = await pdmFetch<Array<{ type: string; id: number; label: string; subLabel?: string }>>(
      '/search?type=CONTACT',
    );
    return data.map(r => ({ id: r.id, label: r.label, subLabel: r.subLabel }));
  } catch {
    return [];
  }
}

export async function loadEmailsForEntity(entityType: string, entityId: number): Promise<Email[]> {
  try {
    const rows = await pdmFetch<DbEmailRow[]>(
      `/emails?entityType=${encodeURIComponent(entityType)}&entityId=${entityId}`,
    );
    return rows.map(r => ({
      id: r.MessageId,
      from: r.FromAddr,
      fromEmail: r.FromAddr,
      to: r.ToAddr || undefined,
      toEmail: r.ToAddr || undefined,
      subject: r.Subject,
      preview: '',
      body: '',
      bodyIsHtml: false,
      receivedAt: r.LinkedAt || r.SentAt,
      hasAttachment: false,
      attachments: [],
      links: [],
      status: 'read' as const,
      isSent: false,
    }));
  } catch {
    return [];
  }
}

// ── BlitzBrett ────────────────────────────────────────────────────────────────

export interface BrettItem {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  entityType: string;
  entityId: number;
}

function searchToBrettItem(r: SearchResult, entityType: string): BrettItem {
  return {
    id: `${entityType}:${r.id}`,
    title: r.label,
    subtitle: r.subLabel,
    entityType,
    entityId: r.id,
  };
}

export async function loadBrettItems(type: 'PROJECT' | 'TASK'): Promise<BrettItem[]> {
  try {
    const data = await pdmFetch<SearchResult[]>(`/search?type=${type}`);
    return data.map(r => searchToBrettItem(r, type));
  } catch {
    return [];
  }
}

export async function loadPurchaseOrders(): Promise<BrettItem[]> {
  try {
    const data = await pdmFetch<SearchResult[]>('/search?type=ORDER');
    return data.map(r => searchToBrettItem(r, 'ORDER'));
  } catch {
    return [];
  }
}

export async function loadObjectsForProject(projectId?: number): Promise<BrettItem[]> {
  try {
    const url = projectId != null
      ? `/search?type=OBJECT&projectId=${projectId}`
      : '/search?type=OBJECT';
    const data = await pdmFetch<SearchResult[]>(url);
    return data.map(r => searchToBrettItem(r, 'OBJECT'));
  } catch {
    return [];
  }
}

export async function loadTasksForEntity(entityType: string, entityId: number): Promise<BrettItem[]> {
  try {
    const data = await pdmFetch<SearchResult[]>(
      `/search?type=TASK&entityType=${encodeURIComponent(entityType)}&entityId=${entityId}`,
    );
    return data.map(r => searchToBrettItem(r, 'TASK'));
  } catch {
    return [];
  }
}

export async function loadAttachmentsForEntity(entityType: string, entityId: number): Promise<BrettItem[]> {
  try {
    const data = await pdmFetch<Array<{ id: number; name: string; size?: number; contentType?: string }>>(
      `/attachments?entityType=${encodeURIComponent(entityType)}&entityId=${entityId}`,
    );
    return data.map(r => ({
      id: `FILE:${r.id}`,
      title: r.name,
      subtitle: r.contentType,
      meta: r.size != null ? `${Math.round(r.size / 1024)} KB` : undefined,
      entityType: 'FILE',
      entityId: r.id,
    }));
  } catch {
    return [];
  }
}

export async function loadEmailLinks(messageId: string): Promise<EmailLink[]> {
  try {
    const data = await pdmFetch<{
      links?: Array<{ entityType: string; entityId: number; label?: string }>;
    }>(`/emails/by-message?messageId=${encodeURIComponent(messageId)}`);
    return (data.links || []).map(l => ({
      entityType: l.entityType,
      entityId: l.entityId,
      entityLabel: l.label || `${l.entityType} #${l.entityId}`,
    }));
  } catch {
    return [];
  }
}
