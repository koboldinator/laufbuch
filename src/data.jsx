import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { COLLECTIONS } from './lib/store.js';
import { todayISO } from './lib/dates.js';

const DataCtx = createContext(null);
const UiCtx = createContext(null);

export const DEFAULT_SETTINGS = { strengthTarget: 2, hrMin: 140, hrMax: 155, pb5k: '', pb10k: '', pbHm: '' };

export function DataProvider({ store, user, children }) {
  const [cols, setCols] = useState(() => Object.fromEntries(COLLECTIONS.map((c) => [c, []])));
  const [loaded, setLoaded] = useState(0);
  const [error, setError] = useState(null);
  const [today, setToday] = useState(todayISO());

  useEffect(() => {
    const seen = new Set();
    const unsub = store.subscribe(
      (name, docs) => {
        setCols((prev) => ({ ...prev, [name]: docs }));
        if (!seen.has(name)) {
          seen.add(name);
          setLoaded(seen.size);
        }
      },
      (err) => setError(err),
    );
    return unsub;
  }, [store]);

  useEffect(() => {
    const tick = () => setToday(todayISO());
    const id = setInterval(tick, 60000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  const settingsDoc = cols.settings.find((s) => s.id === 'main');
  const settings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...(settingsDoc || {}) }), [settingsDoc]);

  const saveSettings = useCallback(
    (patch) => {
      const { id, ...rest } = { ...(settingsDoc || {}), ...patch };
      return store.set('settings', 'main', rest);
    },
    [store, settingsDoc],
  );

  const runOps = useCallback(
    async (ops) => {
      const out = [];
      for (const op of ops) {
        if (op.type === 'merge-settings') {
          const { id, ...rest } = { ...(settingsDoc || {}), ...op.data };
          out.push({ type: 'set', col: 'settings', id: 'main', data: rest });
        } else out.push(op);
      }
      await store.bulk(out);
    },
    [store, settingsDoc],
  );

  const value = useMemo(
    () => ({
      ...cols,
      settings,
      saveSettings,
      runOps,
      store,
      user,
      today,
      ready: loaded >= COLLECTIONS.length,
      error,
    }),
    [cols, settings, saveSettings, runOps, store, user, today, loaded, error],
  );

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function useData() {
  return useContext(DataCtx);
}

export function UiProvider({ value, children }) {
  return <UiCtx.Provider value={value}>{children}</UiCtx.Provider>;
}

export function useUi() {
  return useContext(UiCtx);
}
