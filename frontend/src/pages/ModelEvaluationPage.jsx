import React, { useState, useEffect } from 'react';
import api from '../services/api';
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
import { BarChart3, Award, CheckCircle2, AlertTriangle, Layers, BookOpen, RefreshCw, Download, Printer } from 'lucide-react';

export const ModelEvaluationPage = () => {
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchEvaluation = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get('/biometric/evaluation');
      setEvaluation(res.data);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'No model evaluation available yet. Complete enrollment first.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!evaluation) return;
    const { metrics, roc_curve, confusion_matrix } = evaluation;
    let csv = "Academic Model Evaluation Benchmark Report\n";
    csv += `Metric,Value\n`;
    csv += `ROC_AUC,${metrics.roc_auc}\n`;
    csv += `Accuracy,${metrics.accuracy}\n`;
    csv += `Precision,${metrics.precision}\n`;
    csv += `Recall_TPR,${metrics.recall}\n`;
    csv += `FAR_FalseAcceptanceRate,${metrics.false_acceptance_rate_far}\n`;
    csv += `FRR_FalseRejectionRate,${metrics.false_rejection_rate_frr}\n\n`;

    csv += `Confusion Matrix\n`;
    csv += `Actual_Predicted,Predicted_Authentic,Predicted_Anomaly\n`;
    csv += `Genuine_User,${confusion_matrix.true_positives_genuine_accepted},${confusion_matrix.false_negatives_genuine_blocked}\n`;
    csv += `Adversary_Impostor,${confusion_matrix.false_positives_impostor_accepted},${confusion_matrix.true_negatives_impostor_blocked}\n\n`;

    csv += `ROC Curve Points\n`;
    csv += `FPR,TPR\n`;
    roc_curve.forEach(pt => {
      csv += `${pt.fpr},${pt.tpr}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `biometric_model_benchmark_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    window.print();
  };

  useEffect(() => {
    fetchEvaluation();
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-3" />
        <p className="text-xs">Loading academic evaluation metrics...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-lg mx-auto">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <h3 className="font-bold text-slate-200 text-sm mb-1">Evaluation Unavailable</h3>
        <p className="text-xs text-slate-400 mb-4">{errorMsg}</p>
        <button
          onClick={fetchEvaluation}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
        >
          Retry Fetch
        </button>
      </div>
    );
  }

  const { metrics, confusion_matrix, roc_curve, score_distribution } = evaluation;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
            <Award className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 flex-shrink-0" />
            <span>Academic Model Evaluation &amp; Benchmarks</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
            Empirical validation of Isolation Forest anomaly detector on genuine vs. synthetic adversarial profiles.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700"
            title="Download CSV of benchmarks & ROC curve points"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" /> Export CSV
          </button>
          <button
            onClick={handlePrintReport}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700"
            title="Print or Save as PDF Academic Report"
          >
            <Printer className="w-3.5 h-3.5 text-cyan-400" /> Print / PDF
          </button>
          <button
            onClick={fetchEvaluation}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl">
          <span className="block text-[10px] uppercase font-mono text-slate-500">ROC AUC</span>
          <span className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-400">
            {metrics.roc_auc.toFixed(3)}
          </span>
          <span className="block text-[9px] text-slate-500 mt-0.5 sm:mt-1">Area Under Curve</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl">
          <span className="block text-[10px] uppercase font-mono text-slate-500">Accuracy</span>
          <span className="text-xl sm:text-2xl font-extrabold font-mono text-slate-100">
            {(metrics.accuracy * 100).toFixed(1)}%
          </span>
          <span className="block text-[9px] text-slate-500 mt-0.5 sm:mt-1">Overall Classif.</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl">
          <span className="block text-[10px] uppercase font-mono text-slate-500">Precision</span>
          <span className="text-xl sm:text-2xl font-extrabold font-mono text-slate-100">
            {(metrics.precision * 100).toFixed(1)}%
          </span>
          <span className="block text-[9px] text-slate-500 mt-0.5 sm:mt-1">Inlier Positive</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl">
          <span className="block text-[10px] uppercase font-mono text-slate-500">Recall / TPR</span>
          <span className="text-xl sm:text-2xl font-extrabold font-mono text-slate-100">
            {(metrics.recall * 100).toFixed(1)}%
          </span>
          <span className="block text-[9px] text-slate-500 mt-0.5 sm:mt-1">True Pos. Rate</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl">
          <span className="block text-[10px] uppercase font-mono text-slate-500">FAR (Impostor)</span>
          <span className="text-xl sm:text-2xl font-extrabold font-mono text-amber-400">
            {(metrics.false_acceptance_rate_far * 100).toFixed(1)}%
          </span>
          <span className="block text-[9px] text-slate-500 mt-0.5 sm:mt-1">False Acceptance</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl">
          <span className="block text-[10px] uppercase font-mono text-slate-500">FRR (Genuine)</span>
          <span className="text-xl sm:text-2xl font-extrabold font-mono text-amber-400">
            {(metrics.false_rejection_rate_frr * 100).toFixed(1)}%
          </span>
          <span className="block text-[9px] text-slate-500 mt-0.5 sm:mt-1">False Rejection</span>
        </div>
      </div>

      {/* Charts & Matrix Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* ROC Curve Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h3 className="font-semibold text-xs sm:text-sm text-slate-200 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Receiver Operating Characteristic (ROC Curve)</span>
            </h3>
            <span className="self-start sm:self-auto text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              AUC = {metrics.roc_auc.toFixed(3)}
            </span>
          </div>

          <div className="h-56 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={roc_curve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="fpr"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  label={{ value: 'False Positive Rate (FPR)', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#64748b' }}
                />
                <YAxis
                  domain={[0, 1]}
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  label={{ value: 'True Positive Rate (TPR)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#64748b' }}
                />
                {/* Diagonal random guess reference */}
                <Line
                  type="linear"
                  data={[{ fpr: 0, tpr: 0 }, { fpr: 1, tpr: 1 }]}
                  dataKey="tpr"
                  stroke="#475569"
                  strokeDasharray="4 4"
                  dot={false}
                />
                {/* Real Isolation Forest ROC */}
                <Line
                  type="monotone"
                  dataKey="tpr"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 text-center">
            Steeper ascent toward top-left corner demonstrates superior sensitivity and specificity.
          </p>
        </div>

        {/* Confusion Matrix Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-xs sm:text-sm text-slate-200 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Binary Confusion Matrix (Threshold &le; 50% Risk)</span>
            </h3>

            <div className="overflow-x-auto -mx-1 sm:mx-0">
              <table className="w-full text-center border-collapse min-w-[280px]">
                <thead>
                  <tr>
                    <th className="p-1.5 sm:p-2 text-[11px] sm:text-xs font-semibold text-slate-400 border border-slate-800 bg-slate-950">
                      Actual \ Pred
                    </th>
                    <th className="p-1.5 sm:p-2 text-[11px] sm:text-xs font-semibold text-emerald-400 border border-slate-800 bg-slate-950">
                      Authentic (&le;50%)
                    </th>
                    <th className="p-1.5 sm:p-2 text-[11px] sm:text-xs font-semibold text-red-400 border border-slate-800 bg-slate-950">
                      Anomaly (&gt;50%)
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[11px] sm:text-xs font-mono">
                  <tr>
                    <td className="p-2 sm:p-3 font-semibold text-slate-300 border border-slate-800 bg-slate-950 text-left sm:text-center">
                      Genuine User
                    </td>
                    <td className="p-2 sm:p-3 border border-slate-800 bg-emerald-500/10 text-emerald-300 font-bold">
                      {confusion_matrix.true_positives_genuine_accepted} (TP)
                    </td>
                    <td className="p-2 sm:p-3 border border-slate-800 bg-amber-500/10 text-amber-300">
                      {confusion_matrix.false_negatives_genuine_blocked} (FN)
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 sm:p-3 font-semibold text-slate-300 border border-slate-800 bg-slate-950 text-left sm:text-center">
                      Adversary
                    </td>
                    <td className="p-2 sm:p-3 border border-slate-800 bg-red-500/10 text-red-300">
                      {confusion_matrix.false_positives_impostor_accepted} (FP)
                    </td>
                    <td className="p-2 sm:p-3 border border-slate-800 bg-emerald-500/10 text-emerald-300 font-bold">
                      {confusion_matrix.true_negatives_impostor_blocked} (TN)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Risk Score Separation */}
          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 gap-2 sm:gap-3 text-xs">
            <div className="bg-slate-950/60 p-2.5 sm:p-3 rounded-xl border border-slate-800">
              <span className="block text-[10px] uppercase font-mono text-slate-500">Genuine Mean</span>
              <span className="font-mono font-bold text-emerald-400 text-sm sm:text-base">
                {score_distribution.genuine_mean_risk}%
              </span>
              <span className="block text-[9px] text-slate-500">Std: &plusmn;{score_distribution.genuine_std_risk}%</span>
            </div>

            <div className="bg-slate-950/60 p-2.5 sm:p-3 rounded-xl border border-slate-800">
              <span className="block text-[10px] uppercase font-mono text-slate-500">Impostor Mean</span>
              <span className="font-mono font-bold text-red-400 text-sm sm:text-base">
                {score_distribution.impostor_mean_risk}%
              </span>
              <span className="block text-[9px] text-slate-500">Std: &plusmn;{score_distribution.impostor_std_risk}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Academic Methodology Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-3 text-xs text-slate-400">
        <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Academic ML Methodology &amp; Mathematical Formulation</span>
        </h4>
        <p className="leading-relaxed">
          The continuous authentication engine utilizes an ensemble of 100 random decision trees in an <strong>Isolation Forest</strong>. Anomaly isolation works on the premise that anomalies are few and structurally distinct, making them easier to isolate near the root of the tree with fewer recursive splits.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-[11px]">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <strong className="text-slate-200 block mb-1">RobustScaler Normalization</strong>
            Uses feature medians and interquartile ranges (IQR) to prevent natural keyboard pauses from biasing tree splits.
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <strong className="text-slate-200 block mb-1">Sigmoid Risk Calibration</strong>
            P(anomaly) = 1 / (1 + exp(-k &times; (s - s₀))) converts raw Isolation Forest scores into calibrated risk between 0% and 100%.
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <strong className="text-slate-200 block mb-1">Exponential Moving Average</strong>
            R(t) = &alpha; &times; r(t) + (1 - &alpha;) &times; R(t-1) stabilizes session risk against momentary typing hiccups.
          </div>
        </div>
      </div>
    </div>
  );
};
