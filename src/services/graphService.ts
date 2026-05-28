import type { IPublicClientApplication, AccountInfo } from '@azure/msal-browser';
import { loginRequest } from '../auth/msalConfig';
import type { Email, Attachment } from '../types/email';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

async function getToken(instance: IPublicClientApplication, account: AccountInfo): Promise<string> {
  const result = await instance.acquireTokenSilent({ ...loginRequest, account });
  return result.accessToken;
}

async function graphFetch<T>(
  instance: IPublicClientApplication,
  account: AccountInfo,
  path: string,
): Promise<T> {
  const token = await getToken(instance, account);
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Graph API error: ${res.status} ${path}`);
  return res.json();
}

interface GraphMessage {
  id: string;
  subject: string;
  bodyPreview: string;
  body: { content: string; contentType: string };
  from: { emailAddress: { name: string; address: string } };
  toRecipients?: { emailAddress: { name: string; address: string } }[];
  receivedDateTime?: string;
  sentDateTime?: string;
  hasAttachments: boolean;
}

interface GraphAttachment {
  id: string;
  name: string;
  size: number;
  contentType: string;
  isInline: boolean;
  '@microsoft.graph.downloadUrl'?: string;
}

function mapMessage(msg: GraphMessage, attachments: Attachment[] = [], isSent = false): Email {
  const firstTo = msg.toRecipients?.[0]?.emailAddress;
  return {
    id: msg.id,
    from: msg.from?.emailAddress?.name || msg.from?.emailAddress?.address || 'Unbekannt',
    fromEmail: msg.from?.emailAddress?.address || '',
    to: firstTo?.name || firstTo?.address,
    toEmail: firstTo?.address,
    subject: msg.subject || '(kein Betreff)',
    preview: msg.bodyPreview || '',
    body: msg.body?.content || '',
    bodyIsHtml: msg.body?.contentType === 'html',
    receivedAt: (msg.sentDateTime || msg.receivedDateTime) ?? '',
    hasAttachment: msg.hasAttachments,
    attachments,
    links: [],
    status: 'unread',
    isSent,
  };
}

export async function getInboxMessages(
  instance: IPublicClientApplication,
  account: AccountInfo,
  top = 25,
): Promise<Email[]> {
  const data = await graphFetch<{ value: GraphMessage[] }>(
    instance,
    account,
    `/me/mailFolders/inbox/messages?$top=${top}&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,from,receivedDateTime,hasAttachments`,
  );
  return data.value.map(msg => mapMessage(msg));
}

export async function getSentMessages(
  instance: IPublicClientApplication,
  account: AccountInfo,
  top = 25,
): Promise<Email[]> {
  const data = await graphFetch<{ value: GraphMessage[] }>(
    instance,
    account,
    `/me/mailFolders/SentItems/messages?$top=${top}&$orderby=sentDateTime desc&$select=id,subject,bodyPreview,from,toRecipients,sentDateTime,hasAttachments`,
  );
  return data.value.map(msg => mapMessage(msg, [], true));
}

export async function sendMail(
  instance: IPublicClientApplication,
  account: AccountInfo,
  opts: {
    to: string[];
    cc?: string[];
    subject: string;
    htmlBody: string;
  },
): Promise<void> {
  const token = await getToken(instance, account);
  const message: Record<string, unknown> = {
    subject: opts.subject,
    body: { contentType: 'HTML', content: opts.htmlBody },
    toRecipients: opts.to.map(addr => ({ emailAddress: { address: addr.trim() } })),
  };
  if (opts.cc && opts.cc.length > 0) {
    message.ccRecipients = opts.cc.map(addr => ({ emailAddress: { address: addr.trim() } }));
  }
  const res = await fetch(`${GRAPH_BASE}/me/sendMail`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, saveToSentItems: true }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`sendMail ${res.status}: ${text}`);
  }
}

export async function getMessageDetail(
  instance: IPublicClientApplication,
  account: AccountInfo,
  messageId: string,
): Promise<Email> {
  const [msg, attData] = await Promise.all([
    graphFetch<GraphMessage>(
      instance,
      account,
      `/me/messages/${messageId}?$select=id,subject,bodyPreview,body,from,receivedDateTime,hasAttachments`,
    ),
    graphFetch<{ value: GraphAttachment[] }>(
      instance,
      account,
      `/me/messages/${messageId}/attachments?$select=id,name,size,contentType,isInline`,
    ).catch(() => ({ value: [] })),
  ]);

  const attachments: Attachment[] = attData.value
    .filter(a => !a.isInline)
    .map(a => ({
      id: a.id,
      name: a.name,
      size: a.size,
      contentType: a.contentType,
    }));

  return mapMessage(msg, attachments);
}

export async function downloadAttachment(
  instance: IPublicClientApplication,
  account: AccountInfo,
  messageId: string,
  attachmentId: string,
  filename: string,
): Promise<void> {
  const token = await getToken(instance, account);
  const res = await fetch(`${GRAPH_BASE}/me/messages/${messageId}/attachments/${attachmentId}/$value`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Download fehlgeschlagen: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
