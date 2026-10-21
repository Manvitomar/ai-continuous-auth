import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { Activity, Gauge } from 'lucide-react';

export const TelemetryCharts = ({ history = [] }) => {
  // Format data for chart
  const chartData = history.map((item, idx) => ({
    name: item.timestamp || `W-${idx + 1}`,
    risk: item.risk_score,
    raw: item.raw_anomaly_score,
    status: item.risk_status
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1">
          <p className="font-semibold text-slate-200">{label}</p>
          <p className="text-emerald-400 font-mono">
            Calibrated Risk: <span className="font-bold">{data.risk}%</span>
          </p>
          <p className="text-slate-400 font-mono">
            Model Raw: <span className="font-bold">{data.raw}</span>
          </p>
          <p className="text-[10px] uppercase font-bold text-slate-500">
            Status: {data.status}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <h3 className="font-semibold text-xs sm:text-sm text-slate-200">
            Real-Time Anomaly Trajectory
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500" />
            Normal (&le;40%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-amber-500" />
            Warning (41-70%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500" />
            Breach (&gt;70%)
          </span>
        </div>
      </div>

      <div className="h-56 sm:h-64 w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} tickLine={false} />
              
              {/* Threshold lines */}
              <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.6} />
              <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.8} />

              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="risk"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 3 }}
                activeDot={{ r: 6, fill: '#34d399' }}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
            <Gauge className="w-8 h-8 mb-2 opacity-40 animate-spin" />
            Streaming continuous telemetry windows...
          </div>
        )}
      </div>
    </div>
  );
};
