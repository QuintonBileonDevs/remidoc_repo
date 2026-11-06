import React, { useState } from 'react';
import { Users, Plus, Phone, Search, Edit2, Archive, RotateCcw, AlertTriangle, CheckCircle2, MessageSquare, ShieldCheck, X } from 'lucide-react';
import { Patient } from '../types';
import { RemiMascot } from './RemiMascot';
import { ConfirmationModal } from './ConfirmationModal';
import { formatAndValidatePhone } from '../utils/phoneUtils';

interface PatientsViewProps {
  patients: Patient[];
  onSavePatient: (patient: Omit<Patient, 'id'>, id?: string) => Promise<void>;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
  isLoading?: boolean;
}

export const PatientsView: React.FC<PatientsViewProps> = ({
  patients,
  onSavePatient,
  onToggleActive,
  isLoading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [active, setActive] = useState(true);

  // Form Validation & Warnings
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Deactivate confirmation
  const [pendingDeactivate, setPendingDeactivate] = useState<Patient | null>(null);

  const openAddModal = () => {
    setEditingPatient(null);
    setFullName('');
    setPhoneNumber('');
    setWhatsappConsent(true); // default opt-in prompt
    setActive(true);
    setFormError(null);
    setDuplicateWarning(null);
    setIsModalOpen(true);
  };

  const openEditModal = (patient: Patient) => {
    setEditingPatient(patient);
    setFullName(patient.fullName);
    setPhoneNumber(patient.phoneNumber || patient.phone || '');
    setWhatsappConsent(patient.whatsappConsent);
    setActive(patient.active);
    setFormError(null);
    setDuplicateWarning(null);
    setIsModalOpen(true);
  };

  const handlePhoneChange = (val: string) => {
    setPhoneNumber(val);
    const { formatted } = formatAndValidatePhone(val);
    if (formatted) {
      const existing = patients.find(
        (p) => (p.phoneNumber || p.phone) === formatted && p.id !== editingPatient?.id
      );
      if (existing) {
        setDuplicateWarning(
          `Warning: Phone number ${formatted} is already registered to patient "${existing.fullName}".`
        );
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setFormError('Patient full name is required.');
      return;
    }

    const phoneValidation = formatAndValidatePhone(phoneNumber);
    if (!phoneValidation.isValid) {
      setFormError(phoneValidation.error || 'Please enter a valid phone number.');
      return;
    }

    // Determine consent timestamp
    let consentDate = editingPatient?.whatsappConsentDate || null;
    if (whatsappConsent) {
      if (!editingPatient?.whatsappConsent || !consentDate) {
        consentDate = new Date().toISOString();
      }
    } else {
      consentDate = null;
    }

    await onSavePatient(
      {
        fullName: fullName.trim(),
        phoneNumber: phoneValidation.formatted,
        whatsappConsent,
        whatsappConsentDate: consentDate,
        active,
      },
      editingPatient?.id
    );

    setIsModalOpen(false);
  };

  const filteredPatients = patients.filter((p) => {
    // Status filter
    if (filter === 'active' && !p.active) return false;
    if (filter === 'inactive' && p.active) return false;

    // Search filter
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(term) ||
      (p.phoneNumber || p.phone || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex-1 p-8 space-y-6 bg-[#F4F8F7] overflow-y-auto">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patients by name or phone (+267...)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-[#0B2B2A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
            />
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            {(['active', 'all', 'inactive'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl capitalize transition-all cursor-pointer ${
                  filter === tab
                    ? 'bg-[#0F766E] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-[#0F766E] hover:bg-[#0d655e] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Add Patient</span>
        </button>
      </div>

      {/* Patient Directory Grid / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-base font-bold text-[#0B2B2A]">
            Patient Records ({filteredPatients.length})
          </h3>
          <span className="text-xs text-slate-500 font-medium">Botswana (+267) Verified</span>
        </div>

        {filteredPatients.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center space-y-3 px-4">
            <RemiMascot size="lg" />
            <h4 className="text-lg font-bold text-[#0B2B2A]">
              {filter === 'inactive' ? 'No archived patients' : 'No patient records found'}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm font-normal">
              {searchTerm
                ? 'Try searching with a different name or phone number.'
                : 'Remi is ready when you are. Add your clinic patients to start sending automated appointment reminders.'}
            </p>
            {!searchTerm && filter !== 'inactive' && (
              <button
                onClick={openAddModal}
                className="mt-2 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0d655e] text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Register Patient</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredPatients.map((patient) => (
              <div
                key={patient.id}
                className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                  patient.active ? 'hover:bg-slate-50/80' : 'bg-slate-50/40 opacity-75'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0F766E] font-bold text-sm shrink-0">
                    {patient.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-base font-bold text-[#0B2B2A]">{patient.fullName}</h4>
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                          patient.active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {patient.active ? 'Active' : 'Archived'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                      <span className="flex items-center gap-1.5 font-medium text-slate-800">
                        <Phone className="w-3.5 h-3.5 text-[#0F766E]" />
                        {patient.phoneNumber}
                      </span>

                      {patient.whatsappConsent ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          WhatsApp Reminders Opted-In
                          {patient.whatsappConsentDate && (
                            <span className="text-[10px] text-emerald-600/80 font-normal">
                              ({new Date(patient.whatsappConsentDate).toLocaleDateString()})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          WhatsApp Not Opted-In
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => openEditModal(patient)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit</span>
                  </button>

                  {patient.active ? (
                    <button
                      onClick={() => setPendingDeactivate(patient)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Deactivate</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onToggleActive(patient.id, true)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#0F766E] bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reactivate</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Patient Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 bg-[#F4F8F7] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0F766E]/10 flex items-center justify-center text-[#0F766E]">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#0B2B2A]">
                  {editingPatient ? 'Edit Patient Record' : 'Register New Patient'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {duplicateWarning && (
                <div className="bg-amber-50 border border-amber-300 text-amber-800 px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>{duplicateWarning}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Kagiso Motlhanka"
                  className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Phone Number (Botswana +267 default)
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
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Format: Enter standard 8-digit mobile or international +prefix.
                </span>
              </div>

              {/* WhatsApp Consent Checkbox */}
              <div className="bg-teal-50/60 border border-teal-200/80 rounded-xl p-3.5 space-y-1.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whatsappConsent}
                    onChange={(e) => setWhatsappConsent(e.target.checked)}
                    className="w-4 h-4 text-[#0F766E] rounded border-slate-300 focus:ring-[#0F766E] mt-0.5 shrink-0"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-[#0B2B2A] flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      Patient agreed to receive WhatsApp reminders
                    </span>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                      Remidoc automatically logs the date and timestamp of consent to ensure compliance.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-[#0F766E] hover:bg-[#0d655e] rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  {editingPatient ? 'Save Patient' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deactivation */}
      <ConfirmationModal
        isOpen={!!pendingDeactivate}
        title="Deactivate Patient Record"
        message={`Are you sure you want to deactivate "${pendingDeactivate?.fullName}"? The patient will be archived and will not appear in active booking selections, but past consultation histories remain intact.`}
        confirmLabel="Deactivate Patient"
        onConfirm={() => {
          if (pendingDeactivate) {
            onToggleActive(pendingDeactivate.id, false);
          }
        }}
        onClose={() => setPendingDeactivate(null)}
      />
    </div>
  );
};
