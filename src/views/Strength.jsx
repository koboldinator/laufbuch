import { useState } from 'react';
import { useData, useUi } from '../data.jsx';
import { fmtDayMonth, mondayOf } from '../lib/dates.js';
import { strengthSeries, weekTotals } from '../lib/calc.js';
import { SmallBars } from '../components/Charts.jsx';
import { StrengthFields } from '../components/Forms.jsx';

export default function Strength() {
  const { strength, sessions, activities, settings, store, today } = useData();
  const ui = useUi();
  const target = Number(settings.strengthTarget) || 2;
  const monday = mondayOf(today);
  const count = weekTotals(monday, sessions, activities, strength).kraft;
  const series = strengthSeries(today, 12, strength);
  const list = [...strength].sort((a, b) => b.date.localeCompare(a.date));
  const [f, setF] = useState({ date: today, minutes: 45, focus: 'Ganzkörper', rpe: 6, notes: '' });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e && e.target ? e.target.value : e }));

  async function save() {
    await store.add('strength', { date: f.date, minutes: Number(f.minutes) || null, focus: f.focus, rpe: f.rpe, notes: f.notes || null });
    ui.toast('Kraft eingetragen');
    setF((p) => ({ ...p, notes: '' }));
  }

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <p className="small muted">Kraft</p>
        <h1 className="display h-xl" style={{ fontSize: 'clamp(38px, 6vw, 64px)' }}>{count} <span className="soft">von {target} diese Woche.</span></h1>
      </div>

      <div className="row wrap" style={{ alignItems: 'flex-start', gap: 20 }}>
        <section className="glass glass-hero card stack" style={{ flex: '1 1 340px' }} aria-label="Kraft eintragen">
          <div className="label">Schnell eintragen</div>
          <StrengthFields f={f} set={set} />
          <div className="row"><button className="btn" onClick={save}>Speichern</button></div>
        </section>

        <div className="stack" style={{ flex: '1 1 340px', gap: 20 }}>
          <section className="glass card stack" style={{ gap: 10 }} aria-label="Kraft pro Woche">
            <div className="between label"><span>Einheiten pro Woche</span><span className="muted">12 Wochen · Ziel {target}</span></div>
            <SmallBars data={series} target={target} height={100} label="Krafteinheiten pro Woche" />
          </section>
          <section className="glass card stack" style={{ gap: 2 }} aria-label="Einträge">
            <div className="label" style={{ marginBottom: 6 }}>Einträge</div>
            {list.length === 0 && <p className="empty-note">Noch keine Krafteinheiten.</p>}
            {list.slice(0, 20).map((x) => (
              <button key={x.id} className="list-row" onClick={() => ui.open('strength', { initial: x })}>
                <span className="bar-v" style={{ height: 12, borderRadius: 4, background: '#3A3833' }} />
                <span style={{ width: 56 }} className="small muted">{fmtDayMonth(x.date)}</span>
                <span className="grow">{x.focus}{x.notes ? <span className="tiny muted"> · {x.notes}</span> : null}</span>
                <span className="small muted">{x.minutes ? `${x.minutes} min` : ''}</span>
                <span className="small muted" style={{ width: 44, textAlign: 'right' }}>{x.rpe ? `RPE ${x.rpe}` : ''}</span>
              </button>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

