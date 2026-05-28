export interface Email {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  preview: string;
  body: string;
  bodyIsHtml?: boolean;
  receivedAt: string;
  hasAttachment: boolean;
  attachments: Attachment[];
  links: EmailLink[];
  status: 'unread' | 'read' | 'deleted' | 'to-reply';
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  contentType: string;
}

export interface EmailLink {
  attributeId: string;
  attributeType: AttributeType;
  label: string;
  entityType?: string;
  entityId?: number;
}

export type AttributeType = 'project' | 'purchase-order' | 'task' | 'tag';

export interface Attribute {
  id: string;
  type: AttributeType;
  label: string;
  subLabel?: string;
  color: string;
  entityType?: string;
  entityId?: number;
}

export interface AttributeGroup {
  id: string;
  title: string;
  icon: string;
  items: Attribute[];
  side: 'left' | 'right';
  createType?: 'task' | 'project';
}
