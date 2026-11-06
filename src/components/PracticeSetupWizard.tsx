import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  Layers, 
  Clock, 
  Plus, 
  Trash2, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  AlertCircle, 
  X, 
  Users, 
  Check, 
  ChevronRight,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { Practice, FacilityType, Service, CatalogServiceItem } from '../types';
import { auth } from '../firebase';
import { 
  FACILITY_TYPES, 
  FACILITY_TYPE_COLORS, 
  getFacilityTypeMeta, 
  getServicesForFacilityType 
} from '../utils/practiceCatalog';
import { RemiMascot } from './RemiMascot';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, setDoc } from 'firebase/firestore';

export interface PracticeWizardConfig {
  name: string;
  facilityType: FacilityType;
  services: {
    id?: string;
    name: string;
    durationMinutes: number;
    bufferMinutes: number;
    isCustom: boolean;
    catalogKey: string | null;
    selected: boolean;
  }[];
}

interface PracticeSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  clinicId: string;
  clinicName: string;
  onGoToStaff: () => void;
  onSaved?: (newPracticeId: string) => void;
  existingPracticesCount?: number;
}

export const PracticeSetupWizard: React.FC<PracticeSetupWizardProps> = ({
  isOpen,
  onClose,
  clinicId,
  clinicName,
  onGoToStaff,
  onSaved,
  existingPracticesCount = 0,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Practice details
  const [practiceName, setPracticeName] = useState(
    existingPracticesCount === 0 && clinicName ? `${clinicName} Practice` : 'General Health Practice'
  );
  const [facilityType, setFacilityType] = useState<FacilityType>('general_practice');

  // Step 2 & 3: Services configuration
  interface WizardServiceItem {
    id: string; // temporary key
    name: string;
    durationMinutes: number;
    bufferMinutes: number;
    isCustom: boolean;
    catalogKey: string | null;
    selected: boolean;
  }

  const [wizardServices, setWizardServices] = useState<WizardServiceItem[]>([]);
  const [customServiceName, setCustomServiceName] = useState('');
  const [customServiceError, setCustomServiceError] = useState<string | null>(null);

  // Step 3: Apply-to-all shortcut values
  const [applyAllDuration, setApplyAllDuration] = useState<number>(15);
  const [applyAllBuffer, setApplyAllBuffer] = useState<number>(0);
  const [showAppliedToast, setShowAppliedToast] = useState(false);

  // Validation & Loading
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedPracticeName, setSavedPracticeName] = useState('');

  // Queue of successfully created practices during this wizard session
  const [createdPracticesCount, setCreatedPracticesCount] = useState(0);

  // Initialize services when facilityType changes or on first mount
  useEffect(() => {
    const catalog = getServicesForFacilityType(facilityType);
    const initialItems: WizardServiceItem[] = catalog.map((item, idx) => ({
      id: `cat_${item.key}_${idx}`,
      name: item.name,
      // Default duration 15, default buffer 0 as specified in prompt
      durationMinutes: item.durationMinutes || 15,
      bufferMinutes: item.bufferMinutes || 0,
      isCustom: false,
      catalogKey: item.key,
      selected: true, // ticked by default
    }));

    setWizardServices(initialItems);
  }, [facilityType]);

  if (!isOpen) return null;

  // STEP 2 Handlers: Checklist & Custom Service
  const handleToggleService = (id: string) => {
    setWizardServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
    );
  };

  const handleSelectAllServices = (select: boolean) => {
    setWizardServices((prev) => prev.map((s) => ({ ...s, selected: select })));
  };

  const handleAddCustomService = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customServiceName.trim();
    if (!trimmed) {
      setCustomServiceError('Please enter a service name.');
      return;
    }

    if (wizardServices.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      setCustomServiceError('A service with this name is already in the list.');
      return;
    }

    const newCustom: WizardServiceItem = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      durationMinutes: 15, // Default 15
      bufferMinutes: 0,   // Default 0
      isCustom: true,
      catalogKey: null,
      selected: true,     // Automatically ticked
    };

    setWizardServices((prev) => [...prev, newCustom]);
    setCustomServiceName('');
    setCustomServiceError(null);
  };

  // STEP 3 Handlers: Duration & Buffer table
  const handleUpdateDuration = (id: string, duration: number) => {
    setWizardServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, durationMinutes: duration } : s))
    );
  };

  const handleUpdateBuffer = (id: string, buffer: number) => {
    setWizardServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, bufferMinutes: buffer } : s))
    );
  };

  const handleApplyToAll = () => {
    if (applyAllDuration <= 0) {
      setValidationError('Please specify a duration greater than 0 for Apply to All.');
      return;
    }
    setWizardServices((prev) =>
      prev.map((s) =>
        s.selected
          ? {
              ...s,
              durationMinutes: Number(applyAllDuration) || 15,
              bufferMinutes: Number(applyAllBuffer) || 0,
            }
          : s
      )
    );
    setShowAppliedToast(true);
    setTimeout(() => setShowAppliedToast(false), 2000);
  };

  // NAVIGATION VALIDATIONS
  const handleNextFromStep1 = () => {
    if (!practiceName.trim()) {
      setValidationError('Please enter a practice name.');
      return;
    }
    setValidationError(null);
    setCurrentStep(2);
  };

  const handleNextFromStep2 = () => {
    const selectedCount = wizardServices.filter((s) => s.selected).length;
    if (selectedCount === 0) {
      setValidationError('Please select at least one service offered by this practice.');
      return;
    }
    setValidationError(null);
    setCurrentStep(3);
  };

  const handleNextFromStep3 = () => {
    const selected = wizardServices.filter((s) => s.selected);
    // Requirement: "Require a duration before saving."
    const invalidService = selected.find(
      (s) => !s.durationMinutes || isNaN(s.durationMinutes) || s.durationMinutes <= 0
    );

    if (invalidService) {
      setValidationError(
        `Duration is required for "${invalidService.name}". Please enter a duration greater than 0 minutes.`
      );
      return;
    }

    setValidationError(null);
    setCurrentStep(4);
  };

  // STEP 4: Save practice and services to Firestore
  const handleSaveToFirestore = async (addAnother: boolean = false) => {
    if (!clinicId) {
      setValidationError('Facility context missing. Please ensure you are signed in.');
      return;
    }

    const selectedServices = wizardServices.filter((s) => s.selected);
    if (selectedServices.length === 0) {
      setValidationError('At least one service is required.');
      return;
    }

    // Double check duration requirement
    const invalid = selectedServices.find(
      (s) => !s.durationMinutes || isNaN(s.durationMinutes) || s.durationMinutes <= 0
    );
    if (invalid) {
      setValidationError(`Duration is required for "${invalid.name}".`);
      return;
    }

    setIsSaving(true);
    setValidationError(null);

    try {
      const nowIso = new Date().toISOString();

      // 1. Create Practice Document at facilities/{facilityId}/practices/{practiceId}
      const practiceDocRef = await addDoc(collection(db, 'facilities', clinicId, 'practices'), {
        name: practiceName.trim(),
        facilityType,
        active: true,
        createdAt: nowIso,
        createdBy: auth.currentUser?.uid || '',
        updatedAt: nowIso,
      });

      const newPracticeId = practiceDocRef.id;

      // 2. Create Service Documents at facilities/{facilityId}/services/{serviceId}
      for (const s of selectedServices) {
        await addDoc(collection(db, 'facilities', clinicId, 'services'), {
          practiceId: newPracticeId,
          name: s.name.trim(),
          durationMinutes: Number(s.durationMinutes) || 15,
          bufferMinutes: Number(s.bufferMinutes) || 0,
          isCustom: !!s.isCustom,
          catalogKey: s.isCustom ? null : s.catalogKey,
          active: true,
          createdAt: nowIso,
          createdBy: auth.currentUser?.uid || '',
          updatedAt: nowIso,
        });
      }

      // 3. Update facilities/{facilityId} with setupCompleted
      try {
        const facDoc = doc(db, 'facilities', clinicId);
        await updateDoc(facDoc, {
          setupCompleted: true,
          updatedAt: nowIso,
        });
      } catch (cErr) {
        console.warn('Could not update facility doc setupCompleted flag:', cErr);
      }

      // Record in localStorage that wizard has completed for this clinic
      try {
        localStorage.setItem(`practice_wizard_completed_${clinicId}`, 'true');
      } catch (lsErr) {}

      setSavedPracticeName(practiceName.trim());
      setSaveSuccess(true);
      setCreatedPracticesCount((c) => c + 1);

      if (onSaved) {
        onSaved(newPracticeId);
      }

      if (addAnother) {
        // Reset wizard for adding another practice
        setPracticeName('');
        setFacilityType('dental');
        setCurrentStep(1);
        setSaveSuccess(false);
        setIsSaving(false);
      } else {
        // Proceed to the Staff step!
        setTimeout(() => {
          setIsSaving(false);
          onClose();
          onGoToStaff();
        }, 800);
      }
    } catch (err: any) {
      console.error(`[FS] Error at path facilities/${clinicId}/practices (Code: ${err?.code}):`, err);
      setValidationError(`[FS] Error at facilities/${clinicId}/practices: [${err?.code || 'error'}] ${err.message || 'Failed to save practice and services.'}`);
      setIsSaving(false);
    }
  };

  const selectedServices = wizardServices.filter((s) => s.selected);
  const facilityMeta = getFacilityTypeMeta(facilityType);
  const facilityColors = FACILITY_TYPE_COLORS[facilityType] || FACILITY_TYPE_COLORS.other;

  // Duration quick pick chips
  const durationChips = [10, 15, 20, 30, 45, 60];
  const bufferChips = [0, 5, 10, 15];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Wizard Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-[#0B2B2A] to-[#0F766E] text-white flex items-center justify-between border-b border-teal-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-teal-200">
              <Building2 className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-200 border border-teal-300/30">
                  Practice Setup Wizard
                </span>
                {createdPracticesCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    {createdPracticesCount} practice{createdPracticesCount === 1 ? '' : 's'} added
                  </span>
                )}
              </div>
              <h2 className="text-lg font-black tracking-tight text-white mt-0.5">
                Configure Practice & Clinical Services
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-teal-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Wizard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Steps Stepper */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1 sm:gap-3 min-w-max mx-auto">
            {/* Step 1 */}
            <div className={`flex items-center gap-2 ${currentStep === 1 ? 'text-[#0F766E]' : currentStep > 1 ? 'text-emerald-700' : 'text-slate-400'}`}>
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                currentStep === 1 ? 'bg-[#0F766E] text-white shadow-xs' : currentStep > 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
              </div>
              <span className="text-xs font-bold hidden sm:inline">Add Practice</span>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />

            {/* Step 2 */}
            <div className={`flex items-center gap-2 ${currentStep === 2 ? 'text-[#0F766E]' : currentStep > 2 ? 'text-emerald-700' : 'text-slate-400'}`}>
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                currentStep === 2 ? 'bg-[#0F766E] text-white shadow-xs' : currentStep > 2 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {currentStep > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
              </div>
              <span className="text-xs font-bold hidden sm:inline">Select Services</span>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />

            {/* Step 3 */}
            <div className={`flex items-center gap-2 ${currentStep === 3 ? 'text-[#0F766E]' : currentStep > 3 ? 'text-emerald-700' : 'text-slate-400'}`}>
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                currentStep === 3 ? 'bg-[#0F766E] text-white shadow-xs' : currentStep > 3 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {currentStep > 3 ? <Check className="w-3.5 h-3.5" /> : '3'}
              </div>
              <span className="text-xs font-bold hidden sm:inline">Durations & Buffers</span>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />

            {/* Step 4 */}
            <div className={`flex items-center gap-2 ${currentStep === 4 ? 'text-[#0F766E]' : 'text-slate-400'}`}>
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                currentStep === 4 ? 'bg-[#0F766E] text-white shadow-xs' : 'bg-slate-200 text-slate-600'
              }`}>
                4
              </div>
              <span className="text-xs font-bold hidden sm:inline">Save & Staff</span>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {validationError && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{validationError}</span>
          </div>
        )}

        {/* Wizard Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* ================= STEP 1: Add a practice ================= */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-start gap-3.5 p-4 bg-teal-50/70 border border-teal-100 rounded-2xl">
                <RemiMascot size="sm" className="mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wide">
                    Step 1 of 4: Practice Information
                  </h4>
                  <p className="text-xs text-teal-800 leading-relaxed font-medium">
                    A healthcare facility can house multiple independent practices (e.g. General Practice, Dental Care, Physiotherapy) that share one reception desk. Give this practice a clear name and select its facility type.
                  </p>
                </div>
              </div>

              {/* Practice Name Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#0B2B2A] uppercase tracking-wider">
                  Practice Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={practiceName}
                  onChange={(e) => {
                    setPracticeName(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="e.g. CBD Dental Practice, Main Street Family Health, Horizon Physio"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E] transition-all"
                  autoFocus
                />
              </div>

              {/* Facility Type Selector List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#0B2B2A] uppercase tracking-wider">
                    Select Facility Type <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-medium text-slate-500">
                    Determines predefined clinical services catalog
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {FACILITY_TYPES.map((ft) => {
                    const isSelected = facilityType === ft.key;
                    const color = FACILITY_TYPE_COLORS[ft.key] || FACILITY_TYPE_COLORS.other;
                    return (
                      <button
                        type="button"
                        key={ft.key}
                        onClick={() => setFacilityType(ft.key)}
                        className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#0F766E] bg-teal-50/80 ring-2 ring-[#0F766E]/20 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1.5">
                          <span className={`text-xs font-bold flex items-center gap-2 ${isSelected ? 'text-[#0F766E]' : 'text-slate-800'}`}>
                            <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-[#0F766E]' : 'text-slate-400'}`} />
                            {ft.label}
                          </span>
                          {isSelected ? (
                            <span className="w-5 h-5 rounded-full bg-[#0F766E] text-white flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3" />
                            </span>
                          ) : (
                            <span className="w-5 h-5 rounded-full border border-slate-300 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                          {ft.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: Services Checklist & Custom Service ================= */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-teal-50/70 border border-teal-100 rounded-2xl">
                <div className="flex items-start gap-3">
                  <RemiMascot size="sm" className="mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wide">
                      Step 2 of 4: Services Offered by {practiceName}
                    </h4>
                    <p className="text-xs text-teal-800 font-medium">
                      Tick the services this practice offers. In Step 3, you'll set durations and buffers.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleSelectAllServices(true)}
                    className="text-[11px] font-bold text-[#0F766E] hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => handleSelectAllServices(false)}
                    className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Add Custom Service Input */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0B2B2A] uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-[#0F766E]" /> Add Custom Service
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Saved with <code className="text-[10px] font-mono bg-white px-1 py-0.5 rounded border border-slate-200">isCustom = true</code>
                  </span>
                </div>

                <form onSubmit={handleAddCustomService} className="flex gap-2">
                  <input
                    type="text"
                    value={customServiceName}
                    onChange={(e) => {
                      setCustomServiceName(e.target.value);
                      if (customServiceError) setCustomServiceError(null);
                    }}
                    placeholder="Type custom service name (e.g. Pediatric Growth Screening, Sports Clearance)"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0d655e] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Service</span>
                  </button>
                </form>

                {customServiceError && (
                  <p className="text-[11px] text-rose-600 font-medium">{customServiceError}</p>
                )}
              </div>

              {/* Services Checklist Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
                  <span>Available Services for {facilityMeta.label} ({selectedServices.length} selected)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {wizardServices.map((service) => (
                    <label
                      key={service.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                        service.selected
                          ? 'bg-teal-50/60 border-[#0F766E]/40 text-[#0B2B2A]'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={service.selected}
                        onChange={() => handleToggleService(service.id)}
                        className="mt-0.5 w-4 h-4 text-[#0F766E] rounded-sm focus:ring-[#0F766E] cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold truncate ${service.selected ? 'text-[#0B2B2A]' : 'text-slate-600'}`}>
                            {service.name}
                          </span>
                          {service.isCustom && (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                              Custom
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          Default: {service.durationMinutes}m duration, {service.bufferMinutes}m buffer
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: Duration & Buffer Table ================= */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 bg-teal-50/70 border border-teal-100 rounded-2xl flex items-start gap-3">
                <RemiMascot size="sm" className="mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wide">
                    Step 3 of 4: Consultation Durations & Buffers
                  </h4>
                  <p className="text-xs text-teal-800 leading-relaxed font-medium">
                    Configure standard appointment lengths and buffer times. Receptionists will book slots according to these rules. You can use the quick chips or shortcut bar to set all at once.
                  </p>
                </div>
              </div>

              {/* Apply to All Shortcut Bar */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <span className="text-xs font-extrabold text-[#0B2B2A] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    "Apply to All" Shortcut
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Quickly configure all {selectedServices.length} selected services
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600">Duration:</span>
                      <div className="flex items-center gap-1">
                        {durationChips.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => setApplyAllDuration(chip)}
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              applyAllDuration === chip
                                ? 'bg-[#0F766E] text-white shadow-2xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            {chip}m
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600">Buffer:</span>
                      <div className="flex items-center gap-1">
                        {bufferChips.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => setApplyAllBuffer(chip)}
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              applyAllBuffer === chip
                                ? 'bg-[#0F766E] text-white shadow-2xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            +{chip}m
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyToAll}
                    className="px-4 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    {showAppliedToast ? <Check className="w-3.5 h-3.5" /> : null}
                    <span>{showAppliedToast ? 'Applied to All!' : 'Apply to All Selected'}</span>
                  </button>
                </div>
              </div>

              {/* Table of Services */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white">
                <div className="max-h-[320px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider z-10">
                      <tr>
                        <th className="py-2.5 px-4">Service Name</th>
                        <th className="py-2.5 px-4 w-44">Duration (minutes) *</th>
                        <th className="py-2.5 px-4 w-40">Buffer After (min)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {selectedServices.map((service) => {
                        const hasError = !service.durationMinutes || service.durationMinutes <= 0;
                        return (
                          <tr
                            key={service.id}
                            className={`hover:bg-slate-50/70 transition-colors ${
                              hasError ? 'bg-rose-50/50' : ''
                            }`}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#0B2B2A]">{service.name}</span>
                                {service.isCustom && (
                                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                    Custom
                                  </span>
                                )}
                              </div>
                              {hasError && (
                                <span className="text-[10px] text-rose-600 font-bold block mt-0.5">
                                  Duration is required (&gt; 0 min)
                                </span>
                              )}
                            </td>

                            {/* Duration Input & Quick Chips */}
                            <td className="py-3 px-4">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    min="1"
                                    max="240"
                                    value={service.durationMinutes || ''}
                                    onChange={(e) =>
                                      handleUpdateDuration(service.id, parseInt(e.target.value, 10) || 0)
                                    }
                                    className={`w-20 px-2.5 py-1 text-xs font-bold rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 ${
                                      hasError
                                        ? 'border-rose-400 bg-rose-50 text-rose-900 focus:border-rose-500'
                                        : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-[#0F766E]'
                                    }`}
                                  />
                                  <span className="text-[11px] font-semibold text-slate-500">mins</span>
                                </div>

                                {/* Quick Pick Chips (10, 15, 20, 30, 45, 60) */}
                                <div className="flex flex-wrap items-center gap-1">
                                  {durationChips.map((chip) => (
                                    <button
                                      type="button"
                                      key={chip}
                                      onClick={() => handleUpdateDuration(service.id, chip)}
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                        service.durationMinutes === chip
                                          ? 'bg-[#0F766E] text-white'
                                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                      }`}
                                    >
                                      {chip}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </td>

                            {/* Buffer Input & Quick Chips */}
                            <td className="py-3 px-4">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    min="0"
                                    max="60"
                                    value={service.bufferMinutes ?? 0}
                                    onChange={(e) =>
                                      handleUpdateBuffer(service.id, Math.max(0, parseInt(e.target.value, 10) || 0))
                                    }
                                    className="w-20 px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]"
                                  />
                                  <span className="text-[11px] font-semibold text-slate-500">mins</span>
                                </div>

                                <div className="flex flex-wrap items-center gap-1">
                                  {bufferChips.map((chip) => (
                                    <button
                                      type="button"
                                      key={chip}
                                      onClick={() => handleUpdateBuffer(service.id, chip)}
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                        service.bufferMinutes === chip
                                          ? 'bg-teal-700 text-white'
                                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                      }`}
                                    >
                                      +{chip}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 4: Review, Save & Go to Staff ================= */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-4 bg-teal-50/70 border border-teal-100 rounded-2xl flex items-start gap-3">
                <RemiMascot size="sm" className="mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wide">
                    Step 4 of 4: Review and Save
                  </h4>
                  <p className="text-xs text-teal-800 leading-relaxed font-medium">
                    Review your new practice and configured clinical services below. When ready, click "Save Practice & Go to Staff" to assign practitioners or doctors to this practice.
                  </p>
                </div>
              </div>

              {/* Practice Summary Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5 mb-2 ${facilityColors.badge}`}>
                      <Building2 className="w-3.5 h-3.5" />
                      {facilityMeta.label}
                    </span>
                    <h3 className="text-xl font-black text-[#0B2B2A]">{practiceName}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{facilityMeta.description}</p>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Ready to Save
                  </span>
                </div>

                {/* Services Table Review */}
                <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 font-bold text-slate-600 flex items-center justify-between">
                    <span>Configured Services ({selectedServices.length})</span>
                    <span>Duration & Buffer</span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto">
                    {selectedServices.map((s) => (
                      <div key={s.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#0F766E]" />
                          <span className="font-semibold text-slate-800">{s.name}</span>
                          {s.isCustom && (
                            <span className="text-[9px] font-extrabold uppercase px-1 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                              Custom
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-bold text-slate-600">
                          {s.durationMinutes} min
                          {s.bufferMinutes ? ` (+${s.bufferMinutes}m buffer)` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => {
                  setValidationError(null);
                  setCurrentStep((prev) => (prev - 1) as any);
                }}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {/* Step 1 Actions */}
            {currentStep === 1 && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleNextFromStep1}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#0F766E] hover:bg-[#0d655e] text-white shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <span>Next: Select Services</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Step 2 Actions */}
            {currentStep === 2 && (
              <button
                type="button"
                onClick={handleNextFromStep2}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#0F766E] hover:bg-[#0d655e] text-white shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <span>Next: Set Durations ({selectedServices.length})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {/* Step 3 Actions */}
            {currentStep === 3 && (
              <button
                type="button"
                onClick={handleNextFromStep3}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#0F766E] hover:bg-[#0d655e] text-white shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <span>Review & Save</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {/* Step 4 Actions: Save & Staff / Add Another Practice */}
            {currentStep === 4 && (
              <>
                {/* "Add another practice" button */}
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveToFirestore(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-white border border-teal-300 text-[#0F766E] hover:bg-teal-50 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  title="Saves this practice and lets you add another practice immediately"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save & Add Another Practice</span>
                </button>

                {/* Primary Save & Go to Staff Step button */}
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveToFirestore(false)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold bg-[#0F766E] hover:bg-[#0d655e] text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <span>Saving to Firestore...</span>
                  ) : (
                    <>
                      <Users className="w-4 h-4" />
                      <span>Save Practice & Go to Staff</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
