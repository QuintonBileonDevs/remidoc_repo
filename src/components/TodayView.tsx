import React, { useState, useMemo } from 'react';
import { 
  Appointment, 
  Staff, 
  Service, 
  Practice, 
  AppointmentStatus, 
  StatusHistoryEntry 
} from '../types';
import { NavigationTab } from './Sidebar';
import { getGaboroneDateString, getGaboroneTime, timeToMinutes, calculateEndTime } from '../utils/dateUtils';
import { RemiMascot } from './RemiMascot';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Phone, 
  MessageSquare, 
  ChevronRight, 
  RotateCcw, 
  Ban, 
  UserCheck, 
  UserX, 
  ShieldAlert, 
  TrendingUp, 
  Building2,
  Eye,
  EyeOff,
  Sparkles,
  BarChart3,
  ExternalLink
} from 'lucide-react';

interface TodayViewProps {
  clinicId: string;
  appointments: Appointment[];
  staffList: Staff[];
  services: Service[];
  practices: Practice[];
  onUpdateStatus: (id: string, status: AppointmentStatus, reason?: string) => Promise<void>;
  onCancelAppointment: (id: string, reason: string) => Promise<void>;
  currentUserEmail: string;
  userRole?: string;
  setActiveTab: (tab: NavigationTab) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  clinicId,
  appointments,
  staffList,
  services,
  practices,
  onUpdateStatus,
  onCancelAppointment,
  currentUserEmail,
  userRole = 'staff',
  setActiveTab,
}) => {
  const todayStr = getGaboroneDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedPracticeFilter, setSelectedPracticeFilter] = useState<string>('all');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('all');
  const [showCancelled, setShowCancelled] = useState<boolean>(false);

  // Selected appointment for action bottom sheet
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [cancelReasonType, setCancelReasonType] = useState<'patient request' | 'clinic request' | 'other'>('patient request');
  const [cancelNote, setCancelNote] = useState<string>('');
  const [isCancellingFlow, setIsCancellingFlow] = useState<boolean>(false);

  // Override timing restriction state for owners/admins
  const [isOverrideEnabled, setIsOverrideEnabled] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>('');

  // Patient contact modal state
  const [contactPatient, setContactPatient] = useState<{ name: string; phone?: string } | null>(null);

  const isAdminOrOwner = userRole === 'owner' || userRole === 'admin';

  // Time navigation helpers (Yesterday, Today, Tomorrow)
  const handleSetDayOffset = (offset: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d + offset));
    setSelectedDate(dateObj.toISOString().split('T')[0]);
  };

  // Format date header nicely
  const formattedDateTitle = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    return new Intl.DateTimeFormat('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'Africa/Gaborone'
    }).format(dateObj);
  }, [selectedDate]);

  // Active practices & staff
  const activePractices = useMemo(() => practices.filter(p => p.active !== false), [practices]);
  const availableStaff = useMemo(() => {
    if (selectedPracticeFilter === 'all') return staffList.filter(s => s.active !== false);
    return staffList.filter(s => s.active !== false && s.practiceIds?.includes(selectedPracticeFilter));
  }, [staffList, selectedPracticeFilter]);

  // Filter appointments for selected day
  const dayAppointments = useMemo(() => {
    return appointments.filter(app => {
      const appDate = app.date || (app.startAt ? app.startAt.split('T')[0] : '');
      if (appDate !== selectedDate) return false;

      // Practice filter
      if (selectedPracticeFilter !== 'all') {
        if (app.practiceId && app.practiceId !== selectedPracticeFilter) return false;
      }

      // Practitioner filter
      if (selectedStaffFilter !== 'all') {
        const matchId = app.staffId === selectedStaffFilter;
        const matchName = staffList.find(s => s.id === selectedStaffFilter)?.name?.toLowerCase() === (app.doctorName || app.staffName || '').toLowerCase();
        if (!matchId && !matchName) return false;
      }

      // Cancelled filter
      const statusLower = (app.status || '').trim().toLowerCase();
      if (statusLower === 'cancelled' && !showCancelled) return false;

      return true;
    }).sort((a, b) => {
      const timeA = a.time || (a.startAt ? a.startAt.split('T')[1]?.slice(0, 5) : '08:00');
      const timeB = b.time || (b.startAt ? b.startAt.split('T')[1]?.slice(0, 5) : '08:00');
      return timeToMinutes(timeA) - timeToMinutes(timeB);
    });
  }, [appointments, selectedDate, selectedPracticeFilter, selectedStaffFilter, showCancelled, staffList]);

  // Current Gaborone time in minutes
  const currentTimeObj = getGaboroneTime();
  const isTodaySelected = selectedDate === todayStr;

  // Timing check helpers
  const getAppointmentTimingStatus = (app: Appointment) => {
    const appTime = app.time || (app.startAt ? app.startAt.split('T')[1]?.slice(0, 5) : '08:00');
    const appMin = timeToMinutes(appTime);

    const [y, m, d] = selectedDate.split('-').map(Number);
    const appDateObj = new Date(Date.UTC(y, m - 1, d));
    const todayDateObj = new Date(todayStr);

    if (appDateObj > todayDateObj) {
      // Future date
      return {
        isAttendedAllowed: false,
        attendedReason: 'Available 30 min before the appointment',
        isNoShowAllowed: false,
        noShowReason: 'Available once the appointment time has passed',
      };
    }

    if (appDateObj < todayDateObj) {
      // Past date
      return {
        isAttendedAllowed: true,
        attendedReason: '',
        isNoShowAllowed: true,
        noShowReason: '',
      };
    }

    // Today
    const curMin = currentTimeObj.totalMinutes;
    const attendedAllowedMin = appMin - 30; // 30 min before startAt

    const isAttendedAllowed = curMin >= attendedAllowedMin;
    const isNoShowAllowed = curMin >= appMin;

    return {
      isAttendedAllowed,
      attendedReason: 'Available 30 min before the appointment',
      isNoShowAllowed,
      noShowReason: 'Available once the appointment time has passed',
    };
  };

  // Summary strip statistics for selected day
  const stats = useMemo(() => {
    let total = dayAppointments.length;
    let confirmed = 0;
    let attended = 0;
    let noShow = 0;
    let remaining = 0;
    let cancelled = 0;

    for (const app of dayAppointments) {
      const st = (app.status || '').trim().toLowerCase();
      if (st === 'confirmed') confirmed++;
      else if (st === 'attended') attended++;
      else if (st === 'noshow' || st === 'no_show') noShow++;
      else if (st === 'cancelled') cancelled++;
      else remaining++; // booked / pending
    }

    return { total: total - (showCancelled ? 0 : cancelled), confirmed, attended, noShow, remaining };
  }, [dayAppointments, showCancelled]);

  // Group by practice
  const groupedByPractice = useMemo(() => {
    const map: { [practiceId: string]: { practice: Practice | undefined; apps: Appointment[] } } = {};
    
    for (const app of dayAppointments) {
      const pId = app.practiceId || 'general';
      if (!map[pId]) {
        const prac = practices.find(p => p.id === pId);
        map[pId] = { practice: prac, apps: [] };
      }
      map[pId].apps.push(app);
    }
    return Object.values(map);
  }, [dayAppointments, practices]);

  // Identify next upcoming appointment and past un-updated appointments ("Needs update")
  const { nextUpcomingId, needsUpdateIds } = useMemo(() => {
    const nextIds = new Set<string>();
    const updateIds = new Set<string>();
    if (!isTodaySelected) return { nextUpcomingId: null, needsUpdateIds: updateIds };

    const curMin = currentTimeObj.totalMinutes;
    let foundNext = false;

    for (const app of dayAppointments) {
      const st = (app.status || '').trim().toLowerCase();
      if (st === 'cancelled' || st === 'attended' || st === 'noshow') continue;

      const timeStr = app.time || (app.startAt ? app.startAt.split('T')[1]?.slice(0, 5) : '08:00');
      const startMin = timeToMinutes(timeStr);

      if (curMin > startMin && (st === 'booked' || st === 'pending' || st === 'confirmed')) {
        updateIds.add(app.id);
      }

      if (!foundNext && startMin >= curMin) {
        nextIds.add(app.id);
        foundNext = true;
      }
    }

    const firstNext = Array.from(nextIds)[0] || null;
    return { nextUpcomingId: firstNext, needsUpdateIds: updateIds };
  }, [dayAppointments, isTodaySelected, currentTimeObj]);

  // 30-Day Compact Summary for Bottom Strip linking to Reports
  const thirtyDaySummary = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const recentApps = appointments.filter(a => {
      const d = a.date || (a.startAt ? a.startAt.split('T')[0] : '');
      return d >= thirtyDaysAgo && d <= todayStr;
    });

    let total = 0;
    let attended = 0;
    let noShow = 0;

    for (const app of recentApps) {
      const st = (app.status || '').trim().toLowerCase();
      if (st === 'cancelled') continue;
      total++;
      if (st === 'attended') attended++;
      if (st === 'noshow' || st === 'no_show') noShow++;
    }

    const denom = attended + noShow;
    const noShowRate = denom > 0 ? `${Math.round((noShow / denom) * 100)}%` : 'n/a';

    return { total, attended, noShow, noShowRate };
  }, [appointments, todayStr]);

  // Helper for status badge styling
  const getStatusBadge = (status: string, needsUpdate: boolean, isNext: boolean) => {
    const st = (status || '').trim().toLowerCase();
    let badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
    let label = 'Booked';

    if (st === 'confirmed') {
      badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
      label = 'Confirmed';
    } else if (st === 'attended') {
      badgeClass = 'bg-blue-100 text-blue-800 border-blue-300';
      label = 'Attended';
    } else if (st === 'noshow' || st === 'no_show') {
      badgeClass = 'bg-slate-200 text-slate-800 border-slate-300';
      label = 'No-Show';
    } else if (st === 'cancelled') {
      badgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
      label = 'Cancelled';
    }

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${badgeClass}`}>
          {label}
        </span>
        {needsUpdate && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white animate-pulse">
            Needs Update
          </span>
        )}
        {isNext && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#0F766E] text-white">
            Next Up
          </span>
        )}
      </div>
    );
  };

  // Row Action Handler with Server/Transaction Enforcement
  const handlePerformAction = async (targetStatus: AppointmentStatus, customReason?: string) => {
    if (!activeAppointment || !clinicId) return;

    // Enforce timing rule inside transaction/action handler
    if ((targetStatus === 'attended' || targetStatus === 'noshow') && !isOverrideEnabled) {
      const timing = getAppointmentTimingStatus(activeAppointment);
      if (targetStatus === 'attended' && !timing.isAttendedAllowed) {
        setActionError("This appointment hasn't started yet.");
        return;
      }
      if (targetStatus === 'noshow' && !timing.isNoShowAllowed) {
        setActionError("This appointment hasn't started yet.");
        return;
      }
    }

    if (isOverrideEnabled && (targetStatus === 'attended' || targetStatus === 'noshow') && !overrideReason.trim()) {
      setActionError('Please provide an override reason.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    const path = `facilities/${clinicId}/appointments/${activeAppointment.id}`;
    try {
      if (targetStatus === 'cancelled') {
        const fullReason = cancelNote ? `${cancelReasonType} - ${cancelNote}` : cancelReasonType;
        await onCancelAppointment(activeAppointment.id, fullReason);
      } else {
        let reason = customReason || `Status changed to ${targetStatus} via Today desk workflow`;
        if (isOverrideEnabled && overrideReason.trim()) {
          reason = `[ADMIN OVERRIDE] ${overrideReason.trim()} (${reason})`;
        }
        await onUpdateStatus(activeAppointment.id, targetStatus, reason);
      }
      setActiveAppointment(null);
      setIsCancellingFlow(false);
      setCancelNote('');
      setIsOverrideEnabled(false);
      setOverrideReason('');
    } catch (err: any) {
      console.error(`[FS] Error at path ${path} (Code: ${err?.code}):`, err);
      setActionError(`[FS] Error at ${path}: [${err?.code || 'error'}] ${err.message || 'Failed to update status.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Undo last change
  const handleUndoStatus = async () => {
    if (!activeAppointment || !clinicId || !activeAppointment.statusHistory || activeAppointment.statusHistory.length <= 1) {
      setActionError('No previous status available to undo.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    const path = `facilities/${clinicId}/appointments/${activeAppointment.id}`;

    try {
      const history = [...activeAppointment.statusHistory];
      history.pop();
      const previousEntry = history[history.length - 1];
      const previousStatus = previousEntry ? previousEntry.status : 'booked';

      await onUpdateStatus(activeAppointment.id, previousStatus, `Undo reverted to ${previousStatus}`);
      setActiveAppointment(null);
    } catch (err: any) {
      console.error(`[FS] Error at path ${path} (Code: ${err?.code}):`, err);
      setActionError(`[FS] Error at ${path}: [${err?.code || 'error'}] ${err.message || 'Failed to undo.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCleanWhatsAppNumber = (phone?: string): string => {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F4F8F7] overflow-y-auto">
      
      {/* Top Header & Day Navigation */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E] animate-ping" />
              <h2 className="text-xl font-extrabold text-[#0B2B2A]">
                Reception Today Desk
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Timezone: Africa/Gaborone • Real-time patient arrival and attendance tracking
            </p>
          </div>

          {/* Date Selector Tabs & Date Picker */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-[#F4F8F7] p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleSetDayOffset(-1)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-950 rounded-lg transition-all cursor-pointer"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  selectedDate === todayStr ? 'bg-[#0F766E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleSetDayOffset(1)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-950 rounded-lg transition-all cursor-pointer"
              >
                Tomorrow
              </button>
            </div>

            {/* Native Date Picker */}
            <div className="flex items-center gap-1.5 bg-[#F4F8F7] px-3 py-1.5 rounded-xl border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-[#0F766E]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#0B2B2A] focus:outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Selected Date Title & Filters Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-extrabold text-[#0B2B2A] flex items-center gap-2">
            <span className="text-base">📅</span>
            <span>{formattedDateTitle}</span>
            {selectedDate === todayStr && (
              <span className="text-[10px] font-bold bg-teal-50 text-[#0F766E] border border-teal-200 px-2 py-0.5 rounded-md">
                Live Now
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Practice Filter */}
            <div className="flex items-center gap-1.5 bg-[#F4F8F7] px-3 py-1.5 rounded-xl border border-slate-200">
              <Building2 className="w-3.5 h-3.5 text-[#0F766E]" />
              <select
                value={selectedPracticeFilter}
                onChange={(e) => setSelectedPracticeFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#0B2B2A] focus:outline-none cursor-pointer"
              >
                <option value="all">All practices ({practices.length})</option>
                {practices.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.active === false ? '(Inactive)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Practitioner Filter */}
            <div className="flex items-center gap-1.5 bg-[#F4F8F7] px-3 py-1.5 rounded-xl border border-slate-200">
              <Clock className="w-3.5 h-3.5 text-[#0F766E]" />
              <select
                value={selectedStaffFilter}
                onChange={(e) => setSelectedStaffFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#0B2B2A] focus:outline-none cursor-pointer"
              >
                <option value="all">All practitioners</option>
                {availableStaff.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Show Cancelled Toggle */}
            <button
              type="button"
              onClick={() => setShowCancelled(!showCancelled)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                showCancelled ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-[#F4F8F7] text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {showCancelled ? <Eye className="w-3.5 h-3.5 text-rose-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
              <span>Show Cancelled</span>
            </button>
          </div>
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
          <div className="bg-[#F4F8F7] p-3 rounded-2xl border border-slate-200/70 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Scheduled</div>
              <div className="text-lg font-extrabold text-[#0B2B2A] mt-0.5">{stats.total}</div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center text-[#0F766E] font-bold text-xs">📋</div>
          </div>

          <div className="bg-[#F4F8F7] p-3 rounded-2xl border border-slate-200/70 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirmed</div>
              <div className="text-lg font-extrabold text-emerald-700 mt-0.5">{stats.confirmed}</div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">✓</div>
          </div>

          <div className="bg-[#F4F8F7] p-3 rounded-2xl border border-slate-200/70 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attended</div>
              <div className="text-lg font-extrabold text-blue-700 mt-0.5">{stats.attended}</div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">👥</div>
          </div>

          <div className="bg-[#F4F8F7] p-3 rounded-2xl border border-slate-200/70 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No-Shows</div>
              <div className="text-lg font-extrabold text-slate-600 mt-0.5">{stats.noShow}</div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">∅</div>
          </div>

          <div className="bg-[#F4F8F7] p-3 rounded-2xl border border-slate-200/70 flex items-center justify-between col-span-2 sm:col-span-1">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remaining</div>
              <div className="text-lg font-extrabold text-amber-700 mt-0.5">{stats.remaining}</div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs">⏳</div>
          </div>
        </div>
      </div>

      {/* Main Appointment List Content */}
      <div className="flex-1 p-6 space-y-6">
        {dayAppointments.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs flex flex-col items-center justify-center max-w-md mx-auto my-12 space-y-4">
            <RemiMascot size="lg" />
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-[#0B2B2A]">No appointments for this day.</h3>
              <p className="text-xs text-slate-500 max-w-xs">
                You can switch dates above or add new appointments from the Calendar view.
              </p>
            </div>
          </div>
        ) : (
          /* Grouped by Practice List */
          <div className="space-y-6">
            {groupedByPractice.map(({ practice, apps }) => {
              const pracName = practice?.name || 'General Practice';
              return (
                <div key={practice?.id || 'general'} className="space-y-3">
                  {/* Practice Section Header */}
                  <div className="flex items-center gap-2 px-1">
                    <span className="w-3 h-3 rounded-full bg-[#0F766E]" />
                    <h3 className="text-xs font-extrabold text-[#0B2B2A] uppercase tracking-wider">
                      {pracName} ({apps.length})
                    </h3>
                  </div>

                  {/* Appointment Cards */}
                  <div className="grid gap-3">
                    {apps.map((app) => {
                      const appTime = app.time || (app.startAt ? app.startAt.split('T')[1]?.slice(0, 5) : '08:00');
                      const duration = app.duration || 15;
                      const endTime = calculateEndTime(appTime, duration);
                      const isNext = nextUpcomingId === app.id;
                      const needsUpdate = needsUpdateIds.has(app.id);

                      return (
                        <div
                          key={app.id}
                          onClick={() => setActiveAppointment(app)}
                          className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md ${
                            isNext ? 'border-[#0F766E] ring-2 ring-[#0F766E]/20 bg-teal-50/20' : needsUpdate ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200 hover:border-teal-300'
                          }`}
                        >
                          {/* Left: Time & Patient info */}
                          <div className="flex items-start gap-4">
                            {/* Time badge */}
                            <div className="bg-[#F4F8F7] border border-slate-200 px-3 py-2 rounded-xl text-center shrink-0 min-w-[80px]">
                              <div className="text-xs font-extrabold text-[#0B2B2A]">{appTime}</div>
                              <div className="text-[10px] text-slate-400 font-semibold">{endTime}</div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setContactPatient({ name: app.patientName, phone: app.patientPhone });
                                  }}
                                  className="text-sm font-extrabold text-[#0B2B2A] hover:text-[#0F766E] hover:underline cursor-pointer"
                                  title="Tap to view contact info"
                                >
                                  {app.patientName}
                                </button>
                                {app.patientPhone && (
                                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    {app.patientPhone}
                                  </span>
                                )}
                              </div>

                              <div className="text-xs text-slate-600 font-medium flex items-center gap-3 flex-wrap">
                                <span className="font-bold text-[#0F766E] bg-teal-50 px-2 py-0.5 rounded-md">
                                  {app.serviceName || app.service || 'Consultation'}
                                </span>
                                <span className="text-slate-500">
                                  Dr. {app.doctorName || app.staffName || 'Practitioner'}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  ({duration} mins)
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Status badge & Action hint */}
                          <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                            {getStatusBadge(app.status, needsUpdate, isNext)}
                            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-[#0F766E]">
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Compact 30-Day Summary Strip at bottom linking to Reports */}
        <div 
          onClick={() => setActiveTab('reports')}
          className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 cursor-pointer hover:border-teal-400 transition-all group mt-8"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 flex items-center justify-center text-[#0F766E] group-hover:scale-105 transition-transform">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-[#0B2B2A] flex items-center gap-2">
                <span>Last 30 Days Summary</span>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">View Reports</span>
              </h4>
              <p className="text-xs text-slate-500">
                Total: <strong className="text-slate-800">{thirtyDaySummary.total}</strong> • Attended: <strong className="text-blue-700">{thirtyDaySummary.attended}</strong> • No-Show Rate: <strong className="text-teal-800">{thirtyDaySummary.noShowRate}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#0F766E] group-hover:translate-x-1 transition-transform">
            <span>Open Reports Analytics</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

      </div>

      {/* Row Action Bottom Sheet / Modal */}
      {activeAppointment && (() => {
        const timing = getAppointmentTimingStatus(activeAppointment);
        const isAttendedDisabled = !timing.isAttendedAllowed && !isOverrideEnabled;
        const isNoShowDisabled = !timing.isNoShowAllowed && !isOverrideEnabled;

        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in">
            <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-5 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    Attendance Action
                  </span>
                  <h3 className="text-base font-extrabold text-[#0B2B2A] mt-1">
                    {activeAppointment.patientName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveAppointment(null);
                    setIsCancellingFlow(false);
                    setActionError(null);
                    setIsOverrideEnabled(false);
                    setOverrideReason('');
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              {/* Appointment Details Box */}
              <div className="bg-[#F4F8F7] p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Time:</span>
                  <span className="font-bold text-[#0B2B2A]">{activeAppointment.time || '08:00'} ({activeAppointment.duration || 15}m)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Service:</span>
                  <span className="font-bold text-[#0B2B2A]">{activeAppointment.serviceName || activeAppointment.service}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Practitioner:</span>
                  <span className="font-bold text-[#0B2B2A]">{activeAppointment.doctorName || activeAppointment.staffName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Current Status:</span>
                  <span className="font-bold uppercase text-[#0F766E]">{activeAppointment.status}</span>
                </div>
              </div>

              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Restriction Notice</span>
                  </div>
                  <p className="font-mono text-[11px] leading-relaxed">{actionError}</p>
                </div>
              )}

              {/* Cancellation Sub-Flow */}
              {isCancellingFlow ? (
                <div className="space-y-4 bg-rose-50/50 p-4 rounded-2xl border border-rose-200">
                  <div className="text-xs font-bold text-rose-900 flex items-center gap-2">
                    <Ban className="w-4 h-4 text-rose-600" />
                    <span>Cancel Appointment with Reason</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-rose-900 mb-1 uppercase">Reason</label>
                    <select
                      value={cancelReasonType}
                      onChange={(e) => setCancelReasonType(e.target.value as any)}
                      className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                    >
                      <option value="patient request">Patient request</option>
                      <option value="clinic request">Clinic request / doctor unavailable</option>
                      <option value="other">Other reason</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-rose-900 mb-1 uppercase">Optional Note</label>
                    <input
                      type="text"
                      value={cancelNote}
                      onChange={(e) => setCancelNote(e.target.value)}
                      placeholder="e.g. Rescheduled for next week"
                      className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCancellingFlow(false)}
                      className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handlePerformAction('cancelled')}
                      className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs disabled:opacity-50"
                    >
                      {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Action Buttons Grid */
                <div className="space-y-3">
                  {/* Confirm */}
                  {activeAppointment.status === 'booked' && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handlePerformAction('confirmed')}
                      className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm Appointment</span>
                    </button>
                  )}

                  {/* Mark Attended */}
                  <div className="space-y-1">
                    <button
                      type="button"
                      disabled={isSubmitting || isAttendedDisabled}
                      onClick={() => handlePerformAction('attended')}
                      className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                        isAttendedDisabled
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95 cursor-pointer'
                      }`}
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Mark Attended</span>
                    </button>
                    {isAttendedDisabled && (
                      <p className="text-[11px] text-amber-700 font-semibold px-1">
                        {timing.attendedReason}
                      </p>
                    )}
                  </div>

                  {/* Mark No-Show */}
                  <div className="space-y-1">
                    <button
                      type="button"
                      disabled={isSubmitting || isNoShowDisabled}
                      onClick={() => handlePerformAction('noshow')}
                      className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                        isNoShowDisabled
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-600 hover:bg-slate-700 text-white active:scale-95 cursor-pointer'
                      }`}
                    >
                      <UserX className="w-4 h-4" />
                      <span>Mark No-Show</span>
                    </button>
                    {isNoShowDisabled && (
                      <p className="text-[11px] text-amber-700 font-semibold px-1">
                        {timing.noShowReason}
                      </p>
                    )}
                  </div>

                  {/* Admin / Owner Override Option */}
                  {isAdminOrOwner && (isAttendedDisabled || isNoShowDisabled) && (
                    <div className="bg-amber-50 p-3 rounded-2xl border border-amber-300 space-y-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-amber-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isOverrideEnabled}
                          onChange={(e) => setIsOverrideEnabled(e.target.checked)}
                          className="w-4 h-4 rounded text-[#0F766E] border-amber-400"
                        />
                        <span>Admin/Owner Override (Bypass timing restriction)</span>
                      </label>
                      {isOverrideEnabled && (
                        <input
                          type="text"
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                          placeholder="Reason for override (required)"
                          className="w-full bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                        />
                      )}
                    </div>
                  )}

                  {/* Cancel */}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setIsCancellingFlow(true)}
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Ban className="w-4 h-4 text-rose-600" />
                    <span>Cancel Appointment...</span>
                  </button>

                  {/* Undo last change */}
                  {activeAppointment.statusHistory && activeAppointment.statusHistory.length > 1 && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleUndoStatus}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50 mt-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Undo Last Change ({activeAppointment.statusHistory.length - 1} prior state{activeAppointment.statusHistory.length > 2 ? 's' : ''})</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Patient Contact Panel Modal */}
      {contactPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-100 flex items-center justify-center text-[#0F766E] font-extrabold text-sm">
                  👤
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0B2B2A]">{contactPatient.name}</h3>
                  <p className="text-xs text-slate-500">Patient Quick Contact</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setContactPatient(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 pt-1">
              <div className="bg-[#F4F8F7] p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Phone Number:</span>
                <span className="text-xs font-extrabold text-[#0B2B2A]">{contactPatient.phone || 'No phone provided'}</span>
              </div>

              {contactPatient.phone ? (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <a
                    href={`tel:${contactPatient.phone}`}
                    className="flex items-center justify-center gap-2 bg-[#0F766E] hover:bg-[#0d655e] text-white py-3 rounded-2xl text-xs font-bold shadow-md transition-all active:scale-95"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call Now</span>
                  </a>
                  <a
                    href={`https://wa.me/${getCleanWhatsAppNumber(contactPatient.phone)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-2xl text-xs font-bold shadow-md transition-all active:scale-95"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              ) : (
                <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
                  Phone number is not available for this patient.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
