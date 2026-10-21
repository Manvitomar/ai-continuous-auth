import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useBiometrics } from '../context/BiometricContext';
import { ShieldAlert, KeyRound, CheckCircle2, AlertCircle, Copy, ArrowRight, Lock } from 'lucide-react';

export const MFAModal = ({ isOpen, onClose, isChallengedMode = false }) => {
  const { user, updateUserProfile } = useAuth();
  const { verifyMFA, currentRiskScore } = useBiometrics();

  const [totpCode, setTotpCode] = useState('');
  const [setupData, setSetupData] = useState(null); // { secret, provisioning_uri, qr_code_base64, backup_codes }
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTotpCode('');
      setErrorMsg('');
      setSuccessMsg('');

      // If user doesn't have TOTP enabled and is not in challenged lock, initialize setup
      if (!user?.totp_enabled && !isChallengedMode) {
        initializeSetup();
      }
    }
  }, [isOpen, user?.totp_enabled, isChallengedMode]);

  if (!isOpen && !isChallengedMode) return null;

  const initializeSetup = async () => {
    setIsSettingUp(true);
    setLoading(true);
    try {
      const res = await api.post('/mfa/setup');
      setSetupData(res.data);
    } catch (err) {
      setErrorMsg('Failed to initialize TOTP secret.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOrUnlock = async (e) => {
    e.preventDefault();
    if (!totpCode || totpCode.trim().length < 6) {
      setErrorMsg('Please enter a valid 6-digit TOTP verification code.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      if (isSettingUp && !user?.totp_enabled) {
        // First-time activation
        const res = await api.post('/mfa/enable', { code: totpCode.trim() });
        if (res.data.verified) {
          updateUserProfile({ totp_enabled: true });
          setSuccessMsg('TOTP Authenticator successfully configured and activated!');
          setTimeout(() => {
            if (onClose) onClose();
          }, 1500);
        }
      } else {
        // High-risk unlock or challenge verification
        const ok = await verifyMFA(totpCode.trim());
        if (ok) {
          setSuccessMsg('Identity verified! Session risk restored to baseline.');
          setTimeout(() => {
            if (onClose) onClose();
          }, 1200);
        } else {
          setErrorMsg('Invalid verification code. Please check your authenticator clock.');
        }
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Verification failed. Please check code or backup code.');
    } finally {
      setLoading(false);
    }
  };

  const copySecretToClipboard = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl relative overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Glow */}
        <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
          isChallengedMode ? 'bg-red-500/15' : 'bg-emerald-500/15'
        }`} />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-800 mb-4 sm:mb-5">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className={`p-2 sm:p-2.5 rounded-2xl border flex-shrink-0 ${
              isChallengedMode
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              {isChallengedMode ? <Lock className="w-5 h-5 animate-bounce" /> : <KeyRound className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-100">
                {isChallengedMode ? 'Security Anomaly Lockdown' : 'TOTP Multi-Factor Authentication'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400">
                {isChallengedMode ? `Risk Score Breached ${currentRiskScore}%` : 'RFC 6238 Time-Based OTP'}
              </p>
            </div>
          </div>
          {!isChallengedMode && (
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-base sm:text-lg p-1">
              &times;
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* SETUP SCREEN (If not yet enabled) */}
        {isSettingUp && !user?.totp_enabled && setupData && (
          <div className="space-y-4 mb-4">
            <p className="text-xs text-slate-300">
              Scan this QR code with <strong>Google Authenticator</strong>, <strong>Authy</strong>, or any TOTP app:
            </p>

            <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 bg-white rounded-2xl shadow-inner">
              <img
                src={setupData.qr_code_base64}
                alt="TOTP QR Code"
                className="w-36 h-36 sm:w-44 sm:h-44 object-contain"
              />
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs font-mono">
              <span className="text-slate-400 truncate pr-2">Secret: {setupData.secret}</span>
              <button
                type="button"
                onClick={copySecretToClipboard}
                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[11px] font-sans"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedSecret ? 'Copied' : 'Copy'}
              </button>
            </div>

            {setupData.backup_codes && (
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                <span className="block font-semibold text-slate-300 mb-1">Backup Recovery Codes:</span>
                <div className="flex flex-wrap gap-1.5 font-mono">
                  {setupData.backup_codes.map((code, idx) => (
                    <span key={idx} className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200">
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* HIGH-RISK CHALLENGE BANNER */}
        {isChallengedMode && (
          <div className="mb-4 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 leading-relaxed">
            <strong className="block text-red-200 font-semibold mb-1 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              Behavioral Pattern Deviation Detected
            </strong>
            The continuous biometric engine detected a statistical divergence from your enrolled typing and mouse cadence. Sensitive operations are restricted until re-authenticated.
          </div>
        )}

        {/* VERIFICATION FORM */}
        <form onSubmit={handleVerifyOrUnlock} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
              Enter 6-Digit Authenticator Code (or Backup Code):
            </label>
            <input
              type="text"
              maxLength={8}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
              placeholder="000000"
              autoFocus
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-xl font-mono tracking-widest text-slate-100 focus:border-emerald-500 focus:outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-semibold text-white text-sm transition flex items-center justify-center gap-2 ${
              isChallengedMode
                ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20'
                : 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20'
            }`}
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isChallengedMode ? (
              <>Verify &amp; Unlock Session <ArrowRight className="w-4 h-4" /></>
            ) : isSettingUp ? (
              <>Confirm &amp; Enable TOTP <ArrowRight className="w-4 h-4" /></>
            ) : (
              <>Verify Identity <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
