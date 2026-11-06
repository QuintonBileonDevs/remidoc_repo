import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  CheckCircle2, 
  Building, 
  Stethoscope, 
  Phone, 
  MapPin, 
  Layers, 
  Users, 
  Globe, 
  Clock, 
  Calendar, 
  Mail, 
  Loader2, 
  Building2,
  Sparkles,
  User,
  Plus,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Bell,
  ShieldAlert
} from 'lucide-react';
import { Service, Staff, Practice, FacilityType } from '../types';
import { ServicesView } from './ServicesView';
import { StaffView } from './StaffView';
import { PracticesView } from './PracticesView';
import { RemiMascot } from './RemiMascot';
import { ClinicRecord } from '../utils/sessionManager';
import { getFacilityTypeMeta, FACILITY_TYPE_COLORS } from '../utils/practiceCatalog';
import { runSecurityDiagnostic, DiagnosticResult } from '../utils/securityDiagnostic';
import { auth } from '../firebase';

interface SettingsViewProps {
  initialSubTab?: 'practices' | 'services' | 'staff' | 'general' | 'reminders_template';
  practices: Practice[];
  onSavePractice: (practice: Omit<Practice, 'id'>, id?: string, seedCatalog?: boolean) => Promise<void>;
  onTogglePracticeActive: (id: string, active: boolean) => Promise<void>;
  services: Service[];
  onSaveService: (service: Omit<Service, 'id'>, id?: string) => Promise<void>;
  onToggleServiceActive: (id: string, active: boolean) => Promise<void>;
  onSeedDefaultServices?: () => Promise<void>;
  staffList: Staff[];
  onSaveStaff: (staff: Omit<Staff, 'id'>, id?: string) => Promise<void>;
  onToggleStaffActive: (id: string, active: boolean) => Promise<void>;
  clinicData: ClinicRecord;
  userEmail?: string;
  userName?: string;
  onSaveClinicProfile: (updated: Partial<ClinicRecord>) => Promise<void>;
  onOpenPracticeWizard?: () => void;
  onGoToStaffTab?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  initialSubTab = 'practices',
  practices,
  onSavePractice,
  onTogglePracticeActive,
  services,
  onSaveService,
  onToggleServiceActive,
  onSeedDefaultServices,
  staffList,
  onSaveStaff,
  onToggleStaffActive,
  clinicData,
  userEmail = '',
  userName = '',
  onSaveClinicProfile,
  onOpenPracticeWizard,
  onGoToStaffTab,
}) => {
  const [subTab, setSubTab] = useState<'practices' | 'services' | 'staff' | 'general' | 'reminders_template'>(initialSubTab);

  const [templateEn, setTemplateEn] = useState<string>(
    clinicData.reminderTemplates?.en || "Hello {patientName}. This is a reminder from {facilityName}: you have an appointment on {date} at {time}. Please reply YES to confirm, or let us know if you need to reschedule."
  );
  const [templateTn, setTemplateTn] = useState<string>(
    clinicData.reminderTemplates?.tn || ""
  );
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateSavedMsg, setTemplateSavedMsg] = useState(false);

  const handleSaveTemplates = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTemplate(true);
    try {
      await onSaveClinicProfile({
        reminderTemplates: {
          en: templateEn,
          tn: templateTn,
        },
      });
      setTemplateSavedMsg(true);
      setTimeout(() => setTemplateSavedMsg(false), 3000);
    } catch (err) {
      console.error('Error saving templates:', err);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Form state initialized directly from Firestore registration data
  const [clinicName, setClinicName] = useState(clinicData.name || '');
  const [leadDoctor, setLeadDoctor] = useState(clinicData.leadDoctor || userName || '');
  const [phone, setPhone] = useState(clinicData.phone || '+267 390 1234');
  const [address, setAddress] = useState(clinicData.address || 'Plot 54320, CBD Tower, Gaborone, Botswana');
  const [email, setEmail] = useState(userEmail || '');
  const [specialty, setSpecialty] = useState(clinicData.specialty || 'Multidisciplinary Healthcare Facility');
  const [openingHours, setOpeningHours] = useState(clinicData.openingHours || 'Mon-Fri 08:00-17:00, Sat 08:00-13:00');
  const [timezone, setTimezone] = useState(clinicData.timezone || 'Africa/Gaborone');
  const [autoReminders, setAutoReminders] = useState(clinicData.autoReminders ?? true);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult[] | null>(null);
  const [diagnosticRunning, setDiagnosticRunning] = useState(false);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    if (clinicData) {
      setClinicName(clinicData.name || '');
      setLeadDoctor(clinicData.leadDoctor || userName || '');
      setPhone(clinicData.phone || '+267 390 1234');
      setAddress(clinicData.address || 'Plot 54320, CBD Tower, Gaborone, Botswana');
      setSpecialty(clinicData.specialty || 'Multidisciplinary Healthcare Facility');
      setOpeningHours(clinicData.openingHours || 'Mon-Fri 08:00-17:00, Sat 08:00-13:00');
      setTimezone(clinicData.timezone || 'Africa/Gaborone');
      setAutoReminders(clinicData.autoReminders ?? true);
    }
  }, [clinicData, userName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    try {
      await onSaveClinicProfile({
        name: clinicName.trim(),
        leadDoctor: leadDoctor.trim(),
        phone: phone.trim(),
        address: address.trim(),
        specialty: specialty.trim(),
        openingHours: openingHours.trim(),
        timezone: timezone.trim(),
        autoReminders,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (err: any) {
      console.error('Error saving clinic profile:', err);
      setErrorMessage(err.message || 'Failed to save practice profile.');
    } finally {
      setSaving(false);
    }
  };

  // Derive unique facility types from active practices
  const activePractices = practices.filter((p) => p.active !== false);
  const facilityTypes: FacilityType[] = Array.from(new Set(activePractices.map((p) => p.facilityType)));

  return (
    <div className="flex-1 p-6 sm:p-8 space-y-6 bg-[#F4F8F7] overflow-y-auto">
      {/* Sub-Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B2B2A]">Facility & Practice Management</h2>
          <p className="text-xs text-slate-500 font-medium">Configure facility practices, consultation services, practitioner hours, and facility settings</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-xs">
          <button
            onClick={() => setSubTab('practices')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'practices'
                ? 'bg-[#0F766E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Practices</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${subTab === 'practices' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {practices.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('services')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'services'
                ? 'bg-[#0F766E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Services</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${subTab === 'services' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {services.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('staff')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'staff'
                ? 'bg-[#0F766E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${subTab === 'staff' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {staffList.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('general')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'general'
                ? 'bg-[#0F766E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Facility Profile</span>
          </button>

          <button
            onClick={() => setSubTab('reminders_template')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'reminders_template'
                ? 'bg-[#0F766E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>WhatsApp Templates</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {subTab === 'practices' && (
        <PracticesView
          practices={practices}
          services={services}
          staffList={staffList}
          clinicData={clinicData}
          onSavePractice={onSavePractice}
          onToggleActive={onTogglePracticeActive}
          onSaveService={onSaveService}
          onToggleServiceActive={onToggleServiceActive}
          onOpenWizard={onOpenPracticeWizard}
          onGoToStaff={() => {
            setSubTab('staff');
            if (onGoToStaffTab) onGoToStaffTab();
          }}
          onGoToServices={(pId) => {
            setSubTab('services');
          }}
        />
      )}

      {subTab === 'services' && (
        <ServicesView
          services={services}
          practices={practices}
          onSaveService={onSaveService}
          onToggleActive={onToggleServiceActive}
          onSeedDefaults={onSeedDefaultServices}
        />
      )}

      {subTab === 'staff' && (
        <StaffView
          staffList={staffList}
          practices={practices}
          onSaveStaff={onSaveStaff}
          onToggleActive={onToggleStaffActive}
        />
      )}

      {subTab === 'reminders_template' && (
        <div className="max-w-3xl space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div>
              <span className="text-xs font-bold text-[#0F766E] uppercase tracking-wider">WhatsApp Reminder Templates</span>
              <h3 className="text-xl font-extrabold text-[#0B2B2A] mt-1">Configure Click-to-Chat Message Template</h3>
              <p className="text-xs text-slate-500 mt-0.5">Customize the default message template used by receptionists when dispatching WhatsApp click-to-chat reminders.</p>
            </div>

            {templateSavedMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Reminder templates successfully saved!</span>
              </div>
            )}

            <form onSubmit={handleSaveTemplates} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  English Template ({'{en}'})
                </label>
                <textarea
                  rows={4}
                  value={templateEn}
                  onChange={(e) => setTemplateEn(e.target.value)}
                  className="w-full bg-[#F4F8F7] border border-slate-200 rounded-2xl p-4 text-sm text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                />
                <div className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl mt-2 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Don't include medical details in reminders. Messages may be seen by others.</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Setswana Template (Optional) ({'{tn}'})
                </label>
                <textarea
                  rows={3}
                  value={templateTn}
                  onChange={(e) => setTemplateTn(e.target.value)}
                  placeholder="Setswana translation (leave empty if using English only)"
                  className="w-full bg-[#F4F8F7] border border-slate-200 rounded-2xl p-4 text-sm text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30"
                />
              </div>

              {/* Live Preview Card */}
              <div className="bg-teal-50/50 border border-teal-200 p-4 rounded-2xl space-y-2">
                <div className="text-xs font-bold text-teal-900 uppercase tracking-wider">Live Preview (Sample Patient)</div>
                <div className="bg-white p-3.5 rounded-xl border border-teal-100 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {templateEn
                    .replace(/\{patientName\}/g, 'Eleanor Vance')
                    .replace(/\{facilityName\}/g, clinicData.name || clinicName || 'Remidoc Healthcare Facility')
                    .replace(/\{practiceName\}/g, 'General Practice')
                    .replace(/\{practitionerName\}/g, 'Dr. Lesego Tlhware')
                    .replace(/\{date\}/g, 'Tue 20 Oct')
                    .replace(/\{time\}/g, '09:00')}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingTemplate}
                  className="px-6 py-3 bg-[#0F766E] hover:bg-[#0d655e] text-white rounded-2xl text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingTemplate ? 'Saving...' : 'Save Templates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {subTab === 'general' && (
        <div className="max-w-5xl space-y-8 animate-in fade-in duration-200">
          {/* Facility Name & Profile Header */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[#0F766E] uppercase tracking-wider">Facility Profile</span>
                <h3 className="text-2xl font-black text-[#0B2B2A] tracking-tight mt-0.5">
                  {clinicData.name || clinicName || 'Remidoc Healthcare Facility'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Shared reception facility under Firestore ID: <code className="text-[11px] bg-slate-100 px-2 py-0.5 rounded-md text-teal-800 font-mono">{clinicData.id}</code>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full w-fit">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Shared Reception Desk Active
                </span>
                {onOpenPracticeWizard && (
                  <button
                    type="button"
                    onClick={onOpenPracticeWizard}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0F766E] hover:bg-[#0b544f] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Setup Wizard</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Facility Badges */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>{clinicData.address || address || 'Gaborone, Botswana'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>{clinicData.openingHours || openingHours}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>Timezone: {clinicData.timezone || timezone}</span>
              </div>
            </div>
          </div>

          {/* Cards for Each Practice with Type, Services, and Assigned Practitioners */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-[#0B2B2A]">
                  Facility Practices &amp; Departments ({practices.length})
                </h4>
                <p className="text-xs text-slate-500">
                  Practices operating within this facility, their active consultation services and assigned practitioners
                </p>
              </div>
            </div>

            {practices.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center flex flex-col items-center justify-center space-y-4">
                <RemiMascot size="lg" />
                <div className="space-y-1 max-w-sm">
                  <h4 className="text-base font-bold text-[#0B2B2A]">No practices added yet</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Set up your first practice with its services, duration, and practitioners to begin taking appointments.
                  </p>
                </div>
                {onOpenPracticeWizard && (
                  <button
                    type="button"
                    onClick={onOpenPracticeWizard}
                    className="flex items-center gap-2 px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Launch Practice Setup Wizard</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {practices.map((practice) => {
                  const meta = getFacilityTypeMeta(practice.facilityType);
                  const color = FACILITY_TYPE_COLORS[practice.facilityType] || FACILITY_TYPE_COLORS.other;
                  const practiceServices = services.filter((s) => s.practiceId === practice.id && s.active !== false);
                  const practiceStaff = staffList.filter((st) => st.practiceIds?.includes(practice.id) && st.active !== false);

                  return (
                    <div
                      key={practice.id}
                      className={`bg-white rounded-3xl border p-5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between ${
                        practice.active === false ? 'opacity-75 bg-slate-50/70 border-slate-200' : 'border-slate-200'
                      }`}
                    >
                      <div className="space-y-4">
                        {/* Practice Header with Type Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0F766E] shrink-0">
                              <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-base font-bold text-[#0B2B2A] leading-tight">{practice.name}</h4>
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border mt-1 ${color.badge}`}>
                                <span>{meta.label}</span>
                              </span>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                              practice.active !== false
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            {practice.active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        {/* Services List with Duration and Buffer */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700 flex items-center gap-1.5">
                              <Stethoscope className="w-3.5 h-3.5 text-[#0F766E]" />
                              <span>Services Offered ({practiceServices.length})</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setSubTab('services')}
                              className="text-[11px] font-bold text-[#0F766E] hover:underline cursor-pointer"
                            >
                              Manage
                            </button>
                          </div>

                          {practiceServices.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic py-1">
                              No active services configured for this practice.
                            </p>
                          ) : (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                              {practiceServices.map((svc) => {
                                const dur = svc.durationMinutes ?? svc.duration ?? 15;
                                const buf = svc.bufferMinutes ?? svc.buffer ?? 0;
                                return (
                                  <div
                                    key={svc.id}
                                    className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-[#F4F8F7] rounded-xl border border-slate-200/60"
                                  >
                                    <span className="font-semibold text-[#0B2B2A] truncate max-w-[200px]">
                                      {svc.name}
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0 text-[11px]">
                                      <span className="font-bold text-slate-700">{dur}m</span>
                                      {buf > 0 ? (
                                        <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 text-[10px]">
                                          +{buf}m buffer
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 text-[10px]">(0m buffer)</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Assigned Practitioners List */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700 flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-[#0F766E]" />
                              <span>Assigned Practitioners ({practiceStaff.length})</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setSubTab('staff')}
                              className="text-[11px] font-bold text-[#0F766E] hover:underline cursor-pointer"
                            >
                              Manage
                            </button>
                          </div>

                          {practiceStaff.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic py-1">
                              No clinical practitioners assigned yet.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {practiceStaff.map((staff) => (
                                <div
                                  key={staff.id}
                                  className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl text-xs"
                                >
                                  <div className="w-5 h-5 rounded-full bg-teal-100 text-[#0F766E] font-bold flex items-center justify-center text-[9px] shrink-0">
                                    {staff.name.slice(0, 1).toUpperCase()}
                                  </div>
                                  <span className="font-bold text-slate-800 text-[11px] truncate max-w-[120px]">
                                    {staff.name}
                                  </span>
                                  <span className="text-[9px] font-semibold text-slate-500 uppercase">
                                    ({staff.role})
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Quick Link */}
                      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-400">
                          {practiceServices.length} services • {practiceStaff.length} staff
                        </span>
                        <button
                          type="button"
                          onClick={() => setSubTab('practices')}
                          className="font-bold text-[#0F766E] hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
                        >
                          <span>Practice Settings</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Facility Profile Settings Form */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div>
              <h4 className="text-base font-bold text-[#0B2B2A]">Facility Reception Settings</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Update building name, lead director, operating hours and contact details for the shared facility
              </p>
            </div>

          {saved && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-semibold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Facility profile successfully updated and synchronized to Firestore.</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold animate-in fade-in">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Facility Name
                </label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#0B2B2A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Lead Practitioner / Facility Director
                </label>
                <div className="relative">
                  <Stethoscope className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={leadDoctor}
                    onChange={(e) => setLeadDoctor(e.target.value)}
                    className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#0B2B2A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Reception Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#0B2B2A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Receptionist / Admin Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="w-full bg-slate-100/80 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-500 font-semibold cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Physical Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#0B2B2A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Timezone
                </label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#0B2B2A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                Facility & Reception Operating Hours
              </label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={openingHours}
                  onChange={(e) => setOpeningHours(e.target.value)}
                  className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#0B2B2A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Default operating hours for the reception desk and building</span>
            </div>

            {/* Notification & WhatsApp Gateway Configuration */}
            <div className="p-4 bg-[#F4F8F7] rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#0B2B2A]">Automated WhatsApp Reminders</div>
                  <div className="text-[11px] text-slate-500">Send automatic appointment reminders using Botswana (+267) international gateway format</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoReminders}
                    onChange={(e) => setAutoReminders(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0F766E]"></div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-slate-200">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-[#0F766E] hover:bg-[#0d655e] text-white px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{saving ? 'Saving...' : 'Save Facility Profile'}</span>
              </button>
            </div>
          </form>

          {/* Security Rules Diagnostic Tool */}
          <div className="mt-8 pt-6 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0B2B2A]">Firestore Security Rules Diagnostic</h3>
                <p className="text-xs text-emerald-700 font-mono mt-0.5 font-bold">Signed-in UID: {auth.currentUser?.uid || 'Not signed in'}</p>
                <p className="text-xs text-slate-500 mt-0.5">Facility ID: {clinicData.id}</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  setDiagnosticRunning(true);
                  try {
                    const res = await runSecurityDiagnostic();
                    setDiagnosticResults(res);
                  } catch (err) {
                    console.error('Diagnostic error:', err);
                  } finally {
                    setDiagnosticRunning(false);
                  }
                }}
                disabled={diagnosticRunning}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {diagnosticRunning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{diagnosticRunning ? 'Running Diagnostic...' : 'Run Security Diagnostic'}</span>
              </button>
            </div>

            {diagnosticResults && (
              <div className="bg-slate-900 rounded-2xl p-4 text-white space-y-3 font-mono text-xs overflow-x-auto">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                  <span>Collection Path / Target</span>
                  <span>Operation</span>
                  <span>Status</span>
                </div>
                {diagnosticResults.map((res, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-4 py-1 border-b border-slate-800/50 last:border-0">
                    <span className="text-emerald-400 truncate max-w-[240px]" title={res.path}>{res.path}</span>
                    <span className="text-amber-300 uppercase text-[10px] bg-amber-950/50 px-2 py-0.5 rounded">{res.operation}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      res.status === 'SUCCESS' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                    }`}>
                      {res.status}
                    </span>
                  </div>
                ))}
                <div className="text-[11px] text-slate-400 pt-2 italic">
                  Detailed console logs with [SECURITY DIAGNOSTIC] prefix have also been output to the browser console.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
