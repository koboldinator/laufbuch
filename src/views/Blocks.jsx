import { useData, useUi } from '../data.jsx';
import { diffDays, fmtDayMonth, fmtRange } from '../lib/dates.js';
import { TINTS } from '../lib/types.js';
import { currentPlan } from '../lib/calc.js';
import { SeasonBar, daysUntilText } from '../components/Bits.jsx';

export default function Blocks({ embedded = false }) {
  const { blocks, races, plans, today } = useData();
  const ui = useUi();
  const bs = [...blocks].sort((a, b) => a.start.localeCompare(b.start));
  const rs = [...races].sort((a, b) => a.date.localeCompare(b.date));
  const plan = currentPlan(plans, today);

  return (
    <div className="stack" style={{ gap: 20 }}>
      {!embedded && (
        <div className="between wrap">
          <div>
            <p className="small muted">Blöcke & Wettkämpfe</p>
            <h1 className="display h-l" style={{ fontSize: 34 }}>Die Saison <span className="soft">im Überblick.</span></h1>
          </div>
        </div>
      )}

      <section className="glass card stack" aria-label="Saisonleiste">
        <SeasonBar blocks={blocks} races={races} today={today} onBlock={(b) => ui.open('block', { initial: b })} />
      </section>

      <div className="grid3">
        <section className="glass card stack" style={{ gap: 6 }} aria-label="Blöcke">
          <div className="between label" style={{ marginBottom: 4 }}>
            <span>Blöcke</span>
            <button className="btn btn-sm" onClick={() => ui.open('block', { initial: {} })}>+ Block</button>
          </div>
          {bs.length === 0 && <p className="empty-note">Noch keine Blöcke.</p>}
          {bs.map((b) => {
            const active = today >= b.start && today <= b.end;
            const t = TINTS[b.tint] || TINTS.blau;
            return (
              <button key={b.id} className={`list-row${active ? ' hl' : ''}`} onClick={() => ui.open('block', { initial: b })} style={{ alignItems: 'flex-start' }}>
                <span style={{ width: 14, height: 34, borderRadius: 999, background: t.bg, flex: '0 0 auto', marginTop: 2 }} />
                <span className="grow">
                  <span style={{ display: 'block' }}>{b.name}</span>
                  <span className="tiny muted" style={{ display: 'block' }}>{fmtRange(b.start, b.end)} · {Math.round((diffDays(b.start, b.end) + 1) / 7)} Wochen</span>
                  {b.note && <span className="tiny" style={{ display: 'block', color: '#3C3C44', marginTop: 2 }}>{b.note}</span>}
                </span>
              </button>
            );
          })}
        </section>

        <section className="glass card stack" style={{ gap: 6 }} aria-label="Wettkämpfe">
          <div className="between label" style={{ marginBottom: 4 }}>
            <span>Wettkämpfe</span>
            <button className="btn btn-sm" onClick={() => ui.open('race', { initial: {} })}>+ Wettkampf</button>
          </div>
          {rs.length === 0 && <p className="empty-note">Noch keine Wettkämpfe.</p>}
          {rs.map((r) => (
            <button key={r.id} className="list-row" onClick={() => ui.open('race', { initial: r })}>
              <span className="chip" style={{ padding: '4px 9px' }}>{r.priority || 'A'}</span>
              <span className="grow">
                <span style={{ display: 'block' }}>{r.name}</span>
                <span className="tiny muted">{fmtDayMonth(r.date)} · {r.date >= today ? daysUntilText(today, r.date) : 'vorbei'}{r.distanceKm ? ` · ${String(r.distanceKm).replace('.', ',')} km` : ''}</span>
              </span>
              <span className="small">{r.result || r.goal || ''}</span>
            </button>
          ))}
        </section>

        {plan && (plan.zones?.length > 0 || plan.notes?.length > 0) && (
          <section className="glass card stack" style={{ gap: 8 }} aria-label="Tempo-Zonen">
            <div className="label">Tempo-Zonen · {plan.name}</div>
            {plan.zones?.map((z) => (
              <div key={z.name} className="stack" style={{ gap: 2, padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                <div className="between"><span>{z.name}</span><span className="small strong">{z.pace}</span></div>
                {z.note && <span className="tiny muted">{z.note}</span>}
              </div>
            ))}
            {plan.notes?.length > 0 && (
              <details>
                <summary className="small muted" style={{ cursor: 'pointer', padding: '6px 0' }}>Hinweise zum Plan ({plan.notes.length})</summary>
                <ul className="small" style={{ paddingLeft: 18, margin: '6px 0 0', color: '#3C3C44', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {plan.notes.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              </details>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
