import { useEffect } from 'react';
import { DAY_SHORT, diffDays, fmtDayMonth, fmtRange, fmtShort, fmtKm, weekDays } from '../lib/dates.js';
import { TINTS, orbBackground, typeOf } from '../lib/types.js';
import { activityForSession, sessionStatus, isRun } from '../lib/calc.js';
import { Check, Close } from './Icons.jsx';

export function Sheet({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet glass" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grab" />
        <div className="between" style={{ marginBottom: 16 }}>
          <h2 className="h-m">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Schließen"><Close /></button>
        </div>
        <div className="stack">{children}</div>
        {footer && <div className="row wrap" style={{ marginTop: 18 }}>{footer}</div>}
      </div>
    </div>
  );
}

export function SeasonBar({ blocks, races, today, onBlock }) {
  const bs = [...blocks].sort((a, b) => a.start.localeCompare(b.start));
  if (!bs.length) return <p className="empty-note">Noch keine Blöcke angelegt.</p>;
  const from = bs[0].start;
  const to = bs.reduce((m, b) => (b.end > m ? b.end : m), bs[0].end);
  const total = Math.max(1, diffDays(from, to) + 1);
  const pos = (iso) => (diffDays(from, iso) / total) * 100;
  const todayPos = today >= from && today <= to ? pos(today) + 100 / total / 2 : null;
  return (
    <div>
      <div className="season">
        {bs.map((b) => {
          const tint = TINTS[b.tint] || TINTS.blau;
          const days = diffDays(b.start, b.end) + 1;
          return (
            <button key={b.id} className="seg" style={{ flex: `${days} 1 0`, background: tint.bg, color: tint.fg }}
              onClick={() => onBlock && onBlock(b)} title={`${b.name}: ${fmtRange(b.start, b.end)}`}>
              {b.name}
            </button>
          );
        })}
        {todayPos != null && <div className="lens" style={{ left: `${todayPos}%` }} aria-hidden="true" />}
      </div>
      <div className="row small muted" style={{ gap: 6, marginTop: 8 }}>
        {bs.map((b) => {
          const days = diffDays(b.start, b.end) + 1;
          const rs = races.filter((r) => r.date >= b.start && r.date <= b.end);
          const txt = rs.length ? rs.map((r) => `${r.name} ${fmtShort(r.date)}`).join(' · ') : fmtDayMonth(b.start);
          return (
            <span key={b.id} style={{ flex: `${days} 1 0`, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{txt}</span>
          );
        })}
      </div>
    </div>
  );
}

function dayInfo(iso, sessions, activities, strength, today) {
  const ss = sessions.filter((s) => s.date === iso);
  const main = ss.find((s) => s.type !== 'rest' && s.type !== 'strength') || ss.find((s) => s.type === 'strength') || ss[0] || null;
  const acts = activities.filter((a) => a.date === iso && isRun(a));
  const kraft = strength.some((x) => x.date === iso);
  const done = main ? sessionStatus(main, activities, strength, today) === 'done' : acts.length > 0;
  const type = acts[0]?.type || main?.type || (kraft ? 'strength' : null);
  return { main, acts, kraft, done, type, strides: main?.strides };
}

export function WeekStrip({ monday, sessions, activities, strength, today, onDay }) {
  return (
    <div className="weekstrip">
      {weekDays(monday).map((iso, i) => {
        const d = dayInfo(iso, sessions, activities, strength, today);
        const isToday = iso === today;
        const t = d.type ? typeOf(d.type) : null;
        let orb;
        if (!d.type || d.type === 'rest') orb = <span className="orb empty" />;
        else if (d.type === 'strength') orb = <span className="orb square" style={{ background: orbBackground('strength') }} />;
        else if (d.done) orb = <span className="orb" style={{ background: orbBackground(d.type, d.strides) }}><span className="check"><Check size={12} /></span></span>;
        else if (isToday)
          orb = (
            <span className="orb todayring" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.6))', border: '1px solid rgba(47,91,216,0.3)' }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: orbBackground(d.type, d.strides) }} />
            </span>
          );
        else if (iso < today) orb = <span className="orb" style={{ background: orbBackground(d.type), opacity: 0.3 }} />;
        else orb = <span className="orb planned" style={{ '--c': t.color }} />;
        return (
          <button key={iso} className={`day${isToday ? ' today' : ''}`} onClick={() => onDay && onDay(iso)} aria-label={`${DAY_SHORT[i]} ${fmtShort(iso)}${d.main ? ': ' + (d.main.title || typeOf(d.main.type).label) : ''}`}>
            <span style={{ position: 'relative' }}>
              {orb}
              {d.kraft && d.type !== 'strength' && (
                <span style={{ position: 'absolute', right: -3, bottom: -3, width: 11, height: 11, borderRadius: 4, background: '#3A3833', border: '2px solid #fff' }} />
              )}
            </span>
            {DAY_SHORT[i]}
          </button>
        );
      })}
    </div>
  );
}

export function StatusChip({ status }) {
  const map = { done: 'erledigt', missed: 'verpasst', today: 'heute', open: 'geplant' };
  if (!map[status]) return null;
  return <span className={`status ${status}`}>{map[status]}</span>;
}

export function SessionRow({ session, activities, strength, today, onClick, compact = false }) {
  const status = sessionStatus(session, activities, strength, today);
  const act = activityForSession(session, activities);
  const t = typeOf(session.type);
  const isToday = session.date === today;
  return (
    <button className={`list-row${isToday && status !== 'done' ? ' hl' : ''}`} onClick={onClick}>
      <span className="bar-v" style={{ background: session.type === 'rest' ? '#E2E2E8' : orbBackground(session.type, session.strides) }} />
      <span className="grow">
        <span style={{ display: 'block', color: session.type === 'rest' ? 'var(--muted)' : undefined }}>{session.title || t.label}</span>
        {!compact && session.details && session.type !== 'rest' && (
          <span className="tiny muted" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.details}</span>
        )}
      </span>
      {session.km > 0 && (
        <span className="small muted" style={{ whiteSpace: 'nowrap' }}>
          {act && act.km ? <span style={{ color: 'var(--ink)' }}>{fmtKm(act.km)}</span> : fmtKm(session.km)} km
        </span>
      )}
      {!compact && <StatusChip status={status} />}
    </button>
  );
}

export function daysUntilText(today, iso) {
  const d = diffDays(today, iso);
  if (d === 0) return 'heute';
  if (d === 1) return 'morgen';
  return `in ${d} Tagen`;
}

export function nextSessionAfter(sessions, today) {
  return sessions
    .filter((s) => s.date > today && s.type !== 'rest')
    .sort((a, b) => a.date.localeCompare(b.date))[0] || null;
}

