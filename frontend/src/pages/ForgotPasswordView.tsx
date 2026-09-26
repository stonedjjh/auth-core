import React, { useState } from 'react';
import { AuthLayout, Input, Button, toast } from '@stonedjjh/react-ui';
import { useAuth } from '../context/AuthContext';

interface ForgotPasswordViewProps {
  onNavigate: (view: 'login' | 'register' | 'forgot' | '2fa') => void;
}

export const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({ onNavigate }) => {
  const { api } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await api.post<{ message?: string }>('/auth/forgot-password', { email });
      const msg = res.data?.message || 'Si el correo existe, recibiras un enlace para restablecer tu clave.';
      toast.info('Instrucciones enviadas', msg);
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
              title="Recuperar Contrasena"
              subtitle="Enviaremos un correo seguro con el enlace para restablecer tu clave"
            />
            <AuthLayout.Body>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                <Input
                  type="email"
                  label="Correo electronico asociado"
                  placeholder="usuario@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={submitting}
                />

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={submitting}
                >
                  Enviar enlace de recuperacion
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
                  Recordaste tu contrasena? Iniciar sesion
                </Button>
              </div>
            </AuthLayout.Footer>
          </AuthLayout.Card>
        </AuthLayout>
      </div>
    </div>
  );
};
