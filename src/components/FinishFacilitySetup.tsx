import React, { useState } from 'react';
import { RemiMascot } from './RemiMascot';
import { Building, User, ArrowRight, Loader2, LogOut, AlertCircle } from 'lucide-react';
import { createFacilityAndUserBatch, SessionData } from '../utils/sessionManager';

interface FinishFacilitySetupProps {
  userId: string;
  userEmail: string;
  defaultDisplayName?: string;
  onSuccess: (session: SessionData) => void;
  onLogout: () => void;
}

export const FinishFacilitySetup: React.FC<FinishFacilitySetupProps> = ({
  userId,
  userEmail,
  defaultDisplayName = '',
  onSuccess,
  onLogout,
}) => {
  const [facilityName, setFacilityName] = useState('');
  const [userName, setUserName] = useState(defaultDisplayName || userEmail.split('@')[0] || 'Practitioner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityName.trim()) {
      setError('Please provide a facility name.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      console.log(`[FS] Starting Finish Facility Setup for uid: ${userId}`);
      const session = await createFacilityAndUserBatch({
        userId,
        userEmail,
        userName: userName.trim(),
        facilityName: facilityName.trim(),
      });
      console.log(`[FS] Facility setup batch completed successfully. Facility ID: ${session.facilityId}`);
      onSuccess(session);
    } catch (err: any) {
      console.error('[FS] Error in finish facility setup:', err);
      setError(err?.message || 'Failed to create facility. Please check Firestore permissions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#F4F8F7] px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden p-8 space-y-6 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-2 bg-[#0F766E]/10 rounded-full blur-lg" />
              <RemiMascot size="lg" className="relative z-10" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[#0B2B2A] tracking-tight">Finish setting up your facility</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Welcome to Remidoc! Set up your facility details to start managing appointments and patients.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed break-words">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Your Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. Dr. Boitumelo Raditladi"
                className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Facility Name
            </label>
            <div className="relative">
              <Building className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
                placeholder="e.g. Gaborone Central Practice"
                className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1 pl-1">
              Creates a unique facility identifier and links your owner profile in a single atomic write.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#0F766E] hover:bg-[#0d655e] text-white py-3 rounded-xl font-semibold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Facility...</span>
              </>
            ) : (
              <>
                <span>Create Facility & Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 flex justify-center">
          <button
            type="button"
            onClick={onLogout}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold inline-flex items-center gap-1.5 cursor-pointer py-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign in with a different account
          </button>
        </div>

      </div>
    </div>
  );
};
