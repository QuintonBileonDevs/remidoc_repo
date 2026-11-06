import React from 'react';
import { Search, Plus, Stethoscope, LogOut, User, Globe, Shield, Building2 } from 'lucide-react';
import { Practice } from '../types';

interface TopbarProps {
  activeTab: string;
  onOpenNewAppointment: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  clinicName: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  timezone?: string;
  practices?: Practice[];
  onLogout: () => Promise<void> | void;
}

export const Topbar: React.FC<TopbarProps> = ({
  activeTab,
  onOpenNewAppointment,
  searchQuery,
  setSearchQuery,
  clinicName,
  userName = 'Practitioner',
  userEmail = '',
  userRole = 'admin',
  timezone = 'Africa/Gaborone',
  practices = [],
  onLogout,
}) => {
  const titles: Record<string, string> = {
    calendar: 'Appointment Calendar',
    patients: 'Patient Directory',
    reminders: 'Automated Reminders & Logs',
    practices: 'Facility Practices & Departments',
    services: 'Clinic Consultation Services',
    staff: 'Practitioners & Working Hours',
    settings: 'Facility Profile & Settings',
  };

  const activePracticeCount = practices.filter((p) => p.active !== false).length;

  return (
    <header className="h-20 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between shrink-0 shadow-xs">
      {/* Zone 1: Section Title & Real Registered Clinic Name */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-teal-700 font-semibold tracking-wider uppercase mb-0.5 truncate">
            <Building2 className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
            <span className="font-bold text-[#0F766E] truncate">{clinicName || 'Remidoc Healthcare Facility'}</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
              {activePracticeCount} {activePracticeCount === 1 ? 'practice' : 'practices'}
            </span>
            <span className="hidden lg:inline-flex items-center gap-1 text-[11px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              <Globe className="w-3 h-3 text-slate-400" />
              {timezone}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#0B2B2A] tracking-tight truncate">
            {titles[activeTab] || 'Dashboard'}
          </h2>
        </div>
      </div>

      {/* Zone 2: Search Quick Bar */}
      <div className="hidden lg:flex items-center relative w-72 xl:w-80 mx-4">
        <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search patients, services, staff..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-[#0B2B2A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E] transition-all"
        />
      </div>

      {/* Zone 3: User Details, Quick Action & Logout */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Logged in User Profile Info captured at registration */}
        <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 bg-[#F4F8F7] rounded-xl border border-slate-200/80">
          <div className="w-8 h-8 rounded-lg bg-[#0F766E] text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
            {userName ? userName.charAt(0) : 'U'}
          </div>
          <div className="text-left text-xs leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[#0B2B2A] max-w-[130px] truncate">{userName}</span>
              <span className="px-1.5 py-0.2 rounded-md text-[9px] font-extrabold uppercase bg-teal-100 text-[#0F766E]">
                {userRole}
              </span>
            </div>
            {userEmail && (
              <span className="text-[10px] text-slate-400 max-w-[140px] truncate block font-normal">
                {userEmail}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onOpenNewAppointment}
          className="flex items-center gap-2 bg-[#0F766E] hover:bg-[#0d655e] text-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden xs:inline">New Appointment</span>
        </button>

        <div className="h-6 w-px bg-slate-200" />

        <button
          onClick={onLogout}
          title="Sign out of Remidoc workspace"
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
