import React, { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useBiometrics } from '../context/BiometricContext';
import { Landmark, FileSpreadsheet, Lock, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export const GatedActionCard = ({ onRequireMFA }) => {
  const { sessionToken } = useAuth();
  const { currentRiskScore, riskStatus } = useBiometrics();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { type: 'success' | 'error', message, txId }

  const handleExecuteAction = async (actionType, target, amount = 0) => {
    setLoading(true);
    setResult(null);

    try {
      const res = await api.post('/actions/execute', {
        action_type: actionType,
        target,
        amount,
        session_token: sessionToken
      });

      setResult({
        type: 'success',
        message: res.data.message,
        txId: res.data.transaction_id,
        risk: res.data.risk_score_at_execution
      });
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (err.response?.status === 403 && detail?.requires_mfa) {
        setResult({
          type: 'error',
          message: detail.message,
          risk: detail.risk_score,
          requiresMfa: true
        });
        if (onRequireMFA) onRequireMFA();
      } else {
        setResult({
          type: 'error',
          message: typeof detail === 'string' ? detail : 'Action execution failed.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-4">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <h3 className="font-semibold text-xs sm:text-sm text-slate-200">
            Risk-Gated Sensitive Operations
          </h3>
        </div>
        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
          Threshold &gt; 70% Blocked
        </span>
      </div>

      <p className="text-xs text-slate-400 mb-5 leading-relaxed">
        High-value business actions require continuous behavioral verification. If the live anomaly score reaches the danger threshold, operations are automatically locked pending step-up TOTP.
      </p>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {/* Wire Transfer */}
        <div className="bg-slate-950/60 p-3.5 sm:p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs mb-1">
              <Landmark className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Transfer Tuition / Research Grant</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Wire $2,500.00 to Academic Financial Bursar.
            </p>
          </div>
          <button
            onClick={() => handleExecuteAction('WIRE_TRANSFER', 'FINANCIAL_BURSAR', 2500.0)}
            disabled={loading}
            className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition border border-slate-700 flex items-center justify-center gap-1.5"
          >
            Execute Transfer <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Academic Records Export */}
        <div className="bg-slate-950/60 p-3.5 sm:p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs mb-1">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Export Confidential Transcripts</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Download encrypted academic records and evaluation audits.
            </p>
          </div>
          <button
            onClick={() => handleExecuteAction('DATA_EXPORT', 'CONFIDENTIAL_TRANSCRIPTS')}
            disabled={loading}
            className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition border border-slate-700 flex items-center justify-center gap-1.5"
          >
            Export Archive <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Execution Feedback Banner */}
      {result && (
        <div
          className={`p-3.5 rounded-xl border text-xs leading-relaxed transition ${
            result.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
            <span className="font-semibold flex items-center gap-1.5">
              {result.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              )}
              {result.type === 'success' ? 'Operation Approved' : 'Security Policy Violation'}
            </span>
            {result.txId && (
              <span className="self-start sm:self-auto font-mono text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300">
                {result.txId}
              </span>
            )}
          </div>
          <p>{result.message}</p>
          {result.requiresMfa && (
            <button
              onClick={onRequireMFA}
              className="mt-2 text-[11px] font-bold text-red-200 underline hover:text-white"
            >
              Click here to unlock session with TOTP Authenticator &rarr;
            </button>
          )}
        </div>
      )}
    </div>
  );
};
