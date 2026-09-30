import type { ClipKind } from '../types';

const URL_RE = /^(https?:\/\/|www\.)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i;
const HAS_SCHEME = /^(https?:\/\/|www\.)/i;
// "relatorio.pdf" parece domínio, mas é nome de arquivo
const FILE_EXT = /\.(pdf|docx?|xlsx?|pptx?|txt|md|csv|json|zip|rar|7z|jpe?g|png|gif|webp|heic|mp[34]|mov|apk|exe|js|ts|tsx|py|html?)$/i;
const CODE_HINTS = /(^\s*(export|import|const|let|var|function|def|class|SELECT|#include)\b|[{}]\s*$|\)\s*;\s*$|=>|\$\s\w|^\s*[\w-]+=\S)/m;

export function detectClipKind(text: string): ClipKind {
  const t = text.trim();
  if (!t.includes(' ') && !t.includes('\n') && URL_RE.test(t) && (HAS_SCHEME.test(t) || !FILE_EXT.test(t))) return 'link';
  if (CODE_HINTS.test(t)) return 'código';
  return 'texto';
}
