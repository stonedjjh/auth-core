import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../services/auth.service.js';
import { UserRepository } from '../repositories/user.repository.js';

const registerSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

const verify2FASchema = z.object({
  userId: z.string(),
  code: z.string().length(6),
  rememberMe: z.boolean().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  userId: z.string(),
  token: z.string().min(10),
  newPassword: z.string().min(8),
});

export async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService();
  const userRepo = new UserRepository();

  /**
   * Helper para emitir tokens y setear Cookie httpOnly para Refresh Token
   */
  const issueTokens = (reply: FastifyReply, user: { id: string; email: string; username: string; session_version?: number }, rememberMe = false) => {
    const sessionDays = rememberMe ? Number(process.env.SESSION_EXPIRES_DAYS || 30) : 1;
    const refreshExpiresIn = rememberMe ? `${sessionDays}d` : '1d';

    const accessToken = fastify.jwt.sign(
      {
        userId: user.id,
        email: user.email,
        username: user.username,
        sessionVersion: user.session_version ?? 1,
      },
      { expiresIn: '15m' }
    );

    const refreshToken = fastify.jwt.sign(
      {
        userId: user.id,
        sessionVersion: user.session_version ?? 1,
      },
      { expiresIn: refreshExpiresIn }
    );

    // Setear Cookie httpOnly para el Refresh Token (Protección XSS)
    reply.setCookie('refreshToken', refreshToken, {
      path: '/api/auth',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionDays * 24 * 60 * 60,
    });

    return accessToken;
  };

  // POST /api/auth/register
  fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = registerSchema.parse(request.body);
      const result = await authService.register(parsed.username, parsed.email, parsed.password);
      return reply.code(201).send({
        success: true,
        data: {
          user: result.user,
          message: 'Usuario registrado con éxito. Se ha enviado un correo de bienvenida.',
        },
      });
    } catch (err: any) {
      return reply.code(400).send({
        success: false,
        error: err.message || 'Error en el registro',
      });
    }
  });

  // POST /api/auth/login
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = loginSchema.parse(request.body);
      const result = await authService.login(parsed.identifier, parsed.password);

      if (result.requires2FA) {
        return reply.send({
          success: true,
          data: {
            requires2FA: true,
            tempUserId: result.tempUserId,
            message: 'Se requiere verificación en dos pasos (2FA).',
          },
        });
      }

      const accessToken = issueTokens(reply, result.user!, parsed.rememberMe);

      return reply.send({
        success: true,
        data: {
          user: result.user,
          accessToken,
          message: 'Inicio de sesión exitoso.',
        },
      });
    } catch (err: any) {
      return reply.code(401).send({
        success: false,
        error: err.message || 'Credenciales inválidas',
      });
    }
  });

  // POST /api/auth/2fa/verify-login
  fastify.post('/2fa/verify-login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = verify2FASchema.parse(request.body);
      const user = await authService.verifyLogin2FA(parsed.userId, parsed.code);
      const accessToken = issueTokens(reply, user, parsed.rememberMe);

      return reply.send({
        success: true,
        data: {
          user,
          accessToken,
          message: 'Verificación 2FA completada con éxito.',
        },
      });
    } catch (err: any) {
      return reply.code(400).send({
        success: false,
        error: err.message || 'Código 2FA incorrecto',
      });
    }
  });

  // POST /api/auth/refresh
  fastify.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = request.cookies.refreshToken;
    if (!refreshToken) {
      return reply.code(401).send({ success: false, error: 'No hay token de refresco disponible' });
    }

    try {
      const decoded: any = fastify.jwt.verify(refreshToken);
      const user = await userRepo.findById(decoded.userId);

      if (!user || user.session_version !== decoded.sessionVersion) {
        reply.clearCookie('refreshToken', { path: '/api/auth' });
        return reply.code(401).send({ success: false, error: 'Sesión invalidada o expirada' });
      }

      const accessToken = issueTokens(reply, user, true);
      const { password_hash, two_factor_secret, ...safeUser } = user;

      return reply.send({
        success: true,
        data: {
          user: safeUser,
          accessToken,
        },
      });
    } catch (err) {
      reply.clearCookie('refreshToken', { path: '/api/auth' });
      return reply.code(401).send({ success: false, error: 'Token de refresco inválido' });
    }
  });

  // POST /api/auth/logout
  fastify.post('/logout', async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.clearCookie('refreshToken', { path: '/api/auth' });
    return reply.send({ success: true, data: { message: 'Sesión cerrada exitosamente' } });
  });

  // POST /api/auth/forgot-password
  fastify.post('/forgot-password', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = forgotPasswordSchema.parse(request.body);
      await authService.requestPasswordReset(parsed.email);
      return reply.send({
        success: true,
        data: { message: 'Si el correo existe en nuestro sistema, recibirás un enlace de recuperación.' },
      });
    } catch (err: any) {
      return reply.code(400).send({ success: false, error: err.message });
    }
  });

  // POST /api/auth/reset-password
  fastify.post('/reset-password', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = resetPasswordSchema.parse(request.body);
      await authService.resetPassword(parsed.userId, parsed.token, parsed.newPassword);
      return reply.send({
        success: true,
        data: { message: 'Contraseña actualizada con éxito. Ya puedes iniciar sesión con tu nueva clave.' },
      });
    } catch (err: any) {
      return reply.code(400).send({ success: false, error: err.message });
    }
  });

  // GET /api/auth/me (Ruta protegida)
  fastify.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const payload: any = request.user;
      const user = await userRepo.findById(payload.userId);

      if (!user) {
        return reply.code(404).send({ success: false, error: 'Usuario no encontrado' });
      }

      const { password_hash, two_factor_secret, ...safeUser } = user;
      return reply.send({ success: true, data: { user: safeUser } });
    } catch (err) {
      return reply.code(401).send({ success: false, error: 'No autorizado' });
    }
  });

  // POST /api/auth/2fa/setup
  fastify.post('/2fa/setup', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const payload: any = request.user;
      const result = await authService.setup2FA(payload.userId);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.code(401).send({ success: false, error: err.message });
    }
  });

  // POST /api/auth/2fa/enable
  fastify.post('/2fa/enable', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const payload: any = request.user;
      const body: any = request.body;
      await authService.enable2FA(payload.userId, body.code);
      return reply.send({ success: true, data: { message: '2FA activado satisfactoriamente.' } });
    } catch (err: any) {
      return reply.code(400).send({ success: false, error: err.message });
    }
  });

  // POST /api/auth/google
  fastify.post('/google', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body: any = request.body;
      const { googleId, email, name, rememberMe } = body;
      if (!googleId || !email) throw new Error('Datos de Google incompletos.');

      const user = await authService.loginWithGoogle(googleId, email, name || 'Usuario Google');
      const accessToken = issueTokens(reply, user, rememberMe);

      return reply.send({
        success: true,
        data: {
          user,
          accessToken,
          message: 'Inicio de sesión con Google exitoso.',
        },
      });
    } catch (err: any) {
      return reply.code(400).send({ success: false, error: err.message });
    }
  });
}
