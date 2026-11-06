import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, addDoc, collection, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { RemiMascot } from './RemiMascot';
import { Lock, Mail, User, Building, ArrowRight, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { defaultServices } from '../mockData';
import { 
  saveCachedSession, 
  clearCachedSession,
  resolveUserFacilityAndProfile,
  generateFacilityId,
  createFacilityAndUserBatch
} from '../utils/sessionManager';
import { handleFirestoreError, OperationType } from '../utils/errorUtils';

export const AuthPage: React.FC = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOperationNotAllowed, setIsOperationNotAllowed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsOperationNotAllowed(false);
    setLoading(true);

    try {
      clearCachedSession();

      if (isSignup) {
        if (!name.trim() || !facilityName.trim()) {
          throw new Error('Please provide both your name and facility practice name.');
        }

        const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = userCred.user;
        const trimmedName = name.trim();
        const trimmedFacilityName = facilityName.trim();

        try {
          await updateProfile(user, { displayName: trimmedName });
        } catch (profileErr) {
          console.warn('Could not update Firebase displayName:', profileErr);
        }

        // ONE atomic batched write creating facility, member (role: owner), counters, and users/{uid}
        const session = await createFacilityAndUserBatch({
          userId: user.uid,
          userEmail: user.email || '',
          userName: trimmedName,
          facilityName: trimmedFacilityName,
        });

        console.log(`[FS] Signup batch write successful for facility: ${session.facilityId}`);
      } else {
        const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const user = userCred.user;
        console.log(`[FS] User logged in: ${user.uid}. Resolving facility profile...`);

        const resolution = await resolveUserFacilityAndProfile(user.uid, user.email, user.displayName);
        if (resolution.status === 'success') {
          saveCachedSession(resolution.session);
        } else if (resolution.status === 'facility_access_denied') {
          console.warn(`[FS] Facility access denied at path: ${resolution.path}`);
        } else if (resolution.status === 'no_user_doc') {
          console.log(`[FS] users/${user.uid} document not found; will prompt facility creation.`);
        }
      }
    } catch (err: any) {
      console.error('[FS] Auth error:', err);
      if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
        setIsOperationNotAllowed(true);
        setError('Email/Password provider is disabled in your Firebase Console.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Invalid email or password. Please verify your credentials or create a new facility account.');
      } else {
        setError(err.message || 'Authentication failed. Please check your credentials.');
      }
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
            <h1 className="text-3xl font-extrabold text-[#0B2B2A] lowercase tracking-tight">remidoc</h1>
            <p className="text-xs text-teal-700 font-semibold uppercase tracking-wider mt-1">“Every patient, on time.”</p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-[#F4F8F7] p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => { setIsSignup(false); setError(null); setIsOperationNotAllowed(false); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              !isSignup ? 'bg-white text-[#0B2B2A] shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignup(true); setError(null); setIsOperationNotAllowed(false); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              isSignup ? 'bg-white text-[#0B2B2A] shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Create Facility
          </button>
        </div>

        {isOperationNotAllowed && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-xs space-y-2.5 text-amber-900">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="font-semibold text-amber-900">
                Action Required in Firebase Console:
              </div>
            </div>
            <p className="text-amber-800 leading-relaxed">
              Email/Password provider is currently not enabled in Firebase. To enable it:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-amber-800 font-medium pl-1">
              <li>Open the <a href="https://console.firebase.google.com/project/ai-studio-remidoc-16807fc3-e83d-42cc-9c28-9bfcc7cf26d0/authentication/providers" target="_blank" rel="noopener noreferrer" className="text-[#0F766E] font-bold underline inline-flex items-center gap-0.5">Firebase Auth Providers <ExternalLink className="w-3 h-3 inline" /></a></li>
              <li>Click <strong>Email/Password</strong></li>
              <li>Toggle <strong>Enable</strong> to ON and click <strong>Save</strong></li>
            </ol>
          </div>
        )}

        {error && !isOperationNotAllowed && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Your Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@practice.med"
                className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#F4F8F7] border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#0B2B2A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#0F766E] hover:bg-[#0d655e] text-white py-3 rounded-xl font-semibold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{isSignup ? 'Create Facility & Account' : 'Sign In to Dashboard'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
