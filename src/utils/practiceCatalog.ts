import { FacilityType, FacilityTypeMeta, CatalogServiceItem } from '../types';

export const FACILITY_TYPES: FacilityTypeMeta[] = [
  {
    key: 'general_practice',
    label: 'Primary Care / General Practice Clinic',
    iconName: 'Stethoscope',
    description: 'General consultations, prescriptions, routine check-ups, and preventive family medicine',
  },
  {
    key: 'specialist',
    label: 'Specialist / Single-Specialty Clinic',
    iconName: 'HeartPulse',
    description: 'Specialist consultations, diagnostic reviews, minor surgeries, and outpatient care',
  },
  {
    key: 'dental',
    label: 'Dental Clinic',
    iconName: 'Smile',
    description: 'Comprehensive dental hygiene, extractions, crowns, bridges, and emergency dental care',
  },
  {
    key: 'diagnostic_screening',
    label: 'Diagnostic & Screening Center',
    iconName: 'Pill',
    description: 'X-rays, ultrasounds, CT/MRI, blood collection, wellness panels, and pathology screening',
  },
  {
    key: 'community_health',
    label: 'Community Health Center / Polyclinic',
    iconName: 'Building2',
    description: 'Polyclinic outpatient care, casualty, antenatal, family planning, and maternal health',
  },
  {
    key: 'physiotherapy',
    label: 'Physiotherapy & Rehab',
    iconName: 'Activity',
    description: 'Physical rehabilitation, sports injuries, musculoskeletal care, and mobility',
  },
  {
    key: 'optometry',
    label: 'Optometry & Eye Care',
    iconName: 'Eye',
    description: 'Comprehensive eye examinations, visual acuity, refractions, and contact lens fittings',
  },
  {
    key: 'pediatrics',
    label: 'Pediatrics Clinic',
    iconName: 'Baby',
    description: 'Infant, child, and adolescent healthcare, growth monitoring, and pediatric checks',
  },
  {
    key: 'mental_health',
    label: 'Mental Health & Counseling',
    iconName: 'Brain',
    description: 'Psychological therapy, behavioral consultations, psychotherapy, and counseling',
  },
  {
    key: 'pharmacy_lab',
    label: 'Pharmacy & Laboratory',
    iconName: 'Pill',
    description: 'Prescription dispensing, clinical lab tests, and medication reviews',
  },
  {
    key: 'dietetics',
    label: 'Dietetics & Nutrition',
    iconName: 'Apple',
    description: 'Nutritional counseling, metabolic health, dietary planning, and wellness coaching',
  },
  {
    key: 'other',
    label: 'Other Healthcare Practice',
    iconName: 'Building2',
    description: 'General allied health or multidisciplinary clinical practice',
  },
];

export const CATALOG_SERVICES: CatalogServiceItem[] = [
  // 1. Primary Care / General Practice Clinic
  {
    key: 'primary_care_general_consultations',
    facilityType: 'general_practice',
    name: 'General Consultations',
    durationMinutes: 15,
    bufferMinutes: 0,
  },
  {
    key: 'primary_care_prescription_refills',
    facilityType: 'general_practice',
    name: 'Prescription Refills',
    durationMinutes: 15,
    bufferMinutes: 0,
  },
  {
    key: 'primary_care_routine_checkups',
    facilityType: 'general_practice',
    name: 'Routine Check-ups',
    durationMinutes: 15,
    bufferMinutes: 0,
  },
  {
    key: 'primary_care_immunizations',
    facilityType: 'general_practice',
    name: 'Immunizations',
    durationMinutes: 15,
    bufferMinutes: 0,
  },
  {
    key: 'primary_care_health_screenings',
    facilityType: 'general_practice',
    name: 'Health Screenings',
    durationMinutes: 20,
    bufferMinutes: 5,
  },
  {
    key: 'primary_care_annual_physicals',
    facilityType: 'general_practice',
    name: 'Annual Physicals',
    durationMinutes: 30,
    bufferMinutes: 5,
  },
  {
    key: 'primary_care_chronic_disease_mgmt',
    facilityType: 'general_practice',
    name: 'Chronic Disease Management',
    durationMinutes: 20,
    bufferMinutes: 5,
  },
  {
    key: 'primary_care_minor_procedures',
    facilityType: 'general_practice',
    name: 'Minor Procedures (wound care, dressing changes, injections)',
    durationMinutes: 30,
    bufferMinutes: 5,
  },

  // 2. Specialist / Single-Specialty Clinic
  {
    key: 'specialist_consultations',
    facilityType: 'specialist',
    name: 'Specialist Consultations',
    durationMinutes: 30,
    bufferMinutes: 5,
  },
  {
    key: 'specialist_diagnostic_reviews',
    facilityType: 'specialist',
    name: 'Diagnostic Reviews',
    durationMinutes: 20,
    bufferMinutes: 0,
  },
  {
    key: 'specialist_outpatient_procedures',
    facilityType: 'specialist',
    name: 'Outpatient Procedures',
    durationMinutes: 45,
    bufferMinutes: 10,
  },
  {
    key: 'specialist_minor_surgeries',
    facilityType: 'specialist',
    name: 'Minor Surgeries',
    durationMinutes: 60,
    bufferMinutes: 15,
  },
  {
    key: 'specialist_physiotherapy',
    facilityType: 'specialist',
    name: 'Physiotherapy',
    durationMinutes: 45,
    bufferMinutes: 5,
  },
  {
    key: 'specialist_follow_up_visits',
    facilityType: 'specialist',
    name: 'Follow-up Visits',
    durationMinutes: 15,
    bufferMinutes: 0,
  },
  {
    key: 'specialist_post_operative_checks',
    facilityType: 'specialist',
    name: 'Post-operative Checks',
    durationMinutes: 20,
    bufferMinutes: 5,
  },

  // 3. Dental Clinic
  {
    key: 'dental_cleanings',
    facilityType: 'dental',
    name: 'Cleanings',
    durationMinutes: 30,
    bufferMinutes: 5,
  },
  {
    key: 'dental_exams',
    facilityType: 'dental',
    name: 'Exams',
    durationMinutes: 15,
    bufferMinutes: 0,
  },
  {
    key: 'dental_xrays',
    facilityType: 'dental',
    name: 'X-rays',
    durationMinutes: 15,
    bufferMinutes: 0,
  },
  {
    key: 'dental_fillings',
    facilityType: 'dental',
    name: 'Fillings',
    durationMinutes: 30,
    bufferMinutes: 5,
  },
  {
    key: 'dental_crowns',
    facilityType: 'dental',
    name: 'Crowns',
    durationMinutes: 45,
    bufferMinutes: 10,
  },
  {
    key: 'dental_bridges',
    facilityType: 'dental',
    name: 'Bridges',
    durationMinutes: 45,
    bufferMinutes: 10,
  },
  {
    key: 'dental_extractions',
    facilityType: 'dental',
    name: 'Extractions',
    durationMinutes: 30,
    bufferMinutes: 10,
  },
  {
    key: 'dental_root_canals',
    facilityType: 'dental',
    name: 'Root Canals',
    durationMinutes: 60,
    bufferMinutes: 15,
  },
  {
    key: 'dental_emergency_care',
    facilityType: 'dental',
    name: 'Emergency Dental Care',
    durationMinutes: 30,
    bufferMinutes: 5,
  },

  // 4. Diagnostic & Screening Center
  {
    key: 'diagnostic_xrays',
    facilityType: 'diagnostic_screening',
    name: 'X-rays',
    durationMinutes: 15,
    bufferMinutes: 0,
  },
  {
    key: 'diagnostic_ultrasounds',
    facilityType: 'diagnostic_screening',
    name: 'Ultrasounds',
    durationMinutes: 30,
    bufferMinutes: 5,
  },
  {
    key: 'diagnostic_ct_mri_basic',
    facilityType: 'diagnostic_screening',
    name: 'CT/MRI (basic)',
    durationMinutes: 45,
    bufferMinutes: 10,
  },
  {
    key: 'diagnostic_blood_draws',
    facilityType: 'diagnostic_screening',
    name: 'Blood Draws',
    durationMinutes: 15,
    bufferMinutes: 0,
  },
  {
    key: 'diagnostic_specimen_collection',
    facilityType: 'diagnostic_screening',
    name: 'Specimen Collection',
    durationMinutes: 15,
    bufferMinutes: 0,
  },
  {
    key: 'diagnostic_health_screening_programs',
    facilityType: 'diagnostic_screening',
    name: 'Health Screening Programs',
    durationMinutes: 30,
    bufferMinutes: 5,
  },
  {
    key: 'diagnostic_wellness_panels',
    facilityType: 'diagnostic_screening',
    name: 'Wellness Panels',
    durationMinutes: 20,
    bufferMinutes: 5,
  },

  // 5. Community Health Center / Polyclinic
  {
    key: 'community_outpatient_specialist_visits',
    facilityType: 'community_health',
    name: 'Outpatient Specialist Visits',
    durationMinutes: 20,
    bufferMinutes: 5,
  },
  {
    key: 'community_emergency_casualty_care',
    facilityType: 'community_health',
    name: 'Basic Emergency/Casualty Care',
    durationMinutes: 30,
    bufferMinutes: 10,
  },
  {
    key: 'community_short_stay_observation',
    facilityType: 'community_health',
    name: 'Short-stay Observation',
    durationMinutes: 60,
    bufferMinutes: 15,
  },
  {
    key: 'community_antenatal_care',
    facilityType: 'community_health',
    name: 'Antenatal Care',
    durationMinutes: 20,
    bufferMinutes: 5,
  },
  {
    key: 'community_family_planning',
    facilityType: 'community_health',
    name: 'Family Planning',
    durationMinutes: 15,
    bufferMinutes: 0,
  },
  {
    key: 'community_maternal_child_health',
    facilityType: 'community_health',
    name: 'Maternal/Child Health Services',
    durationMinutes: 20,
    bufferMinutes: 5,
  },

  // Additional types for full backwards compatibility
  {
    key: 'physio_initial_assessment',
    facilityType: 'physiotherapy',
    name: 'Initial Physiotherapy Assessment',
    durationMinutes: 45,
    bufferMinutes: 5,
  },
  {
    key: 'physio_treatment_session',
    facilityType: 'physiotherapy',
    name: 'Physiotherapy Treatment Session',
    durationMinutes: 30,
    bufferMinutes: 5,
  },
  {
    key: 'opt_comprehensive_exam',
    facilityType: 'optometry',
    name: 'Comprehensive Eye Examination',
    durationMinutes: 30,
    bufferMinutes: 5,
  },
  {
    key: 'peds_well_baby',
    facilityType: 'pediatrics',
    name: 'Well-child Milestone Examination',
    durationMinutes: 30,
    bufferMinutes: 5,
  },
  {
    key: 'mh_therapy_session',
    facilityType: 'mental_health',
    name: 'Individual Therapy Session',
    durationMinutes: 50,
    bufferMinutes: 10,
  },
  {
    key: 'lab_phlebotomy_legacy',
    facilityType: 'pharmacy_lab',
    name: 'Blood Draws & Specimen Collection',
    durationMinutes: 15,
    bufferMinutes: 0,
  },
  {
    key: 'diet_nutrition_assessment',
    facilityType: 'dietetics',
    name: 'Nutritional Assessment & Plan',
    durationMinutes: 45,
    bufferMinutes: 5,
  },
  {
    key: 'other_standard',
    facilityType: 'other',
    name: 'Standard Consultation',
    durationMinutes: 20,
    bufferMinutes: 0,
  },
];

export function getServicesForFacilityType(facilityType: FacilityType): CatalogServiceItem[] {
  // If diagnostic_screening or pharmacy_lab, offer diagnostic services
  if (facilityType === 'pharmacy_lab') {
    const direct = CATALOG_SERVICES.filter((s) => s.facilityType === 'pharmacy_lab');
    const diag = CATALOG_SERVICES.filter((s) => s.facilityType === 'diagnostic_screening');
    return [...diag, ...direct];
  }
  return CATALOG_SERVICES.filter((s) => s.facilityType === facilityType);
}

export function getFacilityTypeMeta(facilityType: FacilityType): FacilityTypeMeta {
  const found = FACILITY_TYPES.find((f) => f.key === facilityType);
  if (found) return found;
  return {
    key: facilityType,
    label: facilityType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    iconName: 'Building2',
    description: 'Healthcare practice',
  };
}

export const FACILITY_TYPE_COLORS: Record<FacilityType, { bg: string; text: string; border: string; badge: string; dot: string }> = {
  general_practice: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    dot: 'bg-emerald-500',
  },
  specialist: {
    bg: 'bg-teal-50',
    text: 'text-teal-800',
    border: 'border-teal-200',
    badge: 'bg-teal-100 text-teal-800 border-teal-300',
    dot: 'bg-teal-500',
  },
  dental: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-800',
    border: 'border-cyan-200',
    badge: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    dot: 'bg-cyan-500',
  },
  diagnostic_screening: {
    bg: 'bg-violet-50',
    text: 'text-violet-800',
    border: 'border-violet-200',
    badge: 'bg-violet-100 text-violet-800 border-violet-300',
    dot: 'bg-violet-500',
  },
  community_health: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    dot: 'bg-amber-500',
  },
  physiotherapy: {
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-800 border-orange-300',
    dot: 'bg-orange-500',
  },
  optometry: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-800',
    border: 'border-indigo-200',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    dot: 'bg-indigo-500',
  },
  pediatrics: {
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    badge: 'bg-rose-100 text-rose-800 border-rose-300',
    dot: 'bg-rose-500',
  },
  mental_health: {
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    badge: 'bg-purple-100 text-purple-800 border-purple-300',
    dot: 'bg-purple-500',
  },
  pharmacy_lab: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
    dot: 'bg-blue-500',
  },
  dietetics: {
    bg: 'bg-lime-50',
    text: 'text-lime-800',
    border: 'border-lime-200',
    badge: 'bg-lime-100 text-lime-800 border-lime-300',
    dot: 'bg-lime-500',
  },
  other: {
    bg: 'bg-slate-50',
    text: 'text-slate-800',
    border: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-800 border-slate-300',
    dot: 'bg-slate-500',
  },
};
