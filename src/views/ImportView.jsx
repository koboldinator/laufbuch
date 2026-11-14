import { useRef, useState } from 'react';
import { useData, useUi } from '../data.jsx';
import { jsonToOps, parseXlsxFile, planToOps } from '../lib/importPlan.js';
import { COLLECTIONS } from '../lib/store.js';
import { fmtKm, fmtShort, mondayOf, todayISO, addDays } from '../lib/dates.js';
import { Upload } from '../components/Icons.jsx';

export default function ImportView() {
  const data = useData();
  const { plans, sessions, settings, saveSettings, runOps, store, user } = data;
  const ui = useUi();
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);
  const [pending, setPending] = useState(null); // { kind, file, ops, summary }
  const [xlsxOpts, setXlsxOpts] = useState({ name: '', start: mondayOf(addDays(todayISO(), 7)), easyExtraKm: 0 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [s, setS] = useState(() => ({ ...settings }));
  const [replace, setReplace] = useState({});

  const overlapping = (() => {
    if (!pending?.ops) return [];
    const newPlans = pending.ops.filter((o) => o.col === 'plans' && o.type === 'set' && o.data.start);
    const ids = new Set(newPlans.map((o) => o.id));
    return plans.filter((p) => !ids.has(p.id) && p.start && newPlans.some((o) => {
      const aEnd = addDays(o.data.start, (o.data.weeks || 1) * 7 - 1);
      const bEnd = addDays(p.start, (p.weeks || 1) * 7 - 1);
      return o.data.start <= bEnd && p.start <= aEnd;
    }));
  })();

  async function handleFile(file) {
    setErr('');
    setPending(null);
    if (!file) return;
    const name = file.name.toLowerCase();
    try {
      if (name.endsWith('.json')) {
        const json = JSON.parse(await file.text());
        const { ops, counts } = jsonToOps(json);
        setPending({ kind: 'json', file, ops, counts });
      } else if (/\.(xlsx|xls|ods|csv)$/.test(name)) {
        setPending({ kind: 'xlsx', file });
        setXlsxOpts((o) => ({ ...o, name: o.name || file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ') }));
      } else {
        setErr('Bitte eine .xlsx- oder .json-Datei wählen. Screenshots und PDFs schick mir im Chat – ich mache daraus eine Import-Datei.');
      }
    } catch (e) {
      setErr(e.message || 'Datei konnte nicht gelesen werden.');
    }
  }

  async function previewXlsx() {
    setErr('');
    try {
      const res = await parseXlsxFile(pending.file, { start: xlsxOpts.start, easyExtraKm: Number(xlsxOpts.easyExtraKm) || 0, name: xlsxOpts.name });
      const km = res.sessions.reduce((a, x) => a + (x.km || 0), 0);
      setPending({ ...pending, parsed: res, ops: planToOps(res), counts: { Wochen: res.plan.weeks, Einheiten: res.sessions.filter((x) => x.type !== 'rest').length, km: fmtKm(km) } });
    } catch (e) {
      setErr(e.message || 'Plan konnte nicht gelesen werden.');
    }
  }

  async function doImport() {
    setBusy(true);
    try {
      const del = overlapping.filter((p) => replace[p.id] !== false).flatMap((p) => [
        { type: 'delete', col: 'plans', id: p.id },
        ...sessions.filter((x) => x.planId === p.id).map((x) => ({ type: 'delete', col: 'sessions', id: x.id })),
      ]);
      await runOps([...del, ...pending.ops]);
      ui.toast('Import abgeschlossen');
      setPending(null);
    } catch (e) {
      setErr(e.message || 'Import fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  }

  function exportJson() {
    const out = { format: 'laufbuch', version: 1, created: todayISO() };
    for (const c of COLLECTIONS) {
      if (c === 'settings') continue;
      out[c] = data[c];
    }
    out.settings = Object.fromEntries(Object.entries(settings).filter(([k]) => k !== 'id'));
    const blob = new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `laufbuch-backup-${todayISO()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  async function deletePlan(p) {
    if (!confirm(`„${p.name}“ mit allen geplanten Einheiten löschen? Eingetragene Läufe bleiben erhalten.`)) return;
    const ops = [{ type: 'delete', col: 'plans', id: p.id }, ...sessions.filter((x) => x.planId === p.id).map((x) => ({ type: 'delete', col: 'sessions', id: x.id }))];
    await store.bulk(ops);
    ui.toast('Plan gelöscht');
  }

  async function saveS() {
    const n = (v) => (v === '' || v == null ? null : Number(v));
    await saveSettings({ strengthTarget: n(s.strengthTarget) || 2, hrMin: n(s.hrMin) || 140, hrMax: n(s.hrMax) || 155, pb5k: s.pb5k || '', pb10k: s.pb10k || '', pbHm: s.pbHm || '' });
    ui.toast('Einstellungen gespeichert');
  }
  const setField = (k) => (e) => setS((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <p className="small muted">Import & Einstellungen</p>
        <h1 className="display h-l" style={{ fontSize: 34 }}>Daten rein, <span className="soft">Daten raus.</span></h1>
      </div>

      <div className="grid3">
        <section className="glass glass-hero card stack" aria-label="Import">
          <div className="label">Importieren</div>
          <div className={`drop${over ? ' over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); handleFile(e.dataTransfer.files[0]); }}>
            <div className="stack" style={{ alignItems: 'center', gap: 8 }}>
              <Upload />
              <p>Datei hier ablegen</p>
              <p className="tiny muted">Trainingsplan als Excel (.xlsx) oder Laufbuch-Datei (.json)</p>
              <button className="btn-glass btn-sm" onClick={() => inputRef.current?.click()}>Datei wählen</button>
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.ods,.csv,.json,application/json" hidden onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ''; }} />
            </div>
          </div>
          {err && <p className="small" style={{ color: '#9A1F2A' }}>{err}</p>}

          {pending?.kind === 'xlsx' && !pending.parsed && (
            <div className="stack">
              <label className="field">Name des Plans<input className="input" value={xlsxOpts.name} onChange={(e) => setXlsxOpts({ ...xlsxOpts, name: e.target.value })} /></label>
              <div className="grid2">
                <label className="field">Start (Montag Woche 1)<input className="input" type="date" value={xlsxOpts.start} onChange={(e) => setXlsxOpts({ ...xlsxOpts, start: e.target.value })} /></label>
                <label className="field">Easy-Läufe + km<input className="input" inputMode="decimal" value={xlsxOpts.easyExtraKm} onChange={(e) => setXlsxOpts({ ...xlsxOpts, easyExtraKm: e.target.value })} /></label>
              </div>
              <div className="row"><button className="btn" onClick={previewXlsx}>Plan lesen</button></div>
            </div>
          )}

          {pending?.ops && (
            <div className="stack glass card" style={{ borderRadius: 20, padding: 16 }}>
              <p className="small muted">{pending.file.name}</p>
              {pending.parsed && <p>{pending.parsed.plan.name} · ab {fmtShort(pending.parsed.plan.start)}</p>}
              <div className="row wrap" style={{ gap: 6 }}>
                {Object.entries(pending.counts).map(([k, v]) => <span key={k} className="chip">{label(k)}: {v}</span>)}
              </div>
              {overlapping.map((p) => (
                <label key={p.id} className="row small" style={{ gap: 8 }}>
                  <input type="checkbox" checked={replace[p.id] !== false} onChange={(e) => setReplace({ ...replace, [p.id]: e.target.checked })} />
                  Überschneidet sich mit „{p.name}“ – alten Plan ersetzen
                </label>
              ))}
              <p className="tiny muted">Einträge mit derselben ID werden überschrieben, alles andere kommt dazu. Eingetragene Läufe bleiben immer erhalten.</p>
              <div className="row"><button className="btn" onClick={doImport} disabled={busy}>{busy ? 'Importiere …' : 'Importieren'}</button><button className="link-btn" onClick={() => setPending(null)}>Abbrechen</button></div>
            </div>
          )}
          <p className="tiny muted">Screenshots aus Strava oder Apple Fitness, PDFs und andere Pläne schickst du im Chat an Claude. Du bekommst eine .json-Datei zurück, die du hier ablegst.</p>
        </section>

        <section className="glass card stack" aria-label="Einstellungen">
          <div className="label">Einstellungen</div>
          <div className="grid2">
            <label className="field">Kraft-Ziel pro Woche<input className="input" inputMode="numeric" value={s.strengthTarget ?? ''} onChange={setField('strengthTarget')} /></label>
            <span />
            <label className="field">HF-Bereich von<input className="input" inputMode="numeric" value={s.hrMin ?? ''} onChange={setField('hrMin')} /></label>
            <label className="field">bis (bpm)<input className="input" inputMode="numeric" value={s.hrMax ?? ''} onChange={setField('hrMax')} /></label>
          </div>
          <p className="tiny muted">Der HF-Bereich bestimmt die Kurve „Pace bei HF“. Nimm den Bereich, in dem deine lockeren Läufe meistens liegen.</p>
          <div className="grid2">
            <label className="field">Bestzeit 5K<input className="input" value={s.pb5k ?? ''} onChange={setField('pb5k')} placeholder="22:48" /></label>
            <label className="field">Bestzeit 10K<input className="input" value={s.pb10k ?? ''} onChange={setField('pb10k')} /></label>
            <label className="field">Bestzeit HM<input className="input" value={s.pbHm ?? ''} onChange={setField('pbHm')} /></label>
          </div>
          <div className="row"><button className="btn" onClick={saveS}>Speichern</button></div>
        </section>

        <section className="glass card stack" aria-label="Pläne und Konto">
          <div className="label">Pläne</div>
          {plans.length === 0 && <p className="empty-note">Noch kein Plan importiert.</p>}
          {plans.map((p) => (
            <div key={p.id} className="between" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <span className="grow"><span style={{ display: 'block' }}>{p.name}</span><span className="tiny muted">{p.start ? `ab ${fmtShort(p.start)} · ` : ''}{p.weeks} Wochen</span></span>
              <button className="link-btn" onClick={() => deletePlan(p)}>Löschen</button>
            </div>
          ))}
          <div className="row wrap"><button className="btn-glass btn-sm" onClick={exportJson}>Backup herunterladen</button></div>

          <div className="label" style={{ marginTop: 10 }}>Konto</div>
          {store.kind === 'local' ? (
            <>
              <p className="small muted">Test-Modus: Daten liegen nur in diesem Browser.</p>
              <div className="row wrap"><button className="btn btn-sm" onClick={ui.leaveLocal}>Mit Konto anmelden</button></div>
            </>
          ) : (
            <>
              <p className="small muted">Angemeldet{user?.email ? ` als ${user.email}` : ''}. Deine Daten werden in Firebase gespeichert und auf allen Geräten synchronisiert.</p>
              <div className="row"><button className="btn-glass btn-sm" onClick={ui.logout}>Abmelden</button></div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function label(k) {
  const map = { plans: 'Pläne', sessions: 'Einheiten', blocks: 'Blöcke', races: 'Wettkämpfe', activities: 'Läufe', strength: 'Kraft', settings: 'Einstellungen' };
  return map[k] || k;
}
