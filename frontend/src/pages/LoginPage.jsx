import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, User, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

export const LoginPage = ({ onSwitchToRegister }) => {
  const { login, loginDemo } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    setErrorMsg('');
    try {
      await loginDemo();
    } catch (err) {
      setErrorMsg('Failed to initialize demo evaluator session.');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanUsername = username.trim();

    if (!cleanUsername || !password) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      await login(cleanUsername, password);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setErrorMsg(detail);
      } else if (Array.isArray(detail) && detail.length > 0) {
        setErrorMsg(detail[0].msg || 'Validation failed. Please verify your credentials.');
      } else {
        setErrorMsg('Invalid login credentials. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        {/* Top Segmented Mode Switcher */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-6">
          <button
            type="button"
            className="flex-1 py-2 text-xs font-semibold rounded-lg bg-emerald-500 text-white shadow-sm"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="flex-1 py-2 text-xs font-semibold rounded-lg transition text-slate-400 hover:text-slate-200"
          >
            Create Account
          </button>
        </div>

        {/* Logo & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400 mb-3 shadow-lg">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100">Welcome Back</h2>
          <p className="text-xs text-slate-400 mt-1">
            Sign in to your continuous authentication session
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="self-start text-[11px] font-bold text-emerald-400 hover:text-emerald-300 underline"
            >
              Don't have an account yet? Create one here &rarr;
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. alice_researcher"
                autoFocus
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || demoLoading}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Sign In to Session <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Instant Evaluator Quick Demo */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900 px-2 text-slate-500 font-mono text-[10px]">
              Or Presentation / Viva Demo
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={loading || demoLoading}
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-emerald-500/10 hover:from-emerald-500/20 hover:to-cyan-500/20 border border-emerald-500/30 text-emerald-300 font-semibold text-xs transition flex items-center justify-center gap-2 group shadow-sm"
        >
          {demoLoading ? (
            <span className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Instant Evaluator Demo (One-Click)</span>
            </>
          )}
        </button>

        <div className="mt-6 pt-5 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            Don't have an academic account?{' '}
            <button
              onClick={onSwitchToRegister}
              className="text-emerald-400 hover:text-emerald-300 font-semibold underline ml-1"
            >
              Register here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
