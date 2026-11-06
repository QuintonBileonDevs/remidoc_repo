import React from 'react';
import { 
  Calendar as CalendarIcon, 
  Users, 
  Bell, 
  Settings as SettingsIcon, 
  ShieldCheck, 
  Layers, 
  UserCheck, 
  Stethoscope, 
  Building2,
  CalendarCheck,
  BarChart3
} from 'lucide-react';

export type NavigationTab = 'today' | 'calendar' | 'patients' | 'reminders' | 'reports' | 'settings' | 'services' | 'staff' | 'practices';

interface SidebarProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  appointmentCount: number;
  patientCount: number;
  serviceCount: number;
  practiceCount?: number;
  clinicName?: string;
  userName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  appointmentCount,
  patientCount,
  serviceCount,
  practiceCount = 1,
  clinicName = 'Remidoc Medical Practice',
  userName = 'Practitioner',
}) => {
  return (
    <aside className="w-64 bg-[#0B2B2A] text-white flex flex-col shrink-0 border-r border-teal-950/40 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-teal-900/60 flex items-center gap-3">
        {/* Logo: rounded speech bubble with checkmark */}
        <div className="w-10 h-10 rounded-xl bg-[#0F766E] flex items-center justify-center shadow-md relative shrink-0">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#FB7185] rounded-full border-2 border-[#0B2B2A]" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight text-white lowercase">remidoc</h1>
          <p className="text-[11px] text-teal-300/80 tracking-wide font-medium truncate">“Every patient, on time.”</p>
        </div>
      </div>

      {/* Facility & Shared Reception Banner */}
      <div className="px-4 py-3 mx-3 mt-3 bg-teal-950/70 border border-teal-900/60 rounded-xl">
        <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400 flex items-center justify-between mb-0.5">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3 h-3" />
            <span>Facility Hub</span>
          </span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-900 text-teal-300 border border-teal-700/50">
            {practiceCount} {practiceCount === 1 ? 'Practice' : 'Practices'}
          </span>
        </div>
        <div className="text-xs font-bold text-white truncate" title={clinicName}>
          {clinicName}
        </div>
        <div className="text-[10px] text-teal-300/70 truncate mt-0.5">
          Shared Reception Desk
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-teal-400 uppercase">
          Reception Desk
        </div>

        {/* Today */}
        <button
          onClick={() => setActiveTab('today')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            activeTab === 'today'
              ? 'bg-[#0F766E] text-white shadow-md shadow-teal-950/50 font-semibold'
              : 'text-teal-100/70 hover:bg-teal-900/40 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <CalendarCheck className={`w-5 h-5 ${activeTab === 'today' ? 'text-white' : 'text-teal-400'}`} />
            <span>Today</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-extrabold bg-teal-900 text-teal-200 border border-teal-700/50">
            Live
          </span>
        </button>

        {/* Calendar */}
        <button
          onClick={() => setActiveTab('calendar')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            activeTab === 'calendar'
              ? 'bg-[#0F766E] text-white shadow-md shadow-teal-950/50 font-semibold'
              : 'text-teal-100/70 hover:bg-teal-900/40 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <CalendarIcon className={`w-5 h-5 ${activeTab === 'calendar' ? 'text-white' : 'text-teal-400'}`} />
            <span>Calendar</span>
          </div>
          {appointmentCount > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-white/20 text-white">
              {appointmentCount}
            </span>
          )}
        </button>

        {/* Patients */}
        <button
          onClick={() => setActiveTab('patients')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            activeTab === 'patients'
              ? 'bg-[#0F766E] text-white shadow-md shadow-teal-950/50 font-semibold'
              : 'text-teal-100/70 hover:bg-teal-900/40 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <Users className={`w-5 h-5 ${activeTab === 'patients' ? 'text-white' : 'text-teal-400'}`} />
            <span>Patients</span>
          </div>
          {patientCount > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-teal-900/80 text-teal-300 border border-teal-700/50">
              {patientCount}
            </span>
          )}
        </button>

        {/* Reminders */}
        <button
          onClick={() => setActiveTab('reminders')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            activeTab === 'reminders'
              ? 'bg-[#0F766E] text-white shadow-md shadow-teal-950/50 font-semibold'
              : 'text-teal-100/70 hover:bg-teal-900/40 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <Bell className={`w-5 h-5 ${activeTab === 'reminders' ? 'text-white' : 'text-teal-400'}`} />
            <span>Reminders</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-950 text-emerald-400 border border-emerald-700/50">
            Auto
          </span>
        </button>

        {/* Reports */}
        <button
          onClick={() => setActiveTab('reports')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-[#0F766E] text-white shadow-md shadow-teal-950/50 font-semibold'
              : 'text-teal-100/70 hover:bg-teal-900/40 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <BarChart3 className={`w-5 h-5 ${activeTab === 'reports' ? 'text-white' : 'text-teal-400'}`} />
            <span>Reports</span>
          </div>
        </button>

        {/* Settings & Facility Management */}
        <div className="pt-3 pb-1 px-3 text-[10px] font-semibold tracking-wider text-teal-400 uppercase">
          Facility Setup
        </div>

        {/* Practices (Facility Tenants) */}
        <button
          onClick={() => setActiveTab('practices')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            activeTab === 'practices'
              ? 'bg-[#0F766E] text-white shadow-md shadow-teal-950/50 font-semibold'
              : 'text-teal-100/70 hover:bg-teal-900/40 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-3 pl-1">
            <Building2 className={`w-4 h-4 ${activeTab === 'practices' ? 'text-white' : 'text-teal-400'}`} />
            <span>Practices</span>
          </div>
          {practiceCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-900/60 text-teal-300 font-bold">
              {practiceCount}
            </span>
          )}
        </button>

        {/* Services (Settings > Services) */}
        <button
          onClick={() => setActiveTab('services')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            activeTab === 'services'
              ? 'bg-[#0F766E] text-white shadow-md shadow-teal-950/50 font-semibold'
              : 'text-teal-100/70 hover:bg-teal-900/40 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-3 pl-1">
            <Layers className={`w-4 h-4 ${activeTab === 'services' ? 'text-white' : 'text-teal-400'}`} />
            <span>Services</span>
          </div>
          {serviceCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-900/60 text-teal-300">
              {serviceCount}
            </span>
          )}
        </button>

        {/* Staff (Settings > Staff) */}
        <button
          onClick={() => setActiveTab('staff')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            activeTab === 'staff'
              ? 'bg-[#0F766E] text-white shadow-md shadow-teal-950/50 font-semibold'
              : 'text-teal-100/70 hover:bg-teal-900/40 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-3 pl-1">
            <UserCheck className={`w-4 h-4 ${activeTab === 'staff' ? 'text-white' : 'text-teal-400'}`} />
            <span>Staff & Hours</span>
          </div>
        </button>

        {/* General Settings */}
        <button
          onClick={() => setActiveTab('settings')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-[#0F766E] text-white shadow-md shadow-teal-950/50 font-semibold'
              : 'text-teal-100/70 hover:bg-teal-900/40 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-3 pl-1">
            <SettingsIcon className={`w-4 h-4 ${activeTab === 'settings' ? 'text-white' : 'text-teal-400'}`} />
            <span>Facility Profile</span>
          </div>
        </button>
      </nav>

      {/* Footer Info / Clinic Status */}
      <div className="p-4 m-3 bg-teal-950/60 rounded-xl border border-teal-900/50 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-teal-400 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
            Reception Desk Online
          </span>
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </div>
        <p className="text-teal-200/70 text-[11px] leading-relaxed">
          Botswana (+267) WhatsApp Gateway Active
        </p>
      </div>
    </aside>
  );
};
