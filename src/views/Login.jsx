import { useState } from 'react';
import { loginEmail, loginGoogle, registerEmail } from '../lib/firebase.js';

const ERR = {
  'auth/invalid-credential': 'E-Mail oder Passwort stimmt nicht.',
  'auth/wrong-password': 'E-Mail oder Passwort stimmt nicht.',
  'auth/user-not-found': 'Kein Konto mit dieser E-Mail.',
  'auth/email-already-in-use': 'Für diese E-Mail gibt es schon ein Konto.',
  'auth/weak-password': 'Das Passwort braucht mindestens 6 Zeichen.',
  'auth/operation-not-allowed': 'Diese Anmeldeart ist in Firebase noch nicht eingeschaltet.',
  'auth/unauthorized-domain': 'Diese Adresse ist in Firebase noch nicht freigegeben (Authentication › Einstellungen › Autorisierte Domains).',
  'auth/popup-closed-by-user': 'Anmeldung abgebrochen.',
  'auth/network-request-failed': 'Keine Verbindung zu Firebase.',
};

export default function Login({ onLocal }) {
  const [mode, setMode] = useState('choose');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setErr('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setErr(ERR[e.code] || e.message || 'Anmeldung fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="bg" aria-hidden="true"><span className="o1" /><span className="o2" /><span className="o3" /></div>
      <div className="glass glass-hero card stack" style={{ width: '100%', maxWidth: 420, padding: 28, gap: 18 }}>
        <span className="brand">Laufbuch°</span>
        <h1 className="display h-l" style={{ fontSize: 40 }}>Dein Training.<br /><span className="soft">An einem Ort.</span></h1>
        {mode === 'choose' && (
          <div className="stack">
            <button className="btn" disabled={busy} onClick={() => run(loginGoogle)}>Mit Google anmelden</button>
            <button className="btn-glass" disabled={busy} onClick={() => setMode('email')}>Mit E-Mail anmelden</button>
            <button className="link-btn" onClick={onLocal}>Ohne Konto ausprobieren (nur dieses Gerät)</button>
          </div>
        )}
        {(mode === 'email' || mode === 'register') && (
          <form className="stack" onSubmit={(e) => { e.preventDefault(); run(() => (mode === 'email' ? loginEmail(email, pw) : registerEmail(email, pw))); }}>
            <label className="field">E-Mail<input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
            <label className="field">Passwort<input className="input" type="password" autoComplete={mode === 'email' ? 'current-password' : 'new-password'} value={pw} onChange={(e) => setPw(e.target.value)} required /></label>
            <button className="btn" type="submit" disabled={busy}>{mode === 'email' ? 'Anmelden' : 'Konto erstellen'}</button>
            <div className="between">
              <button type="button" className="link-btn" onClick={() => setMode('choose')}>Zurück</button>
              <button type="button" className="link-btn" onClick={() => setMode(mode === 'email' ? 'register' : 'email')}>{mode === 'email' ? 'Neues Konto' : 'Ich habe ein Konto'}</button>
            </div>
          </form>
        )}
        {err && <p className="small" style={{ color: '#9A1F2A' }}>{err}</p>}
      </div>
    </div>
  );
}
