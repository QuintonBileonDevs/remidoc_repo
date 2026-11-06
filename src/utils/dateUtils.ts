import { WeekDays, DaySchedule } from '../types';

export const TIMEZONE = 'Africa/Gaborone';

/**
 * Returns the current date in Africa/Gaborone as YYYY-MM-DD
 */
export function getGaboroneDateString(d: Date = new Date()): string {
  // Format as YYYY-MM-DD in Africa/Gaborone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

/**
 * Returns current hours and minutes in Africa/Gaborone
 */
export function getGaboroneTime(d: Date = new Date()): { hours: number; minutes: number; totalMinutes: number; timeStr: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);

  const hourPart = parts.find((p) => p.type === 'hour')?.value || '0';
  const minPart = parts.find((p) => p.type === 'minute')?.value || '0';

  const hours = parseInt(hourPart, 10);
  const minutes = parseInt(minPart, 10);

  return {
    hours,
    minutes,
    totalMinutes: hours * 60 + minutes,
    timeStr: `${hourPart.padStart(2, '0')}:${minPart.padStart(2, '0')}`,
  };
}

/**
 * Given any reference date, returns an array of 7 dates (Monday through Sunday)
 */
export function getWeekDays(referenceDateStr: string): { dateStr: string; dayKey: WeekDays; dayName: string; dayNumber: number; monthName: string; isToday: boolean }[] {
  // Parse reference date as midnight UTC to avoid local timezone drift
  const [y, m, d] = referenceDateStr.split('-').map(Number);
  const refDate = new Date(Date.UTC(y, m - 1, d));

  // In JS, 0 is Sunday, 1 is Monday ... 6 is Saturday
  const dayOfWeek = refDate.getUTCDay();
  // We want Monday (1) to be day 0 of our week.
  // If Sunday (0), distance from Monday is -6. Otherwise distance is 1 - dayOfWeek.
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(refDate);
  monday.setUTCDate(refDate.getUTCDate() + diffToMonday);

  const weekDayKeys: WeekDays[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const todayStr = getGaboroneDateString();

  const days = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setUTCDate(monday.getUTCDate() + i);

    const year = cur.getUTCFullYear();
    const month = String(cur.getUTCMonth() + 1).padStart(2, '0');
    const day = String(cur.getUTCDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(cur);
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(cur);

    days.push({
      dateStr,
      dayKey: weekDayKeys[i],
      dayName,
      dayNumber: cur.getUTCDate(),
      monthName,
      isToday: dateStr === todayStr,
    });
  }

  return days;
}

/**
 * Generate 15-minute time slots within opening hours
 * Default: 08:00 to 17:00 (or 18:00 to accommodate evening buffers)
 */
export function generateTimeSlots(startHour = 8, endHour = 17): { time: string; minutesFromStart: number }[] {
  const slots = [];
  for (let h = startHour; h < endHour; h++) {
    for (const m of [0, 15, 30, 45]) {
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      slots.push({
        time: timeStr,
        minutesFromStart: (h - startHour) * 60 + m,
      });
    }
  }
  return slots;
}

/**
 * Checks if a specific time is outside a practitioner's scheduled working hours
 */
export function isSlotOutsideWorkingHours(
  timeStr: string,
  schedule?: DaySchedule
): boolean {
  if (!schedule || schedule.isOff) {
    return true; // Whole day off
  }

  const [slotH, slotM] = timeStr.split(':').map(Number);
  const slotMinutes = slotH * 60 + slotM;

  const [startH, startM] = (schedule.start || '08:00').split(':').map(Number);
  const startMinutes = startH * 60 + startM;

  const [endH, endM] = (schedule.end || '17:00').split(':').map(Number);
  const endMinutes = endH * 60 + endM;

  return slotMinutes < startMinutes || slotMinutes >= endMinutes;
}

/**
 * Converts a HH:MM time into minutes since midnight
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

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

