import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Appointment, 
  Patient, 
  Practice, 
  Staff, 
  Service, 
  AppointmentStatus,
  StatusHistoryEntry 
} from '../types';
import { getGaboroneDateString, timeToMinutes, calculateEndTime } from '../utils/dateUtils';
import { RemiMascot } from './RemiMascot';
import { 
  Bell, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Phone, 
  MessageSquare, 
  Copy, 
  ChevronRight, 
  Building2, 
  Calendar, 
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Check
} from 'lucide-react';

interface RemindersViewProps {
  clinicId: string;
  clinicName: string;
  appointments: Appointment[];
  patients: Patient[];
  practices: Practice[];
  staffList: Staff[];
  reminderTemplates?: { en?: string; tn?: string };
  currentUserEmail: string;
  onUpdateAppointment: (id: string, updates: Partial<Appointment>) => Promise<void>;
  onUpdateStatus: (id: string, status: AppointmentStatus, reason?: string) => Promise<void>;
}

export const RemindersView: React.FC<RemindersViewProps> = ({
  clinicId,
  clinicName,
  appointments,
  patients,
  practices,
  staffList,
  reminderTemplates,
  currentUserEmail,
  onUpdateAppointment,
  onUpdateStatus,
}) => {
  const todayStr = getGaboroneDateString();

  // Compute default "Tomorrow", handling non-working days (e.g. Sunday)
  const defaultTargetDate = useMemo(() => {
    const [y, m, d] = todayStr.split('-').map(Number);
    const tomorrowObj = new Date(Date.UTC(y, m - 1, d + 1));
    const dayOfWeek = tomorrowObj.getUTCDay(); // 0 is Sunday
    let offset = 1;
    let notice = '';

    // If Sunday (0), default to Monday (+2 days from today)
    if (dayOfWeek === 0) {
      offset = 2;
    }

    const targetObj = new Date(Date.UTC(y, m - 1, d + offset));
    return {
      dateStr: targetObj.toISOString().split('T')[0],
      isAdjusted: offset > 1,
      notice: offset > 1 ? `Tomorrow is Sunday (Facility closed). Showing next working day.` : '',
    };
  }, [todayStr]);

  const [selectedDate, setSelectedDate] = useState<string>(defaultTargetDate.dateStr);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Tracking which appointment was clicked to send WhatsApp so we can prompt on visibilitychange
  const pendingWhatsAppAppIdRef = useRef<string | null>(null);
  const [promptAppId, setPromptAppId] = useState<string | null>(null);

  // Listen to visibilitychange to prompt receptionist upon returning to the app
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && pendingWhatsAppAppIdRef.current) {
        setPromptAppId(pendingWhatsAppAppIdRef.current);
        pendingWhatsAppAppIdRef.current = null;
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Format date for message template (e.g., "Tue 20 Oct")
  const formatDateFriendly = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'Africa/Gaborone',
    }).format(dateObj);
  };

  // Default template
  const defaultTemplate = "Hello {patientName}. This is a reminder from {facilityName}: you have an appointment on {date} at {time}. Please reply YES to confirm, or let us know if you need to reschedule.";
  const activeTemplate = reminderTemplates?.en || defaultTemplate;

  // Build message for an appointment
  const generateMessage = (app: Appointment) => {
    const practice = practices.find(p => p.id === app.practiceId)?.name || app.practiceName || 'Main Practice';
    const practitioner = app.doctorName || app.staffName || 'Practitioner';
    const dateFormatted = formatDateFriendly(app.date || (app.startAt ? app.startAt.split('T')[0] : selectedDate));
    const timeFormatted = app.time || (app.startAt ? app.startAt.split('T')[1]?.slice(0, 5) : '09:00');

    return activeTemplate
      .replace(/\{patientName\}/g, app.patientName)
      .replace(/\{facilityName\}/g, clinicName)
      .replace(/\{practiceName\}/g, practice)
      .replace(/\{practitionerName\}/g, practitioner)
      .replace(/\{date\}/g, dateFormatted)
      .replace(/\{time\}/g, timeFormatted);
  };

  // Filter appointments for selected day with status booked or confirmed only
  const eligibleAppointments = useMemo(() => {
    return appointments.filter(app => {
      const appDate = app.date || (app.startAt ? app.startAt.split('T')[0] : '');
      if (appDate !== selectedDate) return false;

      const st = (app.status || '').trim().toLowerCase();
      return st === 'booked' || st === 'confirmed';
    }).sort((a, b) => {
      const timeA = a.time || (a.startAt ? a.startAt.split('T')[1]?.slice(0, 5) : '08:00');
      const timeB = b.time || (b.startAt ? b.startAt.split('T')[1]?.slice(0, 5) : '08:00');
      return timeToMinutes(timeA) - timeToMinutes(timeB);
    });
  }, [appointments, selectedDate]);

  // Separate into WhatsApp consent vs No WhatsApp consent
  const { whatsappGroup, noConsentGroup } = useMemo(() => {
    const whatsapp: { app: Appointment; patient?: Patient }[] = [];
    const noConsent: { app: Appointment; patient?: Patient }[] = [];

    for (const app of eligibleAppointments) {
      const pat = patients.find(p => p.id === app.patientId || p.fullName.toLowerCase() === app.patientName.toLowerCase());
      const hasConsent = pat ? pat.whatsappConsent !== false : true; // default true if unknown

      if (hasConsent) {
        whatsapp.push({ app, patient: pat });
      } else {
        noConsent.push({ app, patient: pat });
      }
    }
    return { whatsappGroup: whatsapp, noConsentGroup: noConsent };
  }, [eligibleAppointments, patients]);

  // Summary strip metrics
  const summary = useMemo(() => {
    const total = eligibleAppointments.length;
    let sentCount = 0;
    let confirmedCount = 0;

    for (const app of eligibleAppointments) {
      if (app.reminderSentAt) sentCount++;
      if ((app.status || '').trim().toLowerCase() === 'confirmed') confirmedCount++;
    }

    return {
      total,
      sentCount,
      remaining: total - sentCount,
      confirmedCount,
    };
  }, [eligibleAppointments]);

  // Group WhatsApp group by practice
  const groupedWhatsapp = useMemo(() => {
    const map: { [pId: string]: { practiceName: string; items: { app: Appointment; patient?: Patient }[] } } = {};
    
    for (const item of whatsappGroup) {
      const pId = item.app.practiceId || 'general';
      const pName = item.app.practiceName || practices.find(p => p.id === pId)?.name || 'General Practice';
      if (!map[pId]) {
        map[pId] = { practiceName: pName, items: [] };
      }
      map[pId].items.push(item);
    }
    return Object.values(map);
  }, [whatsappGroup, practices]);

  // Clean WhatsApp phone number format
  const getCleanNumber = (phone?: string) => {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  };

  const isValidPhone = (phone?: string) => {
    const clean = getCleanNumber(phone);
    return clean.length >= 7;
  };

  // Handlers for sending / marking sent
  const handleOpenWhatsApp = (app: Appointment, phone?: string) => {
    const cleanNum = getCleanNumber(phone);
    if (!isValidPhone(phone)) {
      alert('Invalid phone number format. Please update patient contact details.');
      return;
    }

    const message = generateMessage(app);
    const url = `https://wa.me/${cleanNum}?text=${encodeURIComponent(message)}`;
    
    pendingWhatsAppAppIdRef.current = app.id;
    window.open(url, '_blank');
  };

  const handleMarkSent = async (appId: string, markSent: boolean) => {
    setPromptAppId(null);
    if (!markSent || !clinicId) return;

    const app = appointments.find(a => a.id === appId);
    const nowIso = new Date().toISOString();
    const sentTimeFormatted = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Africa/Gaborone',
    }).format(new Date());

    const newNote: StatusHistoryEntry = {
      status: app?.status || 'booked',
      timestamp: nowIso,
      user: currentUserEmail,
      reason: `WhatsApp reminder sent at ${sentTimeFormatted} by ${currentUserEmail}`,
    };
    const statusHistory = app?.statusHistory ? [...app.statusHistory, newNote] : [newNote];

    try {
      await onUpdateAppointment(appId, {
        reminderSentAt: nowIso,
        reminderSentBy: currentUserEmail,
        reminderCount: (app?.reminderCount || 0) + 1,
        statusHistory,
      });
    } catch (err: any) {
      console.error(`[FS] Error at facilities/${clinicId}/appointments/${appId}:`, err);
      alert(`[FS] Error at facilities/${clinicId}/appointments/${appId}: Failed to update reminder status.`);
    }
  };

  const handleCopyMessage = (app: Appointment) => {
    const msg = generateMessage(app);
    navigator.clipboard.writeText(msg);
    setCopiedId(app.id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  // Find next unsent reminder for "Send next" shortcut
  const nextUnsentApp = useMemo(() => {
    return whatsappGroup.find(item => !item.app.reminderSentAt)?.app;
  }, [whatsappGroup]);

  const scrollToNextUnsent = () => {
    if (!nextUnsentApp) return;
    const el = document.getElementById(`reminder-row-${nextUnsentApp.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-[#0F766E]', 'bg-teal-50/40');
      setTimeout(() => el.classList.remove('ring-2', 'ring-[#0F766E]', 'bg-teal-50/40'), 2500);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F4F8F7] overflow-y-auto">
      
      {/* Header & Day Selector */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#0F766E]" />
              <h2 className="text-xl font-extrabold text-[#0B2B2A]">
                Patient Reminders Desk
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              WhatsApp click-to-chat dispatch and confirmation tracking (Africa/Gaborone)
            </p>
          </div>

          {/* Day Selector Tabs & Date Picker */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-[#F4F8F7] p-1 rounded-xl border border-slate-200">
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
                onClick={() => setSelectedDate(defaultTargetDate.dateStr)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  selectedDate === defaultTargetDate.dateStr ? 'bg-[#0F766E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                Tomorrow
              </button>
            </div>

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

        {defaultTargetDate.notice && selectedDate === defaultTargetDate.dateStr && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{defaultTargetDate.notice} ({formatDateFriendly(defaultTargetDate.dateStr)})</span>
          </div>
        )}

        {/* Summary Strip & Send Next Shortcut */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
            <div className="bg-[#F4F8F7] p-3 rounded-2xl border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Total Eligible</div>
              <div className="text-base font-extrabold text-[#0B2B2A]">{summary.total}</div>
            </div>
            <div className="bg-[#F4F8F7] p-3 rounded-2xl border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Reminders Sent</div>
              <div className="text-base font-extrabold text-emerald-700">{summary.sentCount}</div>
            </div>
            <div className="bg-[#F4F8F7] p-3 rounded-2xl border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Remaining</div>
              <div className="text-base font-extrabold text-amber-700">{summary.remaining}</div>
            </div>
            <div className="bg-[#F4F8F7] p-3 rounded-2xl border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Confirmed</div>
              <div className="text-base font-extrabold text-blue-700">{summary.confirmedCount}</div>
            </div>
          </div>

          {nextUnsentApp && (
            <button
              type="button"
              onClick={scrollToNextUnsent}
              className="flex items-center justify-center gap-1.5 bg-[#0F766E] hover:bg-[#0d655e] text-white px-4 py-3 rounded-2xl text-xs font-bold shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Send Next Unsent</span>
            </button>
          )}
        </div>
      </div>

      {/* Main List Content */}
      <div className="flex-1 p-6 space-y-6">
        {eligibleAppointments.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs flex flex-col items-center justify-center max-w-md mx-auto my-12 space-y-4">
            <RemiMascot size="lg" />
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-[#0B2B2A]">No reminders to send for this day.</h3>
              <p className="text-xs text-slate-500 max-w-xs">
                All booked or confirmed appointments for this date have been processed or none are scheduled.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* WhatsApp Consent Grouped by Practice */}
            {groupedWhatsapp.map(({ practiceName, items }) => (
              <div key={practiceName} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <span className="w-3 h-3 rounded-full bg-[#0F766E]" />
                  <h3 className="text-xs font-extrabold text-[#0B2B2A] uppercase tracking-wider">
                    {practiceName} ({items.length})
                  </h3>
                </div>

                <div className="grid gap-3">
                  {items.map(({ app, patient }) => {
                    const appTime = app.time || (app.startAt ? app.startAt.split('T')[1]?.slice(0, 5) : '08:00');
                    const phone = patient?.phoneNumber || patient?.phone || '';
                    const hasValidPhone = isValidPhone(phone);
                    const isSent = !!app.reminderSentAt;
                    const isConfirmed = (app.status || '').trim().toLowerCase() === 'confirmed';
                    const isPrompting = promptAppId === app.id;

                    return (
                      <div
                        key={app.id}
                        id={`reminder-row-${app.id}`}
                        className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          
                          {/* Left: Patient info & time */}
                          <div className="flex items-start gap-3">
                            <div className="bg-[#F4F8F7] border border-slate-200 px-3 py-2 rounded-xl text-center shrink-0 min-w-[75px]">
                              <div className="text-xs font-extrabold text-[#0B2B2A]">{appTime}</div>
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-extrabold text-[#0B2B2A]">{app.patientName}</h4>
                                {isConfirmed ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Confirmed</span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Pending</span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 font-medium flex items-center gap-3 flex-wrap">
                                <span className="flex items-center gap-1 font-semibold text-slate-700">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  {phone || 'No phone number'}
                                </span>
                                <span>Dr. {app.doctorName || app.staffName || 'Practitioner'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Badge status */}
                          <div className="flex items-center gap-2">
                            {isSent ? (
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Sent at {new Date(app.reminderSentAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by {app.reminderSentBy || 'Reception'}
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                Not sent
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Post-Click Visibilitychange Prompt */}
                        {isPrompting && (
                          <div className="bg-teal-50 border border-teal-300 p-3.5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
                            <div className="text-xs font-bold text-teal-900">
                              Did you send the WhatsApp message to {app.patientName}?
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleMarkSent(app.id, true)}
                                className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#0F766E] hover:bg-[#0d655e] rounded-lg shadow-xs cursor-pointer"
                              >
                                Yes, mark as sent
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMarkSent(app.id, false)}
                                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Actions Row */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Send WhatsApp button */}
                            {hasValidPhone ? (
                              <button
                                type="button"
                                onClick={() => handleOpenWhatsApp(app, phone)}
                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Send on WhatsApp</span>
                              </button>
                            ) : (
                              <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Invalid phone number</span>
                              </div>
                            )}

                            {/* Copy Message Fallback */}
                            <button
                              type="button"
                              onClick={() => handleCopyMessage(app)}
                              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                            >
                              {copiedId === app.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                              <span>{copiedId === app.id ? 'Copied!' : 'Copy message'}</span>
                            </button>
                          </div>

                          {/* Mark Confirmed Button */}
                          {!isConfirmed && (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(app.id, 'confirmed', 'Confirmed via reminder response')}
                              className="flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 text-[#0F766E] border border-teal-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Mark confirmed</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* No WhatsApp Consent Section */}
            {noConsentGroup.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 px-1">
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  <h3 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">
                    No WhatsApp consent: call instead ({noConsentGroup.length})
                  </h3>
                </div>

                <div className="grid gap-3">
                  {noConsentGroup.map(({ app, patient }) => {
                    const appTime = app.time || (app.startAt ? app.startAt.split('T')[1]?.slice(0, 5) : '08:00');
                    const phone = patient?.phoneNumber || patient?.phone || '';
                    const isConfirmed = (app.status || '').trim().toLowerCase() === 'confirmed';

                    return (
                      <div key={app.id} className="bg-amber-50/40 rounded-2xl p-4 border border-amber-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="bg-amber-100 border border-amber-300 px-3 py-2 rounded-xl text-center shrink-0 min-w-[75px]">
                            <div className="text-xs font-extrabold text-amber-900">{appTime}</div>
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-extrabold text-[#0B2B2A]">{app.patientName}</h4>
                              {isConfirmed ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Confirmed</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Pending</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 font-medium">
                              Phone: <strong className="text-slate-900">{phone || 'None'}</strong> • Dr. {app.doctorName || app.staffName}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {phone ? (
                            <a
                              href={`tel:${phone}`}
                              className="flex items-center gap-2 bg-[#0F766E] hover:bg-[#0d655e] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>Call Patient</span>
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">No phone number</span>
                          )}

                          {!isConfirmed && (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(app.id, 'confirmed', 'Confirmed via phone call')}
                              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-[#0F766E] border border-teal-300 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Mark confirmed</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}
      </div>

    </div>
  );
};
