import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { FeatureExtractor } from '../biometrics/featureExtractor';
import { playRiskAlert, playSuccessChime } from '../services/soundEffects';

const BiometricContext = createContext(null);

export const BiometricProvider = ({ children }) => {
  const { user, sessionToken, isAuthenticated } = useAuth();

  const [currentRiskScore, setCurrentRiskScore] = useState(5.0);
  const [rawAnomalyScore, setRawAnomalyScore] = useState(0.20);
  const [riskStatus, setRiskStatus] = useState('LOW');
  const [explanations, setExplanations] = useState([]);
  const [isMfaChallenged, setIsMfaChallenged] = useState(false);
  const [history, setHistory] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeSimulation, setActiveSimulation] = useState(null); // 'BOT', 'HUNT_PECK', 'JITTER', or null

  const extractorRef = useRef(null);
  const intervalRef = useRef(null);

  // Initialize feature extractor
  useEffect(() => {
    extractorRef.current = new FeatureExtractor();
    return () => {
      if (extractorRef.current) {
        extractorRef.current.stopListening();
      }
    };
  }, []);

  // Control listener based on auth and enrollment state
  useEffect(() => {
    if (isAuthenticated && user?.is_enrolled && user?.consent_given) {
      extractorRef.current.startListening();
      setIsStreaming(true);

      // Fetch historical logs on startup
      api.get('/telemetry/history?limit=15')
        .then(res => setHistory(res.data))
        .catch(() => {});

      // Set up periodic continuous telemetry evaluation (every 4 seconds)
      intervalRef.current = setInterval(() => {
        sendTelemetryWindow();
      }, 4000);
    } else {
      if (extractorRef.current) {
        extractorRef.current.stopListening();
      }
      setIsStreaming(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, user?.is_enrolled, user?.consent_given, activeSimulation]);

  const sendTelemetryWindow = async (forcedFeatures = null, simulationLabel = null) => {
    if (!extractorRef.current || !isAuthenticated || !user?.is_enrolled) return;

    let features;
    if (forcedFeatures) {
      features = forcedFeatures;
    } else if (activeSimulation) {
      features = generateSimulationFeatures(activeSimulation);
    } else {
      features = extractorRef.current.extractFeatureVector();
      // Only send real interactions; skip idle windows to avoid cooling down an active threat
      if (!features._hasSufficientData) {
        return;
      }
    }

    try {
      const payload = {
        features,
        session_token: sessionToken,
        is_simulation: !!activeSimulation || !!simulationLabel,
        simulation_label: activeSimulation || simulationLabel
      };

      const res = await api.post('/telemetry/evaluate', payload);
      const data = res.data;

      setCurrentRiskScore(data.risk_score);
      setRawAnomalyScore(data.raw_anomaly_score);
      setRiskStatus(data.risk_status);
      setExplanations(data.explanations || []);

      if (data.is_session_locked || data.is_mfa_required || data.risk_score > 70) {
        setIsMfaChallenged(true);
        playRiskAlert();
      }

      // Add to running history
      setHistory(prev => {
        const updated = [...prev, {
          risk_score: data.risk_score,
          raw_anomaly_score: data.raw_anomaly_score,
          risk_status: data.risk_status,
          timestamp: new Date().toLocaleTimeString(),
          explanations: data.explanations
        }];
        return updated.slice(-20); // Keep last 20
      });

    } catch (err) {
      console.error('Error evaluating telemetry window:', err);
    }
  };

  // Generate realistic synthetic attack features for demo testing
  const generateSimulationFeatures = (type) => {
    if (type === 'BOT') {
      return {
        mean_hold_time: 15.0,
        std_hold_time: 0.3,
        mean_flight_time: 20.0,
        std_flight_time: 0.5,
        typing_speed_cpm: 920.0,
        pause_ratio: 0.01,
        keystroke_overlap_ratio: 0.0,
        flight_time_cv: 0.02,
        mean_velocity: 8.5,
        max_velocity: 25.0,
        mean_acceleration: 1.2,
        mean_jerk: 0.02,
        curvature_ratio: 1.001,
        mean_click_duration: 15.0,
        movement_to_click_ratio: 1.0,
        scroll_intensity: 0.0
      };
    } else if (type === 'HUNT_PECK') {
      return {
        mean_hold_time: 260.0,
        std_hold_time: 65.0,
        mean_flight_time: 480.0,
        std_flight_time: 120.0,
        typing_speed_cpm: 65.0,
        pause_ratio: 0.65,
        keystroke_overlap_ratio: 0.0,
        flight_time_cv: 0.65,
        mean_velocity: 0.25,
        max_velocity: 0.8,
        mean_acceleration: 0.01,
        mean_jerk: 0.005,
        curvature_ratio: 2.8,
        mean_click_duration: 180.0,
        movement_to_click_ratio: 5.0,
        scroll_intensity: 30.0
      };
    } else if (type === 'JITTER') {
      return {
        mean_hold_time: 110.0,
        std_hold_time: 45.0,
        mean_flight_time: 190.0,
        std_flight_time: 85.0,
        typing_speed_cpm: 180.0,
        pause_ratio: 0.25,
        keystroke_overlap_ratio: 0.15,
        flight_time_cv: 0.45,
        mean_velocity: 1.8,
        max_velocity: 7.2,
        mean_acceleration: 0.25,
        mean_jerk: 0.85,
        curvature_ratio: 4.2,
        mean_click_duration: 120.0,
        movement_to_click_ratio: 28.0,
        scroll_intensity: 450.0
      };
    }
    return extractorRef.current.extractFeatureVector();
  };

  const triggerSingleEvaluation = (simType) => {
    const feat = generateSimulationFeatures(simType);
    sendTelemetryWindow(feat, simType);
  };

  const verifyMFA = async (code) => {
    const res = await api.post('/mfa/verify', {
      code,
      session_token: sessionToken
    });
    if (res.data.verified) {
      playSuccessChime();
      setCurrentRiskScore(res.data.new_risk_score);
      setRiskStatus('LOW');
      setIsMfaChallenged(false);
      setActiveSimulation(null); // Reset any active attack simulation
      return true;
    }
    return false;
  };

  return (
    <BiometricContext.Provider
      value={{
        currentRiskScore,
        rawAnomalyScore,
        riskStatus,
        explanations,
        isMfaChallenged,
        history,
        isStreaming,
        activeSimulation,
        setActiveSimulation,
        triggerSingleEvaluation,
        sendTelemetryWindow,
        verifyMFA
      }}
    >
      {children}
    </BiometricContext.Provider>
  );
};

export const useBiometrics = () => useContext(BiometricContext);
