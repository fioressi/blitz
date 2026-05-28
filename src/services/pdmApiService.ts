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

// ── Internal row types ────────────────────────────────────────────────────────

interface TaskRow {
  TaskId: number;
  Title: string;
  TitleDe?: string;
  Status?: string;
  Priority?: string;
  TaskType?: string;
  DueAt?: string;
}

interface OrderRow {
  OrderId: number;
  PoNumber?: string;
  OrderName?: string;
  Status?: string;
  PartId?: string;
  SupplierName?: string;
}

interface ObjectRow {
  ObjectId: number;
  PartId: string;
  part_name?: string;
  Description?: string;
}

interface InvoiceRow {
  InvoiceId: number;
  InvoiceNumber?: string;
  Status?: string;
  SupplierName?: string;
  PoNumber?: string;
  TotalAmount?: number;
  Currency?: string;
  InvoiceDate?: string;
}

// ── Row → BrettItem converters ────────────────────────────────────────────────

function taskToBrettItem(r: TaskRow): BrettItem {
  return {
    id: `TASK:${r.TaskId}`,
    title: r.TitleDe || r.Title,
    subtitle: [r.TaskType, r.Status].filter(Boolean).join(' · '),
    meta: r.DueAt ? new Date(r.DueAt).toLocaleDateString('de-AT') : undefined,
    entityType: 'TASK',
    entityId: r.TaskId,
  };
}

function orderToBrettItem(r: OrderRow): BrettItem {
  return {
    id: `ORDER:${r.OrderId}`,
    title: r.PoNumber || r.OrderName || `PO #${r.OrderId}`,
    subtitle: r.SupplierName || r.PartId,
    meta: r.Status,
    entityType: 'ORDER',
    entityId: r.OrderId,
  };
}

function objectToBrettItem(r: ObjectRow): BrettItem {
  return {
    id: `OBJECT:${r.ObjectId}`,
    title: r.PartId,
    subtitle: r.part_name || r.Description,
    entityType: 'OBJECT',
    entityId: r.ObjectId,
  };
}

function invoiceToBrettItem(r: InvoiceRow): BrettItem {
  const amount = r.TotalAmount != null
    ? `${r.TotalAmount.toLocaleString('de-AT', { maximumFractionDigits: 2 })} ${r.Currency || ''}`
    : undefined;
  return {
    id: `INVOICE:${r.InvoiceId}`,
    title: r.InvoiceNumber || `INV #${r.InvoiceId}`,
    subtitle: r.SupplierName || r.PoNumber,
    meta: [r.Status, amount].filter(Boolean).join(' · '),
    entityType: 'INVOICE',
    entityId: r.InvoiceId,
  };
}

function buildQuery(base: string, params: Record<string, string | number | undefined>): string {
  const qs = Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `${base}?${qs}` : base;
}

// ── Brett loaders — each returns BrettItem[] ──────────────────────────────────

export async function loadBrettProjects(filter?: {
  orderId?: number; objectId?: number; taskId?: number;
  messageId?: string; attachmentId?: number;
}): Promise<BrettItem[]> {
  try {
    const url = buildQuery('/search', { type: 'PROJECT', ...filter });
    const data = await pdmFetch<SearchResult[]>(url);
    return data.map(r => ({ id: `PROJECT:${r.id}`, title: r.label, subtitle: r.subLabel, entityType: 'PROJECT', entityId: r.id }));
  } catch { return []; }
}

export async function loadBrettTasks(filter?: {
  entityType?: string; entityId?: number;
  messageId?: string; attachmentId?: number;
}): Promise<BrettItem[]> {
  try {
    const url = buildQuery('/tasks', { top: 50, lang: 'de', ...filter });
    const data = await pdmFetch<TaskRow[]>(url);
    return data.map(taskToBrettItem);
  } catch { return []; }
}

export async function loadBrettPurchaseOrders(filter?: {
  projectId?: number; objectId?: number; taskId?: number;
  messageId?: string; attachmentId?: number;
}): Promise<BrettItem[]> {
  try {
    const url = buildQuery('/purchase-orders-tracking', { top: 200, ...filter });
    const data = await pdmFetch<{ orders: OrderRow[] }>(url);
    return (data.orders || []).map(orderToBrettItem);
  } catch { return []; }
}

export async function loadBrettObjects(filter?: {
  projectId?: number; orderId?: number; taskId?: number;
  messageId?: string; attachmentId?: number;
}): Promise<BrettItem[]> {
  try {
    const url = buildQuery('/pdm-objects', { top: 200, ...filter });
    const data = await pdmFetch<ObjectRow[]>(url);
    return data.map(objectToBrettItem);
  } catch { return []; }
}

export async function loadBrettInvoices(filter?: {
  projectId?: number; poId?: number; objectId?: number;
  supplierId?: number;
}): Promise<BrettItem[]> {
  try {
    const url = buildQuery('/invoices', { top: 100, ...filter });
    const data = await pdmFetch<InvoiceRow[]>(url);
    return data.map(invoiceToBrettItem);
  } catch { return []; }
}

const ATT_TYPE_LABELS: Record<string, string> = {
  DRAWING:       'Zeichnung',
  SPEC:          'Spezifikation',
  QUOTE:         'Angebot',
  OFFER:         'Angebot',
  INVOICE:       'Rechnung',
  DELIVERY_NOTE: 'Lieferschein',
  CERTIFICATE:   'Zertifikat',
  IMAGE:         'Bild',
  SHIPPING:      'Versand',
  OTHER:         'Datei',
};

function fileIcon(name: string): string {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return '📄';
  if (['stp', 'step', 'stl', 'igs', 'iges', 'obj', 'sat'].includes(ext)) return '🔩';
  if (['dxf', 'dwg'].includes(ext)) return '📐';
  if (['jpg', 'jpeg', 'png', 'bmp', 'gif', 'svg', 'tif', 'tiff'].includes(ext)) return '🖼️';
  if (['xlsx', 'xls', 'csv', 'ods'].includes(ext)) return '📊';
  if (['docx', 'doc', 'odt', 'rtf', 'txt'].includes(ext)) return '📝';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '📦';
  if (['eml', 'msg'].includes(ext)) return '✉️';
  return '📎';
}

export async function loadAttachmentsForEntity(entityType: string, entityId: number): Promise<BrettItem[]> {
  try {
    const data = await pdmFetch<Array<{
      AttachmentId: number;
      FileName: string;
      FileSize?: number;
      MimeType?: string;
      AttachmentType?: string;
    }>>(
      `/attachments?entityType=${encodeURIComponent(entityType)}&entityId=${entityId}`,
    );
    return data.map(r => {
      const icon = fileIcon(r.FileName);
      const typeLabel = r.AttachmentType ? (ATT_TYPE_LABELS[r.AttachmentType] ?? r.AttachmentType) : undefined;
      const sizeLabel = r.FileSize != null ? `${Math.round(r.FileSize / 1024)} KB` : undefined;
      return {
        id: `FILE:${r.AttachmentId}`,
        title: `${icon} ${r.FileName}`,
        subtitle: typeLabel,
        meta: sizeLabel,
        entityType: 'FILE',
        entityId: r.AttachmentId,
      };
    });
  } catch { return []; }
}

// legacy shims — kept for BlitzBrett.tsx compatibility during transition
/** @deprecated use loadBrettProjects */
export async function loadBrettItems(type: 'PROJECT' | 'TASK'): Promise<BrettItem[]> {
  if (type === 'PROJECT') return loadBrettProjects();
  return loadBrettTasks();
}
/** @deprecated use loadBrettPurchaseOrders */
export const loadPurchaseOrders = (): Promise<BrettItem[]> => loadBrettPurchaseOrders();
/** @deprecated use loadBrettObjects */
export const loadObjectsForProject = (projectId?: number): Promise<BrettItem[]> => loadBrettObjects(projectId != null ? { projectId } : undefined);
/** @deprecated use loadBrettTasks */
export const loadTasksForEntity = (entityType: string, entityId: number): Promise<BrettItem[]> => loadBrettTasks({ entityType, entityId });

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
