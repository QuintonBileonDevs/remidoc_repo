import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, User, Phone, Stethoscope, FileText } from 'lucide-react';
import { Appointment, Patient, AppointmentStatus, Service, Staff } from '../types';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointment: Omit<Appointment, 'id'>) => void;
  patients: Patient[];
  services?: Service[];
  staffList?: Staff[];
  initialParams?: { date?: string; time?: string; doctorName?: string };
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  patients,
  services = [],
  staffList = [],
  initialParams,
}) => {
  const activePatients = patients.filter((p) => p.active !== false);
  const activeServices = services.filter((s) => s.active !== false);
  const activeStaff = staffList.filter((s) => s.active !== false);

  const [patientId, setPatientId] = useState(activePatients[0]?.id || '');
  const [patientName, setPatientName] = useState(activePatients[0]?.fullName || '');
  const [patientPhone, setPatientPhone] = useState(activePatients[0]?.phoneNumber || '');
  const [doctorName, setDoctorName] = useState(initialParams?.doctorName || activeStaff[0]?.name || 'Dr. Sarah Jenkins');
  const [service, setService] = useState(activeServices[0]?.name || 'General consultation');
  const [date, setDate] = useState(initialParams?.date || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(initialParams?.time || '10:00');
  const [status, setStatus] = useState<AppointmentStatus>('confirmed');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialParams?.date) setDate(initialParams.date);
    if (initialParams?.time) setTime(initialParams.time);
    if (initialParams?.doctorName) setDoctorName(initialParams.doctorName);
  }, [initialParams, isOpen]);

  useEffect(() => {
    if (activePatients.length > 0 && !patientId) {
      setPatientId(activePatients[0].id);
      setPatientName(activePatients[0].fullName);
      setPatientPhone(activePatients[0].phoneNumber || activePatients[0].phone || '');
    }
  }, [activePatients, patientId]);

  useEffect(() => {
    if (activeServices.length > 0 && (!service || service === 'General consultation')) {
      setService(activeServices[0].name);
    }
  }, [activeServices, service]);

  if (!isOpen) return null;

  const handlePatientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setPatientId(selectedId);
    const pat = activePatients.find((p) => p.id === selectedId);
    if (pat) {
      setPatientName(pat.fullName);
      setPatientPhone(pat.phoneNumber || pat.phone || '');
    }
  };

  const selectedServiceObj = activeServices.find((s) => s.name === service);
  const duration = selectedServiceObj?.duration || 15;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      patientId,
      patientName: patientName || 'Patient',
      patientPhone: patientPhone || '+26771234567',
      doctorName,
      service,
      date,
      time,
      duration,
      status,
      notes,
      reminderSent: false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-[#F4F8F7]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0F766E]/10 flex items-center justify-center text-[#0F766E]">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-[#0B2B2A]">Schedule Appointment</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Select Patient
            </label>
            {activePatients.length === 0 ? (
              <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                No active patients registered yet. Please add a patient first.
              </div>
            ) : (
              <select
                value={patientId}
                onChange={handlePatientChange}
                className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
              >
                {activePatients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} — {p.phoneNumber}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                Date (Africa/Gaborone)
              </label>
              <div className="relative">
                <CalendarIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                Time Slot (15-min increments)
              </label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="time"
                  required
                  step="900"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                Attending Practitioner
              </label>
              {activeStaff.length > 0 ? (
                <select
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                >
                  {activeStaff.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                Service (Duration)
              </label>
              {activeServices.length > 0 ? (
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                >
                  {activeServices.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.duration} mins)
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30"
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Initial Status
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                { id: 'confirmed', label: 'Confirmed', color: 'bg-emerald-600 text-white' },
                { id: 'pending', label: 'Pending', color: 'bg-amber-500 text-white' },
                { id: 'attended', label: 'Attended', color: 'bg-blue-600 text-white' },
                { id: 'cancelled', label: 'Cancelled', color: 'bg-rose-500 text-white' },
                { id: 'noshow', label: 'No-Show', color: 'bg-slate-500 text-white' },
              ].map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setStatus(s.id as AppointmentStatus)}
                  className={`py-2 px-1 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    status === s.id
                      ? `${s.color} shadow-xs font-bold`
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Appointment Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add logistical or preparation instructions..."
              className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl p-3 text-sm text-[#0B2B2A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={activePatients.length === 0}
              className="px-6 py-2.5 text-xs font-semibold text-white bg-[#0F766E] hover:bg-[#0d655e] rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              Book Appointment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
