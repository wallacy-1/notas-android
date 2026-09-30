const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "hoje, 09:42" · "ontem" · "12 set" · "12 set 2025" */
export function formatNoteDate(ts: number, now = Date.now()): string {
  const d = new Date(ts);
  const n = new Date(now);
  if (sameDay(d, n)) return `hoje, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const y = new Date(n);
  y.setDate(n.getDate() - 1);
  if (sameDay(d, y)) return 'ontem';
  const base = `${pad(d.getDate())} ${MESES[d.getMonth()]}`;
  return d.getFullYear() === n.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/** "agora" · "há 4 min" · "há 1 h" · "ontem" · "12 set" */
export function formatRelative(ts: number, now = Date.now()): string {
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  return formatNoteDate(ts, now);
}

/** "hoje, 09:42" · "ontem às 09:42" · "12 set às 09:42" — data sempre com hora. */
export function formatStamp(ts: number, now = Date.now()): string {
  const d = formatNoteDate(ts, now);
  return d.startsWith('hoje') ? d : `${d} às ${formatTime(ts)}`;
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
