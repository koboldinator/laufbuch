// Liest Trainingspläne im Tabellen-Layout (Zeile pro Woche, Spalten Mo–So)
// und das eigene JSON-Format der App.

import { addDays, mondayOf } from './dates.js';
import { newId, COLLECTIONS } from './store.js';

const DAY_KEYS = ['mo', 'di', 'mi', 'do', 'fr', 'sa', 'so'];

function niceCase(s) {
  // „PHASE 1 · WOCHEN 1–3: AEROBE BASIS“ → „Phase 1 · Wochen 1–3: Aerobe Basis“
  s = s.replace(/\s+/g, ' ').trim();
  const allCaps = s === s.toUpperCase();
  return s
    .split(' ')
    .map((w, i) => {
      const caps = w === w.toUpperCase() && /[A-ZÄÖÜ]{3,}/.test(w);
      if (!allCaps && !caps) return w;
      const l = w.toLowerCase();
      return l.length > 2 || i === 0 ? l.charAt(0).toUpperCase() + l.slice(1) : l;
    })
    .join(' ');
}

export function classify(text) {
  const t = text.toLowerCase();
  if (/ruhetag|^rest\b|^ruhe\b/.test(t)) return 'rest';
  if (/wettkampf|\brennen\b|\brace\b/.test(t)) return 'race';
  if (/long ?run|langer lauf/.test(t)) return 'long';
  if (/vo2|intervall|schärfe/.test(t)) return 'vo2';
  if (/10k-tempo|10k-spezifisch|renntempo|hm-tempo|race ?pace/.test(t)) return 'racepace';
  if (/schwelle|tempolauf|threshold|tempo-dauer/.test(t)) return 'threshold';
  if (/kraft|gym|strength/.test(t)) return 'strength';
  if (/easy|locker|ga1|recovery/.test(t)) return 'easy';
  return 'run';
}

export function estimateKm(text) {
  let s = text.replace(/(\d),(\d)/g, '$1.$2').replace(/\([^)]*\)/g, ' ');
  let total = 0;
  // Wiederholungen: 5×1000 m, 2×2 km
  s = s.replace(/(\d+)\s*[×x]\s*(\d+(?:\.\d+)?)\s*(km|m)\b/gi, (_, n, d, u) => {
    const dist = u.toLowerCase() === 'm' ? Number(d) / 1000 : Number(d);
    if (!(u.toLowerCase() === 'm' && Number(d) <= 150)) total += Number(n) * dist; // Strides nicht zählen
    return ' ';
  });
  // „10k @ Renntempo“ – nur einmal zählen
  let kMax = 0;
  s = s.replace(/\b(\d+(?:\.\d+)?)\s*k\b(?![-\w])/gi, (_, d) => {
    kMax = Math.max(kMax, Number(d));
    return ' ';
  });
  total += kMax;
  s.replace(/(\d+(?:\.\d+)?)\s*km\b/gi, (_, d) => {
    total += Number(d);
    return ' ';
  });
  return Math.round(total * 10) / 10;
}

export function parseCell(raw, easyExtraKm = 0) {
  const text = String(raw).trim();
  const type = classify(text);
  const strides = /strides|steigerung/i.test(text);
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  let km = type === 'rest' || type === 'strength' ? 0 : estimateKm(text);
  let first = lines[0] || '';
  let rest = lines.slice(1);

  let title = first.replace(/(\d+(?:[.,]\d+)?)\s*km\b/gi, '').replace(/\s{2,}/g, ' ').replace(/^[\s·+–-]+|[\s·+–-]+$/g, '');
  title = niceCase(title);
  if (!title) title = '';
  if (strides && !/strides/i.test(title) && type === 'easy') title = `${title || 'Easy'} + Strides`;

  if (type === 'easy' && easyExtraKm && km > 0) {
    const orig = km;
    km = Math.round((km + easyExtraKm) * 10) / 10;
    const re = new RegExp(`\\b${String(orig).replace('.', '[.,]')}\\s*km`);
    first = first.replace(re, `${String(km).replace('.', ',')} km`);
  }
  const details = [first, ...rest].join(' · ');

  return { type, strides, km, title: title || null, details };
}

function cellStr(v) {
  if (v == null) return '';
  return String(v).trim();
}

// rows: Array von Zeilen (Array von Zellen) – aus einer Tabelle gelesen
export function parsePlanRows(rows, { start, easyExtraKm = 0, name } = {}) {
  const planId = newId();
  const plan = {
    id: planId,
    name: name || '',
    start: start ? mondayOf(start) : null,
    goal: null,
    zones: [],
    notes: [],
    weekNotes: {},
    weekTags: {},
    phases: {},
    weeks: 0,
    createdAt: Date.now(),
  };
  const sessions = [];

  // Titel & Ziel
  const firstText = rows.map((r) => r.map(cellStr).find(Boolean)).find(Boolean) || '';
  if (!plan.name) plan.name = firstText.replace(/\s+/g, ' ').trim() || 'Trainingsplan';
  const goalMatch = firstText.match(/Ziel\s*([0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?)/i);
  if (goalMatch) plan.goal = goalMatch[1];

  // Kopfzeile finden
  let header = -1;
  let dayCols = [];
  let kmCol = -1;
  let noteCol = -1;
  rows.forEach((r, i) => {
    if (header !== -1) return;
    const lower = r.map((c) => cellStr(c).toLowerCase());
    const idx = DAY_KEYS.map((d) => lower.findIndex((c) => c === d || c.startsWith(d + '.') || c === DAY_FULL[d]));
    if (idx.every((x) => x >= 0)) {
      header = i;
      dayCols = idx;
      kmCol = lower.findIndex((c) => c.includes('km'));
      noteCol = lower.findIndex((c) => c.includes('fokus') || c.includes('notiz'));
    }
  });
  if (header === -1) throw new Error('Keine Kopfzeile mit Mo–So gefunden.');

  // Tempo-Zonen (vor der Kopfzeile)
  const zoneStart = rows.findIndex((r) => /tempo-zonen|zonen/i.test(cellStr(r[0])));
  if (zoneStart >= 0 && zoneStart < header) {
    for (let i = zoneStart + 1; i < header; i++) {
      const cells = rows[i].map(cellStr).filter(Boolean);
      if (cells.length >= 2) plan.zones.push({ name: cells[0], pace: cells[1], note: cells[2] || '' });
    }
  }

  let phase = '';
  let weekCount = 0;
  let inNotes = false;
  for (let i = header + 1; i < rows.length; i++) {
    const r = rows[i];
    const c0 = cellStr(r[0]);
    if (!c0 && r.every((c) => !cellStr(c))) continue;
    if (/^hinweise/i.test(c0)) {
      inNotes = true;
      continue;
    }
    if (inNotes) {
      if (c0) plan.notes.push(c0.replace(/^[•\-*]\s*/, ''));
      continue;
    }
    const wk = c0.match(/^woche\s*(\d+)/i);
    const others = r.slice(1).map(cellStr).filter(Boolean);
    if (wk && others.length >= 3) {
      const week = Number(wk[1]);
      weekCount = Math.max(weekCount, week);
      const tag = c0.match(/\(([^)]+)\)/);
      if (tag) plan.weekTags[week] = tag[1];
      if (phase) plan.phases[week] = phase;
      if (noteCol >= 0 && cellStr(r[noteCol])) plan.weekNotes[week] = cellStr(r[noteCol]);
      dayCols.forEach((col, d) => {
        const raw = cellStr(r[col]);
        if (!raw) return;
        const parsed = parseCell(raw, easyExtraKm);
        sessions.push({
          id: newId(),
          planId,
          week,
          day: d,
          date: plan.start ? addDays(plan.start, (week - 1) * 7 + d) : null,
          ...parsed,
        });
      });
      continue;
    }
    if (others.length === 0 && c0) {
      // Phasen-Überschrift
      phase = niceCase(c0.split(/\s+–\s+/)[0].trim());
    }
  }
  plan.weeks = weekCount;
  return { plan, sessions };
}

const DAY_FULL = { mo: 'montag', di: 'dienstag', mi: 'mittwoch', do: 'donnerstag', fr: 'freitag', sa: 'samstag', so: 'sonntag' };

export async function parseXlsxFile(file, opts) {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });
  return parsePlanRows(rows, opts);
}

// Eigenes JSON-Format → Liste von Schreib-Operationen
export function jsonToOps(json) {
  if (!json || (json.format !== 'laufbuch' && !COLLECTIONS.some((c) => Array.isArray(json[c])))) {
    throw new Error('Diese Datei ist keine Laufbuch-Importdatei.');
  }
  const ops = [];
  const counts = {};
  for (const c of COLLECTIONS) {
    if (c === 'settings') continue;
    const items = json[c];
    if (!Array.isArray(items)) continue;
    counts[c] = items.length;
    for (const item of items) {
      const { id, ...data } = item;
      ops.push({ type: 'set', col: c, id: id || newId(), data });
    }
  }
  if (json.settings && typeof json.settings === 'object') {
    ops.push({ type: 'merge-settings', col: 'settings', id: 'main', data: json.settings });
    counts.settings = 1;
  }
  return { ops, counts };
}

export function planToOps({ plan, sessions }) {
  const { id, ...pdata } = plan;
  return [
    { type: 'set', col: 'plans', id, data: pdata },
    ...sessions.map(({ id: sid, ...s }) => ({ type: 'set', col: 'sessions', id: sid, data: s })),
  ];
}
