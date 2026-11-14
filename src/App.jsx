import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataProvider, UiProvider, useData } from './data.jsx';
import { createFirebaseStore, createLocalStore } from './lib/store.js';
import { db, logout, watchAuth } from './lib/firebase.js';
import { currentPlan, planWeek } from './lib/calc.js';
import { BlockForm, DaySheet, RaceForm, RunForm, SessionForm, StrengthForm } from './components/Forms.jsx';
import { Sheet } from './components/Bits.jsx';
import { Gear, Plus } from './components/Icons.jsx';
import Login from './views/Login.jsx';
import Today from './views/Today.jsx';
import Plan from './views/Plan.jsx';
import Blocks from './views/Blocks.jsx';
import History from './views/History.jsx';
import Strength from './views/Strength.jsx';
import ImportView from './views/ImportView.jsx';

const VIEWS = {
  heute: { label: 'Übersicht', short: 'Heute', C: Today },
  plan: { label: 'Plan', C: Plan },
  bloecke: { label: 'Blöcke', C: Blocks },
  verlauf: { label: 'Verlauf', C: History },
  kraft: { label: 'Kraft', C: Strength },
  import: { label: 'Import', C: ImportView },
};
const DESKTOP_NAV = ['heute', 'plan', 'bloecke', 'verlauf', 'kraft', 'import'];
const MOBILE_NAV = ['heute', 'plan', 'verlauf', 'kraft'];
const MODE_KEY = 'laufbuch-mode';

function readHash() {
  const v = window.location.hash.replace(/^#\/?/, '');
  return VIEWS[v] ? v : 'heute';
}

export default function App() {
  const [user, setUser] = useState(undefined);
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem(MODE_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => watchAuth((u) => setUser(u || null)), []);

  const store = useMemo(() => {
    if (mode === 'local') return createLocalStore();
    if (user) return createFirebaseStore(db, user.uid);
    return null;
  }, [mode, user]);

  const enterLocal = () => {
    try { localStorage.setItem(MODE_KEY, 'local'); } catch { /* egal */ }
    setMode('local');
  };
  const leaveLocal = () => {
    if (!confirm('Test-Modus verlassen? Die Daten in diesem Browser bleiben erhalten, bis du sie löschst. Tipp: Vorher ein Backup herunterladen und nach der Anmeldung importieren.')) return;
    try { localStorage.removeItem(MODE_KEY); } catch { /* egal */ }
    setMode(null);
  };

  if (mode !== 'local' && user === undefined) {
    return <div className="bg" aria-hidden="true"><span className="o1" /><span className="o2" /><span className="o3" /></div>;
  }
  if (!store) return <Login onLocal={enterLocal} />;

  return (
    <DataProvider store={store} user={user}>
      <Shell onLogout={() => logout()} onLeaveLocal={leaveLocal} />
    </DataProvider>
  );
}

function Shell({ onLogout, onLeaveLocal }) {
  const data = useData();
  const [view, setView] = useState(readHash);
  const [sheet, setSheet] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [planId, setPlanId] = useState(null);

  useEffect(() => {
    const onHash = () => setView(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = useCallback((v) => {
    window.location.hash = `/${v}`;
    setView(v);
    setSheet(null);
    window.scrollTo({ top: 0 });
  }, []);
  const open = useCallback((type, props = {}) => setSheet({ type, props, key: Date.now() }), []);
  const close = useCallback(() => setSheet(null), []);
  const toast = useCallback((m) => {
    setToastMsg(m);
    clearTimeout(window.__lbToast);
    window.__lbToast = setTimeout(() => setToastMsg(''), 2200);
  }, []);

  const ui = useMemo(
    () => ({ today: data.today, open, close, go, toast, planId, setPlanId, logout: onLogout, leaveLocal: onLeaveLocal }),
    [data.today, open, close, go, toast, planId, onLogout, onLeaveLocal],
  );

  const plan = currentPlan(data.plans, data.today);
  const week = planWeek(plan, data.today);
  const weekPill = week ? `Woche ${week}${plan.weekTags?.[week] ? ` · ${plan.weekTags[week]}` : ''}` : null;
  const C = VIEWS[view].C;

  return (
    <UiProvider value={ui}>
      <div className="bg" aria-hidden="true"><span className="o1" /><span className="o2" /><span className="o3" /></div>
      <div className="app">
        <header className="topbar">
          <span className="brand">Laufbuch°</span>
          <nav className="navpill glass" aria-label="Hauptnavigation">
            {DESKTOP_NAV.map((v) => (
              <button key={v} className={view === v ? 'active' : ''} aria-current={view === v ? 'page' : undefined} onClick={() => go(v)}>{VIEWS[v].label}</button>
            ))}
          </nav>
          <button className="btn" onClick={() => open('run', { initial: { date: data.today } })}>Lauf eintragen ↗</button>
        </header>

        <header className="mobile-head">
          <span className="brand">Laufbuch°</span>
          <div className="row" style={{ gap: 8 }}>
            {weekPill && <span className="glass pill small" style={{ padding: '8px 13px' }}>{weekPill}</span>}
            <button className="icon-btn" aria-label="Import und Einstellungen" onClick={() => go('import')}><Gear /></button>
          </div>
        </header>

        <main className="main">
          {data.error && <p className="small glass card" style={{ color: '#9A1F2A' }}>Verbindung zur Datenbank fehlgeschlagen: {data.error.code || data.error.message}. Sind die Firestore-Regeln veröffentlicht?</p>}
          {data.store.kind === 'local' && view === 'heute' && <p className="tiny muted center">Test-Modus · Daten nur in diesem Browser</p>}
          {data.ready ? <C /> : <p className="muted center" style={{ padding: 40 }}>Lade …</p>}
        </main>

        <div className="tabbar-wrap">
          <nav className="tabbar glass" aria-label="Hauptnavigation">
            {MOBILE_NAV.map((v) => (
              <button key={v} className={view === v || (v === 'plan' && view === 'bloecke') ? 'active' : ''} aria-current={view === v ? 'page' : undefined} onClick={() => go(v)}>{VIEWS[v].short || VIEWS[v].label}</button>
            ))}
          </nav>
          <button className="fab" aria-label="Eintragen" onClick={() => open('choose')}><Plus /></button>
        </div>
      </div>

      {sheet && <SheetHost sheet={sheet} close={close} open={open} today={data.today} />}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </UiProvider>
  );
}

function SheetHost({ sheet, close, open, today }) {
  const p = sheet.props;
  switch (sheet.type) {
    case 'run': return <RunForm key={sheet.key} initial={p.initial} session={p.session} onClose={close} />;
    case 'strength': return <StrengthForm key={sheet.key} initial={p.initial} date={p.date} onClose={close} />;
    case 'session': return <SessionForm key={sheet.key} initial={p.initial} onClose={close} />;
    case 'block': return <BlockForm key={sheet.key} initial={p.initial} onClose={close} />;
    case 'race': return <RaceForm key={sheet.key} initial={p.initial} onClose={close} />;
    case 'day': return <DaySheet key={sheet.key} date={p.date} onClose={close} />;
    case 'choose':
      return (
        <Sheet title="Eintragen" onClose={close}>
          <button className="btn" onClick={() => open('run', { initial: { date: today } })}>Lauf eintragen</button>
          <button className="btn-glass" onClick={() => open('strength', { date: today })}>Kraft eintragen</button>
          <button className="btn-glass" onClick={() => open('session', { initial: { date: today } })}>Einheit planen</button>
        </Sheet>
      );
    default: return null;
  }
}

