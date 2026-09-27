import React, { useState } from 'react';
import { AuthLayout, Input, Button, Alert } from '@stonedjjh/react-ui';
import { useAuth } from '../context/AuthContext';

interface TwoFactorVerifyViewProps {
  tempUserId: string;
  onNavigate: (view: 'login' | 'register' | 'forgot' | '2fa') => void;
}

export const TwoFactorVerifyView: React.FC<TwoFactorVerifyViewProps> = ({ tempUserId, onNavigate }) => {
  const { api, loginSuccess } = useAuth();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const res = await api.post<{ user: any; accessToken: string }>('/auth/2fa/verify-login', {
        userId: tempUserId,
        code,
      });

      if (!res.success || !res.data) {
        setErrorMessage(res.error || 'Codigo 2FA incorrecto o expirado');
        return;
      }

      loginSuccess(res.data.user, res.data.accessToken);
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
              title="Verificacion de Dos Pasos"
              subtitle="Introduce el codigo de 6 digitos generado por tu aplicacion de autenticacion"
            />
            <AuthLayout.Body>
              <div className="auth-feedback-slot">
                {errorMessage && (
                  <Alert variant="danger" title="Error 2FA">
                    {errorMessage}
                  </Alert>
                )}
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Input
                  label="Codigo TOTP (6 digitos)"
                  placeholder="123456"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  required
                  disabled={submitting}
                  style={{ textAlign: 'center', letterSpacing: '0.25rem', fontSize: '1.25rem' }}
                />

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={submitting}
                  disabled={code.length !== 6}
                >
                  Verificar y Continuar
                </Button>
              </form>
            </AuthLayout.Body>
            <AuthLayout.Footer>
              <div style={{ textAlign: 'center', fontSize: '0.875rem' }}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('login')}
                >
                  Regresar al inicio de sesion
                </Button>
              </div>
            </AuthLayout.Footer>
          </AuthLayout.Card>
        </AuthLayout>
      </div>
    </div>
  );
};
