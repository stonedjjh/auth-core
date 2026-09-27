import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/server.js';
import { FastifyInstance } from 'fastify';
import { runMigration } from '../src/database/runMigration.js';
import { getDatabaseAdapter } from '../src/database/connection.js';
import { authenticator } from 'otplib';

import fs from 'fs';

describe('Batería de Pruebas de Autenticación y Seguridad (Fastify)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Configurar entorno de pruebas con SQLite en archivo temporal
    process.env.NODE_ENV = 'test';
    process.env.DB_FILE = 'test_database.sqlite';
    process.env.DB_ENGINE = 'sqlite';
    process.env.DB_SOFT_DELETE = 'true';

    if (fs.existsSync('test_database.sqlite')) {
      try {
        fs.unlinkSync('test_database.sqlite');
      } catch {}
    }

    await runMigration('sqlite', true);
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    const adapter = getDatabaseAdapter();
    await adapter.close();
    if (fs.existsSync('test_database.sqlite')) {
      try {
        fs.unlinkSync('test_database.sqlite');
      } catch {}
    }
  });

  /**
   * Smoke Test de Salud de la API
   * Qué se evalúa: Disponibilidad del servidor Fastify y respuesta estándar de health check.
   * Qué se necesita: Petición GET a /api/health.
   * Resultado esperado: Código HTTP 200 y status 'ok'.
   */
  it('Smoke Test: El endpoint /api/health responde con código 200 y status ok', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
  });

  /**
   * Registro Exitoso de Usuario (Happy Path)
   * Qué se evalúa: Creación de cuenta con username, email y contraseña segura.
   * Qué se necesita: Enviar payload JSON a /api/auth/register.
   * Resultado esperado: Código HTTP 201, success: true y usuario creado sin exponer password_hash ni 2fa secret.
   */
  it('Registro: Crea un nuevo usuario correctamente y oculta campos sensibles', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: 'juan_perez',
        email: 'juan@ejemplo.com',
        password: 'PasswordSeguro123!',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe('juan@ejemplo.com');
    expect(body.data.user.password_hash).toBeUndefined();
    expect(body.data.user.two_factor_secret).toBeUndefined();
  });

  /**
   * Prevención de Duplicados en Base de Datos (Sad Path)
   * Qué se evalúa: Rechazo inmediato de registro si el correo o nombre de usuario ya existen.
   * Qué se necesita: Enviar el mismo email previamente registrado.
   * Resultado esperado: Código HTTP 400 con mensaje descriptivo de duplicidad.
   */
  it('Registro: Rechaza duplicados cuando el email ya existe', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: 'juan_otro',
        email: 'juan@ejemplo.com',
        password: 'PasswordSeguro123!',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error).toContain('correo electrónico ya se encuentra registrado');
  });

  /**
   * Mitigación de Timing Attacks en Inicio de Sesión
   * Qué se evalúa: Comportamiento uniforme ante usuarios existentes con contraseña incorrecta y usuarios inexistentes.
   * Qué se necesita: Enviar credenciales incorrectas tanto de usuario existente como de uno inexistente.
   * Resultado esperado: Ambos retornan 401 "Credenciales inválidas" sin revelar la existencia del registro en la base de datos.
   */
  it('Login Seguro: Retorna código 401 idéntico para usuario inexistente o clave errónea', async () => {
    // Caso 1: Usuario existente con clave errónea
    const resp1 = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        identifier: 'juan@ejemplo.com',
        password: 'ClaveIncorrecta999!',
      },
    });
    expect(resp1.statusCode).toBe(401);
    expect(JSON.parse(resp1.body).error).toBe('Credenciales inválidas');

    // Caso 2: Usuario inexistente (se ejecuta el hash dummy para igualar tiempo de CPU)
    const resp2 = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        identifier: 'fantasma_no_existe@ejemplo.com',
        password: 'ClaveCualquiera123!',
      },
    });
    expect(resp2.statusCode).toBe(401);
    expect(JSON.parse(resp2.body).error).toBe('Credenciales inválidas');
  });

  /**
   * Inicio de Sesión Exitoso y Cookie HttpOnly (Protección XSS)
   * Qué se evalúa: Emisión de Access Token en el cuerpo JSON y Refresh Token en Cookie httpOnly.
   * Qué se necesita: Enviar credenciales correctas a /api/auth/login.
   * Resultado esperado: Código HTTP 200, accessToken devuelto en data y cabecera set-cookie con HttpOnly.
   */
  it('Login Exitoso: Emite Access Token y configura Cookie refreshToken HttpOnly', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        identifier: 'juan@ejemplo.com',
        password: 'PasswordSeguro123!',
        rememberMe: true,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();

    // Validar cabecera Set-Cookie
    const setCookie = response.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : (setCookie as string);
    expect(cookieStr).toContain('refreshToken=');
    expect(cookieStr.toLowerCase()).toContain('httponly');
    expect(cookieStr).toContain('Path=/api/auth');
  });

  /**
   * Doble Factor de Autenticación (TOTP 2FA)
   * Qué se evalúa: Flujo de configuración de secreto TOTP y activación con código de 6 dígitos.
   * Qué se necesita: Login, obtención de token JWT, llamada a /api/auth/2fa/setup y validación del código con otplib.
   * Resultado esperado: Generación de QR code data URL y confirmación de activación de 2FA.
   */
  it('2FA: Permite configurar y activar la verificación en dos pasos con código TOTP', async () => {
    // 1. Obtener access token
    const loginResp = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        identifier: 'juan@ejemplo.com',
        password: 'PasswordSeguro123!',
      },
    });
    const { accessToken } = JSON.parse(loginResp.body).data;

    // 2. Setup 2FA
    const setupResp = await app.inject({
      method: 'POST',
      url: '/api/auth/2fa/setup',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(setupResp.statusCode).toBe(200);
    const { secret, qrCodeDataUrl } = JSON.parse(setupResp.body).data;
    expect(secret).toBeDefined();
    expect(qrCodeDataUrl).toContain('data:image/png;base64');

    // 3. Generar código válido y activar
    const validCode = authenticator.generate(secret);
    const enableResp = await app.inject({
      method: 'POST',
      url: '/api/auth/2fa/enable',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { code: validCode },
    });
    expect(enableResp.statusCode).toBe(200);
    expect(JSON.parse(enableResp.body).data.message).toContain('2FA activado');
  });

  /**
   * Refresco de Sesión con Cookie HttpOnly (Happy Path)
   * Qué se evalúa: Renovación exitosa del Access Token usando la cookie refreshToken.
   * Qué se necesita: Enviar petición POST a /api/auth/refresh con cookie válida.
   * Resultado esperado: Código HTTP 200 y nuevo accessToken devuelto en el payload.
   */
  it('Refresh Token: Emite un nuevo access token usando la cookie de refresco', async () => {
    // 1. Registrar usuario específico para refresh token
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: 'carlos_refresh',
        email: 'carlos@ejemplo.com',
        password: 'PasswordSeguro123!',
      },
    });

    // 2. Iniciar sesión para obtener cookie
    const loginResp = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        identifier: 'carlos@ejemplo.com',
        password: 'PasswordSeguro123!',
      },
    });

    const setCookie = loginResp.headers['set-cookie'];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0].split(';')[0] : (setCookie as string).split(';')[0];

    // 3. Refrescar token
    const refreshResp = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { cookie: cookieHeader },
    });

    expect(refreshResp.statusCode).toBe(200);
    const body = JSON.parse(refreshResp.body);
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();
  });

  /**
   * Cierre de Sesión Seguro (Logout)
   * Qué se evalúa: Invalidación y remoción de la cookie refreshToken.
   * Qué se necesita: Enviar petición POST a /api/auth/logout.
   * Resultado esperado: Código HTTP 200 y cabecera set-cookie limpiando refreshToken.
   */
  it('Logout: Limpia la cookie refreshToken y concluye la sesión', async () => {
    const logoutResp = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
    });

    expect(logoutResp.statusCode).toBe(200);
    const setCookie = logoutResp.headers['set-cookie'];
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : (setCookie as string);
    expect(cookieStr).toContain('refreshToken=;');
  });

  /**
   * Solicitud de Recuperación de Contraseña
   * Qué se evalúa: Endpoint de solicitud de restablecimiento y mensaje seguro genérico.
   * Qué se necesita: Petición POST a /api/auth/forgot-password con correo del usuario.
   * Resultado esperado: Código HTTP 200 con mensaje genérico para evitar enumeración de cuentas.
   */
  it('Recuperación de Contraseña: Envía respuesta genérica segura', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: 'juan@ejemplo.com' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.message).toContain('recibirás un enlace de recuperación');
  });

  /**
   * Cola de Correos en Segundo Plano con Reintento Exponencial (Resiliencia SMTP)
   * Qué se evalúa: Comportamiento no bloqueante y tolerancia a fallos transitorios con reintento automático.
   * Qué se necesita: Encolar un trabajo con un proveedor de prueba que falle 2 veces y tenga éxito al 3er intento.
   * Resultado esperado: El worker reintenta exponencialmente y finaliza con éxito en el 3er intento sin lanzar excepciones ni bloquear.
   */
  it('Cola de Correos: Ejecuta despacho en segundo plano con reintento exponencial ante fallos transitorios', async () => {
    const { BackgroundEmailQueue } = await import('../src/services/email.queue.js');
    let callCount = 0;
    const mockProvider = {
      isConfigured: () => true,
      send: async () => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Timeout de conexion SMTP simulado');
        }
        return true;
      },
    };

    const queue = new BackgroundEmailQueue(mockProvider);
    queue.defaultBaseDelayMs = 10; // Reducir delay para velocidad de test
    queue.enqueue(
      {
        from: 'test@ejemplo.com',
        to: 'destino@ejemplo.com',
        subject: 'Prueba de Cola',
        html: '<p>Hola</p>',
      },
      3,
      10
    );

    // Esperar a que la cola procese los reintentos
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(callCount).toBe(3);
  });
});
