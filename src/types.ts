export type AttachmentKind = 'image' | 'pdf' | 'file';

export interface Attachment {
  id: string;
  name: string;
  uri: string;
  size: number; // bytes
  mimeType: string;
  kind: AttachmentKind;
  createdAt: number;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  tags: string[];
  favorite: boolean;
  attachments: Attachment[];
  createdAt: number;
  updatedAt: number;
}

export type ClipKind = 'texto' | 'link' | 'código';

export interface ClipItem {
  id: string;
  text: string;
  kind: ClipKind;
  pinned: boolean;
  createdAt: number;
}

export interface Settings {
  autoBackup: boolean;
  lastBackupAt: number | null;
}
