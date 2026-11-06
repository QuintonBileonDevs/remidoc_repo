import { 
  collection, 
  doc, 
  getDoc, 
  getDocs 
} from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface DiagnosticResult {
  path: string;
  operation: 'read' | 'write' | 'list';
  status: 'SUCCESS' | 'PERMISSION_DENIED' | 'ERROR';
  message: string;
}

export async function runSecurityDiagnostic(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];
  const currentUser = auth.currentUser;
  const uid = currentUser ? currentUser.uid : 'anonymous';

  let facilityId: string | null = null;
  if (currentUser) {
    try {
      const userSnap = await getDoc(doc(db, 'users', uid));
      if (userSnap.exists()) {
        facilityId = userSnap.data().facilityId;
      }
    } catch (e) {
      console.warn('[SECURITY DIAGNOSTIC] Could not fetch user record for facilityId resolution:', e);
    }
  }
  if (!facilityId && currentUser) {
    facilityId = `facility_${uid}`;
  }

  console.log(`[SECURITY DIAGNOSTIC] Starting test suite for signedInUid: ${uid}, resolvedFacilityId: ${facilityId}`);

  // 1. Test users/{uid}
  if (currentUser) {
    try {
      const userRef = doc(db, 'users', uid);
      await getDoc(userRef);
      results.push({ path: `users/${uid}`, operation: 'read', status: 'SUCCESS', message: 'Read allowed' });
      console.log(`[SECURITY DIAGNOSTIC] SUCCESS: read users/${uid}`);
    } catch (err: any) {
      const isDenied = err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions');
      results.push({ 
        path: `users/${uid}`, 
        operation: 'read', 
        status: isDenied ? 'PERMISSION_DENIED' : 'ERROR', 
        message: err?.message || String(err) 
      });
      console.error(`[SECURITY DIAGNOSTIC] ${isDenied ? 'PERMISSION_DENIED' : 'ERROR'}: read users/${uid} ->`, err);
    }
  }

  if (!facilityId) {
    console.warn('[SECURITY DIAGNOSTIC] No facilityId resolved, skipping facility tests.');
    return results;
  }

  // 2. Test facilities/{facilityId}
  try {
    const facRef = doc(db, 'facilities', facilityId);
    await getDoc(facRef);
    results.push({ path: `facilities/${facilityId}`, operation: 'read', status: 'SUCCESS', message: 'Read allowed' });
    console.log(`[SECURITY DIAGNOSTIC] SUCCESS: read facilities/${facilityId}`);
  } catch (err: any) {
    const isDenied = err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions');
    results.push({ 
      path: `facilities/${facilityId}`, 
      operation: 'read', 
      status: isDenied ? 'PERMISSION_DENIED' : 'ERROR', 
      message: err?.message || String(err) 
    });
    console.error(`[SECURITY DIAGNOSTIC] ${isDenied ? 'PERMISSION_DENIED' : 'ERROR'}: read facilities/${facilityId} ->`, err);
  }

  // 3. Test facilities/{facilityId}/members/{uid}
  if (currentUser) {
    try {
      const memberRef = doc(db, 'facilities', facilityId, 'members', uid);
      await getDoc(memberRef);
      results.push({ path: `facilities/${facilityId}/members/${uid}`, operation: 'read', status: 'SUCCESS', message: 'Read allowed' });
      console.log(`[SECURITY DIAGNOSTIC] SUCCESS: read facilities/${facilityId}/members/${uid}`);
    } catch (err: any) {
      const isDenied = err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions');
      results.push({ 
        path: `facilities/${facilityId}/members/${uid}`, 
        operation: 'read', 
        status: isDenied ? 'PERMISSION_DENIED' : 'ERROR', 
        message: err?.message || String(err) 
      });
      console.error(`[SECURITY DIAGNOSTIC] ${isDenied ? 'PERMISSION_DENIED' : 'ERROR'}: read facilities/${facilityId}/members/${uid} ->`, err);
    }
  }

  // Subcollections to test list/read
  const subcollections = ['practices', 'services', 'staff', 'patients', 'appointments', 'counters'];
  
  for (const sub of subcollections) {
    const colPath = `facilities/${facilityId}/${sub}`;
    try {
      const colRef = collection(db, 'facilities', facilityId, sub);
      await getDocs(colRef);
      results.push({ path: colPath, operation: 'list', status: 'SUCCESS', message: 'List/Read allowed' });
      console.log(`[SECURITY DIAGNOSTIC] SUCCESS: list ${colPath}`);
    } catch (err: any) {
      const isDenied = err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions');
      results.push({ 
        path: colPath, 
        operation: 'list', 
        status: isDenied ? 'PERMISSION_DENIED' : 'ERROR', 
        message: err?.message || String(err) 
      });
      console.error(`[SECURITY DIAGNOSTIC] ${isDenied ? 'PERMISSION_DENIED' : 'ERROR'}: list ${colPath} ->`, err);
    }
  }

  // 4. Deliberate check: different facility path (expected: denied)
  const fakeFacilityId = 'unauthorized_fake_facility_xyz';
  const fakePath = `facilities/${fakeFacilityId}`;
  try {
    const fakeRef = doc(db, 'facilities', fakeFacilityId);
    await getDoc(fakeRef);
    results.push({ path: fakePath, operation: 'read', status: 'ERROR', message: 'Expected permission denied but read succeeded!' });
    console.warn(`[SECURITY DIAGNOSTIC] UNEXPECTED SUCCESS reading unauthorized facility ${fakePath}`);
  } catch (err: any) {
    const isDenied = err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions');
    results.push({ 
      path: fakePath, 
      operation: 'read', 
      status: isDenied ? 'SUCCESS' : 'ERROR', // SUCCESS meaning correctly denied
      message: isDenied ? 'Correctly denied (Permission Denied as expected)' : String(err) 
    });
    console.log(`[SECURITY DIAGNOSTIC] Correctly denied unauthorized facility access to ${fakePath}`);
  }

  console.log('[SECURITY DIAGNOSTIC] Diagnostic test suite completed.', results);
  return results;
}
