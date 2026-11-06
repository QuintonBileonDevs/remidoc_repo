import React, { useState } from 'react';
import { X, User, Phone, MessageSquare, AlertCircle } from 'lucide-react';
import { Patient } from '../types';
import { formatAndValidatePhone } from '../utils/phoneUtils';

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patient: Omit<Patient, 'id'>) => void;
  existingPhones?: string[];
}

export const PatientModal: React.FC<PatientModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingPhones = [],
}) => {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappConsent, setWhatsappConsent] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePhoneChange = (val: string) => {
    setPhoneNumber(val);
    const { formatted } = formatAndValidatePhone(val);
    if (formatted && existingPhones.includes(formatted)) {
      setDuplicateWarning(`Warning: ${formatted} already exists for another patient.`);
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setFormError('Patient full name is required.');
      return;
    }

    const { isValid, formatted, error } = formatAndValidatePhone(phoneNumber);
    if (!isValid) {
      setFormError(error || 'Invalid phone number format.');
      return;
    }

    onSave({
      fullName: fullName.trim(),
      phoneNumber: formatted,
      whatsappConsent,
      whatsappConsentDate: whatsappConsent ? new Date().toISOString() : null,
      active: true,
      createdAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-[#F4F8F7]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0F766E]/10 flex items-center justify-center text-[#0F766E]">
              <User className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-[#0B2B2A]">Register New Patient</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {duplicateWarning && (
            <div className="bg-amber-50 border border-amber-300 text-amber-800 px-3.5 py-2.5 rounded-xl text-xs font-semibold">
              {duplicateWarning}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Full Patient Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Neo Modise"
                className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Phone Number (+267 default)
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="e.g. 71234567 or +26771234567"
                className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
              />
            </div>
          </div>

          <div className="bg-teal-50/60 border border-teal-200/80 rounded-xl p-3.5 space-y-1.5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={whatsappConsent}
                onChange={(e) => setWhatsappConsent(e.target.checked)}
                className="w-4 h-4 text-[#0F766E] rounded border-slate-300 focus:ring-[#0F766E] mt-0.5"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-[#0B2B2A] flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  Patient agreed to receive WhatsApp reminders
                </span>
                <p className="text-[11px] text-slate-500 font-normal leading-relaxed">
                  Consent date and time will be recorded for compliance.
                </p>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0F766E] hover:bg-[#0d655e] rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
            >
              Register Patient
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
