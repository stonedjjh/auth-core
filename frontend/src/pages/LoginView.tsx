import React, { useState } from 'react';
import { AuthLayout, Input, Button, toast } from '@stonedjjh/react-ui';
import { useAuth } from '../context/AuthContext';

interface LoginViewProps {
  onNavigate: (view: 'login' | 'register' | 'forgot' | '2fa') => void;
  onRequires2FA: (tempUserId: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onNavigate, onRequires2FA }) => {
  const { api, loginSuccess } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await api.post<{
        requires2FA?: boolean;
        tempUserId?: string;
        user?: any;
        accessToken?: string;
      }>('/auth/login', {
        identifier,
        password,
        rememberMe,
      });

      if (!res.success) {
        toast.error('Error de autenticacion', res.error || 'Credenciales invalidas');
        return;
      }

      if (res.data?.requires2FA && res.data?.tempUserId) {
        onRequires2FA(res.data.tempUserId);
        onNavigate('2fa');
        return;
      }

      if (res.data?.user && res.data?.accessToken) {
        toast.success('Bienvenido', 'Inicio de sesion exitoso');
        loginSuccess(res.data.user, res.data.accessToken);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container-box">
        <AuthLayout variant="centered" locale="es">
          <AuthLayout.Card>
            <AuthLayout.Header
              title="Iniciar Sesion"
              subtitle="Ingresa tus credenciales para acceder al sistema"
            />
            <AuthLayout.Body>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                <Input
                  label="Correo electronico o usuario"
                  placeholder="usuario@ejemplo.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  disabled={submitting}
                />

                <Input
                  type="password"
                  label="Contrasena"
                  placeholder="Ingresa tu contrasena"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={submitting}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={submitting}
                    />
                    Recordarme
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate('forgot')}
                  >
                    Olvidaste tu clave?
                  </Button>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={submitting}
                >
                  Entrar
                </Button>
              </form>
            </AuthLayout.Body>
            <AuthLayout.Footer>
              <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#94a3b8' }}>
                No tienes cuenta aun?{' '}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('register')}
                >
                  Registrate aqui
                </Button>
              </div>
            </AuthLayout.Footer>
          </AuthLayout.Card>
        </AuthLayout>
      </div>
    </div>
  );
};
