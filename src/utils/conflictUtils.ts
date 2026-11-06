import { Appointment, Staff, Service, WeekDays } from '../types';
import { getGaboroneDateString, getGaboroneTime, timeToMinutes } from './dateUtils';

/**
 * Calculates end time in HH:MM given start time and duration in minutes
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const totalMin = (h || 0) * 60 + (m || 0) + durationMinutes;
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  isPast?: boolean;
  isOutsideHours?: boolean;
  conflictingAppointment?: Appointment;
  message?: string;
}

/**
 * Checks if a proposed appointment time conflicts with:
 * 1. An existing non-cancelled appointment for the same practitioner (including buffer minutes)
 * 2. Practitioner working hours
 * 3. The past (unless admin override is granted)
 */
export function checkAppointmentConflict(params: {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  duration: number; // minutes
  buffer: number; // minutes
  practitioner: Staff;
  existingAppointments: Appointment[];
  excludeAppointmentId?: string;
  adminOverridePast?: boolean;
}): ConflictCheckResult {
  const {
    date,
    startTime,
    duration,
    buffer,
    practitioner,
    existingAppointments,
    excludeAppointmentId,
    adminOverridePast = false,
  } = params;

  // 1. Check if booking is in the past (using Africa/Gaborone time)
  const todayGaborone = getGaboroneDateString();
  const currentGaboroneTime = getGaboroneTime();

  if (date < todayGaborone) {
    if (!adminOverridePast) {
      return {
        hasConflict: true,
        isPast: true,
        message: 'This date is in the past. Enable Admin Override to record historical appointments.',
      };
    }
  } else if (date === todayGaborone) {
    const slotMin = timeToMinutes(startTime);
    if (slotMin < currentGaboroneTime.totalMinutes && !adminOverridePast) {
      return {
        hasConflict: true,
        isPast: true,
        message: 'This time slot has already passed today. Enable Admin Override to record this appointment.',
      };
    }
  }

  // 2. Check Practitioner Working Hours
  const [y, m, d] = date.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  const weekDayKeys: WeekDays[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayKey = weekDayKeys[dateObj.getUTCDay()];

  const daySchedule = practitioner.workingHours?.[dayKey];
  if (!daySchedule || daySchedule.isOff) {
    return {
      hasConflict: true,
      isOutsideHours: true,
      message: `${practitioner.name} is scheduled as Day Off on ${dayKey.toUpperCase()}s.`,
    };
  }

  const slotStartMin = timeToMinutes(startTime);
  const slotEndMin = slotStartMin + duration;
  const schedStartMin = timeToMinutes(daySchedule.start || '08:00');
  const schedEndMin = timeToMinutes(daySchedule.end || '17:00');

  if (slotStartMin < schedStartMin || slotEndMin > schedEndMin) {
    return {
      hasConflict: true,
      isOutsideHours: true,
      message: `Outside working hours: ${practitioner.name} is scheduled from ${daySchedule.start} to ${daySchedule.end} on this day.`,
    };
  }

  // 3. Check Overlapping Appointments (including service buffer minutes)
  // New appointment occupied block: [newStart, newStart + duration + buffer]
  const newOccupiedStart = slotStartMin;
  const newOccupiedEnd = slotStartMin + duration + (buffer || 0);

  for (const app of existingAppointments) {
    // Skip if same appointment (when editing/rescheduling)
    if (excludeAppointmentId && app.id === excludeAppointmentId) {
      continue;
    }

    // Skip cancelled appointments
    const st = (app.status || '').trim().toLowerCase();
    if (st === 'cancelled' || st === 'canceled') {
      continue;
    }

    // Must be same date
    const appDate = app.date || (app.startAt ? app.startAt.split('T')[0] : '');
    if (!appDate || appDate !== date) {
      continue;
    }

    // Must be same practitioner (compare staffId or doctorName/staffName)
    const appDoc = (app.staffName || app.doctorName || '').trim().toLowerCase();
    const practDoc = (practitioner.name || '').trim().toLowerCase();
    const isSamePractitioner =
      (app.staffId && practitioner.id && app.staffId === practitioner.id) ||
      (appDoc && practDoc && appDoc === practDoc);

    if (!isSamePractitioner) {
      continue;
    }

    // Existing appointment occupied block
    const appTime = app.time || (app.startAt ? app.startAt.split('T')[1]?.slice(0, 5) : '');
    if (!appTime) continue;
    const appStartMin = timeToMinutes(appTime);
    const appDuration = app.duration || 15;
    const appBuffer = app.buffer || 0;
    const appOccupiedEnd = appStartMin + appDuration + appBuffer;

    // Overlap condition: startA < endB && startB < endA
    if (newOccupiedStart < appOccupiedEnd && appStartMin < newOccupiedEnd) {
      const bufferNotice = appBuffer > 0 ? ` (includes ${appBuffer} min prep buffer)` : '';
      return {
        hasConflict: true,
        conflictingAppointment: app,
        message: `Conflict: ${practitioner.name} already has an appointment with ${app.patientName} (${appTime} – ${calculateEndTime(appTime, appDuration)})${bufferNotice}.`,
      };
    }
  }

  return { hasConflict: false };
}
