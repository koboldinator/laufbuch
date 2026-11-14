// Datenspeicher: Firestore (angemeldet) oder lokal im Browser (Test-Modus).
// Beide haben dieselbe Schnittstelle.

import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';

export const COLLECTIONS = ['plans', 'sessions', 'blocks', 'races', 'activities', 'strength', 'settings'];

const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export function newId() {
  let s = '';
  const arr = new Uint8Array(20);
  crypto.getRandomValues(arr);
  for (const b of arr) s += ID_CHARS[b % ID_CHARS.length];
  return s;
}

function clean(obj) {
  // Firestore mag kein undefined
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out;
}

export function createFirebaseStore(db, uid) {
  const col = (name) => collection(db, 'users', uid, name);
  const ref = (name, id) => doc(db, 'users', uid, name, id);

  return {
    kind: 'firebase',
    subscribe(cb, onError) {
      const unsubs = COLLECTIONS.map((name) =>
        onSnapshot(
          col(name),
          (snap) => cb(name, snap.docs.map((d) => ({ id: d.id, ...d.data() })), snap.metadata.fromCache),
          (err) => onError && onError(err),
        ),
      );
      return () => unsubs.forEach((u) => u());
    },
    async add(name, data) {
      const id = newId();
      await setDoc(ref(name, id), clean({ ...data, createdAt: Date.now() }));
      return id;
    },
    set(name, id, data) {
      return setDoc(ref(name, id), clean(data));
    },
    update(name, id, patch) {
      return updateDoc(ref(name, id), clean({ ...patch, updatedAt: Date.now() }));
    },
    remove(name, id) {
      return deleteDoc(ref(name, id));
    },
    async bulk(ops) {
      for (let i = 0; i < ops.length; i += 400) {
        const batch = writeBatch(db);
        for (const op of ops.slice(i, i + 400)) {
          if (op.type === 'delete') batch.delete(ref(op.col, op.id));
          else batch.set(ref(op.col, op.id), clean(op.data));
        }
        await batch.commit();
      }
    },
  };
}

const LOCAL_KEY = 'laufbuch-local-v1';

export function createLocalStore() {
  let data;
  try {
    data = JSON.parse(localStorage.getItem(LOCAL_KEY)) || {};
  } catch {
    data = {};
  }
  for (const c of COLLECTIONS) data[c] = data[c] || {};
  const listeners = new Set();

  const persist = (changed) => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    } catch {
      /* Speicher voll oder gesperrt – Daten bleiben bis zum Neuladen im Speicher */
    }
    for (const l of listeners) for (const c of changed) l(c, list(c), false);
  };
  const list = (c) => Object.entries(data[c]).map(([id, v]) => ({ id, ...v }));

  return {
    kind: 'local',
    subscribe(cb) {
      listeners.add(cb);
      for (const c of COLLECTIONS) cb(c, list(c), false);
      return () => listeners.delete(cb);
    },
    async add(name, d) {
      const id = newId();
      data[name][id] = clean({ ...d, createdAt: Date.now() });
      persist([name]);
      return id;
    },
    async set(name, id, d) {
      data[name][id] = clean(d);
      persist([name]);
    },
    async update(name, id, patch) {
      data[name][id] = clean({ ...(data[name][id] || {}), ...patch, updatedAt: Date.now() });
      persist([name]);
    },
    async remove(name, id) {
      delete data[name][id];
      persist([name]);
    },
    async bulk(ops) {
      const changed = new Set();
      for (const op of ops) {
        if (op.type === 'delete') delete data[op.col][op.id];
        else data[op.col][op.id] = clean(op.data);
        changed.add(op.col);
      }
      persist([...changed]);
    },
  };
}

export function clearLocalStore() {
  try {
    localStorage.removeItem(LOCAL_KEY);
  } catch {
    /* egal */
  }
}
