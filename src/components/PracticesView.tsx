import React, { useState } from 'react';
import { 
  Plus, 
  Edit2, 
  Archive, 
  CheckCircle2, 
  Building2, 
  RotateCcw, 
  Layers, 
  Users, 
  Stethoscope, 
  Clock, 
  Globe,
  Sparkles,
  AlertCircle,
  Settings,
  Trash2,
  ExternalLink,
  Check,
  X
} from 'lucide-react';
import { Practice, FacilityType, Service, Staff } from '../types';
import { 
  FACILITY_TYPES, 
  FACILITY_TYPE_COLORS, 
  getFacilityTypeMeta, 
  getServicesForFacilityType 
} from '../utils/practiceCatalog';
import { RemiMascot } from './RemiMascot';
import { ConfirmationModal } from './ConfirmationModal';
import { ClinicRecord } from '../utils/sessionManager';

interface PracticesViewProps {
  practices: Practice[];
  services: Service[];
  staffList: Staff[];
  clinicData: ClinicRecord;
  onSavePractice: (practice: Omit<Practice, 'id'>, id?: string, seedCatalog?: boolean) => Promise<void>;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
  onSaveService?: (service: Omit<Service, 'id'>, id?: string) => Promise<void>;
  onToggleServiceActive?: (id: string, active: boolean) => Promise<void>;
  onOpenWizard?: () => void;
  onGoToStaff?: () => void;
  onGoToServices?: (practiceId?: string) => void;
  isLoading?: boolean;
}

export const PracticesView: React.FC<PracticesViewProps> = ({
  practices,
  services,
  staffList,
  clinicData,
  onSavePractice,
  onToggleActive,
  onSaveService,
  onToggleServiceActive,
  onOpenWizard,
  onGoToStaff,
  onGoToServices,
  isLoading = false,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPractice, setEditingPractice] = useState<Practice | null>(null);

  // Edit Practice Form State
  const [practiceName, setPracticeName] = useState('');
  const [facilityType, setFacilityType] = useState<FacilityType>('general_practice');
  const [active, setActive] = useState(true);
  const [activeTabInModal, setActiveTabInModal] = useState<'details' | 'services'>('details');

  // New Service addition within the practice edit modal
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState<number>(15);
  const [newServiceBuffer, setNewServiceBuffer] = useState<number>(0);
  const [isAddingNewService, setIsAddingNewService] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmation state for practice deactivation
  const [pendingDeactivate, setPendingDeactivate] = useState<Practice | null>(null);
  // Confirmation state for service soft-delete
  const [pendingDeactivateService, setPendingDeactivateService] = useState<Service | null>(null);

  const openEditModal = (practice: Practice, initialTab: 'details' | 'services' = 'details') => {
    setEditingPractice(practice);
    setPracticeName(practice.name);
    setFacilityType(practice.facilityType);
    setActive(practice.active !== false);
    setActiveTabInModal(initialTab);
    setIsAddingNewService(false);
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleSavePracticeDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practiceName.trim()) {
      setFormError('Practice name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingPractice) {
        await onSavePractice(
          {
            name: practiceName.trim(),
            facilityType,
            active,
            createdAt: editingPractice.createdAt || new Date().toISOString(),
          },
          editingPractice.id
        );
      }
      setIsEditModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to update practice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add a new service directly to this practice
  const handleAddNewServiceToPractice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPractice || !onSaveService) return;
    if (!newServiceName.trim()) {
      setFormError('Service name is required.');
      return;
    }
    if (newServiceDuration <= 0) {
      setFormError('Duration must be greater than 0 minutes.');
      return;
    }

    // Check duplicate service name within this practice
    const trimmedName = newServiceName.trim().toLowerCase();
    const isDuplicate = services.some(
      (s) =>
        s.practiceId === editingPractice.id &&
        s.active !== false &&
        s.name.trim().toLowerCase() === trimmedName
    );
    if (isDuplicate) {
      setFormError(`A service named "${newServiceName.trim()}" already exists in this practice. Duplicate service names within a practice are not allowed.`);
      return;
    }

    try {
      await onSaveService({
        practiceId: editingPractice.id,
        name: newServiceName.trim(),
        durationMinutes: newServiceDuration,
        bufferMinutes: newServiceBuffer,
        duration: newServiceDuration,
        buffer: newServiceBuffer,
        isCustom: true,
        catalogKey: null,
        active: true,
        createdAt: new Date().toISOString(),
      });
      setNewServiceName('');
      setNewServiceDuration(15);
      setNewServiceBuffer(0);
      setIsAddingNewService(false);
      setFormError(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to add service.');
    }
  };

  // Update existing service duration/buffer
  const handleUpdateServiceDuration = async (svc: Service, duration: number, buffer: number) => {
    if (!onSaveService) return;
    try {
      await onSaveService(
        {
          practiceId: svc.practiceId,
          name: svc.name,
          durationMinutes: duration,
          bufferMinutes: buffer,
          duration: duration,
          buffer: buffer,
          isCustom: svc.isCustom ?? true,
          catalogKey: svc.catalogKey || null,
          active: svc.active !== false,
          createdAt: svc.createdAt || new Date().toISOString(),
        },
        svc.id
      );
    } catch (err) {
      console.error('Error updating service duration:', err);
    }
  };

  const filteredPractices = practices.filter((p) => {
    if (filter === 'active') return p.active !== false;
    if (filter === 'inactive') return p.active === false;
    return true;
  });

  const activePractices = practices.filter((p) => p.active !== false);

  // Services belonging to the practice currently being edited
  const editingPracticeServices = editingPractice
    ? services.filter((s) => s.practiceId === editingPractice.id)
    : [];

  const durationQuickChips = [10, 15, 20, 30, 45, 60];

  return (
    <div className="space-y-6">
      {/* Facility Reception Hub Card */}
      <div className="bg-gradient-to-r from-[#0B2B2A] to-[#0F766E] text-white p-6 rounded-3xl shadow-sm border border-teal-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-teal-400/20 text-teal-200 border border-teal-300/30">
                Facility & Reception Hub
              </span>
              <span className="text-xs text-teal-200/80 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                {clinicData.timezone || 'Africa/Gaborone'}
              </span>
            </div>
            <h3 className="text-2xl font-black tracking-tight text-white">{clinicData.name}</h3>
            <p className="text-xs text-teal-100/80 max-w-2xl leading-relaxed">
              One shared reception desk booking across {activePractices.length} active practice{activePractices.length === 1 ? '' : 's'}. Each practice maintains its own service catalog and practitioner assignments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2 md:pt-0">
            {/* Primary Practice Setup Wizard Button */}
            <button
              onClick={onOpenWizard}
              className="flex items-center gap-2 bg-[#FB7185] hover:bg-[#f4516c] text-white font-extrabold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Practice Setup Wizard</span>
            </button>
          </div>
        </div>

        {/* Facility Types Tags */}
        <div className="mt-5 pt-4 border-t border-teal-800/60 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-teal-200 uppercase tracking-wider mr-1">
            Active Facility Types:
          </span>
          {activePractices.length === 0 ? (
            <span className="text-xs text-teal-300/60 italic">No active practices configured</span>
          ) : (
            Array.from(new Set(activePractices.map((p) => p.facilityType))).map((ft) => {
              const meta = getFacilityTypeMeta(ft);
              return (
                <span
                  key={ft}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 text-white border border-white/20 backdrop-blur-xs flex items-center gap-1.5"
                >
                  <Building2 className="w-3 h-3 text-teal-300" />
                  {meta.label}
                </span>
              );
            })
          )}
        </div>
      </div>

      {/* Top Filter and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Filter:</span>
          {(['active', 'all', 'inactive'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl capitalize transition-all cursor-pointer ${
                filter === tab
                  ? 'bg-[#0F766E] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 bg-slate-50'
              }`}
            >
              {tab} ({practices.filter((p) => (tab === 'active' ? p.active !== false : tab === 'inactive' ? p.active === false : true)).length})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenWizard}
            className="flex items-center justify-center gap-2 bg-[#0F766E] hover:bg-[#0d655e] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Practice</span>
          </button>
        </div>
      </div>

      {/* Practices List / Grid */}
      {filteredPractices.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-4">
          <RemiMascot size="lg" />
          <div className="space-y-1 max-w-sm">
            <h4 className="text-lg font-bold text-[#0B2B2A]">
              {filter === 'active' ? 'No active practices found' : 'No practices found'}
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed font-normal">
              A facility can have multiple practices (e.g. General Practice, Dental Care, Physiotherapy) that share one reception desk. Use the wizard to set up your practice with catalog services.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={onOpenWizard}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0d655e] text-white font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch Practice Setup Wizard</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPractices.map((practice) => {
            const meta = getFacilityTypeMeta(practice.facilityType);
            const color = FACILITY_TYPE_COLORS[practice.facilityType] || FACILITY_TYPE_COLORS.other;
            const practiceServices = services.filter((s) => s.practiceId === practice.id);
            const activePracticeServices = practiceServices.filter((s) => s.active !== false);
            const practiceStaff = staffList.filter((st) => st.practiceIds?.includes(practice.id) && st.active !== false);

            return (
              <div
                key={practice.id}
                className={`bg-white rounded-2xl border p-5 transition-all shadow-xs flex flex-col justify-between ${
                  practice.active !== false
                    ? 'border-slate-200 hover:border-teal-400 hover:shadow-md'
                    : 'border-slate-200/60 bg-slate-50/70 opacity-75'
                }`}
              >
                <div>
                  {/* Top Bar with Facility Type Badge & Status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${color.badge}`}>
                      <Building2 className="w-3.5 h-3.5" />
                      {meta.label}
                    </span>

                    {practice.active !== false ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-200 text-slate-600">
                        Deactivated
                      </span>
                    )}
                  </div>

                  {/* Practice Name & Description */}
                  <h4 className="text-base font-bold text-[#0B2B2A] mb-1">{practice.name}</h4>
                  <p className="text-xs text-slate-500 mb-4 line-clamp-2">{meta.description}</p>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs mb-3">
                    <button
                      type="button"
                      onClick={() => openEditModal(practice, 'services')}
                      className="flex items-center gap-2 p-1 rounded-lg hover:bg-teal-50/60 text-left transition-colors cursor-pointer"
                      title="Manage practice services"
                    >
                      <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-[#0B2B2A]">{activePracticeServices.length}</div>
                        <div className="text-[10px] text-teal-700 font-medium">Services ›</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={onGoToStaff}
                      className="flex items-center gap-2 p-1 rounded-lg hover:bg-teal-50/60 text-left transition-colors cursor-pointer"
                      title="Manage assigned practitioners"
                    >
                      <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-[#0B2B2A]">{practiceStaff.length}</div>
                        <div className="text-[10px] text-teal-700 font-medium">Staff ›</div>
                      </div>
                    </button>
                  </div>

                  {/* Services Preview snippet */}
                  {activePracticeServices.length > 0 && (
                    <div className="mb-4">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Services Sample</span>
                        <button
                          type="button"
                          onClick={() => openEditModal(practice, 'services')}
                          className="text-[#0F766E] hover:underline"
                        >
                          View all
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {activePracticeServices.slice(0, 3).map((s) => (
                          <span
                            key={s.id}
                            className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium truncate max-w-[140px]"
                          >
                            {s.name} ({s.durationMinutes || s.duration}m)
                          </span>
                        ))}
                        {activePracticeServices.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px]">
                            +{activePracticeServices.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Actions: Rename, Manage Services, Deactivate */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">
                    ID: <span className="font-mono text-[10px] text-slate-500">{practice.id.slice(0, 8)}...</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(practice, 'services')}
                      className="px-2.5 py-1 text-xs font-bold text-[#0F766E] hover:bg-teal-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      title="Edit Services, Durations & Buffers"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Services</span>
                    </button>

                    <button
                      onClick={() => openEditModal(practice, 'details')}
                      className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                      title="Rename or Edit Practice"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {practice.active !== false ? (
                      <button
                        onClick={() => setPendingDeactivate(practice)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Deactivate Practice (Soft-delete)"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => onToggleActive(practice.id, true)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="Reactivate Practice"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= EDIT PRACTICE & SERVICES MODAL ================= */}
      {isEditModalOpen && editingPractice && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#0F766E] flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0B2B2A]">
                    Edit Practice: {editingPractice.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Rename practice, modify facility type, or update services, durations & buffers
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Tabs: Practice Details vs Services */}
            <div className="flex items-center gap-2 mb-5 border-b border-slate-100 pb-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTabInModal('details')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTabInModal === 'details'
                    ? 'bg-[#0F766E] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Practice Details</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTabInModal('services')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTabInModal === 'services'
                    ? 'bg-[#0F766E] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Services ({editingPracticeServices.filter((s) => s.active !== false).length})</span>
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* TAB 1: Practice Details */}
            {activeTabInModal === 'details' && (
              <form onSubmit={handleSavePracticeDetails} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#0B2B2A] uppercase tracking-wider mb-1.5">
                    Practice Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={practiceName}
                    onChange={(e) => setPracticeName(e.target.value)}
                    placeholder="e.g. CBD Dental Practice"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0B2B2A] uppercase tracking-wider mb-1.5">
                    Facility Type
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {FACILITY_TYPES.map((ft) => {
                      const isSelected = facilityType === ft.key;
                      return (
                        <button
                          type="button"
                          key={ft.key}
                          onClick={() => setFacilityType(ft.key)}
                          className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'border-[#0F766E] bg-teal-50 text-[#0F766E] font-bold shadow-2xs'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span className="text-xs">{ft.label}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-[#0F766E]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <div>
                    <span className="text-xs font-bold text-[#0B2B2A] block">Practice Status</span>
                    <span className="text-[11px] text-slate-500">Deactivating hides this practice from booking slots</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0F766E]"></div>
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0F766E] hover:bg-[#0d655e] text-white shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Practice Details'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: Services Management for this Practice */}
            {activeTabInModal === 'services' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#0B2B2A] uppercase tracking-wider">
                      Services for {editingPractice.name}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Add, adjust durations and buffers, or deactivate services for this practice.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAddingNewService(!isAddingNewService)}
                    className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#0F766E] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAddingNewService ? 'Cancel' : 'Add Service'}</span>
                  </button>
                </div>

                {/* Inline Add New Service Form */}
                {isAddingNewService && (
                  <form
                    onSubmit={handleAddNewServiceToPractice}
                    className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-2xl space-y-3"
                  >
                    <div className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-teal-700" />
                      <span>Add New Service to {editingPractice.name}</span>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        placeholder="Service name (e.g. Scaling & Polish, Comprehensive Exam)"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                        autoFocus
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Duration (min) *
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            value={newServiceDuration}
                            onChange={(e) => setNewServiceDuration(Number(e.target.value) || 15)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Buffer After (min)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={newServiceBuffer}
                          onChange={(e) => setNewServiceBuffer(Number(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingNewService(false)}
                        className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3.5 py-1 bg-[#0F766E] hover:bg-[#0d655e] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                      >
                        Save Service
                      </button>
                    </div>
                  </form>
                )}

                {/* Table of Practice Services */}
                {editingPracticeServices.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                    No services yet for this practice. Click "Add Service" above to add one.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                    <div className="max-h-[300px] overflow-y-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <tr>
                            <th className="py-2 px-3">Service</th>
                            <th className="py-2 px-3 w-32">Duration</th>
                            <th className="py-2 px-3 w-28">Buffer</th>
                            <th className="py-2 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {editingPracticeServices.map((svc) => (
                            <tr
                              key={svc.id}
                              className={`hover:bg-slate-50/80 transition-colors ${
                                svc.active === false ? 'bg-slate-50/60 opacity-60' : ''
                              }`}
                            >
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-slate-800">{svc.name}</span>
                                  {svc.isCustom && (
                                    <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                      Custom
                                    </span>
                                  )}
                                  {svc.active === false && (
                                    <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-slate-200 text-slate-600">
                                      Deactivated
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Duration with quick chips */}
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="1"
                                    value={svc.durationMinutes ?? svc.duration ?? 15}
                                    onChange={(e) =>
                                      handleUpdateServiceDuration(
                                        svc,
                                        Number(e.target.value) || 15,
                                        svc.bufferMinutes ?? svc.buffer ?? 0
                                      )
                                    }
                                    className="w-14 px-1.5 py-0.5 text-xs font-bold rounded border border-slate-200 bg-white"
                                  />
                                  <span className="text-[10px] text-slate-400">m</span>
                                </div>
                              </td>

                              {/* Buffer */}
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    value={svc.bufferMinutes ?? svc.buffer ?? 0}
                                    onChange={(e) =>
                                      handleUpdateServiceDuration(
                                        svc,
                                        svc.durationMinutes ?? svc.duration ?? 15,
                                        Number(e.target.value) || 0
                                      )
                                    }
                                    className="w-12 px-1.5 py-0.5 text-xs font-bold rounded border border-slate-200 bg-white"
                                  />
                                  <span className="text-[10px] text-slate-400">m</span>
                                </div>
                              </td>

                              {/* Soft Delete / Reactivate */}
                              <td className="py-2.5 px-3 text-right">
                                {svc.active !== false ? (
                                  <button
                                    type="button"
                                    onClick={() => setPendingDeactivateService(svc)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                    title="Deactivate Service"
                                  >
                                    <Archive className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => onToggleServiceActive && onToggleServiceActive(svc.id, true)}
                                    className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                                    title="Reactivate Service"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Practice Soft Deactivation */}
      {pendingDeactivate && (
        <ConfirmationModal
          isOpen={!!pendingDeactivate}
          title="Deactivate Practice?"
          message={`Are you sure you want to deactivate "${pendingDeactivate.name}"? Existing appointments and patient records are preserved. You can reactivate this practice at any time.`}
          confirmLabel="Deactivate Practice"
          cancelLabel="Cancel"
          isDestructive={true}
          onConfirm={async () => {
            if (pendingDeactivate) {
              await onToggleActive(pendingDeactivate.id, false);
              setPendingDeactivate(null);
            }
          }}
          onClose={() => setPendingDeactivate(null)}
        />
      )}

      {/* Confirmation Modal for Service Soft Deactivation */}
      {pendingDeactivateService && (
        <ConfirmationModal
          isOpen={!!pendingDeactivateService}
          title="Deactivate Service?"
          message={`Are you sure you want to deactivate "${pendingDeactivateService.name}"? Existing appointments booked with this service remain intact, but it will be hidden from new bookings until reactivated.`}
          confirmLabel="Deactivate Service"
          cancelLabel="Cancel"
          isDestructive={true}
          onConfirm={async () => {
            if (pendingDeactivateService && onToggleServiceActive) {
              await onToggleServiceActive(pendingDeactivateService.id, false);
              setPendingDeactivateService(null);
            }
          }}
          onClose={() => setPendingDeactivateService(null)}
        />
      )}
    </div>
  );
};
