// Datums-Helfer. Alle Daten werden als 'YYYY-MM-DD' (lokale Zeit) gespeichert.

const pad = (n) => String(n).padStart(2, '0');

export function toISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function todayISO() {
  return toISO(new Date());
}

export function addDays(iso, n) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function diffDays(a, b) {
  // b - a in Tagen
  return Math.round((parseISO(b) - parseISO(a)) / 86400000);
}

export function mondayOf(iso) {
  const d = parseISO(iso);
  const wd = (d.getDay() + 6) % 7; // Mo = 0
  d.setDate(d.getDate() - wd);
  return toISO(d);
}

export function weekdayIndex(iso) {
  return (parseISO(iso).getDay() + 6) % 7;
}

export function weekDays(mondayIso) {
  return Array.from({ length: 7 }, (_, i) => addDays(mondayIso, i));
}

export const DAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const DAY_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const MONTHS = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MONTHS_SHORT = ['Jän', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

export function fmtLong(iso) {
  const d = parseISO(iso);
  return `${DAY_LONG[weekdayIndex(iso)]}, ${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}

export function fmtShort(iso) {
  const d = parseISO(iso);
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

export function fmtDayMonth(iso) {
  const d = parseISO(iso);
  return `${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`;
}

export function fmtMonthShort(iso) {
  return MONTHS_SHORT[parseISO(iso).getMonth()];
}

export function fmtRange(a, b) {
  const da = parseISO(a);
  const db = parseISO(b);
  if (da.getMonth() === db.getMonth()) return `${da.getDate()}.–${db.getDate()}. ${MONTHS_SHORT[db.getMonth()]}`;
  return `${da.getDate()}. ${MONTHS_SHORT[da.getMonth()]} – ${db.getDate()}. ${MONTHS_SHORT[db.getMonth()]}`;
}

// Dauer
export function parseDuration(str) {
  if (str == null || str === '') return null;
  if (typeof str === 'number') return str;
  const parts = String(str).trim().split(':').map((p) => Number(p.replace(',', '.')));
  if (parts.some((p) => Number.isNaN(p))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 60; // nur Minuten
}

export function fmtDuration(sec) {
  if (!sec && sec !== 0) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function fmtPace(secPerKm) {
  if (!secPerKm || !Number.isFinite(secPerKm)) return '–';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return s === 60 ? `${m + 1}:00` : `${m}:${pad(s)}`;
}

export function fmtKm(km) {
  if (km == null || Number.isNaN(km)) return '–';
  const r = Math.round(km * 10) / 10;
  return String(r).replace('.', ',');
}
