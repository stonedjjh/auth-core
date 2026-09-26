import React, { useState } from 'react';
import { AuthLayout, Input, Button, Alert } from '@stonedjjh/react-ui';
import { useAuth } from '../context/AuthContext';

interface RegisterViewProps {
  onNavigate: (view: 'login' | 'register' | 'forgot' | '2fa') => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onNavigate }) => {
  const { api } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Las contrasenas no coinciden');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/auth/register', {
        username,
        email,
        password,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Error al procesar el registro');
        return;
      }

      setSuccessMessage('Registro exitoso. Se ha enviado un correo de bienvenida. Ya puedes iniciar sesion.');
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
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
              title="Crear Cuenta"
              subtitle="Unete a la plataforma de forma rapida y segura"
            />
            <AuthLayout.Body>
              <div className="auth-feedback-slot">
                {errorMessage && (
                  <Alert variant="danger" title="Error">
                    {errorMessage}
                  </Alert>
                )}
                {successMessage && (
                  <Alert variant="success" title="Exito">
                    {successMessage}
                  </Alert>
                )}
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Input
                  label="Nombre de usuario"
                  placeholder="ej. juan_perez"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={submitting}
                />

                <Input
                  type="email"
                  label="Correo electronico"
                  placeholder="usuario@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={submitting}
                />

                <Input
                  type="password"
                  label="Contrasena"
                  placeholder="Minimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={submitting}
                />

                <Input
                  type="password"
                  label="Confirmar Contrasena"
                  placeholder="Repite la contrasena"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={submitting}
                />

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={submitting}
                >
                  Registrarse
                </Button>
              </form>
            </AuthLayout.Body>
            <AuthLayout.Footer>
              <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#94a3b8' }}>
                Ya tienes cuenta?{' '}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('login')}
                >
                  Inicia sesion
                </Button>
              </div>
            </AuthLayout.Footer>
          </AuthLayout.Card>
        </AuthLayout>
      </div>
    </div>
  );
};
