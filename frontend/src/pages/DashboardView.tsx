import React, { useState } from 'react';
import { Card, Button, Badge, Alert, Input } from '@stonedjjh/react-ui';
import { useAuth } from '../context/AuthContext';

export const DashboardView: React.FC = () => {
  const { user, accessToken, logout, api, setUser } = useAuth();
  const [setup2FAData, setSetup2FAData] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [loading2FA, setLoading2FA] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'danger'; message: string } | null>(null);

  const handleStart2FA = async () => {
    setLoading2FA(true);
    setFeedback(null);
    try {
      const res = await api.post<{ secret: string; qrCodeDataUrl: string }>('/auth/2fa/setup');
      if (res.success && res.data) {
        setSetup2FAData(res.data);
      } else {
        setFeedback({ type: 'danger', message: res.error || 'Error al iniciar configuracion 2FA' });
      }
    } finally {
      setLoading2FA(false);
    }
  };

  const handleConfirm2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading2FA(true);
    setFeedback(null);

    try {
      const res = await api.post('/auth/2fa/enable', { code: totpCode });
      if (res.success) {
        setFeedback({ type: 'success', message: '2FA activado exitosamente en tu cuenta.' });
        setSetup2FAData(null);
        setTotpCode('');
        if (user) {
          setUser({ ...user, two_factor_enabled: 1 });
        }
      } else {
        setFeedback({ type: 'danger', message: res.error || 'Codigo invalido' });
      }
    } finally {
      setLoading2FA(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f8fafc' }}>
            Panel de Usuario
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            Sesion segura activa con Fastify y JWT
          </p>
        </div>
        <Button variant="danger" size="sm" onClick={logout}>
          Cerrar Sesion
        </Button>
      </div>

      {feedback && (
        <div style={{ marginBottom: '1rem' }}>
          <Alert variant={feedback.type} title={feedback.type === 'success' ? 'Operacion Exitosa' : 'Aviso'}>
            {feedback.message}
          </Alert>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <Card variant="bordered">
          <Card.Header
            title="Datos del Perfil Autenticado"
            subtitle="Informacion validada desde la base de datos"
            action={<Badge variant="success">Activo</Badge>}
          />
          <Card.Body>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', color: '#cbd5e1' }}>
              <div>
                <strong style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>ID DE USUARIO</strong>
                <span>{user?.id}</span>
              </div>
              <div>
                <strong style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>USUARIO</strong>
                <span>{user?.username}</span>
              </div>
              <div>
                <strong style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>CORREO</strong>
                <span>{user?.email}</span>
              </div>
              <div>
                <strong style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>DOBLE FACTOR (2FA)</strong>
                <Badge variant={user?.two_factor_enabled ? 'primary' : 'neutral'}>
                  {user?.two_factor_enabled ? 'Habilitado' : 'Deshabilitado'}
                </Badge>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card variant="bordered">
          <Card.Header
            title="Seguridad de la Cuenta y 2FA"
            subtitle="Configura Google Authenticator u otra app TOTP"
          />
          <Card.Body>
            {!user?.two_factor_enabled && !setup2FAData && (
              <div>
                <p style={{ color: '#94a3b8', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  Anade una capa extra de seguridad a tu cuenta activando la verificacion en dos pasos (TOTP).
                </p>
                <Button variant="primary" loading={loading2FA} onClick={handleStart2FA}>
                  Configurar 2FA ahora
                </Button>
              </div>
            )}

            {setup2FAData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                  1. Escanea este codigo QR con tu aplicacion de autenticacion (Google Authenticator, Authy, etc.):
                </p>
                <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', width: 'fit-content' }}>
                  <img src={setup2FAData.qrCodeDataUrl} alt="Codigo QR 2FA" style={{ display: 'block' }} />
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                  O introduce manualmente la clave secreta: <code style={{ color: '#38bdf8' }}>{setup2FAData.secret}</code>
                </p>

                <form onSubmit={handleConfirm2FA} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginTop: '0.5rem' }}>
                  <Input
                    label="Codigo de confirmacion (6 digitos)"
                    placeholder="123456"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    required
                    disabled={loading2FA}
                  />
                  <Button type="submit" variant="primary" loading={loading2FA} disabled={totpCode.length !== 6}>
                    Activar
                  </Button>
                </form>
              </div>
            )}

            {user?.two_factor_enabled && (
              <p style={{ color: '#4ade80', fontSize: '0.875rem' }}>
                Tu cuenta cuenta con proteccion 2FA activa. Se requerira un codigo temporal en cada inicio de sesion.
              </p>
            )}
          </Card.Body>
        </Card>

        <Card variant="bordered">
          <Card.Header
            title="Telemetria de Sesion y Tokens"
            subtitle="Inspeccion de seguridad en memoria volátil (Sin LocalStorage)"
          />
          <Card.Body>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
              ACCESS TOKEN ACTIVO (Payload decodificable por el cliente):
            </p>
            <pre style={{ background: '#020617', padding: '0.75rem', borderRadius: '6px', fontSize: '0.75rem', color: '#38bdf8', overflowX: 'auto' }}>
              {accessToken ? accessToken.substring(0, 100) + '...' : 'No disponible'}
            </pre>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.75rem' }}>
              Nota: El Refresh Token se encuentra protegido en una Cookie con directiva <code>httpOnly</code> inaccessible desde JavaScript.
            </p>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};
