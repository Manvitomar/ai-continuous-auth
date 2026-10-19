import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useBiometrics } from '../context/BiometricContext';
import { RiskGauge } from '../components/RiskGauge';
import { TelemetryCharts } from '../components/TelemetryCharts';
import { ExplainabilityCard } from '../components/ExplainabilityCard';
import { ImpostorSimulator } from '../components/ImpostorSimulator';
import { GatedActionCard } from '../components/GatedActionCard';
import { ShieldCheck, UserCheck, AlertTriangle } from 'lucide-react';

export const DashboardPage = ({ onOpenEnrollment, onOpenMFA }) => {
  const { user } = useAuth();
  const { currentRiskScore, rawAnomalyScore, riskStatus, explanations, history, isMfaChallenged } = useBiometrics();

  return (
    <div className="space-y-6">
      {/* Enrollment Callout Banner if not yet enrolled */}
      {!user?.is_enrolled && (
        <div className="bg-gradient-to-r from-emerald-950/70 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400 flex-shrink-0">
              <UserCheck className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Biometric Enrollment Required
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                To activate continuous authentication, calibrate your baseline behavioral profile by typing a neutral passage and completing basic mouse calibration. Zero character content is stored.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenEnrollment}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition shadow-lg shadow-emerald-500/20 flex-shrink-0"
          >
            Start Guided Enrollment
          </button>
        </div>
      )}

      {/* Primary Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Speedometer Gauge */}
        <div className="lg:col-span-1">
          <RiskGauge
            riskScore={currentRiskScore}
            rawAnomalyScore={rawAnomalyScore}
            riskStatus={riskStatus}
          />
        </div>

        {/* Live History Trajectory Chart */}
        <div className="lg:col-span-2">
          <TelemetryCharts history={history} />
        </div>
      </div>

      {/* Middle Row: Explainability Breakdown */}
      <div className="grid grid-cols-1 gap-6">
        <ExplainabilityCard explanations={explanations} />
      </div>

      {/* Bottom Row: Adversarial Simulator & Sensitive Gated Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ImpostorSimulator />
        <GatedActionCard onRequireMFA={onOpenMFA} />
      </div>
    </div>
  );
};
