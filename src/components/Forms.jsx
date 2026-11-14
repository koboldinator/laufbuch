import { useState } from 'react';
import { useData, useUi } from '../data.jsx';
import { Sheet } from './Bits.jsx';
import { RUN_TYPES, SESSION_TYPES, STRENGTH_FOCUS, TINTS, typeOf, orbBackground } from '../lib/types.js';
import { fmtDuration, fmtPace, fmtShort, parseDuration } from '../lib/dates.js';

const num = (v) => (v === '' || v == null ? null : Number(String(v).replace(',', '.')));

function TypeChips({ value, onChange, types }) {
  return (
    <div className="row wrap" style={{ gap: 6 }}>
      {types.map((t) => (
        <button type="button" key={t} className={`chip${value === t ? ' sel' : ''}`} onClick={() => onChange(t)}>
          <span className="dot" style={{ background: t === 'rest' ? '#C2C2CA' : orbBackground(t), width: 9, height: 9 }} />
          {typeOf(t).label}
        </button>
      ))}
    </div>
  );
}

function Rpe({ value, onChange }) {
  return (
    <label className="field">
      <span className="between"><span>Anstrengung (RPE)</span><span style={{ color: 'var(--ink)' }}>{value || '–'} / 10</span></span>
      <input type="range" min="1" max="10" step="1" value={value || 5} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export function RunForm({ initial = {}, session, onClose }) {
  const { store, sessions } = useData();
  const ui = useUi();
  const [f, setF] = useState(() => ({
    date: initial.date || session?.date || ui.today,
    type: initial.type || (session && RUN_TYPES.includes(session.type) ? session.type : 'easy'),
    km: initial.km ?? (session?.km || ''),
    duration: initial.durationSec ? fmtDuration(initial.durationSec) : '',
    avgHr: initial.avgHr ?? '',
    maxHr: initial.maxHr ?? '',
    cadence: initial.cadence ?? '',
    elevation: initial.elevation ?? '',
    rpe: initial.rpe ?? null,
    notes: initial.notes ?? '',
    sessionId: initial.sessionId ?? session?.id ?? '',
  }));
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e && e.target ? e.target.value : e }));
  const sameDay = sessions.filter((s) => s.date === f.date && RUN_TYPES.includes(s.type));
  const sec = parseDuration(f.duration);
  const pace = sec && num(f.km) ? sec / num(f.km) : null;

  async function save() {
    const data = {
      date: f.date,
      type: f.type,
      km: num(f.km),
      durationSec: sec,
      avgHr: num(f.avgHr),
      maxHr: num(f.maxHr),
      cadence: num(f.cadence),
      elevation: num(f.elevation),
      rpe: f.rpe,
      notes: f.notes || null,
      sessionId: f.sessionId || null,
      source: initial.source || 'manuell',
    };
    if (initial.id) await store.update('activities', initial.id, data);
    else await store.add('activities', data);
    ui.toast(initial.id ? 'Lauf gespeichert' : 'Lauf eingetragen');
    onClose();
  }
  async function del() {
    if (!confirm('Diesen Lauf löschen?')) return;
    await store.remove('activities', initial.id);
    ui.toast('Lauf gelöscht');
    onClose();
  }

  return (
    <Sheet
      title={initial.id ? 'Lauf bearbeiten' : 'Lauf eintragen'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={save} disabled={!f.date}>Speichern</button>
          {initial.id && <button className="btn-glass" onClick={del}>Löschen</button>}
        </>
      }
    >
      <div className="grid2">
        <label className="field">Datum<input className="input" type="date" value={f.date} onChange={set('date')} /></label>
        <label className="field">Distanz (km)<input className="input" inputMode="decimal" placeholder="10,0" value={f.km} onChange={set('km')} /></label>
      </div>
      <div className="field">Art<TypeChips value={f.type} onChange={set('type')} types={RUN_TYPES} /></div>
      <div className="grid2">
        <label className="field">Zeit (h:mm:ss)<input className="input" inputMode="numeric" placeholder="58:30" value={f.duration} onChange={set('duration')} /></label>
        <div className="field">Pace<div className="input" style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.4)' }}>{pace ? `${fmtPace(pace)} /km` : '–'}</div></div>
        <label className="field">Ø Herzfrequenz<input className="input" inputMode="numeric" placeholder="148" value={f.avgHr} onChange={set('avgHr')} /></label>
        <label className="field">Max. Herzfrequenz<input className="input" inputMode="numeric" value={f.maxHr} onChange={set('maxHr')} /></label>
        <label className="field">Kadenz (spm)<input className="input" inputMode="numeric" placeholder="162" value={f.cadence} onChange={set('cadence')} /></label>
        <label className="field">Höhenmeter<input className="input" inputMode="numeric" value={f.elevation} onChange={set('elevation')} /></label>
      </div>
      <Rpe value={f.rpe} onChange={set('rpe')} />
      {sameDay.length > 0 && (
        <label className="field">Geplante Einheit
          <select className="input" value={f.sessionId} onChange={set('sessionId')}>
            <option value="">– keine –</option>
            {sameDay.map((s) => <option key={s.id} value={s.id}>{s.title || typeOf(s.type).label} · {s.km} km</option>)}
          </select>
        </label>
      )}
      <label className="field">Notiz<textarea className="input" value={f.notes} onChange={set('notes')} placeholder="Wie hat es sich angefühlt?" /></label>
    </Sheet>
  );
}

export function StrengthForm({ initial = {}, date, onClose }) {
  const { store } = useData();
  const ui = useUi();
  const [f, setF] = useState(() => ({
    date: initial.date || date || ui.today,
    minutes: initial.minutes ?? 45,
    focus: initial.focus || 'Ganzkörper',
    rpe: initial.rpe ?? 6,
    notes: initial.notes ?? '',
  }));
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e && e.target ? e.target.value : e }));
  async function save() {
    const data = { date: f.date, minutes: num(f.minutes), focus: f.focus, rpe: f.rpe, notes: f.notes || null };
    if (initial.id) await store.update('strength', initial.id, data);
    else await store.add('strength', data);
    ui.toast('Kraft eingetragen');
    onClose();
  }
  async function del() {
    if (!confirm('Diese Krafteinheit löschen?')) return;
    await store.remove('strength', initial.id);
    onClose();
  }
  return (
    <Sheet title={initial.id ? 'Kraft bearbeiten' : 'Kraft eintragen'} onClose={onClose}
      footer={<><button className="btn" onClick={save}>Speichern</button>{initial.id && <button className="btn-glass" onClick={del}>Löschen</button>}</>}>
      <StrengthFields f={f} set={set} />
    </Sheet>
  );
}

export function StrengthFields({ f, set }) {
  return (
    <>
      <div className="grid2">
        <label className="field">Datum<input className="input" type="date" value={f.date} onChange={set('date')} /></label>
        <label className="field">Dauer (min)<input className="input" inputMode="numeric" value={f.minutes} onChange={set('minutes')} /></label>
      </div>
      <div className="row wrap" style={{ gap: 6 }}>
        {[30, 45, 60, 75].map((m) => (
          <button type="button" key={m} className={`chip${Number(f.minutes) === m ? ' sel' : ''}`} onClick={() => set('minutes')(m)}>{m} min</button>
        ))}
      </div>
      <div className="field">Fokus
        <div className="row wrap" style={{ gap: 6 }}>
          {STRENGTH_FOCUS.map((x) => (
            <button type="button" key={x} className={`chip${f.focus === x ? ' sel' : ''}`} onClick={() => set('focus')(x)}>{x}</button>
          ))}
        </div>
      </div>
      <Rpe value={f.rpe} onChange={set('rpe')} />
      <label className="field">Notiz<input className="input" value={f.notes} onChange={set('notes')} placeholder="optional" /></label>
    </>
  );
}

export function SessionForm({ initial = {}, onClose }) {
  const { store, plans } = useData();
  const ui = useUi();
  const [f, setF] = useState(() => ({
    date: initial.date || ui.today,
    type: initial.type || 'easy',
    strides: !!initial.strides,
    title: initial.title || '',
    km: initial.km ?? '',
    details: initial.details || '',
  }));
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e && e.target ? e.target.value : e }));
  const isRunType = RUN_TYPES.includes(f.type);
  async function save() {
    const data = {
      ...initial,
      date: f.date,
      type: f.type,
      strides: isRunType ? f.strides : false,
      title: f.title || null,
      km: isRunType ? num(f.km) || 0 : 0,
      details: f.details || null,
      planId: initial.planId ?? ui.planId ?? null,
    };
    delete data.id;
    if (initial.id) await store.set('sessions', initial.id, data);
    else await store.add('sessions', data);
    ui.toast('Einheit gespeichert');
    onClose();
  }
  async function del() {
    if (!confirm('Diese geplante Einheit löschen?')) return;
    await store.remove('sessions', initial.id);
    onClose();
  }
  const plan = plans.find((p) => p.id === (initial.planId ?? ui.planId));
  return (
    <Sheet
      title={initial.id ? 'Geplante Einheit' : 'Einheit planen'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={save}>Speichern</button>
          {initial.id && isRunType && <button className="btn-glass" onClick={() => ui.open('run', { session: { ...initial, ...f, id: initial.id } })}>Erledigt eintragen</button>}
          {initial.id && f.type === 'strength' && <button className="btn-glass" onClick={() => ui.open('strength', { date: f.date })}>Kraft eintragen</button>}
          {initial.id && <button className="link-btn" onClick={del}>Löschen</button>}
        </>
      }
    >
      {plan && <p className="small muted">{plan.name}{initial.week ? ` · Woche ${initial.week}` : ''}</p>}
      <div className="grid2">
        <label className="field">Datum<input className="input" type="date" value={f.date} onChange={set('date')} /></label>
        {isRunType && <label className="field">Distanz (km)<input className="input" inputMode="decimal" value={f.km} onChange={set('km')} /></label>}
      </div>
      <div className="field">Art<TypeChips value={f.type} onChange={set('type')} types={SESSION_TYPES} /></div>
      {isRunType && (
        <label className="row small" style={{ gap: 8 }}>
          <input type="checkbox" checked={f.strides} onChange={(e) => set('strides')(e.target.checked)} /> mit Strides
        </label>
      )}
      <label className="field">Titel<input className="input" value={f.title} onChange={set('title')} placeholder={typeOf(f.type).label} /></label>
      <label className="field">Details<textarea className="input" value={f.details} onChange={set('details')} placeholder="z. B. 2,5 km Ein · 5×1000 m @ 4:20 · 2,5 km Aus" /></label>
    </Sheet>
  );
}

export function BlockForm({ initial = {}, onClose }) {
  const { store } = useData();
  const ui = useUi();
  const [f, setF] = useState(() => ({ name: initial.name || '', start: initial.start || ui.today, end: initial.end || ui.today, tint: initial.tint || 'blau', note: initial.note || '' }));
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e && e.target ? e.target.value : e }));
  async function save() {
    if (f.end < f.start) return ui.toast('Ende liegt vor dem Start');
    const data = { name: f.name || 'Block', start: f.start, end: f.end, tint: f.tint, note: f.note || null };
    if (initial.id) await store.set('blocks', initial.id, data);
    else await store.add('blocks', data);
    onClose();
  }
  async function del() {
    if (!confirm('Diesen Block löschen?')) return;
    await store.remove('blocks', initial.id);
    onClose();
  }
  return (
    <Sheet title={initial.id ? 'Block bearbeiten' : 'Neuer Block'} onClose={onClose}
      footer={<><button className="btn" onClick={save}>Speichern</button>{initial.id && <button className="btn-glass" onClick={del}>Löschen</button>}</>}>
      <label className="field">Name<input className="input" value={f.name} onChange={set('name')} placeholder="z. B. Basis" /></label>
      <div className="grid2">
        <label className="field">Start<input className="input" type="date" value={f.start} onChange={set('start')} /></label>
        <label className="field">Ende<input className="input" type="date" value={f.end} onChange={set('end')} /></label>
      </div>
      <div className="field">Farbe
        <div className="row wrap" style={{ gap: 6 }}>
          {Object.entries(TINTS).map(([k, t]) => (
            <button type="button" key={k} className={`chip${f.tint === k ? ' sel' : ''}`} onClick={() => set('tint')(k)}>
              <span style={{ width: 22, height: 10, borderRadius: 5, background: t.bg, display: 'inline-block' }} />{t.label}
            </button>
          ))}
        </div>
      </div>
      <label className="field">Notiz<textarea className="input" value={f.note} onChange={set('note')} placeholder="Ziel, Umfang, Schwerpunkt" /></label>
    </Sheet>
  );
}

export function RaceForm({ initial = {}, onClose }) {
  const { store } = useData();
  const ui = useUi();
  const [f, setF] = useState(() => ({ name: initial.name || '', date: initial.date || ui.today, distanceKm: initial.distanceKm ?? '', goal: initial.goal || '', priority: initial.priority || 'A', result: initial.result || '' }));
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e && e.target ? e.target.value : e }));
  async function save() {
    const data = { name: f.name || 'Wettkampf', date: f.date, distanceKm: num(f.distanceKm), goal: f.goal || null, priority: f.priority, result: f.result || null };
    if (initial.id) await store.set('races', initial.id, data);
    else await store.add('races', data);
    onClose();
  }
  async function del() {
    if (!confirm('Diesen Wettkampf löschen?')) return;
    await store.remove('races', initial.id);
    onClose();
  }
  return (
    <Sheet title={initial.id ? 'Wettkampf' : 'Neuer Wettkampf'} onClose={onClose}
      footer={<><button className="btn" onClick={save}>Speichern</button>{initial.id && <button className="btn-glass" onClick={del}>Löschen</button>}</>}>
      <label className="field">Name<input className="input" value={f.name} onChange={set('name')} placeholder="z. B. HM Salzburg" /></label>
      <div className="grid2">
        <label className="field">Datum<input className="input" type="date" value={f.date} onChange={set('date')} /></label>
        <label className="field">Distanz (km)<input className="input" inputMode="decimal" value={f.distanceKm} onChange={set('distanceKm')} /></label>
        <label className="field">Zielzeit<input className="input" value={f.goal} onChange={set('goal')} placeholder="45:00" /></label>
        <label className="field">Ergebnis<input className="input" value={f.result} onChange={set('result')} placeholder="nach dem Rennen" /></label>
      </div>
      <div className="field">Priorität
        <div className="seg-ctl">
          {['A', 'B', 'C'].map((p) => <button type="button" key={p} className={f.priority === p ? 'active' : ''} onClick={() => set('priority')(p)}>{p}-Rennen</button>)}
        </div>
      </div>
    </Sheet>
  );
}

export function DaySheet({ date, onClose }) {
  const { sessions, activities, strength } = useData();
  const ui = useUi();
  const ss = sessions.filter((s) => s.date === date);
  const acts = activities.filter((a) => a.date === date);
  const kr = strength.filter((x) => x.date === date);
  return (
    <Sheet title={`Tag · ${fmtShort(date)}`} onClose={onClose}
      footer={<>
        <button className="btn btn-sm" onClick={() => ui.open('run', { initial: { date } })}>Lauf eintragen</button>
        <button className="btn-glass btn-sm" onClick={() => ui.open('strength', { date })}>Kraft eintragen</button>
        <button className="btn-glass btn-sm" onClick={() => ui.open('session', { initial: { date } })}>Einheit planen</button>
      </>}>
      {ss.length === 0 && acts.length === 0 && kr.length === 0 && <p className="muted">Für diesen Tag ist nichts eingetragen.</p>}
      {ss.map((s) => (
        <button key={s.id} className="list-row glass" style={{ borderRadius: 18 }} onClick={() => ui.open('session', { initial: s })}>
          <span className="bar-v" style={{ background: s.type === 'rest' ? '#E2E2E8' : orbBackground(s.type, s.strides) }} />
          <span className="grow"><span style={{ display: 'block' }}>{s.title || typeOf(s.type).label}</span><span className="tiny muted">Plan{s.km ? ` · ${s.km} km` : ''}</span></span>
        </button>
      ))}
      {acts.map((a) => (
        <button key={a.id} className="list-row glass" style={{ borderRadius: 18 }} onClick={() => ui.open('run', { initial: a })}>
          <span className="bar-v" style={{ background: orbBackground(a.type) }} />
          <span className="grow"><span style={{ display: 'block' }}>{typeOf(a.type).label} · {a.km} km</span><span className="tiny muted">Gelaufen{a.durationSec ? ` · ${fmtDuration(a.durationSec)}` : ''}{a.avgHr ? ` · ${a.avgHr} bpm` : ''}</span></span>
        </button>
      ))}
      {kr.map((x) => (
        <button key={x.id} className="list-row glass" style={{ borderRadius: 18 }} onClick={() => ui.open('strength', { initial: x })}>
          <span className="bar-v" style={{ background: orbBackground('strength') }} />
          <span className="grow"><span style={{ display: 'block' }}>Kraft · {x.focus}</span><span className="tiny muted">{x.minutes} min</span></span>
        </button>
      ))}
    </Sheet>
  );
}
