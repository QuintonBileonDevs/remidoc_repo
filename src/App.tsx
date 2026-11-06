import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  setDoc,
  onSnapshot,
  runTransaction 
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { AuthPage } from './components/AuthPage';
import { Sidebar, NavigationTab } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { CalendarView } from './components/CalendarView';
import { PatientsView } from './components/PatientsView';
import { RemindersView } from './components/RemindersView';
import { SettingsView } from './components/SettingsView';
import { AppointmentDrawer } from './components/AppointmentDrawer';
import { PatientModal } from './components/PatientModal';
import { PracticeSetupWizard } from './components/PracticeSetupWizard';
import { TodayView } from './components/TodayView';
import { ReportsView } from './components/ReportsView';
import { initialPatients, defaultStaffList, sampleAppointments } from './mockData';
import { 
  Appointment, 
  Patient, 
  AppointmentStatus, 
  Service, 
  Staff, 
  Practice, 
  FacilityType, 
  StatusHistoryEntry,
  Facility
} from './types';
import { getGaboroneDateString, timeToMinutes, calculateEndTime } from './utils/dateUtils';
import { 
  ClinicRecord, 
  getCachedSession, 
  getCachedClinic, 
  saveCachedSession, 
  saveCachedClinic, 
  markExplicitLogout, 
  clearExplicitLogout,
  clearCachedSession,
  isExplicitLogout,
  resolveUserClinicAndProfile,
  resolveUserFacilityAndProfile,
  saveCachedFacility,
  FacilityResolutionResult
} from './utils/sessionManager';
import { migrateToMultiPractice } from './utils/practiceMigration';
import { getServicesForFacilityType } from './utils/practiceCatalog';
import { FinishFacilitySetup } from './components/FinishFacilitySetup';
import { Loader2, AlertCircle, ShieldAlert } from 'lucide-react';

export default function App() {
  // Pre-hydrate from localStorage for zero-flicker instant session restoration
  const initialCached = getCachedSession();
  const initialClinicCached = getCachedClinic();

  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [authLoading, setAuthLoading] = useState<boolean>(() => !initialCached);
  const [clinicId, setClinicId] = useState<string | null>(() => initialCached?.clinicId || null);
  const [clinicName, setClinicName] = useState<string>(() => initialClinicCached?.name || initialCached?.clinicName || 'Remidoc Healthcare Facility');
  const [userName, setUserName] = useState<string>(() => initialCached?.name || 'Practitioner');
  const [userRole, setUserRole] = useState<string>(() => initialCached?.role || 'admin');

  const [resolutionResult, setResolutionResult] = useState<FacilityResolutionResult | null>(() => {
    if (initialCached && initialClinicCached) {
      return {
        status: 'success',
        session: initialCached,
      };
    }
    return null;
  });
  const [resolutionError, setResolutionError] = useState<{ path: string; message: string } | null>(null);

  const [clinicData, setClinicData] = useState<Facility>(() => initialClinicCached || {
    id: initialCached?.facilityId || 'facility_default',
    name: initialCached?.facility?.name || 'Remidoc Medical Facility',
    timezone: 'Africa/Gaborone',
    openingHours: 'Mon-Fri 08:00-17:00, Sat 08:00-13:00',
    ownerUid: '',
    createdAt: new Date().toISOString(),
    createdBy: '',
  });

  const [activeTab, setActiveTab] = useState<NavigationTab>('today');
  const [practices, setPractices] = useState<Practice[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerEditingAppointment, setDrawerEditingAppointment] = useState<Appointment | null>(null);
  const [drawerInitialParams, setDrawerInitialParams] = useState<{ date?: string; time?: string; doctorName?: string; practiceId?: string } | undefined>(undefined);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [showPracticeWizard, setShowPracticeWizard] = useState(false);

  // Transient null debounce timer to prevent unexpected logouts during iframe/token refresh
  const logoutDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Active listener unsubscribe functions collection to guarantee complete listener cleanup on logout
  const activeListenersRef = useRef<(() => void)[]>([]);

  // Auto-prompt Practice Setup Wizard on first login after signup (when practices list is empty and wizard hasn't been completed)
  useEffect(() => {
    if (!authLoading && user && clinicId) {
      const wizardDone = localStorage.getItem(`practice_wizard_completed_${clinicId}`);
      if (!wizardDone && practices.length === 0) {
        setShowPracticeWizard(true);
      }
    }
  }, [authLoading, user, clinicId, practices.length]);

  // Auth State Listener with rock-solid session resilience
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        if (logoutDebounceRef.current) {
          clearTimeout(logoutDebounceRef.current);
          logoutDebounceRef.current = null;
        }

        clearExplicitLogout();
        setUser(currentUser);
        setResolutionError(null);

        try {
          // Resolve facility & user registration data with exact [FS] logging
          const resolved = await resolveUserFacilityAndProfile(
            currentUser.uid,
            currentUser.email,
            currentUser.displayName || userName
          );

          setResolutionResult(resolved);

          if (resolved.status === 'success') {
            const s = resolved.session;
            setClinicId(s.facilityId);
            setClinicData(s.facility);
            setClinicName(s.facility.name);
            setUserName(s.member.displayName);
            setUserRole(s.member.role);

            saveCachedSession(s);
            saveCachedFacility(s.facility);

            // Run multi-practice migration once facilityId is resolved
            migrateToMultiPractice(s.facilityId, s.facility.name).catch((err) =>
              console.error('Migration error:', err)
            );
          } else {
            // Either 'no_user_doc' or 'facility_access_denied'
            setClinicId(null);
          }
        } catch (err: any) {
          console.error('[FS] Error resolving user facility and profile:', err);
          setResolutionError({
            path: `users/${currentUser.uid}`,
            message: err?.message || String(err),
          });
          setClinicId(null);
        } finally {
          setAuthLoading(false);
        }
      } else {
        // Current user is null: check if user explicitly clicked logout
        if (isExplicitLogout()) {
          setUser(null);
          setClinicId(null);
          setResolutionResult(null);
          setAuthLoading(false);
        } else {
          // Debounce by 1500ms before giving up session to survive iframe reloads
          if (logoutDebounceRef.current) clearTimeout(logoutDebounceRef.current);
          logoutDebounceRef.current = setTimeout(() => {
            if (!auth.currentUser && !isExplicitLogout()) {
              const cached = getCachedSession();
              if (cached && Date.now() - (cached.cachedAt || 0) < 48 * 3600 * 1000) {
                console.warn('Network auth heartbeat delayed; preserving cached session.');
                setAuthLoading(false);
              } else {
                setUser(null);
                setClinicId(null);
                setResolutionResult(null);
                setAuthLoading(false);
              }
            }
          }, 1500);
        }
      }
    });

    return () => {
      unsubscribe();
      if (logoutDebounceRef.current) clearTimeout(logoutDebounceRef.current);
    };
  }, []);

  // Real-time synchronization of Clinic metadata under facilities/{clinicId}
  useEffect(() => {
    if (authLoading || !user || !clinicId) return;

    const clinicPath = `facilities/${clinicId}`;
    console.log(`[FS] Path: ${clinicPath}, SignedIn: ${!!auth.currentUser}`);

    const unsubClinic = onSnapshot(
      doc(db, 'facilities', clinicId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const rec: ClinicRecord = {
            id: clinicId,
            name: data.name || clinicName,
            timezone: data.timezone || 'Africa/Gaborone',
            openingHours: data.openingHours || 'Mon-Fri 08:00-17:00, Sat 08:00-13:00',
            facilityTypes: Array.isArray(data.facilityTypes) ? data.facilityTypes : ['general_practice'],
            createdAt: data.createdAt,
            createdBy: data.createdBy,
            leadDoctor: data.leadDoctor || userName,
            phone: data.phone || '+267 390 1234',
            address: data.address || 'Plot 54320, CBD Tower, Gaborone, Botswana',
            specialty: data.specialty || 'Multidisciplinary Healthcare Facility',
            autoReminders: data.autoReminders ?? true,
          };
          setClinicData(rec);
          setClinicName(rec.name);
          saveCachedClinic(rec);
        }
      },
      (err) => {
        console.error(`[FS] Error at path ${clinicPath}:`, err);
      }
    );

    activeListenersRef.current.push(unsubClinic);

    return () => {
      unsubClinic();
      activeListenersRef.current = activeListenersRef.current.filter((u) => u !== unsubClinic);
    };
  }, [authLoading, user, clinicId]);

  // Real-time synchronization of Practices, Services, Staff, Patients & Appointments under facilities/{clinicId}
  useEffect(() => {
    if (authLoading || !user || !clinicId) return;

    const practicesPath = `facilities/${clinicId}/practices`;
    const servicesPath = `facilities/${clinicId}/services`;
    const staffPath = `facilities/${clinicId}/staff`;
    const patientsPath = `facilities/${clinicId}/patients`;
    const appointmentsPath = `facilities/${clinicId}/appointments`;

    console.log(`[FS] Path: ${practicesPath}, SignedIn: ${!!auth.currentUser}`);
    const unsubPractices = onSnapshot(
      collection(db, 'facilities', clinicId, 'practices'),
      (snap) => {
        const loaded: Practice[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setPractices(loaded);
      },
      (err) => console.error(`[FS] Error at path ${practicesPath}:`, err)
    );

    console.log(`[FS] Path: ${servicesPath}, SignedIn: ${!!auth.currentUser}`);
    const unsubServices = onSnapshot(
      collection(db, 'facilities', clinicId, 'services'),
      (snap) => {
        const loaded: Service[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setServices(loaded);
      },
      (err) => console.error(`[FS] Error at path ${servicesPath}:`, err)
    );

    console.log(`[FS] Path: ${staffPath}, SignedIn: ${!!auth.currentUser}`);
    const unsubStaff = onSnapshot(
      collection(db, 'facilities', clinicId, 'staff'),
      async (snap) => {
        if (!snap.empty) {
          const loaded: Staff[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          setStaffList(loaded);
        } else {
          console.log(`[FS] Path: ${practicesPath} (getDocs for staff seeding), SignedIn: ${!!auth.currentUser}`);
          const pSnap = await getDocs(collection(db, 'facilities', clinicId, 'practices'));
          const pIds = pSnap.docs.map((d) => d.id);

          const seeded: Staff[] = [];
          const primaryPractitioner: Omit<Staff, 'id'> = {
            name: userName || clinicData.leadDoctor || 'Lead Doctor',
            role: 'doctor',
            practiceIds: pIds,
            workingHours: {
              monday: { start: '08:00', end: '17:00', isOff: false },
              tuesday: { start: '08:00', end: '17:00', isOff: false },
              wednesday: { start: '08:00', end: '17:00', isOff: false },
              thursday: { start: '08:00', end: '17:00', isOff: false },
              friday: { start: '08:00', end: '17:00', isOff: false },
              saturday: { start: '08:00', end: '13:00', isOff: false },
              sunday: { start: '08:00', end: '13:00', isOff: true },
            },
            active: true,
          };

          const docRef = await addDoc(collection(db, 'facilities', clinicId, 'staff'), {
            ...primaryPractitioner,
            createdAt: new Date().toISOString(),
          });
          seeded.push({ ...primaryPractitioner, id: docRef.id });

          for (const st of defaultStaffList) {
            if (st.name !== primaryPractitioner.name) {
              const extraRef = await addDoc(collection(db, 'facilities', clinicId, 'staff'), {
                ...st,
                practiceIds: pIds,
                createdAt: new Date().toISOString(),
              });
              seeded.push({ ...st, id: extraRef.id, practiceIds: pIds });
            }
          }
          setStaffList(seeded);
        }
      },
      (err) => console.error(`[FS] Error at path ${staffPath}:`, err)
    );

    console.log(`[FS] Path: ${patientsPath}, SignedIn: ${!!auth.currentUser}`);
    const unsubPatients = onSnapshot(
      collection(db, 'facilities', clinicId, 'patients'),
      async (snap) => {
        if (!snap.empty) {
          const loaded: Patient[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          setPatients(loaded);
        } else {
          const seeded: Patient[] = [];
          for (const pat of initialPatients) {
            const { id, ...rest } = pat;
            await setDoc(doc(db, 'facilities', clinicId, 'patients', id), rest);
            seeded.push(pat);
          }
          setPatients(seeded);
        }
      },
      (err) => console.error(`[FS] Error at path ${patientsPath}:`, err)
    );

    console.log(`[FS] Path: ${appointmentsPath}, SignedIn: ${!!auth.currentUser}`);
    const unsubAppointments = onSnapshot(
      collection(db, 'facilities', clinicId, 'appointments'),
      (snap) => {
        const loaded: Appointment[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setAppointments(loaded);
      },
      (err) => console.error(`[FS] Error at path ${appointmentsPath}:`, err)
    );

    const unsubs = [unsubPractices, unsubServices, unsubStaff, unsubPatients, unsubAppointments];
    activeListenersRef.current.push(...unsubs);

    return () => {
      unsubs.forEach((u) => {
        try { u(); } catch (e) {}
      });
      activeListenersRef.current = activeListenersRef.current.filter((u) => !unsubs.includes(u));
    };
  }, [authLoading, user, clinicId, userName, clinicData.leadDoctor]);

  // Synchronize facilityTypes array on clinic document to match all active practices
  const syncClinicFacilityTypes = async (cId: string) => {
    try {
      const snap = await getDocs(collection(db, 'facilities', cId, 'practices'));
      const activeTypes = new Set<FacilityType>();
      snap.forEach((d) => {
        const data = d.data() as Practice;
        if (data.active !== false && data.facilityType) {
          activeTypes.add(data.facilityType);
        }
      });
      const typesArray = Array.from(activeTypes);
      await updateDoc(doc(db, 'facilities', cId), {
        facilityTypes: typesArray.length > 0 ? typesArray : ['general_practice'],
      });
    } catch (err) {
      console.warn('Facility types sync warning:', err);
    }
  };

  // PRACTICES CRUD
  const handleSavePractice = async (
    practiceData: Omit<Practice, 'id'>, 
    id?: string, 
    seedCatalog: boolean = false
  ) => {
    if (!clinicId) return;
    try {
      let savedId = id;
      if (id) {
        await updateDoc(doc(db, 'facilities', clinicId, 'practices', id), { ...practiceData });
      } else {
        const docRef = await addDoc(collection(db, 'facilities', clinicId, 'practices'), {
          ...practiceData,
          createdAt: new Date().toISOString(),
        });
        savedId = docRef.id;
      }

      // If seedCatalog is true, add catalog services for this practice
      if (seedCatalog && savedId) {
        const catalogServices = getServicesForFacilityType(practiceData.facilityType);
        for (const item of catalogServices) {
          await addDoc(collection(db, 'facilities', clinicId, 'services'), {
            practiceId: savedId,
            name: item.name,
            durationMinutes: item.durationMinutes,
            bufferMinutes: item.bufferMinutes,
            duration: item.durationMinutes,
            buffer: item.bufferMinutes,
            isCustom: false,
            catalogKey: item.key,
            active: true,
            createdAt: new Date().toISOString(),
          });
        }
      }

      await syncClinicFacilityTypes(clinicId);
    } catch (err) {
      console.error('Error saving practice:', err);
      throw err;
    }
  };

  const handleTogglePracticeActive = async (id: string, active: boolean) => {
    if (!clinicId) return;
    try {
      await updateDoc(doc(db, 'facilities', clinicId, 'practices', id), { active });
      await syncClinicFacilityTypes(clinicId);
    } catch (err) {
      console.error('Error toggling practice active:', err);
      throw err;
    }
  };

  // SERVICES CRUD
  const handleSaveService = async (serviceData: Omit<Service, 'id'>, id?: string) => {
    if (!clinicId) return;
    try {
      if (id) {
        await updateDoc(doc(db, 'facilities', clinicId, 'services', id), { ...serviceData });
      } else {
        await addDoc(collection(db, 'facilities', clinicId, 'services'), {
          ...serviceData,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error saving service:', err);
      throw err;
    }
  };

  const handleToggleServiceActive = async (id: string, active: boolean) => {
    if (!clinicId) return;
    try {
      await updateDoc(doc(db, 'facilities', clinicId, 'services', id), { active });
    } catch (err) {
      console.error('Error toggling service active:', err);
      throw err;
    }
  };

  // STAFF CRUD
  const handleSaveStaff = async (staffData: Omit<Staff, 'id'>, id?: string) => {
    if (!clinicId) return;
    try {
      if (id) {
        await updateDoc(doc(db, 'facilities', clinicId, 'staff', id), { ...staffData });
      } else {
        await addDoc(collection(db, 'facilities', clinicId, 'staff'), {
          ...staffData,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error saving staff:', err);
      throw err;
    }
  };

  const handleToggleStaffActive = async (id: string, active: boolean) => {
    if (!clinicId) return;
    try {
      await updateDoc(doc(db, 'facilities', clinicId, 'staff', id), { active });
    } catch (err) {
      console.error('Error toggling staff active:', err);
      throw err;
    }
  };

  // PATIENTS CRUD
  const handleSavePatient = async (patientData: Omit<Patient, 'id'>, id?: string) => {
    if (!clinicId) return;
    try {
      if (id) {
        await updateDoc(doc(db, 'facilities', clinicId, 'patients', id), { ...patientData });
      } else {
        await addDoc(collection(db, 'facilities', clinicId, 'patients'), {
          ...patientData,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error saving patient:', err);
      throw err;
    }
  };

  const handleTogglePatientActive = async (id: string, active: boolean) => {
    if (!clinicId) return;
    try {
      await updateDoc(doc(db, 'facilities', clinicId, 'patients', id), { active });
    } catch (err) {
      console.error('Error toggling patient active:', err);
      throw err;
    }
  };

  const handleRegisterNewPatient = async (patientData: Omit<Patient, 'id'>): Promise<Patient> => {
    if (!clinicId) throw new Error('Clinic not loaded');
    const docRef = await addDoc(collection(db, 'facilities', clinicId, 'patients'), {
      ...patientData,
      createdAt: new Date().toISOString(),
    });
    return {
      ...patientData,
      id: docRef.id,
    };
  };

  // PRACTICE PROFILE SETTINGS (Saves to facilities/{clinicId} in Firestore)
  const handleSaveClinicProfile = async (updated: Partial<ClinicRecord>) => {
    if (!clinicId) return;
    try {
      await updateDoc(doc(db, 'facilities', clinicId), {
        ...updated,
        updatedAt: new Date().toISOString(),
      });

      const updatedClinic = { ...clinicData, ...updated };
      setClinicData(updatedClinic);
      saveCachedClinic(updatedClinic);

      if (updated.name) {
        setClinicName(updated.name);
      }
      if (updated.leadDoctor) {
        setUserName(updated.leadDoctor);
        if (user) {
          await updateDoc(doc(db, 'users', user.uid), {
            name: updated.leadDoctor,
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Error saving clinic profile to Firestore:', err);
      throw err;
    }
  };

  // TRANSACTIONAL APPOINTMENTS SAVE (Conflict / Double-booking prevention across shared facility)
  const handleSaveAppointment = async (
    appointmentPayload: Omit<Appointment, 'id'>, 
    id?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!clinicId) return { success: false, error: 'Clinic context not found.' };

    try {
      await runTransaction(db, async (transaction) => {
        // Query all appointments for the facility to check in-flight conflicts
        const snapshot = await getDocs(collection(db, 'facilities', clinicId, 'appointments'));
        const currentApps: Appointment[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Appointment));

        const slotDate = appointmentPayload.date || (appointmentPayload.startAt ? appointmentPayload.startAt.split('T')[0] : '');
        const slotTime = appointmentPayload.time || (appointmentPayload.startAt ? appointmentPayload.startAt.split('T')[1]?.slice(0, 5) : '');

        if (slotDate && slotTime) {
          const slotDuration = appointmentPayload.duration || 15;
          const slotBuffer = appointmentPayload.buffer || 0;
          const slotStartMin = timeToMinutes(slotTime);
          const slotEndMin = slotStartMin + slotDuration + slotBuffer;

          for (const exist of currentApps) {
            if (id && exist.id === id) continue; // ignore self when editing
            const st = (exist.status || '').trim().toLowerCase();
            if (st === 'cancelled' || st === 'canceled') continue;

            const existDate = exist.date || (exist.startAt ? exist.startAt.split('T')[0] : '');
            if (!existDate || existDate !== slotDate) continue; // different day

            // Same practitioner match
            const existDoc = (exist.staffName || exist.doctorName || '').trim().toLowerCase();
            const newDoc = (appointmentPayload.staffName || appointmentPayload.doctorName || '').trim().toLowerCase();
            const isSamePractitioner = 
              (exist.staffId && appointmentPayload.staffId && exist.staffId === appointmentPayload.staffId) ||
              (existDoc && newDoc && existDoc === newDoc);

            if (!isSamePractitioner) continue;

            const existTime = exist.time || (exist.startAt ? exist.startAt.split('T')[1]?.slice(0, 5) : '');
            if (!existTime) continue;

            const existStartMin = timeToMinutes(existTime);
            const existDuration = exist.duration || 15;
            const existBuffer = exist.buffer || 0;
            const existEndMin = existStartMin + existDuration + existBuffer;

            // Overlap check
            if (slotStartMin < existEndMin && existStartMin < slotEndMin) {
              const bufferNotice = existBuffer > 0 ? ` (including ${existBuffer}m buffer)` : '';
              throw new Error(
                `Double-booking conflict: ${appointmentPayload.staffName || appointmentPayload.doctorName || 'Practitioner'} already has an appointment with ${exist.patientName} from ${existTime} to ${calculateEndTime(existTime, existDuration)}${bufferNotice}.`
              );
            }
          }
        }

        const calculatedEnd = appointmentPayload.endAt || (slotDate && slotTime ? `${slotDate}T${calculateEndTime(slotTime, appointmentPayload.duration || 15)}` : undefined);
        const finalPayload = {
          ...appointmentPayload,
          date: slotDate || appointmentPayload.date,
          time: slotTime || appointmentPayload.time,
          startAt: appointmentPayload.startAt || (slotDate && slotTime ? `${slotDate}T${slotTime}` : undefined),
          endAt: calculatedEnd,
          staffName: appointmentPayload.staffName || appointmentPayload.doctorName,
          doctorName: appointmentPayload.doctorName || appointmentPayload.staffName,
        };

        // Commit write in transaction
        if (id) {
          const appRef = doc(db, 'facilities', clinicId, 'appointments', id);
          transaction.update(appRef, finalPayload);
        } else {
          const newRef = doc(collection(db, 'facilities', clinicId, 'appointments'));
          transaction.set(newRef, finalPayload);
        }
      });

      return { success: true };
    } catch (err: any) {
      const isConflict = err?.message?.includes('Double-booking conflict');
      if (isConflict) {
        console.warn('Double-booking conflict validation prevented saving:', err.message);
      } else {
        console.error('Transactional booking error:', err);
      }
      return { success: false, error: err.message || 'Double-booking conflict prevented saving.' };
    }
  };

  // CANCELLATION (Never delete records, keeps statusHistory audit trail)
  const handleCancelAppointment = async (id: string, reason: string) => {
    if (!clinicId) return;
    try {
      const app = appointments.find(a => a.id === id);
      const nowIso = new Date().toISOString();
      const newEntry: StatusHistoryEntry = {
        status: 'cancelled',
        timestamp: nowIso,
        user: user?.email || 'reception@remidoc.med',
        reason: `Cancellation: ${reason}`,
      };
      const statusHistory = app?.statusHistory ? [...app.statusHistory, newEntry] : [newEntry];

      // Optimistic update for instant UI feedback
      setAppointments(prev => prev.map(a => a.id === id ? {
        ...a,
        status: 'cancelled',
        cancelledAt: nowIso,
        cancelReason: reason,
        updatedAt: nowIso,
        statusHistory,
      } : a));

      await updateDoc(doc(db, 'facilities', clinicId, 'appointments', id), {
        status: 'cancelled',
        cancelledAt: nowIso,
        cancelReason: reason,
        updatedAt: nowIso,
        statusHistory,
      });
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      throw err;
    }
  };

  // QUICK STATUS UPDATE (With status history tracking)
  const handleUpdateStatus = async (id: string, status: AppointmentStatus, customReason?: string) => {
    if (!clinicId) return;
    try {
      const app = appointments.find(a => a.id === id);
      const nowIso = new Date().toISOString();
      const newEntry: StatusHistoryEntry = {
        status,
        timestamp: nowIso,
        user: user?.email || 'reception@remidoc.med',
        reason: customReason || `Status updated to ${status}`,
      };
      const statusHistory = app?.statusHistory ? [...app.statusHistory, newEntry] : [newEntry];

      // Optimistic update for instant UI feedback
      setAppointments(prev => prev.map(a => a.id === id ? {
        ...a,
        status,
        updatedAt: nowIso,
        statusHistory,
      } : a));

      await updateDoc(doc(db, 'facilities', clinicId, 'appointments', id), { 
        status, 
        updatedAt: nowIso, 
        statusHistory 
      });
    } catch (err) {
      console.error('Error updating status:', err);
      throw err;
    }
  };

  const handleUpdateAppointment = async (id: string, updates: Partial<Appointment>) => {
    if (!clinicId) return;
    try {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a));

      await updateDoc(doc(db, 'facilities', clinicId, 'appointments', id), {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error(`[FS] Error at facilities/${clinicId}/appointments/${id}:`, err);
      throw err;
    }
  };

  const handleLoadSampleData = async () => {
    if (!clinicId) return;
    try {
      const activeDoctor = staffList.find(s => s.role === 'doctor')?.name || userName || 'Lead Practitioner';
      const defaultPracticeId = practices[0]?.id || '';
      for (const app of sampleAppointments) {
        const { id, ...rest } = app;
        await setDoc(doc(db, 'facilities', clinicId, 'appointments', id), {
          ...rest,
          practiceId: defaultPracticeId,
          doctorName: activeDoctor,
        });
      }
    } catch (err) {
      console.error('Error loading sample data:', err);
    }
  };

  // Drawer Open Handlers
  const handleOpenBookingDrawer = (params: { date: string; time: string; doctorName?: string; practiceId?: string }) => {
    setDrawerEditingAppointment(null);
    setDrawerInitialParams(params);
    setIsDrawerOpen(true);
  };

  const handleOpenEditDrawer = (appointment: Appointment) => {
    setDrawerEditingAppointment(appointment);
    setDrawerInitialParams(undefined);
    setIsDrawerOpen(true);
  };

  // Clean, explicit logout flow: clears all listeners, state, cached sessions, and signs out
  const handleLogout = async () => {
    try {
      // 1. Explicitly unsubscribe all active Firestore snapshot listeners
      activeListenersRef.current.forEach((unsub) => {
        try {
          unsub();
        } catch (e) {}
      });
      activeListenersRef.current = [];

      // 2. Clear all cached state and session storage
      markExplicitLogout();
      clearCachedSession();
      try {
        localStorage.removeItem('remidoc_facility_session');
        localStorage.removeItem('remidoc_facility_cache');
        localStorage.removeItem('remidoc_auth_session');
        localStorage.removeItem('remidoc_clinic_cache');
        sessionStorage.clear();
      } catch (e) {}

      // 3. Clear all React component states
      setUser(null);
      setClinicId(null);
      setResolutionResult(null);
      setResolutionError(null);
      setPractices([]);
      setAppointments([]);
      setPatients([]);
      setServices([]);
      setStaffList([]);

      // 4. Terminate Firebase Auth session
      await signOut(auth);
    } catch (err) {
      console.error('[FS] Logout error:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  if (authLoading && !initialCached) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#F4F8F7]">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#0F766E]" />
          <p className="text-sm font-semibold text-[#0B2B2A]">Loading Remidoc Facility Reception...</p>
        </div>
      </div>
    );
  }

  if (!user && !initialCached) {
    return <AuthPage />;
  }

  // 1. If Firestore post-login lookup failed with an unexpected error
  if (resolutionError) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-[#F4F8F7] px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden p-8 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0B2B2A]">Firestore Lookup Failed</h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Failed to read user data at path <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono font-semibold">{resolutionError.path}</code>
            </p>
          </div>
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-mono text-left break-words">
            {resolutionError.message}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-3 bg-[#0F766E] hover:bg-[#0d655e] text-white rounded-xl text-sm font-semibold transition-all shadow-md cursor-pointer"
          >
            Log out
          </button>
        </div>
      </div>
    );
  }

  // 2. Requirement 2: After login, if users/{uid} does not exist, show "Finish setting up your facility"
  if (user && resolutionResult?.status === 'no_user_doc') {
    return (
      <FinishFacilitySetup
        userId={user.uid}
        userEmail={user.email || ''}
        defaultDisplayName={resolutionResult.displayName || user.displayName || ''}
        onSuccess={(session) => {
          setClinicId(session.facilityId);
          setClinicData(session.facility);
          setClinicName(session.facility.name);
          setUserName(session.member.displayName);
          setUserRole(session.member.role);
          setResolutionResult({ status: 'success', session });
          saveCachedSession(session);
          saveCachedFacility(session.facility);
        }}
        onLogout={handleLogout}
      />
    );
  }

  // 3. Requirement 3: If users/{uid} exists but the facility document cannot be read, show access denied
  if (user && resolutionResult?.status === 'facility_access_denied') {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-[#F4F8F7] px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden p-8 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-[#0B2B2A] tracking-tight">
              Your account is linked to a facility you can't access
            </h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              You are signed in as <span className="font-semibold text-slate-700">{user.email || 'user'}</span>, but your account does not have permission to access facility <span className="font-mono text-slate-800 font-semibold">{resolutionResult.facilityId}</span>.
            </p>
            <div className="mt-3 bg-slate-100 border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-mono break-all text-left">
              <div><strong>Failing Path:</strong> {resolutionResult.path}</div>
              {resolutionResult.errorCode && <div><strong>Error Code:</strong> {resolutionResult.errorCode}</div>}
            </div>
            {resolutionResult.message && (
              <p className="text-[11px] text-slate-400 mt-2">
                {resolutionResult.message}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-3 bg-[#0F766E] hover:bg-[#0d655e] text-white rounded-xl text-sm font-semibold transition-all shadow-md cursor-pointer"
          >
            Log out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F4F8F7]">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        appointmentCount={appointments.filter((a) => a.status === 'confirmed' || a.status === 'booked' || a.status === 'pending').length}
        patientCount={patients.filter((p) => p.active !== false).length}
        serviceCount={services.filter((s) => s.active !== false).length}
        practiceCount={practices.filter((p) => p.active !== false).length}
        clinicName={clinicName}
        userName={userName}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          activeTab={activeTab}
          onOpenNewAppointment={() => handleOpenBookingDrawer({ 
            date: getGaboroneDateString(), 
            time: '09:00', 
            doctorName: userName,
            practiceId: practices[0]?.id 
          })}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          clinicName={clinicName}
          userName={userName}
          userEmail={user?.email || initialCached?.email || ''}
          userRole={userRole}
          timezone={clinicData.timezone || 'Africa/Gaborone'}
          practices={practices}
          onLogout={handleLogout}
        />

        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {activeTab === 'today' && (
            <TodayView
              clinicId={clinicId || ''}
              appointments={appointments}
              staffList={staffList}
              services={services}
              practices={practices}
              onUpdateStatus={handleUpdateStatus}
              onCancelAppointment={handleCancelAppointment}
              currentUserEmail={user?.email || 'reception@remidoc.med'}
              userRole={userRole}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              appointments={appointments}
              practices={practices}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              appointments={appointments}
              staffList={staffList}
              services={services}
              patients={patients}
              practices={practices}
              onOpenBookingSlot={handleOpenBookingDrawer}
              onOpenEditAppointment={handleOpenEditDrawer}
              onLoadSampleData={handleLoadSampleData}
            />
          )}

          {activeTab === 'patients' && (
            <PatientsView
              patients={patients}
              onSavePatient={handleSavePatient}
              onToggleActive={handleTogglePatientActive}
            />
          )}

          {activeTab === 'practices' && (
            <SettingsView
              initialSubTab="practices"
              practices={practices}
              onSavePractice={handleSavePractice}
              onTogglePracticeActive={handleTogglePracticeActive}
              services={services}
              onSaveService={handleSaveService}
              onToggleServiceActive={handleToggleServiceActive}
              staffList={staffList}
              onSaveStaff={handleSaveStaff}
              onToggleStaffActive={handleToggleStaffActive}
              clinicData={clinicData}
              userName={userName}
              userEmail={user?.email || initialCached?.email || ''}
              onSaveClinicProfile={handleSaveClinicProfile}
              onOpenPracticeWizard={() => setShowPracticeWizard(true)}
              onGoToStaffTab={() => setActiveTab('staff')}
            />
          )}

          {activeTab === 'services' && (
            <SettingsView
              initialSubTab="services"
              practices={practices}
              onSavePractice={handleSavePractice}
              onTogglePracticeActive={handleTogglePracticeActive}
              services={services}
              onSaveService={handleSaveService}
              onToggleServiceActive={handleToggleServiceActive}
              staffList={staffList}
              onSaveStaff={handleSaveStaff}
              onToggleStaffActive={handleToggleStaffActive}
              clinicData={clinicData}
              userName={userName}
              userEmail={user?.email || initialCached?.email || ''}
              onSaveClinicProfile={handleSaveClinicProfile}
              onOpenPracticeWizard={() => setShowPracticeWizard(true)}
              onGoToStaffTab={() => setActiveTab('staff')}
            />
          )}

          {activeTab === 'staff' && (
            <SettingsView
              initialSubTab="staff"
              practices={practices}
              onSavePractice={handleSavePractice}
              onTogglePracticeActive={handleTogglePracticeActive}
              services={services}
              onSaveService={handleSaveService}
              onToggleServiceActive={handleToggleServiceActive}
              staffList={staffList}
              onSaveStaff={handleSaveStaff}
              onToggleStaffActive={handleToggleStaffActive}
              clinicData={clinicData}
              userName={userName}
              userEmail={user?.email || initialCached?.email || ''}
              onSaveClinicProfile={handleSaveClinicProfile}
              onOpenPracticeWizard={() => setShowPracticeWizard(true)}
              onGoToStaffTab={() => setActiveTab('staff')}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              initialSubTab="general"
              practices={practices}
              onSavePractice={handleSavePractice}
              onTogglePracticeActive={handleTogglePracticeActive}
              services={services}
              onSaveService={handleSaveService}
              onToggleServiceActive={handleToggleServiceActive}
              staffList={staffList}
              onSaveStaff={handleSaveStaff}
              onToggleStaffActive={handleToggleStaffActive}
              clinicData={clinicData}
              userName={userName}
              userEmail={user?.email || initialCached?.email || ''}
              onSaveClinicProfile={handleSaveClinicProfile}
              onOpenPracticeWizard={() => setShowPracticeWizard(true)}
              onGoToStaffTab={() => setActiveTab('staff')}
            />
          )}

          {activeTab === 'reminders' && (
            <RemindersView 
              clinicId={clinicId || ''}
              clinicName={clinicName}
              appointments={appointments}
              patients={patients}
              practices={practices}
              staffList={staffList}
              reminderTemplates={clinicData.reminderTemplates}
              currentUserEmail={user?.email || 'reception@remidoc.med'}
              onUpdateAppointment={handleUpdateAppointment}
              onUpdateStatus={handleUpdateStatus}
            />
          )}
        </main>
      </div>

      {/* Unified Multi-Practice Appointment Booking & Editing Drawer */}
      <AppointmentDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        existingAppointment={drawerEditingAppointment}
        initialParams={drawerInitialParams}
        practices={practices}
        patients={patients}
        services={services}
        staffList={staffList}
        existingAppointments={appointments}
        currentUserEmail={user?.email || initialCached?.email || 'desk@remidoc.med'}
        onSaveAppointment={handleSaveAppointment}
        onCancelAppointment={handleCancelAppointment}
        onUpdateStatus={handleUpdateStatus}
        onRegisterNewPatient={handleRegisterNewPatient}
      />

      {/* Patient Registration Modal (from Patients tab) */}
      <PatientModal
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        onSave={(pat) => handleSavePatient(pat)}
        existingPhones={patients.map((p) => p.phoneNumber || p.phone || '')}
      />

      {/* Practice Setup Wizard (Settings > Practices & shown on first login after signup) */}
      <PracticeSetupWizard
        isOpen={showPracticeWizard}
        onClose={() => setShowPracticeWizard(false)}
        clinicId={clinicId || ''}
        clinicName={clinicName}
        existingPracticesCount={practices.length}
        onGoToStaff={() => {
          setShowPracticeWizard(false);
          setActiveTab('staff');
        }}
      />
    </div>
  );
}
