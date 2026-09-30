// Parser de markdown enxuto: cabeçalhos, listas, citações, código e ênfase inline.

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'italic'; text: string }
  | { type: 'code'; text: string };

export type Block =
  | { type: 'heading'; level: 1 | 2 | 3; marker: string; inlines: Inline[] }
  | { type: 'bullet'; inlines: Inline[] }
  | { type: 'ordered'; index: string; inlines: Inline[] }
  | { type: 'quote'; inlines: Inline[] }
  | { type: 'codeblock'; text: string }
  | { type: 'paragraph'; inlines: Inline[] }
  | { type: 'blank' };

const INLINE_RE = /(\*\*([^*]+)\*\*|__([^_]+)__|`([^`]+)`|\*([^*]+)\*|_([^_]+)_)/g;
const WORD_CHAR = /[A-Za-z0-9À-ɏ]/;

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  const re = new RegExp(INLINE_RE);
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const idx = m.index;
    const end = idx + m[0].length;
    // "_" colado em palavra (minha_variavel_nova) é texto, não ênfase;
    // recomeça logo depois dele para achar ênfases reais adiante.
    if (m[0].startsWith('_') && (WORD_CHAR.test(src[idx - 1] ?? '') || WORD_CHAR.test(src[end] ?? ''))) {
      re.lastIndex = idx + 1;
      continue;
    }
    if (idx > last) out.push({ type: 'text', text: src.slice(last, idx) });
    if (m[2] !== undefined || m[3] !== undefined) out.push({ type: 'bold', text: m[2] ?? m[3] });
    else if (m[4] !== undefined) out.push({ type: 'code', text: m[4] });
    else out.push({ type: 'italic', text: m[5] ?? m[6] });
    last = end;
  }
  if (last < src.length) out.push({ type: 'text', text: src.slice(last) });
  return out;
}

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      blocks.push({ type: 'codeblock', text: buf.join('\n') });
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      blocks.push({ type: 'heading', level: h[1].length as 1 | 2 | 3, marker: h[1] + ' ', inlines: parseInline(h[2]) });
      i++;
      continue;
    }
    const b = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (b) {
      blocks.push({ type: 'bullet', inlines: parseInline(b[1]) });
      i++;
      continue;
    }
    const o = /^\s*(\d+)[.)]\s+(.*)$/.exec(line);
    if (o) {
      blocks.push({ type: 'ordered', index: o[1], inlines: parseInline(o[2]) });
      i++;
      continue;
    }
    const q = /^>\s?(.*)$/.exec(line);
    if (q) {
      blocks.push({ type: 'quote', inlines: parseInline(q[1]) });
      i++;
      continue;
    }
    if (line.trim() === '') {
      blocks.push({ type: 'blank' });
      i++;
      continue;
    }
    blocks.push({ type: 'paragraph', inlines: parseInline(line) });
    i++;
  }
  return blocks;
}

/** Texto sem marcação, para prévia e busca. */
export function stripMarkdown(src: string): string {
  // Usa o mesmo parser da visualização: só some o que de fato é marcação.
  return parseMarkdown(src)
    .map((b) => {
      if (b.type === 'blank') return '';
      if (b.type === 'codeblock') return b.text;
      return b.inlines.map((i) => i.text).join('');
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
