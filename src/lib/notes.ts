import type { Attachment, AttachmentKind, Note } from '../types';

const KINDS: AttachmentKind[] = ['image', 'pdf', 'file'];

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/** Nota com algo escrito ou anexado (rascunho vazio não conta). */
export function hasContent(n: Note): boolean {
  return n.title.trim().length > 0 || n.body.trim().length > 0 || n.attachments.length > 0;
}

function sanitizeAttachment(raw: unknown): (Attachment & { data?: string }) | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;
  if (typeof a.id !== 'string' || typeof a.name !== 'string') return null;
  const mimeType = str(a.mimeType, 'application/octet-stream');
  return {
    id: a.id,
    name: a.name,
    uri: str(a.uri),
    size: num(a.size, 0),
    mimeType,
    kind: KINDS.includes(a.kind as AttachmentKind) ? (a.kind as AttachmentKind) : 'file',
    createdAt: num(a.createdAt, Date.now()),
    ...(typeof a.data === 'string' ? { data: a.data } : {}),
  };
}

/**
 * Aceita dados vindos de fora (backup, armazenamento) e devolve notas bem formadas.
 * Descarta o que não tem id; completa campos ausentes em vez de deixar o app quebrar.
 */
export function sanitizeNotes(raw: unknown): Note[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Note[] = [];
  const now = Date.now();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const n = item as Record<string, unknown>;
    if (typeof n.id !== 'string' || !n.id || seen.has(n.id)) continue;
    seen.add(n.id);
    const createdAt = num(n.createdAt, now);
    out.push({
      id: n.id,
      title: str(n.title),
      body: str(n.body),
      tags: Array.isArray(n.tags) ? [...new Set(n.tags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0))] : [],
      favorite: n.favorite === true,
      attachments: Array.isArray(n.attachments) ? n.attachments.map(sanitizeAttachment).filter((a): a is Attachment => a !== null) : [],
      createdAt,
      updatedAt: num(n.updatedAt, createdAt),
    });
  }
  return out;
}
