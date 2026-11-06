import { Appointment, Patient, Service, Staff, ReminderLog, ClinicSettings } from './types';

export const initialPatients: Patient[] = [
  {
    id: 'p1',
    fullName: 'Eleanor Vance',
    phoneNumber: '+26771234567',
    whatsappConsent: true,
    whatsappConsentDate: '2026-09-10T08:30:00.000Z',
    active: true,
  },
  {
    id: 'p2',
    fullName: 'Marcus Chen',
    phoneNumber: '+26772345678',
    whatsappConsent: true,
    whatsappConsentDate: '2026-10-02T10:15:00.000Z',
    active: true,
  },
  {
    id: 'p3',
    fullName: 'Sophia Rodriguez',
    phoneNumber: '+26773456789',
    whatsappConsent: false,
    whatsappConsentDate: null,
    active: true,
  },
  {
    id: 'p4',
    fullName: 'Liam O’Connor',
    phoneNumber: '+26774567890',
    whatsappConsent: true,
    whatsappConsentDate: '2026-10-10T14:00:00.000Z',
    active: true,
  }
];

export const defaultServices: Omit<Service, 'id'>[] = [
  {
    name: 'General consultation',
    duration: 20,
    buffer: 0,
    active: true,
  },
  {
    name: 'Follow-up',
    duration: 15,
    buffer: 0,
    active: true,
  },
  {
    name: 'Vaccination',
    duration: 10,
    buffer: 0,
    active: true,
  },
];

export const defaultStaffList: Omit<Staff, 'id'>[] = [
  {
    name: 'Dr. Sarah Jenkins',
    role: 'doctor',
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
  },
  {
    name: 'Nurse Amantle Dube',
    role: 'nurse',
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
  }
];

const today = new Date();
const formatDateStr = (d: Date) => d.toISOString().split('T')[0];
const todayStr = formatDateStr(today);

const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const tomorrowStr = formatDateStr(tomorrow);

const nextWeek = new Date(today);
nextWeek.setDate(today.getDate() + 3);
const nextWeekStr = formatDateStr(nextWeek);

export const sampleAppointments: Appointment[] = [
  {
    id: 'a1',
    patientId: 'p1',
    patientName: 'Eleanor Vance',
    patientPhone: '+26771234567',
    doctorName: 'Dr. Sarah Jenkins',
    service: 'General consultation',
    date: todayStr,
    time: '09:30',
    status: 'confirmed',
    notes: 'Morning consultation session.',
    reminderSent: true
  },
  {
    id: 'a2',
    patientId: 'p2',
    patientName: 'Marcus Chen',
    patientPhone: '+26772345678',
    doctorName: 'Dr. Sarah Jenkins',
    service: 'Vaccination',
    date: todayStr,
    time: '11:00',
    status: 'pending',
    notes: 'Scheduled vaccination slot.',
    reminderSent: false
  },
  {
    id: 'a3',
    patientId: 'p3',
    patientName: 'Sophia Rodriguez',
    patientPhone: '+26773456789',
    doctorName: 'Dr. Sarah Jenkins',
    service: 'Follow-up',
    date: tomorrowStr,
    time: '14:15',
    status: 'confirmed',
    notes: 'Routine follow-up consultation.',
    reminderSent: true
  },
  {
    id: 'a4',
    patientId: 'p4',
    patientName: 'Liam O’Connor',
    patientPhone: '+26774567890',
    doctorName: 'Dr. Sarah Jenkins',
    service: 'General consultation',
    date: nextWeekStr,
    time: '10:00',
    status: 'confirmed',
    notes: 'In-clinic consultation.',
    reminderSent: false
  }
];

export const initialReminders: ReminderLog[] = [
  {
    id: 'r1',
    patientName: 'Eleanor Vance',
    channel: 'WhatsApp',
    sentTime: 'Today at 08:00 AM',
    status: 'delivered',
    content: 'Hi Eleanor, reminder for your appointment with Dr. Jenkins today at 09:30 AM at St. Jude Family Practice.'
  },
  {
    id: 'r2',
    patientName: 'Sophia Rodriguez',
    channel: 'SMS',
    sentTime: 'Yesterday at 04:30 PM',
    status: 'delivered',
    content: 'St. Jude Practice: Reminder for Dr. Ross consultation tomorrow at 2:15 PM. Reply C to confirm.'
  },
  {
    id: 'r3',
    patientName: 'Marcus Chen',
    channel: 'Email',
    sentTime: 'Yesterday at 02:00 PM',
    status: 'pending',
    content: 'Subject: Appointment Confirmation - Remidoc Clinic. Your wellness exam is scheduled for today at 11:00 AM.'
  }
];

export const initialSettings: ClinicSettings = {
  clinicName: 'St. Jude Family Practice',
  tagline: 'Every patient, on time.',
  doctorName: 'Dr. Sarah Jenkins',
  specialty: 'General Practice',
  email: 'contact@stjudefamilypractice.med',
  phone: '+267 390 1234',
  address: 'Plot 54320, CBD Tower, Gaborone, Botswana',
  workingHours: 'Mon-Fri 08:00-17:00, Sat 08:00-13:00',
  autoReminders: true,
  reminderTiming: '24 hours before appointment'
};
