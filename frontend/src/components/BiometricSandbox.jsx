import React, { useState, useRef } from 'react';
import { useBiometrics } from '../context/BiometricContext';
import { Keyboard, Zap, RefreshCw, CheckCircle2, AlertTriangle, UserX, UserCheck } from 'lucide-react';

export const BiometricSandbox = () => {
  const { sendTelemetryWindow } = useBiometrics();
  const [text, setText] = useState('');
  const [wpm, setWpm] = useState(0);
  const [avgHoldTime, setAvgHoldTime] = useState(0);
  const [avgFlightTime, setAvgFlightTime] = useState(0);
  const [overlapRatio, setOverlapRatio] = useState(0);
  const [lastEvaluatedRisk, setLastEvaluatedRisk] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Key tracking
  const keyPressMap = useRef({});
  const holdTimes = useRef([]);
  const flightTimes = useRef([]);
  const lastKeyDownTime = useRef(null);
  const lastKeyUpTime = useRef(null);
  const backspaceCount = useRef(0);
  const keyCount = useRef(0);
  const overlapCount = useRef(0);
  const startTime = useRef(null);

  const practicePrompt = "Machine learning behavioral biometrics verify authentic keystroke flight time and mouse curvature.";

  const handleKeyDown = (e) => {
    const now = performance.now();
    if (!startTime.current) startTime.current = now;

    keyCount.current += 1;
    if (e.key === 'Backspace') backspaceCount.current += 1;

    // Detect key overlap (roll-typing)
    if (Object.keys(keyPressMap.current).length > 0) {
      overlapCount.current += 1;
    }
    const currentOverlap = keyCount.current > 1 ? Math.min(1.0, overlapCount.current / (keyCount.current - 1)) : 0;
    setOverlapRatio(Math.round(currentOverlap * 100));

    // Flight time
    if (lastKeyUpTime.current) {
      const flight = now - lastKeyUpTime.current;
      if (flight >= 10 && flight <= 3000) {
        flightTimes.current.push(flight);
        if (flightTimes.current.length > 30) flightTimes.current.shift();
        const avgF = flightTimes.current.reduce((a, b) => a + b, 0) / flightTimes.current.length;
        setAvgFlightTime(Math.round(avgF));
      }
    }

    keyPressMap.current[e.code] = now;
    lastKeyDownTime.current = now;
  };

  const handleKeyUp = (e) => {
    const now = performance.now();
    lastKeyUpTime.current = now;

    if (keyPressMap.current[e.code]) {
      const hold = now - keyPressMap.current[e.code];
      delete keyPressMap.current[e.code];
      if (hold >= 10 && hold <= 1500) {
        holdTimes.current.push(hold);
        if (holdTimes.current.length > 30) holdTimes.current.shift();
        const avgH = holdTimes.current.reduce((a, b) => a + b, 0) / holdTimes.current.length;
        setAvgHoldTime(Math.round(avgH));
      }
    }

    // Update WPM
    if (startTime.current) {
      const elapsedMinutes = (now - startTime.current) / 60000;
      if (elapsedMinutes > 0.04) {
        const words = text.trim().split(/\s+/).filter(Boolean).length;
        setWpm(Math.round(words / elapsedMinutes));
      }
    }
  };

  const handleEvaluateCadence = async () => {
    if (holdTimes.current.length < 4) {
      alert("Please type at least one full word (4+ keystrokes) so your biometric cadence can be measured!");
      return;
    }

    setIsEvaluating(true);
    const holdMean = holdTimes.current.reduce((a, b) => a + b, 0) / holdTimes.current.length;
    const flightMean = flightTimes.current.length > 0 
      ? flightTimes.current.reduce((a, b) => a + b, 0) / flightTimes.current.length 
      : 140.0;
    
    const stdFlight = flightTimes.current.length > 1
      ? Math.sqrt(flightTimes.current.reduce((acc, v) => acc + Math.pow(v - flightMean, 2), 0) / flightTimes.current.length)
      : flightMean * 0.22;
    
    const flightCv = flightMean > 0 ? stdFlight / flightMean : 0.22;
    const cpm = wpm > 0 ? wpm * 5.0 : 300.0;

    const features = {
      mean_hold_time: holdMean,
      std_hold_time: Math.max(5.0, holdMean * 0.18),
      mean_flight_time: flightMean,
      std_flight_time: stdFlight,
      typing_speed_cpm: cpm,
      pause_ratio: 0.10,
      keystroke_overlap_ratio: overlapRatio / 100,
      flight_time_cv: Math.round(flightCv * 100) / 100,
      mean_velocity: 0.85,
      max_velocity: 2.8,
      mean_acceleration: 0.04,
      mean_jerk: 0.01,
      curvature_ratio: 1.25,
      mean_click_duration: 85.0,
      movement_to_click_ratio: 6.0,
      scroll_intensity: 0.0,
      _hasSufficientData: true
    };

    try {
      await sendTelemetryWindow(features, "SANDBOX_INTERACTIVE_CADENCE");
      setLastEvaluatedRisk("Cadence evaluated and fed into Hybrid ML Risk Engine!");
      setTimeout(() => setLastEvaluatedRisk(null), 3500);
    } catch (e) {
      console.error(e);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Preset quick tests for live demonstrations
  const simulateGuestTypist = async () => {
    setIsEvaluating(true);
    // Typical pattern of another person: heavier key holds (195ms), zero roll overlap, sluggish transition (340ms)
    const guestFeatures = {
      mean_hold_time: 195.0,
      std_hold_time: 48.0,
      mean_flight_time: 340.0,
      std_flight_time: 110.0,
      typing_speed_cpm: 110.0,
      pause_ratio: 0.45,
      keystroke_overlap_ratio: 0.02,
      flight_time_cv: 0.58,
      mean_velocity: 0.40,
      max_velocity: 1.1,
      mean_acceleration: 0.015,
      mean_jerk: 0.005,
      curvature_ratio: 2.6,
      mean_click_duration: 165.0,
      movement_to_click_ratio: 4.0,
      scroll_intensity: 10.0,
      _hasSufficientData: true
    };

    try {
      await sendTelemetryWindow(guestFeatures, "SIMULATED_GUEST_USER");
      setLastEvaluatedRisk("⚠️ Guest / Foreign Cadence Injected! Risk should spike on the gauge.");
      setTimeout(() => setLastEvaluatedRisk(null), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleReset = () => {
    setText('');
    setWpm(0);
    setAvgHoldTime(0);
    setAvgFlightTime(0);
    setOverlapRatio(0);
    holdTimes.current = [];
    flightTimes.current = [];
    keyPressMap.current = {};
    lastKeyDownTime.current = null;
    lastKeyUpTime.current = null;
    keyCount.current = 0;
    overlapCount.current = 0;
    backspaceCount.current = 0;
    startTime.current = null;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Keyboard className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <h3 className="font-semibold text-xs sm:text-sm text-slate-200">
            Interactive Biometric Typing Sandbox
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Zero-Content Cadence Analyzer
        </span>
      </div>

      <p className="text-xs text-slate-400 mb-3 leading-relaxed">
        Test your natural typing rhythm vs. another person's cadence. The system measures micro-hold durations, key overlap, and transition latencies without capturing characters.
      </p>

      {/* Suggested Prompt */}
      <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 mb-3 select-none">
        <span className="text-slate-500 block text-[9px] uppercase font-mono font-bold mb-0.5">Sample Passage:</span>
        <span className="italic text-slate-300 font-mono">"{practicePrompt}"</span>
      </div>

      {/* Typing Area */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        placeholder="Type here to test your cadence, or have another person type on your laptop..."
        rows={3}
        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:outline-none transition font-mono leading-relaxed resize-none"
      />

      {/* Live Biometric Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3 text-center">
        <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
          <span className="block text-[9px] uppercase font-mono text-slate-500">Hold Duration</span>
          <span className="font-mono font-bold text-xs text-slate-200">{avgHoldTime} ms</span>
        </div>
        <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
          <span className="block text-[9px] uppercase font-mono text-slate-500">Flight Latency</span>
          <span className="font-mono font-bold text-xs text-slate-200">{avgFlightTime} ms</span>
        </div>
        <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
          <span className="block text-[9px] uppercase font-mono text-slate-500">Roll Overlap</span>
          <span className="font-mono font-bold text-xs text-cyan-400">{overlapRatio}%</span>
        </div>
        <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
          <span className="block text-[9px] uppercase font-mono text-slate-500">Typing Speed</span>
          <span className="font-mono font-bold text-xs text-emerald-400">{wpm} WPM</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium transition flex items-center justify-center gap-1.5 border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Clear
          </button>
          <button
            type="button"
            onClick={simulateGuestTypist}
            disabled={isEvaluating}
            className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold transition flex items-center justify-center gap-1.5 border border-amber-500/30"
            title="Inject simulated foreign typist cadence to demonstrate anomaly detection"
          >
            <UserX className="w-3.5 h-3.5 text-amber-400" /> Test Guest Cadence
          </button>
        </div>

        <button
          type="button"
          onClick={handleEvaluateCadence}
          disabled={isEvaluating}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
        >
          <Zap className="w-3.5 h-3.5" />
          {isEvaluating ? 'Evaluating Cadence...' : 'Evaluate Live Rhythm on Risk Gauge'}
        </button>
      </div>

      {lastEvaluatedRisk && (
        <div className={`mt-2.5 text-center text-[11px] font-semibold animate-fade-in flex items-center justify-center gap-1 ${
          lastEvaluatedRisk.includes('Guest') ? 'text-amber-400' : 'text-emerald-400'
        }`}>
          {lastEvaluatedRisk.includes('Guest') ? <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          <span>{lastEvaluatedRisk}</span>
        </div>
      )}
    </div>
  );
};
