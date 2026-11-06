import React, { useState } from 'react';
import { 
  Plus, 
  Edit2, 
  Archive, 
  UserCheck, 
  Clock, 
  Stethoscope, 
  RotateCcw, 
  AlertCircle,
  Building2,
  CheckCircle2,
  Layers,
  LayoutGrid
} from 'lucide-react';
import { Staff, StaffRole, DaySchedule, WeekDays, Practice } from '../types';
import { RemiMascot } from './RemiMascot';
import { ConfirmationModal } from './ConfirmationModal';
import { getFacilityTypeMeta, FACILITY_TYPE_COLORS } from '../utils/practiceCatalog';

interface StaffViewProps {
  staffList: Staff[];
  practices: Practice[];
  onSaveStaff: (staff: Omit<Staff, 'id'>, id?: string) => Promise<void>;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
  isLoading?: boolean;
}

const defaultWorkingHours: Record<WeekDays, DaySchedule> = {
  monday: { start: '08:00', end: '17:00', isOff: false },
  tuesday: { start: '08:00', end: '17:00', isOff: false },
  wednesday: { start: '08:00', end: '17:00', isOff: false },
  thursday: { start: '08:00', end: '17:00', isOff: false },
  friday: { start: '08:00', end: '17:00', isOff: false },
  saturday: { start: '08:00', end: '13:00', isOff: false },
  sunday: { start: '08:00', end: '13:00', isOff: true },
};

const dayLabels: Record<WeekDays, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export const StaffView: React.FC<StaffViewProps> = ({
  staffList,
  practices,
  onSaveStaff,
  onToggleActive,
  isLoading = false,
}) => {
  const [viewMode, setViewMode] = useState<'grouped' | 'grid'>('grouped');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [practiceFilter, setPracticeFilter] = useState<string>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  const activePractices = practices.filter((p) => p.active !== false);

  // Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState<StaffRole>('doctor');
  const [selectedPracticeIds, setSelectedPracticeIds] = useState<string[]>([]);
  const [workingHours, setWorkingHours] = useState<Record<WeekDays, DaySchedule>>(defaultWorkingHours);
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmation state
  const [pendingDeactivate, setPendingDeactivate] = useState<Staff | null>(null);

  const openAddModal = (initialPracticeId?: string) => {
    setEditingStaff(null);
    setName('');
    setRole('doctor');
    // Pre-select initialPracticeId or current filter practice or first active practice
    const defaultIds = initialPracticeId
      ? [initialPracticeId]
      : (practiceFilter !== 'all' ? [practiceFilter] : (activePractices[0] ? [activePractices[0].id] : []));
    setSelectedPracticeIds(defaultIds);
    setWorkingHours(defaultWorkingHours);
    setActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (staff: Staff) => {
    setEditingStaff(staff);
    setName(staff.name);
    setRole(staff.role);
    setSelectedPracticeIds(staff.practiceIds && staff.practiceIds.length > 0 ? staff.practiceIds : (activePractices[0] ? [activePractices[0].id] : []));
    setWorkingHours(staff.workingHours || defaultWorkingHours);
    setActive(staff.active);
    setFormError(null);
    setIsModalOpen(true);
  };

  const togglePracticeSelection = (pId: string) => {
    setSelectedPracticeIds((prev) => 
      prev.includes(pId) ? prev.filter((id) => id !== pId) : [...prev, pId]
    );
  };

  const updateDaySchedule = (day: WeekDays, updates: Partial<DaySchedule>) => {
    setWorkingHours({
      ...workingHours,
      [day]: {
        ...workingHours[day],
        ...updates,
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Staff name is required.');
      return;
    }
    if (selectedPracticeIds.length === 0) {
      setFormError('Please assign at least one practice for this practitioner.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveStaff(
        {
          name: name.trim(),
          role,
          practiceIds: selectedPracticeIds,
          workingHours,
          active,
          createdAt: editingStaff?.createdAt || new Date().toISOString(),
        },
        editingStaff?.id
      );
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save staff member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStaff = staffList.filter((s) => {
    if (statusFilter === 'active' && !s.active) return false;
    if (statusFilter === 'inactive' && s.active) return false;

    if (practiceFilter !== 'all') {
      if (!s.practiceIds || !s.practiceIds.includes(practiceFilter)) {
        return false;
      }
    }

    return true;
  });

  const getRoleBadge = (r: StaffRole) => {
    switch (r) {
      case 'doctor':
        return <span className="bg-teal-50 text-[#0F766E] border border-teal-200 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Doctor</span>;
      case 'nurse':
        return <span className="bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Nurse</span>;
      case 'other':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Staff</span>;
    }
  };

  const renderStaffCard = (staff: Staff) => {
    const assignedPractices = practices.filter((p) => staff.practiceIds?.includes(p.id));

    return (
      <div
        key={staff.id}
        className={`bg-white rounded-2xl border p-5 transition-all shadow-xs flex flex-col justify-between ${
          staff.active
            ? 'border-slate-200 hover:border-teal-300 hover:shadow-md'
            : 'border-slate-200 bg-slate-50/70 opacity-75'
        }`}
      >
        <div className="space-y-4">
          {/* Staff Info Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0F766E] font-bold text-sm shrink-0">
                {staff.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 className="text-base font-bold text-[#0B2B2A] tracking-tight">{staff.name}</h4>
                <div className="mt-0.5">{getRoleBadge(staff.role)}</div>
              </div>
            </div>

            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                staff.active
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}
            >
              {staff.active ? 'Active' : 'Archived'}
            </span>
          </div>

          {/* Multi-Practice Assignment Badges */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-400" />
              <span>Associated Practices ({assignedPractices.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {assignedPractices.length === 0 ? (
                <span className="text-[11px] text-slate-400 italic">No practices assigned</span>
              ) : (
                assignedPractices.map((p) => {
                  const color = FACILITY_TYPE_COLORS[p.facilityType] || FACILITY_TYPE_COLORS.other;
                  return (
                    <span
                      key={p.id}
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${color.badge}`}
                    >
                      <Building2 className="w-2.5 h-2.5" />
                      <span>{p.name}</span>
                    </span>
                  );
                })
              )}
            </div>
          </div>

          {/* Working hours preview */}
          <div className="bg-[#F4F8F7] p-3 rounded-xl border border-slate-200/60 text-xs space-y-1">
            <div className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
              <Clock className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Weekly Working Hours</span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-600">
              <div>Mon-Fri: <span className="font-medium text-slate-800">{staff.workingHours?.monday?.isOff ? 'Off' : `${staff.workingHours?.monday?.start || '08:00'} - ${staff.workingHours?.monday?.end || '17:00'}`}</span></div>
              <div>Saturday: <span className="font-medium text-slate-800">{staff.workingHours?.saturday?.isOff ? 'Off' : `${staff.workingHours?.saturday?.start || '08:00'} - ${staff.workingHours?.saturday?.end || '13:00'}`}</span></div>
              <div>Sunday: <span className="font-medium text-slate-800">{staff.workingHours?.sunday?.isOff ? 'Off' : `${staff.workingHours?.sunday?.start || '08:00'} - ${staff.workingHours?.sunday?.end || '13:00'}`}</span></div>
            </div>
          </div>
        </div>

        {/* Card Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-slate-100">
          <button
            onClick={() => openEditModal(staff)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Edit Profile</span>
          </button>

          {staff.active ? (
            <button
              onClick={() => setPendingDeactivate(staff)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Deactivate</span>
            </button>
          ) : (
            <button
              onClick={() => onToggleActive(staff.id, true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#0F766E] bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reactivate</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle (Grouped by Practice vs Grid) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'grouped'
                  ? 'bg-white text-[#0F766E] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Group staff by practice"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Grouped by Practice</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-[#0F766E] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Show all practitioners in a grid"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Flat Grid</span>
            </button>
          </div>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          {/* Practice Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Practice:</span>
            <select
              value={practiceFilter}
              onChange={(e) => setPracticeFilter(e.target.value)}
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

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Status:</span>
            {(['active', 'all', 'inactive'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl capitalize transition-all cursor-pointer ${
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

        {/* Add Practitioner Button */}
        <button
          onClick={() => openAddModal()}
          className="flex items-center gap-2 bg-[#0F766E] hover:bg-[#0d655e] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Practitioner</span>
        </button>
      </div>

      {/* Staff Listing */}
      {filteredStaff.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-4">
          <RemiMascot size="lg" />
          <div className="space-y-1 max-w-sm">
            <h4 className="text-lg font-bold text-[#0B2B2A]">
              {statusFilter === 'inactive' ? 'No archived practitioners' : 'No practitioners found'}
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed font-normal">
              {statusFilter === 'inactive'
                ? 'Deactivated practitioners will appear here.'
                : 'Add clinic doctors, nurses, and medical staff to manage schedules and multi-practice assignments.'}
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => openAddModal()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0d655e] text-white font-bold text-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Practitioner</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'grouped' ? (
        /* Grouped by Practice View */
        <div className="space-y-8">
          {(practiceFilter === 'all' 
            ? practices.filter((p) => p.active !== false || filteredStaff.some(s => s.practiceIds?.includes(p.id)))
            : practices.filter((p) => p.id === practiceFilter)
          ).map((practice) => {
            const practiceStaff = filteredStaff.filter((s) => s.practiceIds?.includes(practice.id));
            const color = FACILITY_TYPE_COLORS[practice.facilityType] || FACILITY_TYPE_COLORS.other;
            const meta = getFacilityTypeMeta(practice.facilityType);

            return (
              <div 
                key={practice.id} 
                className="bg-white rounded-3xl border border-slate-200/90 p-5 md:p-6 shadow-xs space-y-4 transition-all"
              >
                {/* Practice Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0F766E] shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-[#0B2B2A]">{practice.name}</h3>
                        {practice.active === false && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                            Inactive Practice
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${color.badge}`}>
                          {meta.label}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs font-semibold text-slate-500">
                          {practiceStaff.length} {practiceStaff.length === 1 ? 'practitioner' : 'practitioners'} assigned
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openAddModal(practice.id)}
                    className="self-start sm:self-auto flex items-center gap-1.5 text-xs font-bold text-[#0F766E] hover:text-[#0b4844] hover:bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200/70 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Assign Practitioner to {practice.name}</span>
                  </button>
                </div>

                {/* Practitioners in this practice */}
                {practiceStaff.length === 0 ? (
                  <div className="py-8 text-center bg-[#F4F8F7]/60 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-xs font-medium text-slate-500">
                      No practitioners currently assigned to <strong className="text-slate-700">{practice.name}</strong>.
                    </p>
                    <button
                      type="button"
                      onClick={() => openAddModal(practice.id)}
                      className="mt-2 text-xs font-bold text-[#0F766E] hover:underline cursor-pointer"
                    >
                      + Assign practitioner now
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {practiceStaff.map((staff) => renderStaffCard(staff))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Unassigned Staff section if any exist */}
          {filteredStaff.some((s) => !s.practiceIds || s.practiceIds.length === 0) && (
            <div className="bg-amber-50/50 rounded-3xl border border-amber-200/80 p-5 md:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-amber-200/50">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-amber-950">Unassigned Practitioners</h3>
                  <p className="text-xs text-amber-800">
                    These staff members have no practices assigned. Edit their profile to assign them to a practice.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStaff
                  .filter((s) => !s.practiceIds || s.practiceIds.length === 0)
                  .map((staff) => renderStaffCard(staff))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Flat Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStaff.map((staff) => renderStaffCard(staff))}
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-slate-100 bg-[#F4F8F7] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0B2B2A]">
                  {editingStaff ? 'Edit Practitioner Profile & Hours' : 'Add New Practitioner'}
                </h3>
                <p className="text-xs text-slate-500">
                  Assign practitioner to practices and configure working schedule
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Name and Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0B2B2A] uppercase tracking-wider mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Sarah Jenkins"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0B2B2A] uppercase tracking-wider mb-1.5">
                    Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as StaffRole)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-[#0B2B2A] font-medium focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E] transition-all cursor-pointer"
                  >
                    <option value="doctor">Doctor / Specialist</option>
                    <option value="nurse">Nurse / Practitioner</option>
                    <option value="other">Other Clinical Staff</option>
                  </select>
                </div>
              </div>

              {/* Practice Assignment (Multi-select) */}
              <div>
                <label className="block text-xs font-bold text-[#0B2B2A] uppercase tracking-wider mb-1">
                  Practices Assigned <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Check all practices within this facility where this practitioner consults
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {practices.map((p) => {
                    const isChecked = selectedPracticeIds.includes(p.id);
                    const meta = getFacilityTypeMeta(p.facilityType);
                    return (
                      <label
                        key={p.id}
                        onClick={() => togglePracticeSelection(p.id)}
                        className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                          isChecked
                            ? 'border-[#0F766E] bg-teal-50/60 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent onClick
                          className="mt-0.5 w-4 h-4 text-[#0F766E] rounded-sm focus:ring-[#0F766E] cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#0B2B2A] truncate">{p.name}</div>
                          <div className="text-[10px] text-slate-500">{meta.label}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Weekly Working Hours */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#0B2B2A] uppercase tracking-wider">
                    Weekly Working Hours
                  </label>
                  <span className="text-[11px] text-slate-400">Times outside these hours are greyed out on calendar</span>
                </div>

                <div className="space-y-2 bg-[#F4F8F7] p-3 rounded-2xl border border-slate-200/80 max-h-56 overflow-y-auto">
                  {(Object.keys(dayLabels) as WeekDays[]).map((day) => {
                    const sched = workingHours[day] || { start: '08:00', end: '17:00', isOff: false };
                    return (
                      <div key={day} className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg bg-white border border-slate-100">
                        <span className="w-24 font-bold text-slate-700 capitalize">{dayLabels[day]}</span>

                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sched.isOff}
                              onChange={(e) => updateDaySchedule(day, { isOff: e.target.checked })}
                              className="w-3.5 h-3.5 rounded-sm text-[#0F766E] focus:ring-[#0F766E]"
                            />
                            <span>Off</span>
                          </label>

                          {!sched.isOff ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="time"
                                value={sched.start}
                                onChange={(e) => updateDaySchedule(day, { start: e.target.value })}
                                className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                              />
                              <span className="text-slate-400 font-bold">-</span>
                              <input
                                type="time"
                                value={sched.end}
                                onChange={(e) => updateDaySchedule(day, { end: e.target.value })}
                                className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                              />
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-slate-400 italic px-6">Not working</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Active Toggle (Editing) */}
              {editingStaff && (
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0B2B2A]">Practitioner Active Status</span>
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

              {/* Form Actions */}
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
                  {isSubmitting ? 'Saving...' : editingStaff ? 'Save Changes' : 'Create Practitioner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal */}
      {pendingDeactivate && (
        <ConfirmationModal
          isOpen={!!pendingDeactivate}
          title="Deactivate Practitioner?"
          message={`Are you sure you want to deactivate "${pendingDeactivate.name}"? Past appointment logs are preserved, but they will be removed from future scheduling slots until reactivated.`}
          confirmLabel="Deactivate Practitioner"
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
