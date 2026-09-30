import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as DocumentPicker from 'expo-document-picker';
import JSZip from 'jszip';
import type { Attachment, Note, Settings } from '../types';
import { backupsDir, fileExists, PICKER_COPY_TO_CACHE, writeAttachmentData } from './files';
import { parseMarkdown, type Inline } from './markdown';
import { sanitizeNotes } from './notes';

export interface BackupPayload {
  app: 'caderno';
  version: 1;
  exportedAt: number;
  notes: Note[];
  settings: Partial<Settings>;
}

/** Arquivo escolhido não é um backup do Caderno. */
export class InvalidBackupError extends Error {
  constructor() {
    super('Esse arquivo não parece um backup do Caderno.');
  }
}

function stamp() {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

async function shareFile(file: File, mimeType: string, dialogTitle: string) {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle, UTI: mimeType });
  }
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = globalThis.atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function payload(notes: Note[], settings: Settings): BackupPayload {
  return { app: 'caderno', version: 1, exportedAt: Date.now(), notes, settings };
}

/** Backup local em Paths.document/backups — usado pelo automático e pelo "Fazer backup agora". */
export function writeLocalBackup(notes: Note[], settings: Settings): File {
  const dir = backupsDir();
  if (!dir.exists) dir.create({ intermediates: true });
  const file = new File(dir, `caderno-${stamp()}.json`);
  if (file.exists) file.delete();
  file.write(JSON.stringify(payload(notes, settings)));
  // mantém só os 7 mais recentes
  listLocalBackups()
    .slice(7)
    .forEach((f) => f.delete());
  return file;
}

export function listLocalBackups(): File[] {
  const dir = backupsDir();
  if (!dir.exists) return [];
  return dir
    .list()
    .filter((e): e is File => e instanceof File)
    .sort((a, b) => (b.modificationTime ?? 0) - (a.modificationTime ?? 0));
}

/** JSON para levar a outro aparelho: anexos vão junto, em base64. */
export async function exportJson(notes: Note[], settings: Settings) {
  const withData = await Promise.all(
    notes.map(async (n) => ({
      ...n,
      attachments: await Promise.all(
        n.attachments.map(async (a) => {
          try {
            const f = new File(a.uri);
            return f.exists ? { ...a, data: await f.base64() } : a;
          } catch {
            return a;
          }
        }),
      ),
    })),
  );
  const file = new File(Paths.cache, `caderno-${stamp()}.json`);
  if (file.exists) file.delete();
  file.write(JSON.stringify(payload(withData, settings), null, 2));
  await shareFile(file, 'application/json', 'Exportar JSON');
}

function noteToMarkdown(n: Note) {
  const head = [
    `# ${n.title || 'Sem título'}`,
    n.tags.length ? `tags: ${n.tags.join(', ')}` : null,
    `atualizada: ${new Date(n.updatedAt).toISOString()}`,
  ]
    .filter(Boolean)
    .join('\n');
  const atts = n.attachments.length
    ? '\n\n## Anexos\n' + n.attachments.map((a) => `- [${a.name}](anexos/${n.id}/${a.name})`).join('\n')
    : '';
  return `${head}\n\n${n.body}${atts}\n`;
}

function fileSlug(n: Note) {
  const base = (n.title || 'sem-titulo')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `${base || 'nota'}-${n.id.slice(-4)}.md`;
}

export async function exportMarkdownZip(notes: Note[]) {
  const zip = new JSZip();
  for (const n of notes) {
    zip.file(fileSlug(n), noteToMarkdown(n));
    for (const a of n.attachments) {
      try {
        const f = new File(a.uri);
        if (f.exists) zip.file(`anexos/${n.id}/${a.name}`, await f.bytes());
      } catch {}
    }
  }
  const bytes = await zip.generateAsync({ type: 'uint8array' });
  const file = new File(Paths.cache, `caderno-${stamp()}.zip`);
  if (file.exists) file.delete();
  file.write(bytes);
  await shareFile(file, 'application/zip', 'Exportar Markdown');
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inlinesHtml(inl: Inline[]) {
  return inl
    .map((x) => {
      if (x.type === 'bold') return `<b>${esc(x.text)}</b>`;
      if (x.type === 'italic') return `<i>${esc(x.text)}</i>`;
      if (x.type === 'code') return `<code>${esc(x.text)}</code>`;
      return esc(x.text);
    })
    .join('');
}

function noteHtml(n: Note) {
  const parts: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  const close = () => {
    if (list) {
      parts.push(`</${list}>`);
      list = null;
    }
  };
  for (const b of parseMarkdown(n.body)) {
    if (b.type === 'bullet' || b.type === 'ordered') {
      const tag = b.type === 'bullet' ? 'ul' : 'ol';
      if (list !== tag) {
        close();
        parts.push(`<${tag}>`);
        list = tag;
      }
      parts.push(`<li>${inlinesHtml(b.inlines)}</li>`);
      continue;
    }
    close();
    if (b.type === 'heading') parts.push(`<h${b.level + 1}>${inlinesHtml(b.inlines)}</h${b.level + 1}>`);
    else if (b.type === 'quote') parts.push(`<blockquote>${inlinesHtml(b.inlines)}</blockquote>`);
    else if (b.type === 'codeblock') parts.push(`<pre>${esc(b.text)}</pre>`);
    else if (b.type === 'paragraph') parts.push(`<p>${inlinesHtml(b.inlines)}</p>`);
  }
  close();
  const tags = n.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join(' ');
  return `<section id="n-${n.id}"><h1>${esc(n.title || 'Sem título')}</h1><div class="meta">${tags}</div>${parts.join('')}</section>`;
}

export async function exportPdf(notes: Note[]) {
  const toc = notes.map((n) => `<li><a href="#n-${n.id}">${esc(n.title || 'Sem título')}</a></li>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:-apple-system,Roboto,sans-serif;color:#201e1d;background:#fff;padding:32px;font-size:13px;line-height:1.55}
    h1{font-size:22px;margin:0 0 6px}h2{font-size:17px}h3{font-size:15px}
    section{page-break-before:always;padding-top:12px}
    .tag{display:inline-block;background:#f0fae1;color:#3d472b;border-radius:999px;padding:2px 9px;font-size:10px;margin-right:4px}
    .meta{margin-bottom:12px}blockquote{border-left:3px solid #aebf92;margin:0;padding-left:12px;color:#645c50;font-style:italic}
    pre,code{font-family:ui-monospace,monospace;background:#eee7db;border-radius:6px;padding:2px 6px}pre{padding:10px}
    .toc h1{font-size:26px}.toc ol{columns:2}
  </style></head><body>
  <div class="toc"><h1>Caderno</h1><p>${notes.length} notas · ${new Date().toLocaleDateString('pt-BR')}</p><ol>${toc}</ol></div>
  ${notes.map(noteHtml).join('')}
  </body></html>`;
  // expo-print grava num diretório que o app nem sempre pode ler (Expo Go);
  // pede o conteúdo em base64 e grava no cache do próprio app.
  const { base64 } = await Print.printToFileAsync({ html, base64: true });
  const file = new File(Paths.cache, `caderno-${stamp()}.pdf`);
  if (file.exists) file.delete();
  file.write(base64ToBytes(base64 ?? ''));
  await shareFile(file, 'application/pdf', 'PDF do caderno');
}

/** Abre o seletor e devolve o payload lido; null se cancelado, InvalidBackupError se não for backup. */
export async function pickBackupFile(): Promise<BackupPayload | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', '*/*'], copyToCacheDirectory: PICKER_COPY_TO_CACHE });
  if (res.canceled || !res.assets?.[0]) return null;
  const text = await new File(res.assets[0].uri).text();
  const data = parseBackup(text);
  if (!data) throw new InvalidBackupError();
  return data;
}

export function parseBackup(text: string): BackupPayload | null {
  try {
    const data = JSON.parse(text);
    if (data?.app !== 'caderno' || !Array.isArray(data.notes)) return null;
    const settings: Partial<Settings> = typeof data.settings?.autoBackup === 'boolean' ? { autoBackup: data.settings.autoBackup } : {};
    return { app: 'caderno', version: 1, exportedAt: Number(data.exportedAt) || 0, notes: sanitizeNotes(data.notes), settings };
  } catch {
    return null;
  }
}

/**
 * Prepara anexos das notas restauradas: grava os que vieram em base64 e
 * descarta os que apontam para arquivo inexistente (ex.: backup de outro aparelho).
 */
export function restoreAttachments(notes: Note[]): Note[] {
  return notes.map((n) => ({
    ...n,
    attachments: n.attachments.flatMap((raw): Attachment[] => {
      const { data, ...att } = raw as Attachment & { data?: string };
      try {
        if (data) return [writeAttachmentData(att, data)];
      } catch {}
      return fileExists(att.uri) ? [att] : [];
    }),
  }));
}
