import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './pages/LoginView';
import { RegisterView } from './pages/RegisterView';
import { TwoFactorVerifyView } from './pages/TwoFactorVerifyView';
import { ForgotPasswordView } from './pages/ForgotPasswordView';
import { DashboardView } from './pages/DashboardView';

type ViewMode = 'login' | 'register' | 'forgot' | '2fa';

const MainNavigator: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewMode>('login');
  const [tempUserId, setTempUserId] = useState<string>('');

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        Verificando credenciales de sesion...
      </div>
    );
  }

  if (user) {
    return <DashboardView />;
  }

  if (currentView === 'register') {
    return <RegisterView onNavigate={setCurrentView} />;
  }

  if (currentView === 'forgot') {
    return <ForgotPasswordView onNavigate={setCurrentView} />;
  }

  if (currentView === '2fa') {
    return <TwoFactorVerifyView tempUserId={tempUserId} onNavigate={setCurrentView} />;
  }

  return (
    <LoginView
      onNavigate={setCurrentView}
      onRequires2FA={(id) => {
        setTempUserId(id);
      }}
    />
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainNavigator />
    </AuthProvider>
  );
}
