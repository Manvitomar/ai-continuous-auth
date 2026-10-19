import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useBiometrics } from '../context/BiometricContext';
import { ShieldCheck, ShieldAlert, LogOut, Activity, BarChart3, UserCheck } from 'lucide-react';

export const Navbar = ({ currentTab, setCurrentTab, onOpenEnrollment, onOpenMFA }) => {
  const { user, logout } = useAuth();
  const { currentRiskScore, riskStatus, isStreaming } = useBiometrics();

  const getStatusBadge = () => {
    if (riskStatus === 'LOW') {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          LOW RISK ({currentRiskScore}%)
        </span>
      );
    }
    if (riskStatus === 'MEDIUM') {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          MEDIUM RISK ({currentRiskScore}%)
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
        <span className="w-2 h-2 rounded-full bg-red-400 animate-bounce" />
        HIGH RISK ({currentRiskScore}%)
      </span>
    );
  };

  return (
    <nav className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-100 flex items-center gap-2">
              AI Continuous Authentication
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Academic Project
              </span>
            </h1>
            <p className="text-xs text-slate-400">Behavioral Biometrics Anomaly Detection (Isolation Forest)</p>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <div className="flex items-center bg-slate-950/60 p-1 rounded-xl border border-slate-800 text-sm">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-medium transition ${
              currentTab === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            Live Dashboard
          </button>
          <button
            onClick={() => setCurrentTab('evaluation')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-medium transition ${
              currentTab === 'evaluation'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Model Evaluation
          </button>
        </div>

        {/* User controls & Status */}
        <div className="flex items-center gap-4">
          {user?.is_enrolled ? (
            getStatusBadge()
          ) : (
            <button
              onClick={onOpenEnrollment}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition shadow-sm"
            >
              <UserCheck className="w-4 h-4" />
              Complete Enrollment
            </button>
          )}

          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <button
              onClick={onOpenMFA}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700"
              title="Configure TOTP MFA"
            >
              {user?.totp_enabled ? 'TOTP Active' : 'Setup MFA'}
            </button>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
