import { doc, getDoc, setDoc, writeBatch, collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Facility, FacilityMember, UserProfile } from '../types';
import { defaultServices } from '../mockData';

export interface SessionData {
  uid: string;
  email: string;
  displayName: string;
  facilityId: string;
  facility: Facility;
  member: FacilityMember;
  clinicId?: string;
  clinicName?: string;
  name?: string;
  role?: string;
  cachedAt?: number;
}

export type ClinicRecord = Facility;

export type FacilityResolutionResult =
  | {
      status: 'success';
      session: SessionData;
    }
  | {
      status: 'no_user_doc';
      uid: string;
      email: string;
      displayName: string;
    }
  | {
      status: 'facility_access_denied';
      facilityId: string;
      path: string;
      errorCode?: string;
      message: string;
    };

const AUTH_SESSION_KEY = 'remidoc_facility_session';
const FACILITY_CACHE_KEY = 'remidoc_facility_cache';
const LOGGING_OUT_KEY = 'remidoc_explicit_logout';

export function saveCachedSession(data: Omit<SessionData, 'cachedAt'>): void {
  try {
    const session: SessionData = {
      ...data,
      clinicId: data.facilityId,
      clinicName: data.facility?.name,
      name: data.displayName,
      role: data.member?.role,
      cachedAt: Date.now(),
    };
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  } catch (err) {
    console.warn('Failed to save session to localStorage:', err);
  }
}

export function getCachedSession(): SessionData | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

export function clearCachedSession(): void {
  try {
    localStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(FACILITY_CACHE_KEY);
    localStorage.removeItem('remidoc_auth_session');
    localStorage.removeItem('remidoc_clinic_cache');
  } catch (err) {}
}

export const getCachedClinic = getCachedFacility;
export const saveCachedClinic = saveCachedFacility;

export function saveCachedFacility(facility: Facility): void {
  try {
    localStorage.setItem(FACILITY_CACHE_KEY, JSON.stringify(facility));
  } catch (err) {
    console.warn('Failed to cache facility:', err);
  }
}

export function getCachedFacility(): Facility | null {
  try {
    const raw = localStorage.getItem(FACILITY_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

export function markExplicitLogout(): void {
  try {
    sessionStorage.setItem(LOGGING_OUT_KEY, 'true');
    clearCachedSession();
  } catch (err) {}
}

export function clearExplicitLogout(): void {
  try {
    sessionStorage.removeItem(LOGGING_OUT_KEY);
  } catch (err) {}
}

export function isExplicitLogout(): boolean {
  try {
    return sessionStorage.getItem(LOGGING_OUT_KEY) === 'true';
  } catch (err) {
    return false;
  }
}

export function generateFacilityId(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'facility';
  const rand = Math.random().toString(36).substring(2, 6);
  return `${slug}-${rand}`;
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Creates facilities/{facilityId}, facilities/{facilityId}/members/{uid} (role "owner"),
 * the counters documents, and users/{uid} in ONE atomic batched write.
 */
export async function createFacilityAndUserBatch(params: {
  userId: string;
  userEmail: string;
  userName: string;
  facilityName: string;
}): Promise<SessionData> {
  const { userId, userEmail, userName, facilityName } = params;
  const facilityId = generateFacilityId(facilityName);
  const nowIso = new Date().toISOString();

  const facilityPath = `facilities/${facilityId}`;
  const memberPath = `facilities/${facilityId}/members/${userId}`;
  const userPath = `users/${userId}`;
  const patientCounterPath = `facilities/${facilityId}/counters/patients`;
  const appointmentCounterPath = `facilities/${facilityId}/counters/appointments`;

  console.log(`[FS] Preparing ONE batched write for signup/setup:`);
  console.log(`[FS] -> Path 1: ${facilityPath} (create)`);
  console.log(`[FS] -> Path 2: ${memberPath} (create, role: owner)`);
  console.log(`[FS] -> Path 3: ${userPath} (create, facilityId: ${facilityId})`);
  console.log(`[FS] -> Path 4: ${patientCounterPath} (create, lastNumber: 0)`);
  console.log(`[FS] -> Path 5: ${appointmentCounterPath} (create, lastNumber: 0)`);

  const batch = writeBatch(db);

  const facilityData: Facility = {
    id: facilityId,
    name: facilityName,
    timezone: 'Africa/Gaborone',
    openingHours: 'Mon-Fri 08:00-17:00, Sat 08:00-13:00',
    ownerUid: userId,
    setupCompleted: false,
    createdAt: nowIso,
    createdBy: userId,
    updatedAt: nowIso,
  };

  const memberData: FacilityMember = {
    userId,
    displayName: userName,
    email: userEmail,
    role: 'owner',
    createdAt: nowIso,
  };

  batch.set(doc(db, 'facilities', facilityId), facilityData);
  batch.set(doc(db, 'facilities', facilityId, 'members', userId), memberData);
  batch.set(doc(db, 'users', userId), {
    facilityId,
    displayName: userName,
    email: userEmail,
    createdAt: nowIso,
  });
  batch.set(doc(db, 'facilities', facilityId, 'counters', 'patients'), {
    lastNumber: 0,
  });
  batch.set(doc(db, 'facilities', facilityId, 'counters', 'appointments'), {
    lastNumber: 0,
  });

  try {
    await batch.commit();
    console.log(`[FS] Batch commit SUCCEEDED for facility ${facilityId}`);
  } catch (commitErr: any) {
    console.error(`[FS] Batch commit FAILED. Error Code: ${commitErr?.code}. Message: ${commitErr?.message}`);
    console.error(`[FS] Failing batch paths involved: ${facilityPath}, ${memberPath}, ${userPath}, ${patientCounterPath}, ${appointmentCounterPath}`);
    throw new Error(`[FS] Error at path ${facilityPath} (batch write): [${commitErr?.code || 'unknown'}] ${commitErr?.message || String(commitErr)}`);
  }

  // Seed default staff record under facility
  const staffPath = `facilities/${facilityId}/staff`;
  console.log(`[FS] Writing default staff at path: ${staffPath}`);
  try {
    await addDoc(collection(db, 'facilities', facilityId, 'staff'), {
      name: userName,
      role: 'doctor',
      practiceIds: [],
      weeklyHours: {
        monday: { start: '08:00', end: '17:00', isOff: false },
        tuesday: { start: '08:00', end: '17:00', isOff: false },
        wednesday: { start: '08:00', end: '17:00', isOff: false },
        thursday: { start: '08:00', end: '17:00', isOff: false },
        friday: { start: '08:00', end: '17:00', isOff: false },
        saturday: { start: '08:00', end: '13:00', isOff: false },
        sunday: { start: '08:00', end: '13:00', isOff: true },
      },
      active: true,
      createdAt: nowIso,
      createdBy: userId,
      updatedAt: nowIso,
    });
    console.log(`[FS] Staff write SUCCEEDED at path: ${staffPath}`);
  } catch (staffErr: any) {
    console.warn(`[FS] Warning at path ${staffPath}: [${staffErr?.code}] ${staffErr?.message}`);
  }

  // Seed default services under facility
  const servicesPath = `facilities/${facilityId}/services`;
  console.log(`[FS] Writing default services at path: ${servicesPath}`);
  try {
    for (const s of defaultServices) {
      await addDoc(collection(db, 'facilities', facilityId, 'services'), {
        practiceId: 'general-practice',
        name: s.name,
        durationMinutes: s.durationMinutes,
        bufferMinutes: s.bufferMinutes,
        isCustom: false,
        catalogKey: (s as any).key || null,
        active: true,
        createdAt: nowIso,
        createdBy: userId,
        updatedAt: nowIso,
      });
    }
    console.log(`[FS] Services write SUCCEEDED at path: ${servicesPath}`);
  } catch (svcErr: any) {
    console.warn(`[FS] Warning at path ${servicesPath}: [${svcErr?.code}] ${svcErr?.message}`);
  }

  const session: SessionData = {
    uid: userId,
    email: userEmail,
    displayName: userName,
    facilityId,
    facility: facilityData,
    member: memberData,
    clinicId: facilityId,
    clinicName: facilityName,
    name: userName,
    role: 'owner',
  };

  saveCachedSession(session);
  saveCachedFacility(facilityData);

  return session;
}

/**
 * Resolves the signed-in user's facility and profile.
 * - Reads users/{uid}
 * - If users/{uid} does not exist, returns status: 'no_user_doc'
 * - If facility document cannot be read, returns status: 'facility_access_denied'
 * - Logs all operations with [FS] prefix and error codes.
 */
export async function resolveUserFacilityAndProfile(
  userId: string,
  userEmail?: string | null,
  displayName?: string | null
): Promise<FacilityResolutionResult> {
  const userPath = `users/${userId}`;
  console.log(`[FS] Reading path: ${userPath}, SignedIn: ${!!auth.currentUser}`);

  let facilityId: string | null = null;
  let userProfile: UserProfile | null = null;

  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (!userSnap.exists()) {
      console.log(`[FS] Path ${userPath} does not exist.`);
      return {
        status: 'no_user_doc',
        uid: userId,
        email: userEmail || '',
        displayName: displayName || userEmail?.split('@')[0] || 'Practitioner',
      };
    }
    userProfile = userSnap.data() as UserProfile;
    facilityId = userProfile.facilityId;
    console.log(`[FS] Read path: ${userPath} SUCCEEDED. facilityId: ${facilityId}`);
  } catch (err: any) {
    console.error(`[FS] Error reading path: ${userPath}, Code: ${err?.code}, Message: ${err?.message}`);
    throw new Error(`[FS] Error reading path ${userPath}: [${err?.code || 'unknown'}] ${err?.message || String(err)}`);
  }

  if (!facilityId) {
    console.log(`[FS] Path ${userPath} has no facilityId configured.`);
    return {
      status: 'no_user_doc',
      uid: userId,
      email: userEmail || '',
      displayName: displayName || userProfile?.displayName || 'Practitioner',
    };
  }

  const facilityPath = `facilities/${facilityId}`;
  console.log(`[FS] Reading path: ${facilityPath}, SignedIn: ${!!auth.currentUser}`);

  let facilityData: Facility;
  try {
    const facSnap = await getDoc(doc(db, 'facilities', facilityId));
    if (!facSnap.exists()) {
      console.error(`[FS] Read failed: facility document does not exist at path: ${facilityPath}`);
      return {
        status: 'facility_access_denied',
        facilityId,
        path: facilityPath,
        message: 'Facility document does not exist',
      };
    }
    facilityData = { id: facSnap.id, ...facSnap.data() } as Facility;
    console.log(`[FS] Read path: ${facilityPath} SUCCEEDED. Name: ${facilityData.name}`);
  } catch (err: any) {
    console.error(`[FS] Error reading path: ${facilityPath}, Code: ${err?.code}, Message: ${err?.message}`);
    return {
      status: 'facility_access_denied',
      facilityId,
      path: facilityPath,
      errorCode: err?.code,
      message: err?.message || String(err),
    };
  }

  const memberPath = `facilities/${facilityId}/members/${userId}`;
  console.log(`[FS] Reading path: ${memberPath}, SignedIn: ${!!auth.currentUser}`);

  let memberData: FacilityMember;
  try {
    const memSnap = await getDoc(doc(db, 'facilities', facilityId, 'members', userId));
    if (memSnap.exists()) {
      memberData = memSnap.data() as FacilityMember;
      console.log(`[FS] Read path: ${memberPath} SUCCEEDED. Role: ${memberData.role}`);
    } else {
      console.warn(`[FS] Member document missing at path: ${memberPath}. Fallback role based on ownerUid.`);
      memberData = {
        userId,
        displayName: displayName || userProfile?.displayName || 'User',
        email: userEmail || userProfile?.email || '',
        role: facilityData.ownerUid === userId ? 'owner' : 'admin',
        createdAt: new Date().toISOString(),
      };
    }
  } catch (err: any) {
    console.warn(`[FS] Error reading path: ${memberPath}, Code: ${err?.code}, Message: ${err?.message}`);
    memberData = {
      userId,
      displayName: displayName || userProfile?.displayName || 'User',
      email: userEmail || userProfile?.email || '',
      role: facilityData.ownerUid === userId ? 'owner' : 'admin',
      createdAt: new Date().toISOString(),
    };
  }

  const session: SessionData = {
    uid: userId,
    email: userEmail || userProfile?.email || '',
    displayName: memberData.displayName || userProfile?.displayName || 'Practitioner',
    facilityId,
    facility: facilityData,
    member: memberData,
    clinicId: facilityId,
    clinicName: facilityData.name,
    name: memberData.displayName,
    role: memberData.role,
  };

  saveCachedSession(session);
  saveCachedFacility(facilityData);

  return {
    status: 'success',
    session,
  };
}

export const resolveUserClinicAndProfile = async (
  userId: string,
  userEmail?: string | null,
  displayName?: string | null
) => {
  const result = await resolveUserFacilityAndProfile(userId, userEmail, displayName);
  if (result.status === 'success') {
    return {
      clinicId: result.session.facilityId,
      clinic: result.session.facility,
      profileName: result.session.member.displayName,
      role: result.session.member.role,
    };
  }
  return {
    clinicId: '',
    clinic: null as any,
    profileName: '',
    role: 'receptionist',
  };
};
