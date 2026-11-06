import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence, 
  inMemoryPersistence 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Guarantee persistent login state across iframe reloads, tab navigation, and sleep/wake cycles,
// falling back to inMemoryPersistence if IndexedDB is unavailable.
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Unable to set browserLocalPersistence, falling back to inMemoryPersistence:', err);
  setPersistence(auth, inMemoryPersistence).catch(() => {});
});
