import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FeatureExtractor } from '../biometrics/featureExtractor';
import { ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, MousePointer, Keyboard, Sparkles } from 'lucide-react';

const ENROLLMENT_PROMPTS = [
  "Continuous authentication verifies human identity through natural typing and interaction rhythms.",
  "Biometric dynamics preserve privacy by discarding all textual characters and preserving only timing intervals.",
  "Machine learning models detect anomalous behavioral drift without requiring invasive physical sensors.",
  "The Isolation Forest algorithm isolates anomalous interaction patterns through random recursive partitioning."
];

export const EnrollmentModal = ({ isOpen, onClose, onEnrollmentComplete }) => {
  const { user, updateConsent, updateUserProfile } = useAuth();

  const [step, setStep] = useState(1); // 1: Consent, 2: Typing, 3: Mouse Calibration, 4: Training
  const [consentChecked, setConsentChecked] = useState(false);
  const [currentPromptIdx, setCurrentPromptIdx] = useState(0);
  const [typedInput, setTypedInput] = useState('');
  const [collectedSamples, setCollectedSamples] = useState([]);
  const [mouseTargetsHit, setMouseTargetsHit] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const extractorRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      extractorRef.current = new FeatureExtractor();
      extractorRef.current.startListening();
      setStep(user?.consent_given ? 2 : 1);
      setConsentChecked(user?.consent_given || false);
      setCollectedSamples([]);
      setMouseTargetsHit(0);
      setTypedInput('');
      setErrorMsg('');
    }

    return () => {
      if (extractorRef.current) {
        extractorRef.current.stopListening();
      }
    };
  }, [isOpen, user?.consent_given]);

  if (!isOpen) return null;

  const handleConsentSubmit = async () => {
    if (!consentChecked) {
      setErrorMsg('Please review and check the behavioral telemetry consent box to proceed.');
      return;
    }
    try {
      await updateConsent(true);
      setStep(2);
      setErrorMsg('');
    } catch (err) {
      setErrorMsg('Failed to record biometric consent. Please try again.');
    }
  };

  const handleTypingChange = (e) => {
    const val = e.target.value;
    setTypedInput(val);

    // Harvest a window every ~25 characters
    if (val.length > 0 && val.length % 25 === 0 && extractorRef.current) {
      const vec = extractorRef.current.extractFeatureVector();
      setCollectedSamples(prev => [...prev, vec]);
    }

    // Check if user finished current prompt
    const targetPrompt = ENROLLMENT_PROMPTS[currentPromptIdx];
    if (val.trim() === targetPrompt.trim() || val.length >= targetPrompt.length + 5) {
      // Harvest completed prompt window
      if (extractorRef.current) {
        const vec = extractorRef.current.extractFeatureVector();
        setCollectedSamples(prev => [...prev, vec]);
      }

      if (currentPromptIdx < ENROLLMENT_PROMPTS.length - 1) {
        setCurrentPromptIdx(prev => prev + 1);
        setTypedInput('');
      } else {
        // Move to mouse calibration step
        setStep(3);
      }
    }
  };

  const handleTargetClick = (targetId) => {
    if (extractorRef.current) {
      const vec = extractorRef.current.extractFeatureVector();
      setCollectedSamples(prev => [...prev, vec]);
    }
    const newCount = mouseTargetsHit + 1;
    setMouseTargetsHit(newCount);

    if (newCount >= 6) {
      // Gathered enough samples (typing + mouse >= 12-15)
      trainAndFinalize();
    }
  };

  const trainAndFinalize = async () => {
    setStep(4);
    setIsSubmitting(true);
    setErrorMsg('');

    // Ensure we have at least 10 samples
    let finalSamples = collectedSamples.slice();
    if (finalSamples.length < 12 && extractorRef.current) {
      while (finalSamples.length < 15) {
        finalSamples.push(extractorRef.current.extractFeatureVector());
      }
    }

    try {
      const res = await api.post('/biometric/enroll', { samples: finalSamples });
      updateUserProfile({ is_enrolled: true });
      if (onEnrollmentComplete) onEnrollmentComplete(res.data);
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 1500);
    } catch (err) {
      setIsSubmitting(false);
      setErrorMsg(err.response?.data?.detail || 'Failed to train biometric model. Please try again.');
      setStep(2);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-8 shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Behavioral Biometrics Enrollment</h2>
              <p className="text-xs text-slate-400">Step {step} of 4: Calibrate Baseline Profile</p>
            </div>
          </div>
          {step !== 4 && (
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-sm">
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

        {/* STEP 1: Consent */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs text-slate-300">
              <h4 className="font-semibold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Zero-Content Privacy Protocol
              </h4>
              <p className="leading-relaxed">
                This academic continuous authentication platform measures your behavioral interaction dynamics (keystroke hold times, flight latency, mouse velocity, and trajectory smoothness).
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li><strong className="text-slate-200">No passwords or text</strong> are ever logged or stored.</li>
                <li>Only relative millisecond time intervals are mathematically processed.</li>
                <li>An individual <strong>Isolation Forest</strong> model is trained locally to establish your authentic baseline.</li>
              </ul>
            </div>

            <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/40 border border-slate-800 cursor-pointer hover:bg-slate-800/40 transition">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-300 leading-snug">
                I understand and consent to the recording of numerical behavioral biometric timing dynamics for identity verification.
              </span>
            </label>

            <button
              onClick={handleConsentSubmit}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-semibold text-white text-sm transition flex items-center justify-center gap-2"
            >
              Continue to Keystroke Calibration <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: Typing Calibration */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                <Keyboard className="w-4 h-4" /> Exercise {currentPromptIdx + 1} of {ENROLLMENT_PROMPTS.length}
              </span>
              <span>Samples Gathered: <strong>{collectedSamples.length}</strong></span>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-sm font-mono text-slate-300 leading-relaxed select-none">
              {ENROLLMENT_PROMPTS[currentPromptIdx]}
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                Type the passage naturally above:
              </label>
              <textarea
                rows={3}
                value={typedInput}
                onChange={handleTypingChange}
                placeholder="Start typing naturally here..."
                autoFocus
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none transition resize-none font-mono"
              />
            </div>

            <div className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>Type at your usual natural speed</span>
              <span>{typedInput.length} / {ENROLLMENT_PROMPTS[currentPromptIdx].length} chars</span>
            </div>
          </div>
        )}

        {/* STEP 3: Mouse Calibration */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                <MousePointer className="w-4 h-4" /> Click the Active Target
              </span>
              <span>Target {mouseTargetsHit + 1} of 6</span>
            </div>

            <p className="text-xs text-slate-400">
              Move your mouse naturally and click each numbered target to calibrate cursor velocity and curvature.
            </p>

            {/* Target Canvas Grid */}
            <div className="relative h-48 bg-slate-950 rounded-2xl border border-slate-800 p-4 overflow-hidden flex items-center justify-center">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const isActive = mouseTargetsHit === idx;
                const positions = [
                  'top-6 left-8',
                  'top-6 right-8',
                  'bottom-6 left-12',
                  'bottom-6 right-12',
                  'top-1/2 left-1/3 -translate-y-1/2',
                  'top-1/2 right-1/3 -translate-y-1/2'
                ];

                if (!isActive) return null;

                return (
                  <button
                    key={idx}
                    onClick={() => handleTargetClick(idx)}
                    className={`absolute ${positions[idx]} px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all transform hover:scale-105 bg-emerald-500 text-white animate-pulse`}
                  >
                    Target #{idx + 1} (Click Me)
                  </button>
                );
              })}
            </div>

            <div className="text-center text-xs text-slate-500">
              Calibration captures natural trajectory arc, velocity, and click duration.
            </div>
          </div>
        )}

        {/* STEP 4: Training in Progress */}
        {step === 4 && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-14 h-14 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" />
            <div>
              <h3 className="font-bold text-base text-slate-100">Fitting Isolation Forest Model</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Normalizing numerical features with RobustScaler, fitting 100 random decision trees, and generating baseline benchmark ROC metrics...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
