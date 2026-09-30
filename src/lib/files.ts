import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import type { Attachment, AttachmentKind } from '../types';
import { uid } from './id';

export const attachmentsDir = () => new Directory(Paths.document, 'attachments');
export const backupsDir = () => new Directory(Paths.document, 'backups');

/**
 * No Android a cópia do DocumentPicker cai num cache que o expo-file-system
 * recusa ler ("Missing 'READ' permission"); o content:// original é legível.
 * No iOS a cópia é necessária para o arquivo continuar acessível.
 */
export const PICKER_COPY_TO_CACHE = Platform.OS !== 'android';

function ensure(dir: Directory) {
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export function kindFor(mimeType: string, name: string): AttachmentKind {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf' || /\.pdf$/i.test(name)) return 'pdf';
  return 'file';
}

function safeName(name: string) {
  return name.replace(/[^\w.\-]+/g, '_');
}

/** Copia um arquivo escolhido para dentro do app e devolve o anexo. */
export async function importAttachment(
  sourceUri: string,
  name: string,
  mimeType?: string | null,
  size?: number | null,
): Promise<Attachment> {
  const dir = ensure(attachmentsDir());
  const id = uid();
  const target = new File(dir, `${id}-${safeName(name)}`);
  await new File(sourceUri).copy(target);
  const mime = mimeType ?? 'application/octet-stream';
  return {
    id,
    name,
    uri: target.uri,
    size: size ?? target.size ?? 0,
    mimeType: mime,
    kind: kindFor(mime, name),
    createdAt: Date.now(),
  };
}

/** Grava um anexo vindo de backup (base64) dentro do app e devolve o anexo apontando para ele. */
export function writeAttachmentData(att: Attachment, base64: string): Attachment {
  const dir = ensure(attachmentsDir());
  const target = new File(dir, `${att.id}-${safeName(att.name)}`);
  if (target.exists) target.delete();
  target.write(base64, { encoding: 'base64' });
  return { ...att, uri: target.uri, size: att.size || target.size || 0 };
}

export function fileExists(uri: string): boolean {
  try {
    return !!uri && new File(uri).exists;
  } catch {
    return false;
  }
}

export function deleteAttachmentFile(att: Attachment) {
  try {
    const f = new File(att.uri);
    if (f.exists) f.delete();
  } catch {}
}

export function attachmentsTotalSize(list: Attachment[]): number {
  return list.reduce((acc, a) => acc + (a.size || 0), 0);
}

export function cleanupOrphans(keep: Set<string>) {
  try {
    const dir = attachmentsDir();
    if (!dir.exists) return;
    for (const entry of dir.list()) {
      if (entry instanceof File && !keep.has(entry.uri)) entry.delete();
    }
  } catch {}
}
