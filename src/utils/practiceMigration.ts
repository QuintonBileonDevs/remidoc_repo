import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc,
  writeBatch 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Practice, Service, Staff, Appointment, FacilityType } from '../types';

export interface MigrationResult {
  migrated: boolean;
  primaryPracticeId: string;
}

/**
 * Ensures a facility has at least one default practice, and migrates any
 * existing services and staff into a default practice so nothing breaks.
 * Soft-deactivates (active: false) obsolete seeded example services.
 * Adds practiceId to appointments and ensures soft-delete discipline everywhere.
 */
export async function migrateToMultiPractice(
  facilityId: string, 
  facilityName: string
): Promise<MigrationResult> {
  if (!facilityId) return { migrated: false, primaryPracticeId: '' };

  const path = `facilities/${facilityId}/practices`;
  console.log(`[FS] Path: ${path}, SignedIn: ${!!auth.currentUser}`);

  try {
    const practicesSnap = await getDocs(collection(db, 'facilities', facilityId, 'practices'));
    let primaryPracticeId = '';
    const existingPractices: Practice[] = [];

    practicesSnap.forEach((d) => {
      existingPractices.push({ id: d.id, ...(d.data() as any) });
    });

    const activePractices = existingPractices.filter((p) => p.active !== false);

    if (activePractices.length === 0) {
      const practiceRef = doc(collection(db, 'facilities', facilityId, 'practices'));
      primaryPracticeId = practiceRef.id;

      const defaultPractice: Omit<Practice, 'id'> = {
        name: facilityName || 'General Practice',
        facilityType: 'general_practice',
        active: true,
        createdAt: new Date().toISOString(),
      };

      await setDoc(practiceRef, defaultPractice);

      await updateDoc(doc(db, 'facilities', facilityId), {
        facilityTypes: ['general_practice'],
      }).catch(() => {});
    } else {
      primaryPracticeId = activePractices[0].id;
    }

    const servicesSnap = await getDocs(collection(db, 'facilities', facilityId, 'services'));
    const serviceBatch = writeBatch(db);
    let serviceBatchCount = 0;

    const oldSeededNames = new Set(['General consultation', 'Follow-up', 'Vaccination']);
    const hasCustomOrCatalogServices = servicesSnap.docs.some((d) => {
      const data = d.data() as any;
      return (data.catalogKey || data.practiceId) && !oldSeededNames.has(data.name);
    });

    servicesSnap.forEach((sDoc) => {
      const data = sDoc.data() as any;
      const updates: Record<string, any> = {};

      if (hasCustomOrCatalogServices && !data.practiceId && oldSeededNames.has(data.name)) {
        updates.active = false;
        updates.practiceId = primaryPracticeId;
      } else {
        if (!data.practiceId) {
          updates.practiceId = primaryPracticeId;
        }
      }

      if (data.durationMinutes === undefined) {
        updates.durationMinutes = data.duration || 15;
      }
      if (data.bufferMinutes === undefined) {
        updates.bufferMinutes = data.buffer || 0;
      }
      if (data.isCustom === undefined) {
        updates.isCustom = !data.catalogKey;
      }
      if (data.catalogKey === undefined) {
        updates.catalogKey = null;
      }

      if (Object.keys(updates).length > 0) {
        serviceBatch.update(sDoc.ref, updates);
        serviceBatchCount++;
      }
    });

    if (serviceBatchCount > 0) {
      await serviceBatch.commit();
    }

    const staffSnap = await getDocs(collection(db, 'facilities', facilityId, 'staff'));
    const staffBatch = writeBatch(db);
    let staffBatchCount = 0;

    staffSnap.forEach((stDoc) => {
      const data = stDoc.data() as any;
      if (!data.practiceIds || !Array.isArray(data.practiceIds) || data.practiceIds.length === 0) {
        staffBatch.update(stDoc.ref, {
          practiceIds: [primaryPracticeId],
        });
        staffBatchCount++;
      }
    });

    if (staffBatchCount > 0) {
      await staffBatch.commit();
    }

    const appSnap = await getDocs(collection(db, 'facilities', facilityId, 'appointments'));
    const appBatch = writeBatch(db);
    let appBatchCount = 0;

    appSnap.forEach((aDoc) => {
      const data = aDoc.data() as any;
      if (!data.practiceId) {
        appBatch.update(aDoc.ref, {
          practiceId: primaryPracticeId,
        });
        appBatchCount++;
      }
    });

    if (appBatchCount > 0) {
      await appBatch.commit();
    }

    return { migrated: true, primaryPracticeId };
  } catch (err) {
    console.error(`[FS] Error at migration path ${path}:`, err);
    return { migrated: false, primaryPracticeId: '' };
  }
}
