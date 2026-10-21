import React from 'react';
import { HelpCircle, ArrowUpRight, ArrowDownRight, CheckCircle2, AlertOctagon } from 'lucide-react';

export const ExplainabilityCard = ({ explanations = [] }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <h3 className="font-semibold text-xs sm:text-sm text-slate-200">
              Biometric Anomaly Attributions
            </h3>
          </div>
          <span className="text-[9px] sm:text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 whitespace-nowrap">
            Z-Score Decomposition
          </span>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Statistical deviations indicating why the current interaction rhythm diverges from the user's enrolled baseline profile.
        </p>

        <div className="space-y-2.5">
          {explanations.length > 0 ? (
            explanations.map((exp, idx) => {
              const isCrit = exp.severity === 'CRITICAL';
              const isWarn = exp.severity === 'WARNING';

              const badgeColor = isCrit
                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                : isWarn
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';

              return (
                <div
                  key={idx}
                  className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-slate-200 flex items-center gap-1.5">
                      {isCrit ? (
                        <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
                      ) : isWarn ? (
                        <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      {exp.feature_label}
                    </span>

                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
                      {exp.direction === 'HIGHER' ? '+' : ''}{exp.deviation_z_score} &sigma;
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {exp.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 text-[10px] font-mono text-slate-500">
                    <span>Observed: <strong className="text-slate-300">{exp.observed_value}</strong></span>
                    <span>Enrolled Mean: <strong className="text-slate-300">{exp.baseline_mean}</strong></span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 sm:p-8 text-center text-xs text-slate-500">
              Interaction dynamics are fully aligned with baseline profile. No anomalous deviations detected.
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/80 text-[10px] text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <span>Zero-Content Guarantee: Features are pure dynamics</span>
        <span>Standard Normal: &plusmn;1.96 &sigma; (95% CI)</span>
      </div>
    </div>
  );
};
