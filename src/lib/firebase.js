import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
} from 'firebase/firestore';

// Die Web-Konfiguration ist nicht geheim – sie identifiziert nur das Projekt.
// Geschützt werden die Daten durch die Firestore-Regeln (firestore.rules).
const firebaseConfig = {
  apiKey: 'AIzaSyC0VXUQz7dE0XkIbnjlnm4ZagCyvFMwwAQ',
  authDomain: 'laufprogramm.firebaseapp.com',
  projectId: 'laufprogramm',
  storageBucket: 'laufprogramm.firebasestorage.app',
  messagingSenderId: '164636241268',
  appId: '1:164636241268:web:057abb79686315dac35021',
};

export const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
});

let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch (e) {
  dbInstance = initializeFirestore(app, { localCache: memoryLocalCache() });
}
export const db = dbInstance;

export function watchAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

export async function loginGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    return await signInWithPopup(auth, provider);
  } catch (e) {
    // Falls Popups blockiert sind (z. B. in der Homescreen-App): Weiterleitung
    if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) {
      return signInWithRedirect(auth, provider);
    }
    throw e;
  }
}

export function loginEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function registerEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function logout() {
  return signOut(auth);
}
