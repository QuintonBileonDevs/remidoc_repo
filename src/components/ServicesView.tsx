import React, { useState } from 'react';
import { 
  Plus, 
  Edit2, 
  Archive, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  AlertCircle, 
  RotateCcw, 
  Building2, 
  Layers,
  ChevronDown
} from 'lucide-react';
import { Service, Practice } from '../types';
import { RemiMascot } from './RemiMascot';
import { ConfirmationModal } from './ConfirmationModal';
import { 
  getFacilityTypeMeta, 
  FACILITY_TYPE_COLORS, 
  getServicesForFacilityType 
} from '../utils/practiceCatalog';

interface ServicesViewProps {
  services: Service[];
  practices: Practice[];
  onSaveService: (service: Omit<Service, 'id'>, id?: string) => Promise<void>;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
  onSeedDefaults?: () => Promise<void>;
  isLoading?: boolean;
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  services,
  practices,
  onSaveService,
  onToggleActive,
  isLoading = false,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [selectedPracticeFilter, setSelectedPracticeFilter] = useState<string>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form State
  const activePractices = practices.filter((p) => p.active !== false);
  const [practiceId, setPracticeId] = useState<string>(activePractices[0]?.id || '');
  const [name, setName] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [bufferMinutes, setBufferMinutes] = useState<number>(0);
  const [isCustom, setIsCustom] = useState<boolean>(true);
  const [catalogKey, setCatalogKey] = useState<string | null>(null);
  const [active, setActive] = useState<boolean>(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deactivation confirmation modal state
  const [pendingDeactivate, setPendingDeactivate] = useState<Service | null>(null);

  const selectedPracticeObj = practices.find((p) => p.id === practiceId) || activePractices[0];
  const catalogOptions = selectedPracticeObj ? getServicesForFacilityType(selectedPracticeObj.facilityType) : [];

  const openAddModal = () => {
    setEditingService(null);
    const defaultP = selectedPracticeFilter !== 'all' ? selectedPracticeFilter : (activePractices[0]?.id || '');
    setPracticeId(defaultP);
    setName('');
    setDurationMinutes(15);
    setBufferMinutes(0);
    setIsCustom(true);
    setCatalogKey(null);
    setActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (svc: Service) => {
    setEditingService(svc);
    setPracticeId(svc.practiceId || activePractices[0]?.id || '');
    setName(svc.name);
    setDurationMinutes(svc.durationMinutes ?? svc.duration ?? 15);
    setBufferMinutes(svc.bufferMinutes ?? svc.buffer ?? 0);
    setIsCustom(svc.isCustom !== undefined ? svc.isCustom : true);
    setCatalogKey(svc.catalogKey || null);
    setActive(svc.active);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handlePickCatalogItem = (itemKey: string) => {
    const item = catalogOptions.find((c) => c.key === itemKey);
    if (!item) return;
    setName(item.name);
    setDurationMinutes(item.durationMinutes);
    setBufferMinutes(item.bufferMinutes);
    setIsCustom(false);
    setCatalogKey(item.key);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Service name is required.');
      return;
    }
    if (!practiceId) {
      setFormError('Please select a practice for this service.');
      return;
    }
    if (durationMinutes < 1) {
      setFormError('Duration must be at least 1 minute.');
      return;
    }
    if (bufferMinutes < 0) {
      setFormError('Buffer cannot be negative.');
      return;
    }

    // Validation: no duplicate service names within a practice
    const trimmedName = name.trim().toLowerCase();
    const isDuplicate = services.some(
      (s) =>
        s.practiceId === practiceId &&
        s.active !== false &&
        s.id !== editingService?.id &&
        s.name.trim().toLowerCase() === trimmedName
    );
    if (isDuplicate) {
      setFormError(`A service named "${name.trim()}" already exists in this practice. Duplicate service names within a practice are not allowed.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveService(
        {
          practiceId,
          name: name.trim(),
          durationMinutes: Number(durationMinutes),
          bufferMinutes: Number(bufferMinutes),
          duration: Number(durationMinutes),
          buffer: Number(bufferMinutes),
          isCustom,
          catalogKey: isCustom ? null : catalogKey,
          active,
          createdAt: editingService?.createdAt || new Date().toISOString(),
        },
        editingService?.id
      );
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredServices = services.filter((s) => {
    // Status filter
    if (statusFilter === 'active' && !s.active) return false;
    if (statusFilter === 'inactive' && s.active) return false;

    // Practice filter
    if (selectedPracticeFilter !== 'all' && s.practiceId !== selectedPracticeFilter) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Filter and Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        {/* Practice and Status Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Practice Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Practice:</span>
            <select
              value={selectedPracticeFilter}
              onChange={(e) => setSelectedPracticeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-semibold text-[#0B2B2A] rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 cursor-pointer"
            >
              <option value="all">All Practices ({practices.length})</option>
              {practices.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.active === false ? '(Inactive)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          {/* Status Pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Status:</span>
            {(['active', 'all', 'inactive'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl capitalize transition-all cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-[#0F766E] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Add Service Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-[#0F766E] hover:bg-[#0d655e] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Service</span>
          </button>
        </div>
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-4">
          <RemiMascot size="lg" />
          <div className="space-y-1 max-w-sm">
            <h4 className="text-lg font-bold text-[#0B2B2A]">
              {statusFilter === 'inactive' ? 'No archived services' : 'No services found'}
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed font-normal">
              {statusFilter === 'inactive'
                ? 'Deactivated services appear here. You can reactivate them anytime.'
                : 'Add consultation or procedure services to allow receptionists to book appointments for each practice.'}
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0d655e] text-white font-bold text-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Service</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServices.map((svc) => {
            const assignedPractice = practices.find((p) => p.id === svc.practiceId);
            const facilityMeta = assignedPractice ? getFacilityTypeMeta(assignedPractice.facilityType) : null;
            const color = assignedPractice ? (FACILITY_TYPE_COLORS[assignedPractice.facilityType] || FACILITY_TYPE_COLORS.other) : FACILITY_TYPE_COLORS.other;
            const duration = svc.durationMinutes ?? svc.duration ?? 15;
            const buffer = svc.bufferMinutes ?? svc.buffer ?? 0;

            return (
              <div
                key={svc.id}
                className={`bg-white rounded-2xl border p-5 transition-all shadow-xs flex flex-col justify-between ${
                  svc.active
                    ? 'border-slate-200 hover:border-teal-300 hover:shadow-md'
                    : 'border-slate-200 bg-slate-50/70 opacity-75'
                }`}
              >
                <div className="space-y-3">
                  {/* Practice Badge & Active Status */}
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border flex items-center gap-1.5 truncate max-w-[200px] ${color.badge}`}>
                      <Building2 className="w-3 h-3 shrink-0" />
                      <span className="truncate">{assignedPractice?.name || 'Primary Practice'}</span>
                    </span>

                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                        svc.active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {svc.active ? 'Active' : 'Archived'}
                    </span>
                  </div>

                  {/* Service Title */}
                  <div>
                    <h4 className="text-base font-bold text-[#0B2B2A] tracking-tight">{svc.name}</h4>
                    {svc.isCustom === false && (
                      <span className="text-[10px] font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md inline-block mt-1">
                        Catalog Service
                      </span>
                    )}
                  </div>

                  {/* Duration and Buffer Details */}
                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-[#0F766E]" />
                        <span>Duration</span>
                      </span>
                      <strong className="text-slate-800 font-bold">{duration} mins</strong>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <span className="w-3.5 h-3.5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[9px] font-bold">+</span>
                        <span>Post-buffer</span>
                      </span>
                      <strong className="text-slate-800 font-bold">{buffer} mins</strong>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-slate-100">
                  <button
                    onClick={() => openEditModal(svc)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit</span>
                  </button>

                  {svc.active ? (
                    <button
                      onClick={() => setPendingDeactivate(svc)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Deactivate</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onToggleActive(svc.id, true)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#0F766E] bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reactivate</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-slate-100 bg-[#F4F8F7] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0B2B2A]">
                  {editingService ? 'Edit Service' : 'Add Practice Service'}
                </h3>
                <p className="text-xs text-slate-500">
                  Configure consultation length and post-appointment buffer
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Target Practice Selector */}
              <div>
                <label className="block text-xs font-bold text-[#0B2B2A] uppercase tracking-wider mb-1.5">
                  Target Practice <span className="text-rose-500">*</span>
                </label>
                <select
                  value={practiceId}
                  onChange={(e) => {
                    setPracticeId(e.target.value);
                    setCatalogKey(null);
                  }}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-[#0B2B2A] font-medium focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E] transition-all cursor-pointer"
                  required
                >
                  {practices.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({getFacilityTypeMeta(p.facilityType).label}) {p.active === false ? '- Inactive' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Pick from Practice Facility Catalog */}
              {!editingService && catalogOptions.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0F766E] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      Quick Catalog for {getFacilityTypeMeta(selectedPracticeObj?.facilityType || 'general_practice').label}
                    </span>
                    <span className="text-[10px] text-teal-700/80 font-medium">Click to pre-fill</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {catalogOptions.map((opt) => (
                      <button
                        type="button"
                        key={opt.key}
                        onClick={() => handlePickCatalogItem(opt.key)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer text-left ${
                          catalogKey === opt.key
                            ? 'bg-[#0F766E] text-white border-[#0F766E] font-bold shadow-xs'
                            : 'bg-white text-slate-700 border-teal-200/80 hover:bg-teal-100/50'
                        }`}
                      >
                        {opt.name} ({opt.durationMinutes}m)
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Service Name */}
              <div>
                <label className="block text-xs font-bold text-[#0B2B2A] uppercase tracking-wider mb-1.5">
                  Service Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. General consultation, Teeth cleaning, Follow-up"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (catalogKey) {
                      setIsCustom(true);
                      setCatalogKey(null);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E] transition-all"
                  required
                />
              </div>

              {/* Duration and Buffer Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0B2B2A] uppercase tracking-wider mb-1.5">
                    Duration (Minutes) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      step="5"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E] transition-all"
                      required
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-semibold pointer-events-none">
                      min
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                    {[10, 15, 20, 30, 45, 60].map((chip) => (
                      <button
                        type="button"
                        key={chip}
                        onClick={() => setDurationMinutes(chip)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          durationMinutes === chip
                            ? 'bg-[#0F766E] text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        {chip}m
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">Appointment slot duration</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0B2B2A] uppercase tracking-wider mb-1.5">
                    Post-Appointment Buffer
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={bufferMinutes}
                      onChange={(e) => setBufferMinutes(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E] transition-all"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-semibold pointer-events-none">
                      min
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                    {[0, 5, 10, 15].map((chip) => (
                      <button
                        type="button"
                        key={chip}
                        onClick={() => setBufferMinutes(chip)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          bufferMinutes === chip
                            ? 'bg-teal-700 text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        +{chip}m
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">Prep / cleaning / rest period</span>
                </div>
              </div>

              {/* Active Toggle (for editing) */}
              {editingService && (
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0B2B2A]">Service Active Status</span>
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
              )}

              {/* Form Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#0F766E] hover:bg-[#0d655e] text-white shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : editingService ? 'Save Service' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal (Soft-Delete) */}
      {pendingDeactivate && (
        <ConfirmationModal
          isOpen={!!pendingDeactivate}
          title="Deactivate Service?"
          message={`Are you sure you want to deactivate "${pendingDeactivate.name}"? Existing appointments booked with this service remain intact, but it will be hidden from new bookings until reactivated.`}
          confirmLabel="Deactivate Service"
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
    </div>
  );
};
