import { useState } from 'react';
import { useData, useUi } from '../data.jsx';
import { fmtDayMonth, fmtDuration, fmtKm, fmtPace, mondayOf } from '../lib/dates.js';
import { acwr, fieldSeries, isRun, paceAtHrSeries, strengthSeries, sumSeries, volumeSeries } from '../lib/calc.js';
import { orbBackground, typeOf } from '../lib/types.js';
import { LineChart, SmallBars, VolumeChart } from '../components/Charts.jsx';

function first(series) {
  return series.find((x) => x.value != null)?.value ?? null;
}
function last(series) {
  return [...series].reverse().find((x) => x.value != null)?.value ?? null;
}

export default function History() {
  const { activities, strength, sessions, settings, today } = useData();
  const ui = useUi();
  const [n, setN] = useState(12);
  const [all, setAll] = useState(false);
  const monday = mondayOf(today);
  const vol = volumeSeries(today, n, sessions, activities);
  const pace = paceAtHrSeries(today, n, activities, Number(settings.hrMin), Number(settings.hrMax));
  const hr = fieldSeries(today, n, activities, 'avgHr');
  const cad = fieldSeries(today, n, activities, 'cadence');
  const elev = sumSeries(today, n, activities, 'elevation');
  const kraft = strengthSeries(today, n, strength);
  const load = acwr(activities, strength, today);
  const runs = activities.filter(isRun).sort((a, b) => b.date.localeCompare(a.date));
  const shown = all ? runs : runs.slice(0, 12);
  const totalKm = vol.reduce((s, v) => s + v.ist, 0);

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="between wrap">
        <div>
          <p className="small muted">Verlauf</p>
          <h1 className="display h-l" style={{ fontSize: 34 }}>{fmtKm(totalKm)} km <span className="soft">in {n} Wochen.</span></h1>
        </div>
        <div className="seg-ctl">
          {[8, 12, 26].map((x) => <button key={x} className={n === x ? 'active' : ''} onClick={() => setN(x)}>{x} Wo</button>)}
        </div>
      </div>

      <div className="grid3">
        <section className="glass card stack" style={{ gap: 10 }} aria-label="Wochenumfang">
          <div className="between label"><span>Wochenumfang</span><span className="muted">Plan · Ist</span></div>
          <VolumeChart data={vol} currentMonday={monday} height={140} />
        </section>

        <section className="glass card stack" style={{ gap: 10 }} aria-label="Pace bei gleicher Herzfrequenz">
          <div className="between label"><span>Pace bei HF {settings.hrMin}–{settings.hrMax}</span>
            <button className="link-btn" onClick={() => ui.go('import')}>ändern</button></div>
          <p className="h-l">{first(pace) ? <>{fmtPace(first(pace))} → {fmtPace(last(pace))} <span className="soft">/km</span></> : <span className="soft">–</span>}</p>
          <LineChart data={pace} invert label="Pace bei gleicher Herzfrequenz" />
          <p className="tiny muted">Wird schneller, wenn deine aerobe Form besser wird. Zählt nur Läufe mit Ø-HF im Bereich.</p>
        </section>

        <section className="glass card stack" style={{ gap: 10 }} aria-label="Belastung">
          <div className="between label"><span>Belastung</span><span className="muted">7 zu 28 Tage</span></div>
          <p className="h-l">{load ? <>{String(load.ratio).replace('.', ',')} <span className="soft">{load.label}</span></> : <span className="soft">–</span>}</p>
          <p className="tiny muted">Minuten × Anstrengung (RPE) der letzten 7 Tage im Vergleich zum Schnitt der letzten 4 Wochen, Kraft eingerechnet. Zwischen 0,8 und 1,3 gilt als gut verträglich.</p>
          <div className="between label" style={{ marginTop: 6 }}><span>Kraft pro Woche</span><span className="muted">Ziel {settings.strengthTarget}</span></div>
          <SmallBars data={kraft} target={Number(settings.strengthTarget)} height={70} label="Krafteinheiten pro Woche" />
        </section>

        <section className="glass card stack" style={{ gap: 10 }} aria-label="Herzfrequenz">
          <div className="between label"><span>Ø Herzfrequenz</span><span className="muted">alle Läufe</span></div>
          <p className="h-l">{last(hr) ? <>{Math.round(last(hr))} <span className="soft">bpm</span></> : <span className="soft">–</span>}</p>
          <LineChart data={hr} color="#E8456B" label="Durchschnittliche Herzfrequenz pro Woche" />
        </section>

        <section className="glass card stack" style={{ gap: 10 }} aria-label="Kadenz">
          <div className="between label"><span>Kadenz</span><span className="muted">Schritte pro Minute</span></div>
          <p className="h-l">{last(cad) ? <>{Math.round(last(cad))} <span className="soft">spm</span></> : <span className="soft">–</span>}</p>
          <LineChart data={cad} color="#7A4DE0" label="Kadenz pro Woche" />
        </section>

        <section className="glass card stack" style={{ gap: 10 }} aria-label="Höhenmeter">
          <div className="between label"><span>Höhenmeter</span><span className="muted">pro Woche</span></div>
          <p className="h-l">{Math.round(elev.reduce((s, e) => s + e.value, 0))} <span className="soft">hm gesamt</span></p>
          <SmallBars data={elev} color="#1F9C8B" height={90} label="Höhenmeter pro Woche" />
        </section>
      </div>

      <section className="glass card stack" style={{ gap: 2 }} aria-label="Läufe">
        <div className="between label" style={{ marginBottom: 6 }}>
          <span>Läufe</span>
          <button className="btn btn-sm" onClick={() => ui.open('run', { initial: { date: today } })}>+ Lauf</button>
        </div>
        {runs.length === 0 && <p className="empty-note">Noch keine Läufe eingetragen. Trag deinen ersten Lauf über das Plus ein oder schick mir Screenshots, dann mache ich dir eine Import-Datei.</p>}
        {shown.map((a) => (
          <button key={a.id} className="list-row" onClick={() => ui.open('run', { initial: a })}>
            <span className="bar-v" style={{ background: orbBackground(a.type) }} />
            <span style={{ width: 56 }} className="small muted">{fmtDayMonth(a.date)}</span>
            <span className="grow">{typeOf(a.type).label}{a.notes ? <span className="tiny muted"> · {a.notes}</span> : null}</span>
            <span className="small hide-mobile muted" style={{ width: 70 }}>{a.durationSec ? fmtDuration(a.durationSec) : ''}</span>
            <span className="small muted" style={{ width: 64 }}>{a.durationSec && a.km ? `${fmtPace(a.durationSec / a.km)}` : ''}</span>
            <span className="small hide-mobile muted" style={{ width: 56 }}>{a.avgHr ? `${a.avgHr} bpm` : ''}</span>
            <span className="small" style={{ width: 56, textAlign: 'right' }}>{fmtKm(a.km)} km</span>
          </button>
        ))}
        {runs.length > 12 && <button className="link-btn" onClick={() => setAll(!all)}>{all ? 'Weniger anzeigen' : `Alle ${runs.length} anzeigen`}</button>}
      </section>
    </div>
  );
}
