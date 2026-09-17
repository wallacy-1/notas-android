import type { ClipKind } from '../types';

const URL_RE = /^(https?:\/\/|www\.)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i;
const CODE_HINTS = /(^\s*(export|import|const|let|var|function|def|class|SELECT|#include)\b|[{};]\s*$|=>|\$\s\w|^\s*[\w-]+=\S)/m;

export function detectClipKind(text: string): ClipKind {
  const t = text.trim();
  if (!t.includes(' ') && !t.includes('\n') && URL_RE.test(t)) return 'link';
  if (CODE_HINTS.test(t)) return 'código';
  return 'texto';
}
