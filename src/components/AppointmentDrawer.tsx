import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Stethoscope, 
  AlertTriangle, 
  CheckCircle2, 
  Ban, 
  ShieldAlert, 
  Plus, 
  History, 
  Send,
  CheckSquare,
  FileText,
  Building2,
  AlertCircle
} from 'lucide-react';
import { 
  Appointment, 
  Patient, 
  Service, 
  Staff, 
  Practice,
  AppointmentStatus, 
  StatusHistoryEntry 
} from '../types';
import { RemiMascot } from './RemiMascot';
import { calculateEndTime, checkAppointmentConflict } from '../utils/conflictUtils';
import { formatAndValidatePhone } from '../utils/phoneUtils';
import { getFacilityTypeMeta, FACILITY_TYPE_COLORS } from '../utils/practiceCatalog';

interface AppointmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  // If editing an existing appointment:
  existingAppointment?: Appointment | null;
  // Pre-filled booking parameters (e.g. from clicked slot):
  initialParams?: { date?: string; time?: string; doctorName?: string; practiceId?: string };
  // Reference data
  practices: Practice[];
  patients: Patient[];
  services: Service[];
  staffList: Staff[];
  existingAppointments: Appointment[];
  currentUserEmail?: string;
  // Actions
  onSaveAppointment: (appointmentData: Omit<Appointment, 'id'>, id?: string) => Promise<{ success: boolean; error?: string }>;
  onCancelAppointment: (id: string, reason: string) => Promise<void>;
  onUpdateStatus: (id: string, status: AppointmentStatus) => Promise<void>;
  onRegisterNewPatient: (patientData: Omit<Patient, 'id'>) => Promise<Patient>;
}

export const AppointmentDrawer: React.FC<AppointmentDrawerProps> = ({
  isOpen,
  onClose,
  existingAppointment,
  initialParams,
  practices,
  patients,
  services,
  staffList,
  existingAppointments,
  currentUserEmail = 'desk@remidoc.med',
  onSaveAppointment,
  onCancelAppointment,
  onUpdateStatus,
  onRegisterNewPatient,
}) => {
  const activePractices = useMemo(() => practices.filter((p) => p.active !== false), [practices]);
  const activePatients = useMemo(() => patients.filter((p) => p.active !== false), [patients]);
  const activeServices = useMemo(() => services.filter((s) => s.active !== false), [services]);
  const activeStaff = useMemo(() => staffList.filter((s) => s.active !== false), [staffList]);

  const isEditing = !!existingAppointment;

  // Form Fields
  const [practiceId, setPracticeId] = useState<string>('');
  const [patientId, setPatientId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [notes, setNotes] = useState('');
  const [adminOverridePast, setAdminOverridePast] = useState(false);

  // Quick inline "Add new patient" state
  const [isAddingNewPatient, setIsAddingNewPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientWhatsapp, setNewPatientWhatsapp] = useState(true);
  const [newPatientError, setNewPatientError] = useState<string | null>(null);

  // Cancellation state
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState<'patient request' | 'clinic request' | 'other'>('patient request');
  const [cancelNote, setCancelNote] = useState('');

  // Conflict error banner state
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track drawer open transitions to prevent resetting inputs on user typing
  const prevOpenRef = useRef(false);
  const prevExistingIdRef = useRef<string | undefined>(undefined);
  const prevInitialParamsRef = useRef(initialParams);

  // Populate form ONLY on drawer open or when changing the appointment being edited
  useEffect(() => {
    if (!isOpen) {
      prevOpenRef.current = false;
      prevExistingIdRef.current = undefined;
      setConflictError(null);
      setIsAddingNewPatient(false);
      setIsCancelling(false);
      return;
    }

    const justOpened = !prevOpenRef.current;
    const switchedAppointment = existingAppointment?.id !== prevExistingIdRef.current;
    const initialParamsChanged = !isEditing && initialParams !== prevInitialParamsRef.current;

    if (justOpened || switchedAppointment || initialParamsChanged) {
      prevOpenRef.current = true;
      prevExistingIdRef.current = existingAppointment?.id;
      prevInitialParamsRef.current = initialParams;

      if (existingAppointment) {
        const pId = existingAppointment.practiceId || activePractices[0]?.id || '';
        setPracticeId(pId);
        setPatientId(existingAppointment.patientId);
        setServiceId(existingAppointment.serviceId || activeServices[0]?.id || '');
        setStaffId(existingAppointment.staffId || activeStaff[0]?.id || '');
        setDate(existingAppointment.date || (existingAppointment.startAt ? existingAppointment.startAt.split('T')[0] : ''));
        setStartTime(existingAppointment.time || (existingAppointment.startAt ? existingAppointment.startAt.split('T')[1]?.slice(0, 5) : '09:00'));
        setNotes(existingAppointment.notes || '');
        setAdminOverridePast(false);
        setPatientSearch('');
      } else {
        // Booking new appointment
        const defaultPractice = initialParams?.practiceId || activePractices[0]?.id || '';
        setPracticeId(defaultPractice);

        const defaultDate = initialParams?.date || new Date().toISOString().split('T')[0];
        const defaultTime = initialParams?.time || '09:00';
        
        // Services for this practice
        const pServices = activeServices.filter((s) => s.practiceId === defaultPractice);
        const chosenService = pServices[0] || activeServices[0];

        // Staff for this practice
        const pStaff = activeStaff.filter((st) => st.practiceIds?.includes(defaultPractice));
        const defaultStaff = (initialParams?.doctorName ? activeStaff.find((s) => s.name === initialParams.doctorName) : null) || pStaff[0] || activeStaff[0];

        setPatientId(activePatients[0]?.id || '');
        setServiceId(chosenService?.id || '');
        setStaffId(defaultStaff?.id || activeStaff[0]?.id || '');
        setDate(defaultDate);
        setStartTime(defaultTime);
        setNotes('');
        setAdminOverridePast(false);
        setPatientSearch('');
      }
    }
  }, [isOpen, existingAppointment, initialParams, activePractices, activeServices, activeStaff, activePatients, isEditing]);

  if (!isOpen) return null;

  // Selected Objects
  const selectedPractice = practices.find((p) => p.id === practiceId) || activePractices[0];
  const practiceFacilityMeta = selectedPractice ? getFacilityTypeMeta(selectedPractice.facilityType) : null;
  const practiceColor = selectedPractice ? (FACILITY_TYPE_COLORS[selectedPractice.facilityType] || FACILITY_TYPE_COLORS.other) : FACILITY_TYPE_COLORS.other;

  // Filter services and staff STRICTLY by selected practice
  const currentPracticeId = practiceId || selectedPractice?.id || '';
  const availableServices = activeServices.filter((s) => s.practiceId === currentPracticeId);
  const availableStaff = activeStaff.filter((st) => st.practiceIds?.includes(currentPracticeId));

  const selectedPatient = patients.find((p) => p.id === patientId) || activePatients[0];
  const selectedService = availableServices.find((s) => s.id === serviceId) || availableServices[0];
  const selectedPractitioner = availableStaff.find((s) => s.id === staffId) || availableStaff[0];

  // Calculated End Time
  const duration = selectedService?.durationMinutes || selectedService?.duration || 15;
  const buffer = selectedService?.bufferMinutes || selectedService?.buffer || 0;
  const calculatedEndTime = calculateEndTime(startTime, duration);

  // Filter patients for searchable dropdown
  const filteredPatients = activePatients.filter((p) =>
    p.fullName.toLowerCase().includes(patientSearch.toLowerCase()) ||
    (p.phoneNumber || p.phone || '').includes(patientSearch)
  );

  // Practice switcher inside modal
  const handlePracticeChange = (newPId: string) => {
    setPracticeId(newPId);
    const pServices = activeServices.filter((s) => s.practiceId === newPId);
    setServiceId(pServices[0]?.id || '');
    const pStaff = activeStaff.filter((st) => st.practiceIds?.includes(newPId));
    setStaffId(pStaff[0]?.id || '');
  };

  // Inline Add Patient Handler
  const handleCreatePatientInline = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewPatientError(null);

    if (!newPatientName.trim()) {
      setNewPatientError('Please provide the patient full name.');
      return;
    }

    const { isValid, formatted, error } = formatAndValidatePhone(newPatientPhone);
    if (!isValid) {
      setNewPatientError(error || 'Invalid phone number format.');
      return;
    }

    try {
      const created = await onRegisterNewPatient({
        fullName: newPatientName.trim(),
        phoneNumber: formatted,
        whatsappConsent: newPatientWhatsapp,
        whatsappConsentDate: newPatientWhatsapp ? new Date().toISOString() : null,
        active: true,
        createdAt: new Date().toISOString(),
      });

      setPatientId(created.id);
      setIsAddingNewPatient(false);
      setNewPatientName('');
      setNewPatientPhone('');
    } catch (err: any) {
      setNewPatientError(err.message || 'Failed to register patient.');
    }
  };

  // Submit Appointment Save (with conflict prevention)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);

    if (!selectedPatient) {
      setConflictError('Please select or register a patient.');
      return;
    }
    if (!selectedService) {
      setConflictError('Please select a consultation service.');
      return;
    }
    if (!selectedPractitioner) {
      setConflictError('Please select a practitioner.');
      return;
    }

    // Run Conflict Check
    const conflictResult = checkAppointmentConflict({
      date,
      startTime,
      duration,
      buffer,
      practitioner: selectedPractitioner,
      existingAppointments,
      excludeAppointmentId: existingAppointment?.id,
      adminOverridePast,
    });

    if (conflictResult.hasConflict) {
      setConflictError(conflictResult.message || 'Time slot has a conflict with an existing appointment.');
      return;
    }

    setIsSubmitting(true);

    try {
      const nowIso = new Date().toISOString();
      const newStatusHistoryEntry: StatusHistoryEntry = {
        status: isEditing ? existingAppointment.status : 'booked',
        timestamp: nowIso,
        user: currentUserEmail,
        reason: isEditing ? 'Rescheduled / Details updated' : 'Initial booking from reception desk',
      };

      const updatedHistory = existingAppointment?.statusHistory
        ? [...existingAppointment.statusHistory, newStatusHistoryEntry]
        : [newStatusHistoryEntry];

      const appointmentPayload: Omit<Appointment, 'id'> = {
        practiceId: practiceId || selectedPractice?.id || '',
        practiceName: selectedPractice?.name || '',
        patientId: selectedPatient.id,
        patientName: selectedPatient.fullName,
        patientPhone: selectedPatient.phoneNumber,
        staffId: selectedPractitioner.id,
        staffName: selectedPractitioner.name,
        doctorName: selectedPractitioner.name,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        service: selectedService.name,
        date,
        time: startTime,
        startAt: `${date}T${startTime}`,
        endAt: `${date}T${calculatedEndTime}`,
        duration,
        buffer,
        status: (isEditing ? existingAppointment.status : 'booked') as AppointmentStatus,
        source: 'desk',
        notes: notes.trim(),
        reminderSent: existingAppointment?.reminderSent || false,
        createdBy: existingAppointment?.createdBy || currentUserEmail,
        createdAt: existingAppointment?.createdAt || nowIso,
        updatedAt: nowIso,
        statusHistory: updatedHistory,
      };

      const result = await onSaveAppointment(appointmentPayload, existingAppointment?.id);
      if (!result.success) {
        setConflictError(result.error || 'Failed to save appointment.');
      } else {
        onClose();
      }
    } catch (err: any) {
      setConflictError(err.message || 'An unexpected error occurred while booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel Appointment Handler
  const handleConfirmCancel = async () => {
    if (!existingAppointment) return;
    setIsSubmitting(true);
    try {
      const fullReason = cancelNote ? `${cancelReason} - ${cancelNote}` : cancelReason;
      await onCancelAppointment(existingAppointment.id, fullReason);
      onClose();
    } catch (err: any) {
      setConflictError(err.message || 'Failed to cancel appointment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs transition-opacity">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-[#F4F8F7] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0F766E]/10 flex items-center justify-center text-[#0F766E]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0B2B2A]">
                {isEditing ? 'Manage & Reschedule Appointment' : 'Book Practice Appointment'}
              </h3>
              <p className="text-xs text-slate-500">
                Shared reception booking for {selectedPractice?.name || 'facility practice'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Drawer Body Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Conflict Error Alert */}
          {conflictError && (
            <div className="bg-rose-50 border border-rose-300 rounded-2xl p-4 text-xs text-rose-800 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Scheduling Conflict Detected</span>
              </div>
              <p className="leading-relaxed pl-6">{conflictError}</p>

              {conflictError.includes('past') && (
                <div className="pl-6 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-900">
                    <input
                      type="checkbox"
                      checked={adminOverridePast}
                      onChange={(e) => {
                        setAdminOverridePast(e.target.checked);
                        setConflictError(null);
                      }}
                      className="w-4 h-4 text-[#0F766E] rounded border-rose-300"
                    />
                    <span>Admin Override: Allow booking in the past</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Cancellation Confirmation Box (if cancelling) */}
          {isCancelling ? (
            <div className="bg-rose-50 border border-rose-300 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <Ban className="w-4 h-4 text-rose-600" />
                <span>Confirm Appointment Cancellation</span>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed font-normal">
                Remidoc never deletes appointments to maintain an accurate audit history. The status will be set to <strong>cancelled</strong> with the timestamp recorded.
              </p>

              <div>
                <label className="block text-xs font-semibold text-rose-900 mb-1.5 uppercase tracking-wide">
                  Cancellation Reason
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value as any)}
                  className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                >
                  <option value="patient request">Patient request</option>
                  <option value="clinic request">Clinic request / doctor unavailable</option>
                  <option value="other">Other reason</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-900 mb-1.5 uppercase tracking-wide">
                  Optional Details
                </label>
                <input
                  type="text"
                  value={cancelNote}
                  onChange={(e) => setCancelNote(e.target.value)}
                  placeholder="e.g. Patient called to reschedule next month"
                  className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCancelling(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
                >
                  Confirm Cancellation
                </button>
              </div>
            </div>
          ) : (
            <form id="appointment-form" onSubmit={handleSubmit} className="space-y-4">
              
              {/* Practice in Facility Selector */}
              <div>
                <label className="block text-xs font-bold text-[#0B2B2A] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#0F766E]" />
                    <span>Practice in Facility</span>
                  </span>
                  <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-md">
                    {practiceFacilityMeta?.label || 'General Practice'}
                  </span>
                </label>
                <select
                  value={practiceId}
                  onChange={(e) => handlePracticeChange(e.target.value)}
                  className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E] cursor-pointer"
                >
                  {practices.map((p) => {
                    const meta = getFacilityTypeMeta(p.facilityType);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} ({meta.label}) {p.active === false ? '- Inactive' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 1. Service (only that practice's active services, showing duration) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-[#0F766E]" />
                    <span>Consultation Service</span>
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500">
                    {availableServices.length} {availableServices.length === 1 ? 'service' : 'services'} available
                  </span>
                </label>

                {availableServices.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>This practice does not have any active services. Please add services in Settings &gt; Practices.</span>
                  </div>
                ) : (
                  <select
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 cursor-pointer"
                  >
                    {availableServices.map((s) => {
                      const dur = s.durationMinutes ?? s.duration ?? 15;
                      const buf = s.bufferMinutes ?? s.buffer ?? 0;
                      return (
                        <option key={s.id} value={s.id}>
                          {s.name} ({dur} min{buf > 0 ? ` + ${buf}m buffer` : ''})
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* 2. Practitioner (only staff assigned to that practice) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#0F766E]" />
                    <span>Practitioner</span>
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500">
                    {availableStaff.length} {availableStaff.length === 1 ? 'practitioner' : 'practitioners'} assigned
                  </span>
                </label>

                {availableStaff.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>No practitioners are assigned to this practice. Please assign staff in Settings &gt; Staff.</span>
                  </div>
                ) : (
                  <select
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 cursor-pointer"
                  >
                    {availableStaff.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.role})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 3. Patient Selection with "Add new patient" option */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Patient Record
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewPatient(!isAddingNewPatient)}
                    className="text-xs font-bold text-[#0F766E] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAddingNewPatient ? 'Cancel New Patient' : 'Add New Patient'}</span>
                  </button>
                </div>

                {isAddingNewPatient ? (
                  <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4 space-y-3 animate-in fade-in">
                    <div className="font-bold text-xs text-teal-900">Register New Patient Directly</div>
                    {newPatientError && (
                      <div className="text-[11px] text-rose-700 font-semibold">{newPatientError}</div>
                    )}
                    <div>
                      <input
                        type="text"
                        placeholder="Full Name (e.g. Mpho Kgosi)"
                        value={newPatientName}
                        onChange={(e) => setNewPatientName(e.target.value)}
                        className="w-full bg-white border border-teal-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30"
                      />
                    </div>
                    <div>
                      <input
                        type="tel"
                        placeholder="Phone Number (+26771234567)"
                        value={newPatientPhone}
                        onChange={(e) => setNewPatientPhone(e.target.value)}
                        className="w-full bg-white border border-teal-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newPatientWhatsapp}
                        onChange={(e) => setNewPatientWhatsapp(e.target.checked)}
                        className="w-3.5 h-3.5 text-[#0F766E] rounded"
                      />
                      <span>Agreed to WhatsApp Reminders</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleCreatePatientInline}
                      className="w-full py-2 bg-[#0F766E] hover:bg-[#0d655e] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Save & Select Patient
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <select
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                      className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E] cursor-pointer"
                    >
                      {activePatients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName} ({p.phoneNumber})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* 3. Date & Start Time + Calculated End Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    step="900"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    End Time
                  </label>
                  <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>{calculatedEndTime}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({duration}m)</span>
                  </div>
                </div>
              </div>

              {buffer > 0 && (
                <div className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  Buffer period: Includes {buffer} minutes after appointment for preparation/cooldown.
                </div>
              )}

              {/* 4. Optional Notes with Medical Warning */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                  Optional Booking Notes
                </label>
                <div className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl mb-1.5 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Notice: Do not enter medical details, symptoms or diagnoses.</span>
                </div>
                <textarea
                  id="booking-notes"
                  name="bookingNotes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Patient arriving by bus, needs afternoon slot confirmed"
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm text-[#0B2B2A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40 focus:border-[#0F766E] transition-all"
                />
              </div>

              {/* Status Update Quick Buttons (if editing) */}
              {isEditing && (
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
                    Quick Status Update
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {[
                      { id: 'booked', label: 'Booked', color: 'bg-teal-600 text-white' },
                      { id: 'confirmed', label: 'Confirmed', color: 'bg-emerald-600 text-white' },
                      { id: 'attended', label: 'Attended', color: 'bg-blue-600 text-white' },
                      { id: 'noshow', label: 'No-Show', color: 'bg-slate-600 text-white' },
                      { id: 'pending', label: 'Pending', color: 'bg-amber-600 text-white' },
                    ].map((s) => (
                      <button
                        type="button"
                        key={s.id}
                        onClick={async () => {
                          await onUpdateStatus(existingAppointment.id, s.id as any);
                          onClose();
                        }}
                        className={`py-2 px-1 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                          existingAppointment.status === s.id
                            ? `${s.color} font-bold shadow-xs`
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Status History Log (Audit Trail) */}
              {isEditing && existingAppointment.statusHistory && existingAppointment.statusHistory.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    <span>Audit History ({existingAppointment.statusHistory.length})</span>
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto bg-slate-50 p-3 rounded-xl border border-slate-200/70 text-[11px]">
                    {existingAppointment.statusHistory.map((h, i) => (
                      <div key={i} className="flex items-start justify-between gap-2 border-b border-slate-200/50 pb-1 last:border-b-0 last:pb-0">
                        <div>
                          <span className="font-bold text-[#0B2B2A] capitalize">{h.status}</span>
                          <span className="text-slate-500"> by {h.user}</span>
                          {h.reason && <p className="text-slate-600 text-[10px]">{h.reason}</p>}
                        </div>
                        <span className="text-slate-400 text-[10px] shrink-0">
                          {new Date(h.timestamp || h.changedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          {isEditing && !isCancelling ? (
            <button
              type="button"
              onClick={() => setIsCancelling(true)}
              className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Cancel Appointment...
            </button>
          ) : (
            <span className="text-xs text-slate-400 font-medium">Remidoc Desk Gateway</span>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>

            {!isCancelling && (
              <button
                type="submit"
                form="appointment-form"
                disabled={isSubmitting}
                className="px-6 py-2.5 text-xs font-bold text-white bg-[#0F766E] hover:bg-[#0d655e] rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Confirm Booking'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
