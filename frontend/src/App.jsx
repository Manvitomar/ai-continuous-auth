import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useBiometrics } from './context/BiometricContext';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { ModelEvaluationPage } from './pages/ModelEvaluationPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { EnrollmentModal } from './components/EnrollmentModal';
import { MFAModal } from './components/MFAModal';

export const App = () => {
  const { isAuthenticated, loading } = useAuth();
  const { isMfaChallenged } = useBiometrics();

  const [authView, setAuthView] = useState('login'); // 'login' | 'register'
  const [currentTab, setCurrentTab] = useState('dashboard'); // 'dashboard' | 'evaluation'
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(false);
  const [isMFAOpen, setIsMFAOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-400">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono uppercase tracking-wider">Initializing Security Engine...</p>
      </div>
    );
  }

  // Unauthenticated Flow
  if (!isAuthenticated) {
    return authView === 'login' ? (
      <LoginPage onSwitchToRegister={() => setAuthView('register')} />
    ) : (
      <RegisterPage onSwitchToLogin={() => setAuthView('login')} />
    );
  }

  // Authenticated App Flow
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenEnrollment={() => setIsEnrollmentOpen(true)}
        onOpenMFA={() => setIsMFAOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 py-5 sm:p-6 md:p-8">
        {currentTab === 'dashboard' ? (
          <DashboardPage
            onOpenEnrollment={() => setIsEnrollmentOpen(true)}
            onOpenMFA={() => setIsMFAOpen(true)}
          />
        ) : (
          <ModelEvaluationPage />
        )}
      </main>

      {/* Guided Enrollment Wizard Modal */}
      <EnrollmentModal
        isOpen={isEnrollmentOpen}
        onClose={() => setIsEnrollmentOpen(false)}
        onEnrollmentComplete={() => setIsEnrollmentOpen(false)}
      />

      {/* Standard MFA Configuration Modal */}
      <MFAModal
        isOpen={isMFAOpen}
        onClose={() => setIsMFAOpen(false)}
        isChallengedMode={false}
      />

      {/* High-Risk Lock Challenge Modal (Cannot be dismissed until valid TOTP entered) */}
      {isMfaChallenged && (
        <MFAModal
          isOpen={true}
          onClose={() => {}}
          isChallengedMode={true}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
        <p>AI-Based Continuous Authentication Using Behavioral Biometrics &bull; Academic Security Architecture</p>
        <p className="text-[10px] text-slate-700 mt-1">
          Zero-Content Telemetry Guarantee &bull; scikit-learn Isolation Forest &bull; RFC 6238 TOTP Multi-Factor Authentication
        </p>
      </footer>
    </div>
  );
};

export default App;
