import { useEffect, useMemo, useState } from 'react';
import { useData, useUi } from '../data.jsx';
import { addDays, DAY_SHORT, fmtKm, fmtRange, fmtShort, mondayOf, weekDays } from '../lib/dates.js';
import { activityForSession, currentPlan, isRun, planWeek, sessionStatus, weekTotals } from '../lib/calc.js';
import { orbBackground, typeOf } from '../lib/types.js';
import { SessionRow } from '../components/Bits.jsx';
import { Chevron, Plus } from '../components/Icons.jsx';
import Blocks from './Blocks.jsx';

export default function Plan() {
  const { plans, sessions, activities, strength, today } = useData();
  const ui = useUi();
  const sortedPlans = useMemo(() => [...plans].sort((a, b) => (b.start || '').localeCompare(a.start || '')), [plans]);
  const [planId, setPlanId] = useState(null);
  const plan = plans.find((p) => p.id === planId) || currentPlan(plans, today);
  const [monday, setMonday] = useState(mondayOf(today));
  const [seg, setSeg] = useState('woche');

  useEffect(() => {
    ui.setPlanId(plan?.id || null);
  }, [plan?.id]);

  const week = planWeek(plan, monday);
  const totals = weekTotals(monday, sessions, activities, strength);
  const days = weekDays(monday);

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="between wrap">
        <div>
          <p className="small muted">Plan</p>
          <h1 className="display h-l" style={{ fontSize: 34 }}>{plan ? plan.name : 'Noch kein Plan'}</h1>
        </div>
        <div className="row wrap">
          {sortedPlans.length > 1 && (
            <select className="input" style={{ width: 'auto', height: 40 }} value={plan?.id || ''} onChange={(e) => setPlanId(e.target.value)} aria-label="Plan wählen">
              {sortedPlans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <button className="btn-glass btn-sm" onClick={() => ui.go('import')}>Plan importieren</button>
          <button className="btn btn-sm" onClick={() => ui.open('session', { initial: { date: today } })}>+ Einheit</button>
        </div>
      </div>

      <div className="seg-ctl hide-desktop" style={{ alignSelf: 'flex-start' }}>
        {[['woche', 'Woche'], ['gesamt', 'Gesamt'], ['bloecke', 'Blöcke']].map(([k, l]) => (
          <button key={k} className={seg === k ? 'active' : ''} onClick={() => setSeg(k)}>{l}</button>
        ))}
      </div>

      {seg === 'bloecke' && <div className="hide-desktop"><Blocks embedded /></div>}

      <div className="row wrap" style={{ alignItems: 'flex-start', gap: 20 }}>
        <section className={`glass card stack ${seg !== 'woche' ? 'hide-mobile' : ''}`} style={{ flex: '1 1 380px', minWidth: 0, gap: 12 }} aria-label="Wochenansicht">
          <div className="between">
            <button className="icon-btn" aria-label="Vorige Woche" onClick={() => setMonday(addDays(monday, -7))}><Chevron dir="left" /></button>
            <div className="center">
              <p className="label">{week ? `Woche ${week}${plan?.weekTags?.[week] ? ` · ${plan.weekTags[week]}` : ''}` : 'Woche'}</p>
              <p className="tiny muted">{fmtRange(monday, addDays(monday, 6))}</p>
            </div>
            <button className="icon-btn" aria-label="Nächste Woche" onClick={() => setMonday(addDays(monday, 7))}><Chevron /></button>
          </div>
          <div className="between small">
            <span className="muted">{week && plan?.phases?.[week] ? plan.phases[week] : ''}</span>
            <span className="muted" style={{ whiteSpace: 'nowrap' }}><span style={{ color: 'var(--ink)' }}>{fmtKm(totals.ist)}</span> / {fmtKm(totals.plan)} km</span>
          </div>
          {week && plan?.weekNotes?.[week] && <p className="small" style={{ color: '#3C3C44' }}>{plan.weekNotes[week]}</p>}
          {monday !== mondayOf(today) && (
            <button className="link-btn" style={{ alignSelf: 'center' }} onClick={() => setMonday(mondayOf(today))}>Zur aktuellen Woche</button>
          )}
          <div className="stack" style={{ gap: 2 }}>
            {days.map((iso, i) => {
              const ss = sessions.filter((s) => s.date === iso).sort((a, b) => (a.type === 'rest') - (b.type === 'rest'));
              const matched = new Set(ss.map((s) => activityForSession(s, activities)?.id).filter(Boolean));
              const extra = activities.filter((a) => a.date === iso && isRun(a) && !matched.has(a.id));
              const kr = strength.filter((x) => x.date === iso);
              return (
                <div key={iso} className="row" style={{ alignItems: 'flex-start', gap: 8, padding: '6px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
                  <div style={{ width: 44, paddingTop: 9, flex: '0 0 auto' }} className={iso === today ? 'strong' : 'muted'}>
                    <div className="small">{DAY_SHORT[i]}</div>
                    <div className="tiny">{fmtShort(iso)}</div>
                  </div>
                  <div className="grow stack" style={{ gap: 0 }}>
                    {ss.map((s) => (
                      <SessionRow key={s.id} session={s} activities={activities} strength={strength} today={today} onClick={() => ui.open('session', { initial: s })} />
                    ))}
                    {extra.map((a) => (
                      <button key={a.id} className="list-row" onClick={() => ui.open('run', { initial: a })}>
                        <span className="bar-v" style={{ background: orbBackground(a.type) }} />
                        <span className="grow">{typeOf(a.type).label} <span className="tiny muted">gelaufen</span></span>
                        <span className="small">{fmtKm(a.km)} km</span>
                      </button>
                    ))}
                    {kr.map((x) => (
                      <button key={x.id} className="list-row" onClick={() => ui.open('strength', { initial: x })}>
                        <span className="bar-v" style={{ height: 12, borderRadius: 4, background: '#3A3833' }} />
                        <span className="grow">Kraft · {x.focus}</span>
                        <span className="small muted">{x.minutes} min</span>
                      </button>
                    ))}
                    {ss.length === 0 && extra.length === 0 && kr.length === 0 && <span className="small muted" style={{ padding: '9px 10px' }}>–</span>}
                  </div>
                  <button className="icon-btn" style={{ width: 34, height: 34, marginTop: 4 }} aria-label={`Zu ${DAY_SHORT[i]} ${fmtShort(iso)} hinzufügen`} onClick={() => ui.open('day', { date: iso })}><Plus size={13} /></button>
                </div>
              );
            })}
          </div>
        </section>

        {plan && (
          <section className={`glass card stack ${seg !== 'gesamt' ? 'hide-mobile' : ''}`} style={{ flex: '2 1 560px', minWidth: 0, gap: 10 }} aria-label="Gesamtplan">
            <div className="between label"><span>Gesamtplan · {plan.weeks} Wochen</span><span className="muted">ab {fmtShort(plan.start)}</span></div>
            <div style={{ overflowX: 'auto' }}>
              <table className="plan-table" style={{ minWidth: 720 }}>
                <thead>
                  <tr><th style={{ width: 64 }}>Woche</th>{DAY_SHORT.map((d) => <th key={d}>{d}</th>)}<th style={{ width: 46 }}>km</th></tr>
                </thead>
                <tbody>
                  {Array.from({ length: plan.weeks }, (_, w) => {
                    const mo = addDays(plan.start, w * 7);
                    const cur = mo === mondayOf(today);
                    const t = weekTotals(mo, sessions.filter((s) => s.planId === plan.id), [], []);
                    return (
                      <tr key={w}>
                        <td>
                          <button className={`plan-cell${cur ? ' cur' : ''}`} style={{ minHeight: 52 }} onClick={() => { setMonday(mo); setSeg('woche'); }}>
                            <span className="strong">W{w + 1}</span><br /><span className="muted">{plan.weekTags?.[w + 1] || fmtShort(mo)}</span>
                          </button>
                        </td>
                        {weekDays(mo).map((iso) => {
                          const s = sessions.find((x) => x.date === iso && x.planId === plan.id && x.type !== 'rest') || null;
                          if (!s) return <td key={iso}><div className="plan-cell" style={{ background: 'rgba(255,255,255,0.25)' }} /></td>;
                          const st = sessionStatus(s, activities, strength, today);
                          return (
                            <td key={iso}>
                              <button className={`plan-cell${iso === today ? ' cur' : ''}`} onClick={() => ui.open('session', { initial: s })} title={s.details || ''}>
                                <span className="row" style={{ gap: 5 }}>
                                  <span className="dot" style={{ width: 8, height: 8, background: orbBackground(s.type, s.strides) }} />
                                  <span className="strong">{s.km ? `${fmtKm(s.km)} km` : ''}</span>
                                  {st === 'done' && <span style={{ color: '#136B5F' }}>✓</span>}
                                </span>
                                <span style={{ display: 'block', marginTop: 3 }}>{s.title || typeOf(s.type).label}</span>
                              </button>
                            </td>
                          );
                        })}
                        <td className="small" style={{ paddingTop: 8, paddingLeft: 4 }}>{fmtKm(t.plan)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
