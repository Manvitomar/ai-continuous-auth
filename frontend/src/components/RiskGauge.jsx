import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';

export const RiskGauge = ({ riskScore = 5.0, rawAnomalyScore = 0.20, riskStatus = 'LOW' }) => {
  // Normalize 0-100 to angle between -90 and 90 degrees
  const angle = Math.min(90, Math.max(-90, (riskScore / 100) * 180 - 90));

  const getColor = () => {
    if (riskScore <= 40) return { stroke: '#10b981', bg: 'text-emerald-400', label: 'AUTHENTIC USER' };
    if (riskScore <= 70) return { stroke: '#f59e0b', bg: 'text-amber-400', label: 'ELEVATED MONITORING' };
    return { stroke: '#ef4444', bg: 'text-red-400', label: 'ANOMALY BREACH' };
  };

  const statusInfo = getColor();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col items-center justify-between relative overflow-hidden">
      {/* Background glow based on risk */}
      <div
        className="absolute -top-12 -left-12 w-48 h-48 rounded-full blur-3xl opacity-15 pointer-events-none transition-all duration-700"
        style={{ backgroundColor: statusInfo.stroke }}
      />

      <div className="w-full flex items-center justify-between mb-2 gap-2">
        <h3 className="font-semibold text-xs sm:text-sm text-slate-300 uppercase tracking-wider truncate">
          Continuous Risk Engine
        </h3>
        <span className={`text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-current/20 whitespace-nowrap ${statusInfo.bg}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* SVG Semi-Circle Speedometer */}
      <div className="relative w-full max-w-[260px] h-36 flex items-center justify-center my-2">
        <svg viewBox="0 0 200 110" className="w-full h-full">
          {/* Background Arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#1e293b"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Color Zones */}
          {/* Green zone (0-40%) */}
          <path
            d="M 20 100 A 80 80 0 0 1 84 36"
            fill="none"
            stroke="#10b981"
            strokeWidth="8"
            strokeOpacity="0.4"
          />
          {/* Yellow zone (40-70%) */}
          <path
            d="M 84 36 A 80 80 0 0 1 144 48"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="8"
            strokeOpacity="0.4"
          />
          {/* Red zone (70-100%) */}
          <path
            d="M 144 48 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#ef4444"
            strokeWidth="8"
            strokeOpacity="0.4"
          />

          {/* Needle */}
          <g
            style={{
              transform: `rotate(${angle}deg)`,
              transformOrigin: '100px 100px',
              transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="28"
              stroke={statusInfo.stroke}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="100" cy="100" r="7" fill={statusInfo.stroke} />
            <circle cx="100" cy="100" r="3" fill="#0f172a" />
          </g>
        </svg>

        {/* Needle center readout */}
        <div className="absolute bottom-2 flex flex-col items-center">
          <span className="text-3xl font-extrabold tracking-tight font-mono text-white">
            {riskScore.toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-400 uppercase font-semibold">
            Calibrated Risk
          </span>
        </div>
      </div>

      {/* Metric Breakdown Footer */}
      <div className="w-full grid grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-xs text-slate-400">
        <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
          <span className="block text-[10px] uppercase font-mono text-slate-500">ML Model Output</span>
          <span className="font-mono font-bold text-slate-200">
            {rawAnomalyScore > 0 ? `+${rawAnomalyScore.toFixed(3)}` : rawAnomalyScore.toFixed(3)}
          </span>
          <span className="block text-[9px] text-slate-500">Isolation Forest (s &gt; 0 = Inlier)</span>
        </div>

        <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
          <span className="block text-[10px] uppercase font-mono text-slate-500">Policy Action</span>
          <span className="font-semibold text-slate-200">
            {riskScore <= 40 ? 'All Allowed' : riskScore <= 70 ? 'Step-up Warning' : 'Session Challenged'}
          </span>
          <span className="block text-[9px] text-slate-500">
            {riskScore <= 70 ? 'Normal privileges' : 'TOTP Required'}
          </span>
        </div>
      </div>
    </div>
  );
};
