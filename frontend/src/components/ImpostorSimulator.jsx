import React from 'react';
import { useBiometrics } from '../context/BiometricContext';
import { Bot, UserX, Zap, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

export const ImpostorSimulator = () => {
  const {
    activeSimulation,
    setActiveSimulation,
    triggerSingleEvaluation,
    currentRiskScore,
    riskStatus
  } = useBiometrics();

  const handleSimulate = (type) => {
    setActiveSimulation(type);
    triggerSingleEvaluation(type);
  };

  const handleResetToGenuine = () => {
    setActiveSimulation(null);
    triggerSingleEvaluation(null);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Decorative tag */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <h3 className="font-semibold text-xs sm:text-sm text-slate-200">
            Adversarial Simulation Lab
          </h3>
        </div>
        <span className="text-[9px] sm:text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 whitespace-nowrap">
          Academic Demo Sandbox
        </span>
      </div>

      <p className="text-xs text-slate-400 mb-5 leading-relaxed">
        Test the real-time responsiveness of the Isolation Forest anomaly detector by triggering synthetic adversarial behavioral profiles.
      </p>

      {/* Simulator Mode Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        {/* 1. Bot Injection */}
        <button
          onClick={() => handleSimulate('BOT')}
          className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
            activeSimulation === 'BOT'
              ? 'bg-red-500/10 border-red-500 text-red-200 ring-1 ring-red-500'
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <span className="font-semibold text-xs flex items-center gap-1.5 text-red-400">
              <Bot className="w-4 h-4" /> Scripted Bot
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">
              900+ CPM
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Supersonic mechanical key bursts, 0ms variance, perfectly straight cursor paths.
          </p>
        </button>

        {/* 2. Hunt and Peck */}
        <button
          onClick={() => handleSimulate('HUNT_PECK')}
          className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
            activeSimulation === 'HUNT_PECK'
              ? 'bg-amber-500/10 border-amber-500 text-amber-200 ring-1 ring-amber-500'
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <span className="font-semibold text-xs flex items-center gap-1.5 text-amber-400">
              <UserX className="w-4 h-4" /> Foreign Typist
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
              65 CPM
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Sluggish hunt-and-peck cadence, 3.5x flight latency, meandering cursor movements.
          </p>
        </button>

        {/* 3. Erratic Jitter */}
        <button
          onClick={() => handleSimulate('JITTER')}
          className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
            activeSimulation === 'JITTER'
              ? 'bg-purple-500/10 border-purple-500 text-purple-200 ring-1 ring-purple-500'
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <span className="font-semibold text-xs flex items-center gap-1.5 text-purple-400">
              <Zap className="w-4 h-4" /> Erratic Tremor
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
              High Jerk
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Kinematic hand tremors, extreme jerk (&gt;0.8 px/ms&sup3;), sharp irregular clicks.
          </p>
        </button>
      </div>

      {/* Control Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Active Mode:</span>
          {activeSimulation ? (
            <span className="font-bold text-red-400 font-mono flex items-center gap-1 text-[11px] sm:text-xs">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {activeSimulation} ATTACK ACTIVE
            </span>
          ) : (
            <span className="font-bold text-emerald-400 font-mono flex items-center gap-1 text-[11px] sm:text-xs">
              <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" /> GENUINE PROFILE (LIVE)
            </span>
          )}
        </div>

        {activeSimulation && (
          <button
            onClick={handleResetToGenuine}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Resume Genuine Profile
          </button>
        )}
      </div>
    </div>
  );
};
