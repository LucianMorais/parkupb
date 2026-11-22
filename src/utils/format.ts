// Formatação em português de Portugal, sem depender do suporte Intl do motor JS.
const MONTHS = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
const MONTHS_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const WEEKDAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const WEEKDAYS_SHORT = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];

const pad = (n: number) => String(n).padStart(2, '0');

export const MIN = 60 * 1000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

export function euro(cents: number): string {
  const neg = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const int = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${neg ? '-' : ''}${int},${pad(abs % 100)} €`;
}

export function time(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function date(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function dateShort(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]}`;
}

export function dateTime(ts: number): string {
  return `${date(ts)} · ${time(ts)}`;
}

export function longDate(ts: number): string {
  const d = new Date(ts);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS_LONG[d.getMonth()]} de ${d.getFullYear()}`;
}

export function dayChip(ts: number): { week: string; day: string; month: string } {
  const d = new Date(ts);
  return { week: WEEKDAYS_SHORT[d.getDay()], day: pad(d.getDate()), month: MONTHS[d.getMonth()] };
}

export function monthYear(ts: number): string {
  const d = new Date(ts);
  const m = MONTHS_LONG[d.getMonth()];
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} de ${d.getFullYear()}`;
}

export function duration(ms: number): string {
  const total = Math.max(0, Math.round(ms / MIN));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h} h ${pad(m)} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

export function countdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / MIN));
  return `${pad(Math.floor(total / 60))} h ${pad(total % 60)} min`;
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function at(dayTs: number, hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(startOfDay(dayTs));
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function normalizePlate(p: string): string {
  return p.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/(.{2})(?=.)/g, '$1-');
}

export function isValidPlate(p: string): boolean {
  return /^[A-Z0-9]{2}-[A-Z0-9]{2}-[A-Z0-9]{2}$/.test(normalizePlate(p));
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
