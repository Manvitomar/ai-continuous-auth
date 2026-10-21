import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBiometrics } from '../context/BiometricContext';
import { ShieldCheck, LogOut, Activity, BarChart3, UserCheck, KeyRound, Menu, X, Volume2, VolumeX } from 'lucide-react';
import { isSoundEnabled, setSoundEnabled } from '../services/soundEffects';

export const Navbar = ({ currentTab, setCurrentTab, onOpenEnrollment, onOpenMFA }) => {
  const { user, logout } = useAuth();
  const { currentRiskScore, riskStatus } = useBiometrics();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  const getStatusBadge = (compact = false) => {
    if (riskStatus === 'LOW') {
      return (
        <span className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          {compact ? `${currentRiskScore}%` : `LOW RISK (${currentRiskScore}%)`}
        </span>
      );
    }
    if (riskStatus === 'MEDIUM') {
      return (
        <span className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping flex-shrink-0" />
          {compact ? `${currentRiskScore}%` : `MEDIUM RISK (${currentRiskScore}%)`}
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/30 whitespace-nowrap">
        <span className="w-2 h-2 rounded-full bg-red-400 animate-bounce flex-shrink-0" />
        {compact ? `${currentRiskScore}%` : `HIGH RISK (${currentRiskScore}%)`}
      </span>
    );
  };

  const handleTabChange = (tab) => {
    setCurrentTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-3.5 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400 flex-shrink-0">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="font-bold text-sm sm:text-base text-slate-100 flex items-center gap-1.5 sm:gap-2">
              <span className="hidden xs:inline">AI Continuous Auth</span>
              <span className="xs:hidden">Continuous Auth</span>
              <span className="hidden sm:inline-block text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Academic
              </span>
            </h1>
            <p className="hidden md:block text-xs text-slate-400">Behavioral Biometrics Anomaly Detection (Isolation Forest)</p>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <div className="hidden md:flex items-center bg-slate-950/60 p-1 rounded-xl border border-slate-800 text-sm">
          <button
            onClick={() => handleTabChange('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition ${
              currentTab === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            Live Dashboard
          </button>
          <button
            onClick={() => handleTabChange('evaluation')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition ${
              currentTab === 'evaluation'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Model Evaluation
          </button>
        </div>

        {/* Desktop User Controls & Status */}
        <div className="hidden md:flex items-center gap-3">
          {user?.is_enrolled ? (
            getStatusBadge(false)
          ) : (
            <button
              onClick={onOpenEnrollment}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition shadow-sm whitespace-nowrap"
            >
              <UserCheck className="w-4 h-4" />
              Enroll
            </button>
          )}

          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <button
              onClick={toggleSound}
              className={`p-1.5 rounded-lg border transition ${
                soundOn
                  ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
              }`}
              title={soundOn ? 'Security Audio Alerts: ON' : 'Security Audio Alerts: MUTED'}
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={onOpenMFA}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700 whitespace-nowrap"
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

        {/* Mobile Header Right: Compact Status + Hamburger Toggle */}
        <div className="flex md:hidden items-center gap-2">
          {user?.is_enrolled && getStatusBadge(true)}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-slate-800 space-y-2.5">
          {/* Mobile Tabs */}
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => handleTabChange('dashboard')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition ${
                currentTab === 'dashboard'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => handleTabChange('evaluation')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition ${
                currentTab === 'evaluation'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Evaluation
            </button>
          </div>

          {/* User Actions */}
          <div className="space-y-2 pt-1">
            {!user?.is_enrolled && (
              <button
                onClick={() => { onOpenEnrollment(); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-500 text-white text-xs font-semibold"
              >
                <UserCheck className="w-4 h-4" />
                Complete Biometric Enrollment
              </button>
            )}

            <button
              onClick={() => { onOpenMFA(); setMobileMenuOpen(false); }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
            >
              <KeyRound className="w-4 h-4 text-emerald-400" />
              {user?.totp_enabled ? 'TOTP Authenticator (Active)' : 'Configure TOTP MFA'}
            </button>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 px-1 text-xs text-slate-400">
              <span className="truncate max-w-[150px]">User: <strong className="text-slate-200">{user?.username}</strong></span>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSound}
                  className="flex items-center gap-1 text-slate-300 hover:text-white py-1 px-2 rounded-lg bg-slate-800 border border-slate-700 text-[11px]"
                >
                  {soundOn ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
                  {soundOn ? 'Sound On' : 'Muted'}
                </button>
                <button
                  onClick={logout}
                  className="flex items-center gap-1 text-red-400 hover:text-red-300 font-medium py-1 px-2 rounded-lg hover:bg-slate-800"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
