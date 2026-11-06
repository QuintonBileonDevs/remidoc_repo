import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Eye, 
  EyeOff, 
  Clock, 
  User, 
  Calendar as CalendarIcon, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Ban,
  Building2
} from 'lucide-react';
import { Appointment, AppointmentStatus, Staff, Service, Patient, Practice } from '../types';
import { 
  getGaboroneDateString, 
  getGaboroneTime, 
  getWeekDays, 
  generateTimeSlots, 
  isSlotOutsideWorkingHours,
  timeToMinutes
} from '../utils/dateUtils';
import { RemiMascot } from './RemiMascot';
import { getFacilityTypeMeta, FACILITY_TYPE_COLORS } from '../utils/practiceCatalog';

interface CalendarViewProps {
  appointments: Appointment[];
  staffList: Staff[];
  services: Service[];
  patients: Patient[];
  practices: Practice[];
  onOpenBookingSlot: (params: { date: string; time: string; doctorName?: string; practiceId?: string }) => void;
  onOpenEditAppointment: (appointment: Appointment) => void;
  onLoadSampleData?: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  appointments,
  staffList,
  services,
  patients,
  practices,
  onOpenBookingSlot,
  onOpenEditAppointment,
  onLoadSampleData,
}) => {
  // Today in Africa/Gaborone
  const todayGaborone = getGaboroneDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayGaborone);

  // Practice Filter State
  const activePractices = practices.filter((p) => p.active !== false);
  const [selectedPracticeFilter, setSelectedPracticeFilter] = useState<string>('all');

  // View Mode: 'week' or 'day' (defaults to 'day' on small screens < 640px)
  const [viewMode, setViewMode] = useState<'week' | 'day'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return 'day';
    }
    return 'week';
  });

  // Responsive listener
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640 && viewMode === 'week') {
        setViewMode('day');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  // Filter staff by selected practice (or all active staff)
  const activeStaff = staffList.filter((s) => s.active !== false);
  const availableStaff = selectedPracticeFilter === 'all'
    ? activeStaff
    : activeStaff.filter((s) => s.practiceIds?.includes(selectedPracticeFilter));

  const [selectedStaffId, setSelectedStaffId] = useState<string>(availableStaff[0]?.id || activeStaff[0]?.id || '');

  // Keep selectedStaffId valid when practice filter changes
  useEffect(() => {
    if (availableStaff.length > 0) {
      const stillValid = availableStaff.some((s) => s.id === selectedStaffId);
      if (!stillValid) {
        setSelectedStaffId(availableStaff[0].id);
      }
    } else if (activeStaff.length > 0) {
      setSelectedStaffId(activeStaff[0].id);
    }
  }, [selectedPracticeFilter, availableStaff, activeStaff, selectedStaffId]);

  const selectedStaff = availableStaff.find((s) => s.id === selectedStaffId) || activeStaff.find((s) => s.id === selectedStaffId) || activeStaff[0];

  // Cancelled appointments toggle: hidden by default
  const [showCancelled, setShowCancelled] = useState(false);

  // Time slots: 08:00 to 17:00 (15-min increments = 36 slots)
  const timeSlots = generateTimeSlots(8, 17); // 8:00 to 17:00
  const slotHeight = 32; // height in px for 15-minute slot

  // Current Gaborone time tracking for line indicator
  const [currentTime, setCurrentTime] = useState(getGaboroneTime());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getGaboroneTime());
    }, 60000); // update every minute
    return () => clearInterval(timer);
  }, []);

  // Compute week days (Monday - Sunday) for selectedDate
  const weekDays = getWeekDays(selectedDate);

  // Navigation Handlers
  const handleToday = () => {
    setSelectedDate(todayGaborone);
  };

  const handlePrev = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    const step = viewMode === 'week' ? -7 : -1;
    dateObj.setUTCDate(dateObj.getUTCDate() + step);
    setSelectedDate(dateObj.toISOString().split('T')[0]);
  };

  const handleNext = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    const step = viewMode === 'week' ? 7 : 1;
    dateObj.setUTCDate(dateObj.getUTCDate() + step);
    setSelectedDate(dateObj.toISOString().split('T')[0]);
  };

  // Filter Appointments for the selected practitioner
  const practitionerAppointments = appointments.filter((app) => {
    // Practice filter match if not 'all'
    if (selectedPracticeFilter !== 'all') {
      if (app.practiceId) {
        if (app.practiceId !== selectedPracticeFilter) return false;
      } else {
        // Fallback for legacy appointments: check service or staff practice
        const matchSvc = services.find((s) => s.id === app.serviceId || s.name.toLowerCase() === (app.serviceName || app.service || '').toLowerCase());
        const matchStaff = staffList.find((st) => st.id === app.staffId || (st.name && app.doctorName && st.name.toLowerCase() === app.doctorName.toLowerCase()));
        const svcMatches = matchSvc?.practiceId === selectedPracticeFilter;
        const staffMatches = matchStaff?.practiceIds?.includes(selectedPracticeFilter);
        if (!svcMatches && !staffMatches) {
          return false;
        }
      }
    }

    // If practitioner selected, filter by staffId or doctorName
    if (selectedStaff) {
      const matchStaffId = app.staffId && app.staffId === selectedStaff.id;
      const matchStaffName = app.doctorName && selectedStaff.name && app.doctorName.toLowerCase() === selectedStaff.name.toLowerCase();
      if (!matchStaffId && !matchStaffName) {
        return false;
      }
    }
    // Filter cancelled if not toggled on
    if ((app.status || '').trim().toLowerCase() === 'cancelled' && !showCancelled) {
      return false;
    }
    return true;
  });

  // Calculate duration in minutes (if not in appointment, look up service)
  const getAppointmentDuration = (app: Appointment) => {
    if (app.duration && app.duration > 0) return app.duration;
    const matchSvc = services.find((s) => s.id === app.serviceId || s.name.toLowerCase() === (app.serviceName || app.service || '').toLowerCase());
    return matchSvc?.durationMinutes || matchSvc?.duration || 15;
  };

  // Status Color Mapping
  const getStatusColorClasses = (status: AppointmentStatus) => {
    switch (status) {
      case 'booked':
        return 'bg-[#0F766E] text-white border-teal-800 shadow-sm hover:bg-[#0d655e]';
      case 'confirmed':
        return 'bg-emerald-600 text-white border-emerald-700 shadow-sm hover:bg-emerald-700';
      case 'pending':
        return 'bg-amber-500 text-white border-amber-600 shadow-sm hover:bg-amber-600';
      case 'attended':
        return 'bg-blue-600 text-white border-blue-700 shadow-sm hover:bg-blue-700';
      case 'cancelled':
        return 'bg-rose-500 text-white border-rose-600 shadow-sm hover:bg-rose-600 opacity-80';
      case 'noshow':
        return 'bg-slate-500 text-white border-slate-600 shadow-sm hover:bg-slate-600';
    }
  };

  // Click on open slot
  const handleSlotClick = (dateStr: string, timeStr: string) => {
    onOpenBookingSlot({
      date: dateStr,
      time: timeStr,
      doctorName: selectedStaff?.name,
      practiceId: selectedPracticeFilter !== 'all' ? selectedPracticeFilter : activePractices[0]?.id,
    });
  };

  // Visible days depending on viewMode
  const visibleDays = viewMode === 'week' 
    ? weekDays 
    : weekDays.filter((w) => w.dateStr === selectedDate).length > 0
      ? weekDays.filter((w) => w.dateStr === selectedDate)
      : [
          {
            dateStr: selectedDate,
            dayKey: 'monday' as const,
            dayName: new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(new Date(selectedDate)),
            dayNumber: parseInt(selectedDate.split('-')[2], 10),
            monthName: new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(new Date(selectedDate)),
            isToday: selectedDate === todayGaborone,
          }
        ];

  // Header range title
  const dateRangeTitle = viewMode === 'week'
    ? `${weekDays[0].dayNumber} ${weekDays[0].monthName} – ${weekDays[6].dayNumber} ${weekDays[6].monthName} ${selectedDate.split('-')[0]}`
    : `${visibleDays[0]?.dayName}, ${visibleDays[0]?.dayNumber} ${visibleDays[0]?.monthName} ${selectedDate.split('-')[0]}`;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F4F8F7] overflow-hidden">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0 shadow-xs">
        
        {/* Left: Practice Selector & Practitioner Selector & Date Range */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Practice Filter Dropdown (Color-coded with 'All practices' default) */}
          <div className="flex items-center gap-1.5 bg-[#F4F8F7] px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                selectedPracticeFilter === 'all'
                  ? 'bg-[#0F766E]'
                  : (FACILITY_TYPE_COLORS[practices.find(p => p.id === selectedPracticeFilter)?.facilityType || 'other']?.dot || 'bg-[#0F766E]')
              }`}
            />
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">Practice:</span>
            <select
              value={selectedPracticeFilter}
              onChange={(e) => setSelectedPracticeFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#0B2B2A] focus:outline-none cursor-pointer pr-1"
            >
              <option value="all">All practices ({practices.length})</option>
              {practices.map((p) => {
                const meta = getFacilityTypeMeta(p.facilityType);
                return (
                  <option key={p.id} value={p.id}>
                    {p.name} ({meta.label}) {p.active === false ? '(Inactive)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Quick Color-coded Practice Chips */}
          {practices.length > 1 && (
            <div className="hidden xl:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSelectedPracticeFilter('all')}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedPracticeFilter === 'all'
                    ? 'bg-white text-[#0F766E] shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#0F766E]"></span>
                <span>All Practices</span>
              </button>
              {practices.filter(p => p.active !== false).map((p) => {
                const color = FACILITY_TYPE_COLORS[p.facilityType] || FACILITY_TYPE_COLORS.other;
                const isSelected = selectedPracticeFilter === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPracticeFilter(p.id)}
                    className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? `bg-white ${color.text} shadow-2xs font-extrabold`
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${color.dot}`}></span>
                    <span className="truncate max-w-[110px]">{p.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Practitioner Dropdown (Only staff assigned to selected practice) */}
          <div className="flex items-center gap-1.5 bg-[#F4F8F7] px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
            <User className="w-3.5 h-3.5 text-[#0F766E]" />
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">Practitioner:</span>
            <select
              value={selectedStaff?.id || ''}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#0B2B2A] focus:outline-none cursor-pointer pr-1"
            >
              {availableStaff.length === 0 ? (
                <option value="" disabled>No staff assigned to this practice</option>
              ) : (
                availableStaff.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} ({staff.role})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={handlePrev}
              title="Previous"
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-bold text-[#0B2B2A] hover:bg-white rounded-lg transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              title="Next"
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Current Date Range Display */}
          <div className="text-sm font-extrabold text-[#0B2B2A] tracking-tight">
            {dateRangeTitle}
          </div>
        </div>

        {/* Right: View Mode Toggle & Show Cancelled Switch */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Cancelled Toggle */}
          <button
            onClick={() => setShowCancelled(!showCancelled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              showCancelled
                ? 'bg-rose-50 text-rose-700 border-rose-300'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {showCancelled ? <Eye className="w-3.5 h-3.5 text-rose-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
            <span>Show Cancelled</span>
          </button>

          {/* View Mode: Week / Day */}
          <div className="flex bg-[#F4F8F7] p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'day'
                  ? 'bg-white text-[#0B2B2A] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-white text-[#0B2B2A] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Week
            </button>
          </div>

          {/* Quick Book Button */}
          <button
            onClick={() => onOpenBookingSlot({ 
              date: selectedDate, 
              time: '09:00', 
              doctorName: selectedStaff?.name,
              practiceId: selectedPracticeFilter !== 'all' ? selectedPracticeFilter : activePractices[0]?.id 
            })}
            className="flex items-center gap-1.5 bg-[#0F766E] hover:bg-[#0d655e] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Book Slot</span>
          </button>
        </div>
      </div>

      {/* Main Calendar Grid Canvas */}
      <div className="flex-1 overflow-auto flex flex-col bg-white select-none">
        {/* Days Header Row */}
        <div className="flex border-b border-slate-200 sticky top-0 bg-white z-20 shadow-2xs">
          {/* Time gutter spacer */}
          <div className="w-16 sm:w-20 shrink-0 border-r border-slate-200 bg-slate-50/70 p-2 text-center text-[10px] font-bold text-slate-400 uppercase">
            Time
          </div>

          {/* Day Columns Header */}
          <div className="flex-1 grid grid-flow-col auto-cols-fr divide-x divide-slate-200">
            {visibleDays.map((day) => {
              const daySchedule = selectedStaff?.workingHours?.[day.dayKey];
              const isDayOff = daySchedule?.isOff;

              return (
                <div
                  key={day.dateStr}
                  onClick={() => setSelectedDate(day.dateStr)}
                  className={`py-3 px-2 text-center transition-colors cursor-pointer ${
                    day.isToday ? 'bg-teal-50/60' : isDayOff ? 'bg-slate-50/60' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {day.dayName}
                  </div>
                  <div
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-extrabold mt-0.5 ${
                      day.isToday
                        ? 'bg-[#0F766E] text-white shadow-xs'
                        : 'text-[#0B2B2A]'
                    }`}
                  >
                    {day.dayNumber}
                  </div>
                  {isDayOff && (
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      Day Off
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Time Grid Canvas with 15-Minute increments */}
        <div className="flex-1 flex relative min-h-[1152px]">
          {/* Time Column Labels */}
          <div className="w-16 sm:w-20 shrink-0 border-r border-slate-200 bg-slate-50/40 text-[11px] font-semibold text-slate-400 select-none">
            {timeSlots.map((slot) => {
              const isHourStart = slot.time.endsWith(':00');
              const isHalfHour = slot.time.endsWith(':30');

              return (
                <div
                  key={slot.time}
                  style={{ height: `${slotHeight}px` }}
                  className={`relative px-2 flex items-start justify-end ${
                    isHourStart ? 'font-bold text-slate-600 border-t border-slate-200' : isHalfHour ? 'border-t border-slate-100 text-[10px]' : ''
                  }`}
                >
                  {isHourStart && (
                    <span className="-mt-2.5 bg-slate-50/80 px-1 rounded">{slot.time}</span>
                  )}
                  {isHalfHour && (
                    <span className="-mt-2 text-slate-400">{slot.time}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Columns for Visible Days */}
          <div className="flex-1 grid grid-flow-col auto-cols-fr divide-x divide-slate-200 relative">
            {visibleDays.map((day) => {
              const daySchedule = selectedStaff?.workingHours?.[day.dayKey];
              const isDayOff = daySchedule?.isOff;

              // Filter appointments on this specific day
              const dayAppointments = practitionerAppointments.filter(
                (a) => (a.date || a.startAt?.split('T')[0]) === day.dateStr
              );

              return (
                <div
                  key={day.dateStr}
                  className={`relative flex flex-col ${isDayOff ? 'bg-slate-100/50' : 'bg-white'}`}
                >
                  {/* Slots background grid */}
                  {timeSlots.map((slot) => {
                    const isOutside = isSlotOutsideWorkingHours(slot.time, daySchedule);
                    const isHour = slot.time.endsWith(':00');

                    return (
                      <div
                        key={slot.time}
                        style={{ height: `${slotHeight}px` }}
                        onClick={() => !isOutside && handleSlotClick(day.dateStr, slot.time)}
                        className={`group relative transition-colors ${
                          isHour ? 'border-t border-slate-200' : 'border-t border-slate-100'
                        } ${
                          isOutside
                            ? 'bg-slate-100/70 cursor-not-allowed opacity-75'
                            : 'hover:bg-teal-50/40 cursor-pointer'
                        }`}
                      >
                        {/* Hover hint for empty slot */}
                        {!isOutside && (
                          <div className="opacity-0 group-hover:opacity-100 absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#0F766E] pointer-events-none">
                            + Book {slot.time}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Red/Teal Current Time Indicator Line (if today) */}
                  {day.isToday && (
                    (() => {
                      const startMinutes = 8 * 60; // 08:00
                      const endMinutes = 17 * 60;  // 17:00
                      const curMin = currentTime.totalMinutes;

                      if (curMin >= startMinutes && curMin <= endMinutes) {
                        const topPx = ((curMin - startMinutes) / 15) * slotHeight;
                        return (
                          <div
                            style={{ top: `${topPx}px` }}
                            className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
                          >
                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs -ml-1.5" />
                            <div className="h-0.5 bg-rose-500 w-full" />
                            <span className="absolute right-1 text-[9px] font-extrabold bg-rose-500 text-white px-1.5 py-0.5 rounded shadow-2xs">
                              {currentTime.timeStr}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()
                  )}

                  {/* Render Appointment Blocks */}
                  {dayAppointments.map((app) => {
                    const appTime = app.time || (app.startAt ? app.startAt.split('T')[1]?.slice(0, 5) : '08:00');
                    const appMin = timeToMinutes(appTime);
                    const startMin = 8 * 60; // 08:00
                    const duration = getAppointmentDuration(app);

                    // Slot position and duration height
                    const slotIndex = Math.max(0, (appMin - startMin) / 15);
                    const topPx = slotIndex * slotHeight;
                    const heightPx = Math.max(slotHeight - 2, (duration / 15) * slotHeight - 2);

                    const colorClasses = getStatusColorClasses(app.status);
                    const appPractice = practices.find((p) => p.id === app.practiceId);

                    return (
                      <div
                        key={app.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenEditAppointment(app);
                        }}
                        style={{
                          top: `${topPx + 1}px`,
                          height: `${heightPx}px`,
                        }}
                        className={`absolute left-1 right-1 rounded-xl p-2 border overflow-hidden cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md z-10 flex flex-col justify-between ${colorClasses}`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-extrabold text-xs truncate leading-tight">
                              {app.patientName}
                            </span>
                            <span className="text-[10px] font-bold opacity-90 shrink-0">
                              {appTime}
                            </span>
                          </div>

                          <div className="text-[11px] font-medium opacity-90 truncate flex items-center gap-1.5">
                            {appPractice && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-black/20 rounded truncate max-w-[80px]">
                                {appPractice.name}
                              </span>
                            )}
                            <span className="truncate">{app.serviceName || app.service}</span>
                          </div>
                        </div>

                        {heightPx >= 45 && (
                          <div className="flex items-center justify-between text-[10px] opacity-80 pt-0.5 border-t border-white/20">
                            <span>{duration} min</span>
                            <span className="capitalize">{app.status}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Status Legend */}
      <div className="bg-white border-t border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-600 shrink-0">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-[11px] uppercase tracking-wider text-slate-400">Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-[#0F766E] inline-block" />
            <span>Booked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-600 inline-block" />
            <span>Confirmed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-blue-600 inline-block" />
            <span>Attended</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-500 inline-block" />
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-slate-500 inline-block" />
            <span>No-Show</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-500 inline-block" />
            <span>Cancelled</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="w-3 h-3 rounded-md bg-slate-200 inline-block" />
            <span>Outside Hours</span>
          </div>
        </div>

        <div className="text-[11px] text-teal-700 font-medium">
          “Every patient, on time.”
        </div>
      </div>
    </div>
  );
};
