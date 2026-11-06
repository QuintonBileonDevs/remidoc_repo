import React from 'react';
import { X, Calendar, Clock, User, Phone, Stethoscope, CheckCircle2, AlertCircle, Ban, Send, Trash2, CheckSquare } from 'lucide-react';
import { Appointment, AppointmentStatus } from '../types';

interface AppointmentDetailModalProps {
  appointment: Appointment | null;
  onClose: () => void;
  onUpdateStatus: (id: string, status: AppointmentStatus) => void;
  onDelete: (id: string) => void;
}

export const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
  appointment,
  onClose,
  onUpdateStatus,
  onDelete,
}) => {
  if (!appointment) return null;

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Confirmed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            Pending
          </span>
        );
      case 'attended':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
            Attended
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Ban className="w-3.5 h-3.5 text-rose-600" />
            Cancelled
          </span>
        );
      case 'noshow':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Ban className="w-3.5 h-3.5 text-slate-500" />
            No-Show
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-100 bg-[#F4F8F7] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0F766E]/10 flex items-center justify-center text-[#0F766E]">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-[#0B2B2A]">Appointment Details</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Patient Header */}
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-lg font-bold text-[#0B2B2A]">{appointment.patientName}</h4>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <Phone className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>{appointment.patientPhone}</span>
              </div>
            </div>
            {getStatusBadge(appointment.status)}
          </div>

          {/* Details Grid */}
          <div className="bg-[#F4F8F7] rounded-2xl p-4 border border-slate-200/70 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-[#0F766E]" /> Service:
              </span>
              <span className="font-bold text-slate-800">{appointment.service}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#0F766E]" /> Practitioner:
              </span>
              <span className="font-bold text-slate-800">{appointment.staffName || appointment.doctorName || 'Practitioner'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#0F766E]" /> Date:
              </span>
              <span className="font-bold text-slate-800">{appointment.date || (appointment.startAt ? appointment.startAt.split('T')[0] : 'N/A')}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#0F766E]" /> Time & Duration:
              </span>
              <span className="font-bold text-slate-800">
                {appointment.time || (appointment.startAt ? appointment.startAt.split('T')[1]?.slice(0, 5) : '08:00')} ({appointment.duration || 15} mins)
              </span>
            </div>

            {appointment.notes && (
              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">Notes:</span>
                <p className="text-slate-700 mt-0.5">{appointment.notes}</p>
              </div>
            )}
          </div>

          {/* Status Update Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
              Update Patient Status
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                onClick={() => { onUpdateStatus(appointment.id, 'confirmed'); onClose(); }}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  appointment.status === 'confirmed'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                Confirmed
              </button>

              <button
                onClick={() => { onUpdateStatus(appointment.id, 'attended'); onClose(); }}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  appointment.status === 'attended'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                }`}
              >
                Attended
              </button>

              <button
                onClick={() => { onUpdateStatus(appointment.id, 'pending'); onClose(); }}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  appointment.status === 'pending'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                }`}
              >
                Pending
              </button>

              <button
                onClick={() => { onUpdateStatus(appointment.id, 'noshow'); onClose(); }}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  appointment.status === 'noshow'
                    ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                No-Show
              </button>

              <button
                onClick={() => { onUpdateStatus(appointment.id, 'cancelled'); onClose(); }}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  appointment.status === 'cancelled'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                }`}
              >
                Cancelled
              </button>

              <button
                onClick={() => {
                  alert(`WhatsApp reminder dispatched to ${appointment.patientPhone}!`);
                }}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-teal-200 bg-teal-50 text-[#0F766E] hover:bg-teal-100 transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Delete Action */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <button
              onClick={() => {
                if (confirm('Delete this appointment record?')) {
                  onDelete(appointment.id);
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Record</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
