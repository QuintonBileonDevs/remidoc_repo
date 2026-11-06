export type AppointmentStatus = 'booked' | 'confirmed' | 'pending' | 'attended' | 'cancelled' | 'noShow' | 'noshow';

export interface StatusHistoryEntry {
  status: AppointmentStatus;
  changedAt?: string;
  timestamp?: string;
  changedBy?: string;
  user?: string;
  reason?: string;
}

export type FacilityType = 
  | 'general_practice'
  | 'specialist'
  | 'dental'
  | 'diagnostic_screening'
  | 'community_health'
  | 'physiotherapy'
  | 'optometry'
  | 'pediatrics'
  | 'mental_health'
  | 'pharmacy_lab'
  | 'dietetics'
  | 'other';

export interface FacilityTypeMeta {
  key: FacilityType;
  label: string;
  iconName: string;
  description: string;
}

export interface UserProfile {
  uid: string;
  facilityId: string;
  displayName: string;
  email: string;
  createdAt: string;
}

export interface Facility {
  id: string;
  name: string;
  timezone: string;
  openingHours: string;
  ownerUid?: string;
  setupCompleted?: boolean;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  leadDoctor?: string;
  phone?: string;
  address?: string;
  specialty?: string;
  autoReminders?: boolean;
  facilityTypes?: FacilityType[];
  reminderTemplates?: { en?: string; tn?: string };
}

export type ClinicRecord = Facility;

export type MemberRole = 'owner' | 'admin' | 'receptionist' | 'practitioner';

export interface FacilityMember {
  userId: string;
  displayName: string;
  email: string;
  role: MemberRole;
  createdAt: string;
}

export interface Practice {
  id: string;
  name: string;
  facilityType: FacilityType;
  active: boolean;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
}

export interface CatalogServiceItem {
  key: string;
  facilityType: FacilityType;
  name: string;
  durationMinutes: number;
  bufferMinutes: number;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  practiceId?: string;
  practiceName?: string;
  serviceId?: string;
  serviceName?: string;
  service?: string;
  staffId?: string;
  staffName?: string;
  doctorName?: string;
  startAt?: string;
  endAt?: string;
  date?: string;
  time?: string;
  duration?: number;
  buffer?: number;
  status: AppointmentStatus;
  source?: 'desk' | string;
  notes?: string;
  statusHistory?: StatusHistoryEntry[];
  reminderSentAt?: string | null;
  reminderSentBy?: string | null;
  reminderCount?: number;
  reminderSent?: boolean;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  cancelledAt?: string | null;
  cancelReason?: string | null;
}

export interface Patient {
  id: string;
  fullName: string;
  phone?: string;
  phoneNumber?: string;
  whatsappConsent: boolean;
  whatsappConsentAt?: string | null;
  whatsappConsentDate?: string | null;
  active: boolean;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
}

export interface Service {
  id: string;
  practiceId?: string;
  name: string;
  durationMinutes?: number;
  bufferMinutes?: number;
  duration?: number;
  buffer?: number;
  isCustom?: boolean;
  catalogKey?: string | null;
  active: boolean;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
}

export type StaffRole = 'doctor' | 'nurse' | 'other';

export interface DaySchedule {
  start: string;
  end: string;
  isOff: boolean;
}

export type WeekDays = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  practiceIds?: string[];
  weeklyHours?: Record<WeekDays, DaySchedule>;
  workingHours?: Record<WeekDays, DaySchedule>;
  active: boolean;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
}

export interface ReminderLog {
  id: string;
  patientName: string;
  channel: 'SMS' | 'WhatsApp' | 'Email';
  sentTime: string;
  status: 'delivered' | 'pending' | 'failed';
  content: string;
}

export interface ClinicSettings {
  clinicName: string;
  tagline: string;
  doctorName: string;
  specialty: string;
  email: string;
  phone: string;
  address: string;
  workingHours: string;
  autoReminders: boolean;
  reminderTiming: string;
}
