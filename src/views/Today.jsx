import { useData, useUi } from '../data.jsx';
import { addDays, diffDays, fmtDayMonth, fmtKm, fmtLong, fmtPace, fmtDuration, mondayOf } from '../lib/dates.js';
import { activeBlock, activityForSession, acwr, currentPlan, fieldSeries, nextRace, paceAtHrSeries, planWeek, sessionStatus, volumeSeries, weekTotals, pctDiff } from '../lib/calc.js';
import { tileBackground, todayHeadline, typeOf } from '../lib/types.js';
import { SeasonBar, SessionRow, WeekStrip, daysUntilText, nextSessionAfter } from '../components/Bits.jsx';
import { LineChart, VolumeChart } from '../components/Charts.jsx';
import { Dumbbell, Plus } from '../components/Icons.jsx';

const ZONE_MATCH = {
  easy: /easy|locker|ga/i,
  long: /easy|locker|long/i,
  threshold: /schwelle|threshold/i,
  racepace: /renntempo|10k|race/i,
  vo2: /vo2/i,
  race: /renntempo|10k|race/i,
};

export function zoneFor(plan, type) {
  if (!plan || !plan.zones || !ZONE_MATCH[type]) return null;
  return plan.zones.find((z) => ZONE_MATCH[type].test(z.name)) || null;
}

export function useTodayModel() {
  const d = useData();
  const { plans, sessions, activities, strength, blocks, races, settings, today } = d;
  const plan = currentPlan(plans, today);
  const week = planWeek(plan, today);
  const monday = mondayOf(today);
  const todays = sessions.filter((s) => s.date === today);
  const main = todays.find((s) => s.type !== 'rest' && s.type !== 'strength') || todays.find((s) => s.type === 'strength') || todays[0] || null;
  const status = main ? sessionStatus(main, activities, strength, today) : null;
  const act = main ? activityForSession(main, activities) : activities.find((a) => a.date === today);
  const race = nextRace(races, today);
  const block = activeBlock(blocks, today);
  const totals = weekTotals(monday, sessions, activities, strength);
  const next = nextSessionAfter(sessions, today);
  const phase = plan && week ? plan.phases?.[week] : null;
  const tag = plan && week ? plan.weekTags?.[week] : null;
  const focus = plan && week ? plan.weekNotes?.[week] : null;
  return { ...d, plan, week, monday, main, status, act, race, block, totals, next, phase, tag, focus };
}

function HeroCard({ m }) {
  const ui = useUi();
  const { main, status, act, next, plan, today } = m;
  const showNext = !main || main.type === 'rest';
  const s = showNext ? next : main;
  if (!s) {
    return (
      <div className="glass glass-hero card stack">
        <p className="muted">Noch kein Plan. Importiere deinen Trainingsplan oder plane eine Einheit.</p>
        <div className="row"><button className="btn" onClick={() => ui.go('import')}>Plan importieren</button></div>
      </div>
    );
  }
  const t = typeOf(s.type);
  const zone = zoneFor(plan, s.type);
  const done = !showNext && status === 'done';
  return (
    <div className="glass glass-hero card stack" style={{ padding: 18, gap: 16 }}>
      <div className="row" style={{ gap: 16 }}>
        <div className="hero-tile" style={{ background: tileBackground(s.type, s.strides) }} aria-hidden="true" />
        <div className="stack" style={{ gap: 4 }}>
          <p className="small muted">{showNext ? `Als Nächstes · ${daysUntilText(today, s.date)}` : s.title || t.label}</p>
          <p className="h-l">{done && act?.km ? `${fmtKm(act.km)} km` : s.km ? `${fmtKm(s.km)} km` : s.title || t.label}</p>
          <p className="small" style={{ color: '#3C3C44' }}>
            {done && act ? [act.durationSec && fmtDuration(act.durationSec), act.durationSec && act.km && `${fmtPace(act.durationSec / act.km)} /km`, act.avgHr && `${act.avgHr} bpm`].filter(Boolean).join(' · ') || 'Erledigt'
              : showNext ? s.title || t.label : zone ? `${zone.pace}` : t.label}
          </p>
        </div>
      </div>
      {!done && (s.details || zone?.note) && (
        <p className="small" style={{ color: '#3C3C44', lineHeight: 1.45 }}>
          {s.details && s.details !== `${s.km} km` ? s.details : ''}{zone?.note && !showNext ? `${s.details ? ' — ' : ''}${zone.note}` : ''}
        </p>
      )}
      <div className="row">
        {done ? (
          <>
            <span className="status done" style={{ fontSize: 13, padding: '6px 12px' }}>Erledigt ✓</span>
            <button className="btn-glass btn-sm" onClick={() => ui.open('run', { initial: act })}>Ansehen</button>
            {next && <span className="tiny muted grow" style={{ textAlign: 'right' }}>Als Nächstes {daysUntilText(today, next.date)}: {next.title || typeOf(next.type).label}{next.km ? ` · ${fmtKm(next.km)} km` : ''}</span>}
          </>
        ) : main?.type === 'strength' ? (
          <button className="btn grow" onClick={() => ui.open('strength', { date: today })}>Kraft eintragen ↗</button>
        ) : (
          <>
            <button className="btn grow" onClick={() => ui.open('run', showNext ? { initial: { date: today } } : { session: s })}>Lauf eintragen ↗</button>
            <button className="btn-glass" onClick={() => ui.open('session', { initial: s })}>Details</button>
          </>
        )}
      </div>
    </div>
  );
}

function Countdown({ m, className = '' }) {
  const { race, today } = m;
  if (!race) return <div className={`glass mini ${className}`}><p className="small muted">Kein Wettkampf geplant</p></div>;
  const days = diffDays(today, race.date);
  return (
    <div className={`glass mini ${className}`}>
      <p className="small muted">bis {race.name} · {fmtDayMonth(race.date)}</p>
      <p className="h-l" style={{ marginTop: 4 }}>{days} <span className="soft">{days === 1 ? 'Tag' : 'Tage'}</span></p>
    </div>
  );
}

function Goal({ m, className = '' }) {
  const { race, plan } = m;
  const goal = race?.goal || plan?.goal;
  const pace = goal && race?.distanceKm ? fmtPace(durationOf(goal) / race.distanceKm) : null;
  return (
    <div className={`glass mini ${className}`}>
      <p className="small muted">{goal ? `Ziel${pace ? ` · ${pace} /km` : ''}` : 'Ziel'}</p>
      <p className="h-l" style={{ marginTop: 4 }}>{goal || <span className="soft">offen</span>}</p>
    </div>
  );
}

function durationOf(g) {
  const p = String(g).split(':').map(Number);
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + (p[1] || 0);
}

function StrengthCapsule({ m }) {
  const ui = useUi();
  const target = Number(m.settings.strengthTarget) || 2;
  return (
    <div className="glass pill row" style={{ height: 56, padding: '0 8px 0 18px', gap: 12 }}>
      <Dumbbell />
      <span>Kraft</span>
      <span className="muted">{m.totals.kraft} von {target}</span>
      <span className="row" style={{ gap: 4, marginLeft: 'auto' }} aria-hidden="true">
        {Array.from({ length: Math.max(target, m.totals.kraft) }, (_, i) => (
          <span key={i} style={{ width: 18, height: 6, borderRadius: 3, background: i < m.totals.kraft ? '#3A3833' : 'rgba(58,56,51,0.18)' }} />
        ))}
      </span>
      <button className="icon-btn" aria-label="Krafteinheit eintragen" onClick={() => ui.open('strength', { date: m.today })}><Plus size={14} /></button>
    </div>
  );
}

function WeekCard({ m }) {
  const ui = useUi();
  return (
    <div className="glass card stack" style={{ padding: '14px 14px 12px', borderRadius: 24, gap: 10 }}>
      <div className="between small muted">
        <span>Diese Woche{m.tag ? ` · ${m.tag}` : ''}</span>
        <span><span style={{ color: 'var(--ink)' }}>{fmtKm(m.totals.ist)}</span> / {fmtKm(m.totals.plan)} km</span>
      </div>
      <WeekStrip monday={m.monday} sessions={m.sessions} activities={m.activities} strength={m.strength} today={m.today} onDay={(iso) => ui.open('day', { date: iso })} />
    </div>
  );
}

function MobileToday({ m }) {
  const main = m.main && m.main.type !== 'rest' ? m.main : null;
  const [a, b] = m.status === 'done' ? ['Erledigt.', 'Gut gemacht.'] : todayHeadline(main ? main.type : m.main ? 'rest' : null);
  return (
    <div className="stack hide-desktop" style={{ gap: 20 }}>
      <div>
        <p className="small muted" style={{ marginBottom: 8 }}>{fmtLong(m.today)}</p>
        <h1 className="display h-xl">{a}<br /><span className="soft">{b}</span></h1>
      </div>
      <HeroCard m={m} />
      <div className="grid2" style={{ gap: 14 }}>
        <Countdown m={m} className="tilt-l" />
        <Goal m={m} className="tilt-r" />
      </div>
      <WeekCard m={m} />
      <StrengthCapsule m={m} />
      {m.focus && (
        <div className="glass card small" style={{ borderRadius: 24, padding: 16, color: '#3C3C44' }}>
          <p className="tiny muted" style={{ marginBottom: 4 }}>Fokus · Woche {m.week}</p>
          {m.focus}
        </div>
      )}
    </div>
  );
}

function DesktopToday({ m }) {
  const ui = useUi();
  const { plan, week, race, today, settings } = m;
  const days = race ? diffDays(today, race.date) : null;
  const headA = plan && week ? (m.tag && /peak/i.test(m.tag) ? 'Peak-Woche.' : `Woche ${week} von ${plan.weeks}.`) : m.block ? `${m.block.name}.` : fmtLong(today) + '.';
  const headB = race ? (days === 0 ? 'Heute ist Renntag.' : `Noch ${days} ${days === 1 ? 'Tag' : 'Tage'}.`) : 'Weiter so.';
  const vol = volumeSeries(addDays(today, 21), 10, m.sessions, m.activities);
  const past = vol.filter((v) => v.monday < m.monday && (v.plan > 0 || v.ist > 0));
  const sumPlan = past.reduce((s, v) => s + v.plan, 0);
  const sumIst = past.reduce((s, v) => s + v.ist, 0);
  const diff = pctDiff(sumIst, sumPlan);
  const pace = paceAtHrSeries(today, 8, m.activities, Number(settings.hrMin), Number(settings.hrMax));
  const pv = pace.filter((p) => p.value);
  const cad = fieldSeries(today, 4, m.activities, 'cadence').filter((x) => x.value);
  const load = acwr(m.activities, m.strength, today);
  const weekSessions = m.sessions.filter((s) => s.date >= m.monday && s.date <= addDays(m.monday, 6) && s.type !== 'rest').sort((a, b) => a.date.localeCompare(b.date));
  const target = Number(settings.strengthTarget) || 2;
  const s = m.main && m.main.type !== 'rest' ? m.main : m.next;

  return (
    <div className="stack hide-mobile" style={{ gap: 30 }}>
      <section className="row wrap" style={{ justifyContent: 'space-between', gap: 24 }}>
        <button className="glass glass-hero card row" style={{ flex: '1 1 200px', maxWidth: 270, transform: 'rotate(-3deg)', padding: 18, gap: 14, borderRadius: 26, textAlign: 'left' }}
          onClick={() => s && ui.open('session', { initial: s })}>
          <span className="hero-tile" style={{ width: 58, height: 58, borderRadius: 17, background: s ? tileBackground(s.type, s.strides) : '#EEF0F8' }} />
          <span>
            <span className="small muted" style={{ display: 'block' }}>{s && s.date !== today ? `Als Nächstes · ${daysUntilText(today, s.date)}` : 'Heute'}</span>
            <span style={{ display: 'block', fontSize: 18 }}>{s ? `${s.title || typeOf(s.type).label}` : 'Ruhetag'}</span>
            <span className="small" style={{ color: '#3C3C44' }}>{s && s.km ? `${fmtKm(s.km)} km` : ''}{m.status === 'done' && s === m.main ? ' · erledigt ✓' : ''}</span>
          </span>
        </button>
        <div className="center" style={{ flex: '2 1 420px' }}>
          <p className="muted" style={{ marginBottom: 12, fontSize: 14 }}>{[plan && week ? `Woche ${week} von ${plan.weeks}` : null, m.phase].filter(Boolean).join(' · ') || fmtLong(today)}</p>
          <h1 className="display h-xl">{headA}<br /><span className="soft">{headB}</span></h1>
          {race && <p style={{ marginTop: 16, marginBottom: 8, fontSize: 15, color: '#3C3C44' }}>{race.name} am {fmtDayMonth(race.date)}{race.goal ? ` · Ziel ${race.goal}` : ''}</p>}
        </div>
        <div className="glass glass-hero card" style={{ flex: '1 1 200px', maxWidth: 270, transform: 'rotate(3deg)', padding: 18, borderRadius: 26 }}>
          <div className="between">
            <p className="small muted">Kraft diese Woche</p>
            <button className="icon-btn" style={{ width: 32, height: 32 }} aria-label="Krafteinheit eintragen" onClick={() => ui.open('strength', { date: today })}><Plus size={12} /></button>
          </div>
          <p className="h-l" style={{ margin: '4px 0 10px' }}>{m.totals.kraft} <span className="soft">von {target}</span></p>
          <div className="row" style={{ gap: 6 }} aria-hidden="true">
            {Array.from({ length: Math.max(target, m.totals.kraft) }, (_, i) => (
              <span key={i} style={{ width: 30, height: 8, borderRadius: 4, background: i < m.totals.kraft ? '#3A3833' : 'rgba(58,56,51,0.15)' }} />
            ))}
          </div>
        </div>
      </section>

      <section className="glass card stack" style={{ gap: 12 }} aria-label="Saisonblöcke">
        <div className="between label"><span>Saison</span><span className="muted">{m.block ? `${m.block.name} · ${m.block.note || ''}` : ''}</span></div>
        <SeasonBar blocks={m.blocks} races={m.races} today={today} onBlock={(b) => ui.open('block', { initial: b })} />
      </section>

      <div className="grid3">
        <section className="glass card stack" style={{ gap: 4 }} aria-label="Diese Woche">
          <div className="between label" style={{ marginBottom: 6 }}>
            <span>Diese Woche{m.tag ? ` · ${m.tag}` : ''}</span>
            <span className="muted"><span style={{ color: 'var(--ink)' }}>{fmtKm(m.totals.ist)}</span> / {fmtKm(m.totals.plan)} km</span>
          </div>
          {weekSessions.length === 0 && <p className="empty-note">Für diese Woche ist nichts geplant.</p>}
          {weekSessions.map((x) => (
            <SessionRow key={x.id} session={x} activities={m.activities} strength={m.strength} today={today} compact
              onClick={() => ui.open('session', { initial: x })} />
          ))}
          {m.strength.filter((x) => x.date >= m.monday && x.date <= addDays(m.monday, 6)).map((x) => (
            <button key={x.id} className="list-row" onClick={() => ui.open('strength', { initial: x })}>
              <span className="bar-v" style={{ height: 12, borderRadius: 4, background: '#3A3833' }} />
              <span className="grow">Kraft · {x.focus}</span><span className="small muted">{x.minutes} min</span>
            </button>
          ))}
        </section>

        <section className="glass card stack" style={{ gap: 10 }} aria-label="Wochenumfang">
          <div className="between label"><span>Wochenumfang</span><span className="muted">Plan · Ist</span></div>
          <p className="h-l">{diff == null || sumIst === 0 ? <span className="soft">Noch keine Läufe</span> : diff === 0 ? <>Genau <span className="soft">im Plan</span></> : <>{diff > 0 ? '+' : ''}{diff} % <span className="soft">{diff > 0 ? 'über Plan' : 'unter Plan'}</span></>}</p>
          <VolumeChart data={vol} currentMonday={m.monday} height={130} />
        </section>

        <section className="glass card stack" style={{ gap: 10 }} aria-label="Entwicklung">
          <div className="between label"><span>Pace bei HF {settings.hrMin}–{settings.hrMax}</span><span className="muted">8 Wochen</span></div>
          <p className="h-l">{pv.length >= 2 ? <>{fmtPace(pv[0].value)} → {fmtPace(pv[pv.length - 1].value)} <span className="soft">/km</span></> : pv.length === 1 ? <>{fmtPace(pv[0].value)} <span className="soft">/km</span></> : <span className="soft">Noch keine Daten</span>}</p>
          <LineChart data={pace} invert height={92} label="Pace bei gleicher Herzfrequenz" />
          <div className="row wrap" style={{ gap: 8 }}>
            <span className="chip">Kadenz {cad.length ? `${Math.round(cad.reduce((a, c) => a + c.value, 0) / cad.length)} spm` : '–'}</span>
            {settings.pb5k && <span className="chip">5K-PB {settings.pb5k}</span>}
            {settings.pb10k && <span className="chip">10K-PB {settings.pb10k}</span>}
            <span className="chip" title={load ? `akut ${load.acute} · chronisch ${load.chronic}` : ''}>Belastung {load ? `${String(load.ratio).replace('.', ',')} · ${load.label}` : '–'}</span>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function Today() {
  const m = useTodayModel();
  return (
    <>
      <MobileToday m={m} />
      <DesktopToday m={m} />
    </>
  );
}

