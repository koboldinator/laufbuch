import { addDays, mondayOf, diffDays } from './dates.js';
import { RUN_TYPES, typeOf } from './types.js';

export const isRun = (a) => RUN_TYPES.includes(a.type);

export function inRange(iso, from, to) {
  return iso >= from && iso <= to;
}

export function planEnd(plan) {
  return addDays(plan.start, (plan.weeks || 1) * 7 - 1);
}

export function currentPlan(plans, today) {
  const withStart = plans.filter((p) => p.start);
  const active = withStart.find((p) => inRange(today, p.start, planEnd(p)));
  if (active) return active;
  const future = withStart.filter((p) => p.start > today).sort((a, b) => a.start.localeCompare(b.start));
  if (future.length) return future[0];
  const past = withStart.sort((a, b) => b.start.localeCompare(a.start));
  return past[0] || null;
}

export function planWeek(plan, iso) {
  if (!plan || !plan.start) return null;
  const w = Math.floor(diffDays(plan.start, iso) / 7) + 1;
  return w >= 1 && w <= (plan.weeks || 0) ? w : null;
}

export function activeBlock(blocks, iso) {
  return blocks.find((b) => inRange(iso, b.start, b.end)) || null;
}

export function nextRace(races, iso) {
  return races.filter((r) => r.date >= iso).sort((a, b) => a.date.localeCompare(b.date))[0] || null;
}

export function sessionsOn(sessions, iso) {
  return sessions.filter((s) => s.date === iso);
}

export function activityForSession(session, activities) {
  const linked = activities.find((a) => a.sessionId === session.id);
  if (linked) return linked;
  if (session.type === 'rest') return null;
  if (session.type === 'strength') return null;
  return activities.find((a) => a.date === session.date && isRun(a) && !a.sessionId) || null;
}

export function sessionStatus(session, activities, strength, today) {
  if (session.type === 'rest') return 'rest';
  if (session.type === 'strength') {
    return strength.some((x) => x.date === session.date) ? 'done' : session.date < today ? 'missed' : 'open';
  }
  if (activityForSession(session, activities)) return 'done';
  return session.date < today ? 'missed' : session.date === today ? 'today' : 'open';
}

export function weekTotals(monday, sessions, activities, strength) {
  const sunday = addDays(monday, 6);
  const plan = sessions.filter((s) => inRange(s.date, monday, sunday)).reduce((a, s) => a + (Number(s.km) || 0), 0);
  const ist = activities.filter((a) => isRun(a) && inRange(a.date, monday, sunday)).reduce((a, x) => a + (Number(x.km) || 0), 0);
  const kraft = strength.filter((x) => inRange(x.date, monday, sunday)).length;
  return { plan: round1(plan), ist: round1(ist), kraft };
}

export function weeklySeries(endIso, n, fn) {
  const end = mondayOf(endIso);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const monday = addDays(end, -7 * i);
    out.push({ monday, ...fn(monday, addDays(monday, 6)) });
  }
  return out;
}

export function volumeSeries(endIso, n, sessions, activities) {
  return weeklySeries(endIso, n, (mo, so) => ({
    plan: round1(sessions.filter((s) => inRange(s.date, mo, so)).reduce((a, s) => a + (Number(s.km) || 0), 0)),
    ist: round1(activities.filter((a) => isRun(a) && inRange(a.date, mo, so)).reduce((a, x) => a + (Number(x.km) || 0), 0)),
  }));
}

function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
}

export function paceAtHrSeries(endIso, n, activities, hrMin, hrMax) {
  return weeklySeries(endIso, n, (mo, so) => {
    const runs = activities.filter(
      (a) => isRun(a) && inRange(a.date, mo, so) && a.avgHr >= hrMin && a.avgHr <= hrMax && a.km > 0 && a.durationSec > 0,
    );
    // nach Distanz gewichtet
    const km = runs.reduce((s, a) => s + Number(a.km), 0);
    const sec = runs.reduce((s, a) => s + Number(a.durationSec), 0);
    return { value: km > 0 ? sec / km : null, count: runs.length };
  });
}

export function fieldSeries(endIso, n, activities, field) {
  return weeklySeries(endIso, n, (mo, so) => {
    const vals = activities.filter((a) => isRun(a) && inRange(a.date, mo, so) && Number(a[field]) > 0).map((a) => Number(a[field]));
    return { value: avg(vals) };
  });
}

export function sumSeries(endIso, n, activities, field) {
  return weeklySeries(endIso, n, (mo, so) => ({
    value: activities.filter((a) => isRun(a) && inRange(a.date, mo, so)).reduce((s, a) => s + (Number(a[field]) || 0), 0),
  }));
}

export function strengthSeries(endIso, n, strength) {
  return weeklySeries(endIso, n, (mo, so) => ({ value: strength.filter((x) => inRange(x.date, mo, so)).length }));
}

// Belastung (Session-RPE): Minuten × Anstrengung. Akut 7 Tage vs. chronisch 28 Tage.
export function loadOf(item, kind) {
  if (kind === 'strength') return (Number(item.minutes) || 45) * (Number(item.rpe) || typeOf('strength').rpe);
  const min = item.durationSec ? item.durationSec / 60 : (Number(item.km) || 0) * 6;
  return min * (Number(item.rpe) || typeOf(item.type).rpe || 4);
}

export function acwr(activities, strength, today) {
  const from28 = addDays(today, -27);
  const from7 = addDays(today, -6);
  let acute = 0;
  let chronic = 0;
  for (const a of activities) {
    if (!isRun(a) || !inRange(a.date, from28, today)) continue;
    const l = loadOf(a, 'run');
    chronic += l;
    if (a.date >= from7) acute += l;
  }
  for (const x of strength) {
    if (!inRange(x.date, from28, today)) continue;
    const l = loadOf(x, 'strength');
    chronic += l;
    if (x.date >= from7) acute += l;
  }
  if (chronic <= 0) return null;
  const ratio = acute / (chronic / 4);
  let label = 'im grünen Bereich';
  if (ratio < 0.8) label = 'eher niedrig';
  else if (ratio > 1.5) label = 'hoch – aufpassen';
  else if (ratio > 1.3) label = 'erhöht';
  return { ratio: Math.round(ratio * 100) / 100, label, acute: Math.round(acute), chronic: Math.round(chronic / 4) };
}

export function round1(x) {
  return Math.round(x * 10) / 10;
}

export function pctDiff(ist, plan) {
  if (!plan) return null;
  return Math.round(((ist - plan) / plan) * 100);
}
