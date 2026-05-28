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
  receivedDateTime: string;
  hasAttachments: boolean;
}

interface GraphAttachment {
  id: string;
  name: string;
  size: number;
  contentType: string;
}

function mapMessage(msg: GraphMessage, attachments: Attachment[] = []): Email {
  return {
    id: msg.id,
    from: msg.from?.emailAddress?.name || msg.from?.emailAddress?.address || 'Unbekannt',
    fromEmail: msg.from?.emailAddress?.address || '',
    subject: msg.subject || '(kein Betreff)',
    preview: msg.bodyPreview || '',
    body: msg.body?.content || '',
    bodyIsHtml: msg.body?.contentType === 'html',
    receivedAt: msg.receivedDateTime,
    hasAttachment: msg.hasAttachments,
    attachments,
    links: [],
    status: 'unread',
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
      `/me/messages/${messageId}/attachments?$select=id,name,size,contentType`,
    ).catch(() => ({ value: [] })),
  ]);

  const attachments: Attachment[] = attData.value.map(a => ({
    id: a.id,
    name: a.name,
    size: a.size,
    contentType: a.contentType,
  }));

  return mapMessage(msg, attachments);
}
