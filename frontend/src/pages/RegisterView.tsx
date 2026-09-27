import React, { useState } from 'react';
import { AuthLayout, Input, Button, toast } from '@stonedjjh/react-ui';
import { useAuth } from '../context/AuthContext';
import { PASSWORD_RULES, validatePassword } from '../config/passwordRules';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validar reglas de contraseña
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      toast.error('Contrasena debil', passwordValidation.errors[0]);
      return;
    }

    // 2. Validar coincidencia
    if (password !== confirmPassword) {
      toast.error('Validacion', 'Las contrasenas no coinciden.');
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
        toast.error('Error en el registro', res.error || 'Error al procesar el registro');
        return;
      }

      toast.success('Cuenta Creada', 'Registro exitoso. Se ha enviado un correo de bienvenida.');
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onNavigate('login');
      }, 1500);
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
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
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
                  placeholder="Ingresa tu clave"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={submitting}
                />

                {/* Checklist visual en tiempo real de reglas activas de contrasena */}
                {password.length > 0 && (
                  <div style={{ background: '#020617', padding: '0.75rem', borderRadius: '6px', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ color: '#94a3b8', fontWeight: 600, marginBottom: '0.25rem' }}>Requisitos de la contrasena:</span>
                    {PASSWORD_RULES.map((rule) => {
                      const passed = rule.test(password);
                      return (
                        <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: passed ? '#4ade80' : '#f87171' }}>
                          <span>{passed ? '[✓]' : '[ ]'}</span>
                          <span>{rule.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

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
