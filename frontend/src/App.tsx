import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './pages/LoginView';
import { RegisterView } from './pages/RegisterView';
import { TwoFactorVerifyView } from './pages/TwoFactorVerifyView';
import { ForgotPasswordView } from './pages/ForgotPasswordView';
import { DashboardView } from './pages/DashboardView';

type ViewMode = 'login' | 'register' | 'forgot' | '2fa';

const MainNavigator: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const [currentView, setCurrentView] = useState<ViewMode>('login');
  const [tempUserId, setTempUserId] = useState<string>('');

  // Efecto de seguridad: cuando no hay usuario autenticado, garantizar que la vista sea login a menos que se este en registro o recuperacion
  React.useEffect(() => {
    if (!user && currentView !== 'register' && currentView !== 'forgot' && !tempUserId) {
      setCurrentView('login');
    }
  }, [user, tempUserId, currentView]);

  const handleLogout = async () => {
    setCurrentView('login');
    setTempUserId('');
    await logout();
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        Verificando credenciales de sesion...
      </div>
    );
  }

  if (user) {
    return <DashboardView onLogout={handleLogout} />;
  }

  if (currentView === 'register') {
    return <RegisterView onNavigate={setCurrentView} />;
  }

  if (currentView === 'forgot') {
    return <ForgotPasswordView onNavigate={setCurrentView} />;
  }

  if (currentView === '2fa') {
    return (
      <TwoFactorVerifyView
        tempUserId={tempUserId}
        onNavigate={(view) => {
          if (view !== '2fa') setTempUserId('');
          setCurrentView(view);
        }}
      />
    );
  }

  return (
    <LoginView
      onNavigate={setCurrentView}
      onRequires2FA={(id) => {
        setTempUserId(id);
        setCurrentView('2fa');
      }}
    />
  );
};

import { ToastProvider } from '@stonedjjh/react-ui';

export default function App() {
  return (
    <ToastProvider position="top-right" duration={4000}>
      <AuthProvider>
        <MainNavigator />
      </AuthProvider>
    </ToastProvider>
  );
}
