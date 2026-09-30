const COMBINING = /[̀-ͯ]/g;

export function norm(s: string): string {
  return s.normalize('NFD').replace(COMBINING, '').toLowerCase();
}

/**
 * Normaliza guardando, para cada caractere do resultado, o índice de origem —
 * assim um acerto no texto normalizado vira um trecho exato do original,
 * mesmo quando o original vem com acentos decompostos (NFD).
 */
function normWithMap(text: string): { n: string; map: number[] } {
  let n = '';
  const map: number[] = [];
  let i = 0;
  for (const ch of text) {
    const part = norm(ch);
    for (let k = 0; k < part.length; k++) map.push(i);
    n += part;
    i += ch.length;
  }
  return { n, map };
}

/** Trechos [início, fim) do texto original que casam com a busca. */
export function matchRanges(text: string, q: string): [number, number][] {
  const nq = norm(q);
  if (!nq) return [];
  const { n, map } = normWithMap(text);
  const out: [number, number][] = [];
  let from = 0;
  for (;;) {
    const j = n.indexOf(nq, from);
    if (j < 0) break;
    const last = j + nq.length - 1;
    let end = map[last] + 1;
    // leva junto surrogates e acentos combinantes do último caractere
    while (end < text.length && isTrailing(text, end)) end++;
    out.push([map[j], end]);
    from = j + nq.length;
  }
  return out;
}

function isTrailing(text: string, i: number): boolean {
  const c = text.charCodeAt(i);
  return (c >= 0x0300 && c <= 0x036f) || (c >= 0xdc00 && c <= 0xdfff);
}

export function highlight(text: string, q: string): { t: string; hit: boolean }[] {
  const ranges = matchRanges(text, q);
  if (ranges.length === 0) return [{ t: text, hit: false }];
  const parts: { t: string; hit: boolean }[] = [];
  let i = 0;
  for (const [s, e] of ranges) {
    if (s > i) parts.push({ t: text.slice(i, s), hit: false });
    parts.push({ t: text.slice(s, e), hit: true });
    i = e;
  }
  if (i < text.length) parts.push({ t: text.slice(i), hit: false });
  return parts;
}

export function snippet(plain: string, q: string): string {
  const first = q ? matchRanges(plain, q)[0] : undefined;
  if (!first) return plain.slice(0, 110);
  const start = Math.max(0, first[0] - 40);
  const end = Math.min(plain.length, first[1] + 60);
  return (start > 0 ? '…' : '') + plain.slice(start, end) + (end < plain.length ? '…' : '');
}
