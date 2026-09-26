import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import dotenv from 'dotenv';
import path from 'path';
import { authRoutes } from './routes/auth.routes.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export async function buildServer() {
  const app = Fastify({
    logger: process.env.NODE_ENV === 'test' ? false : true,
  });

  // CORS
  await app.register(fastifyCors, {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  });

  // Cookies
  await app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET || 'super_secreto_cookie_default',
  });

  // JWT
  await app.register(fastifyJwt, {
    secret: process.env.JWT_ACCESS_SECRET || 'super_secreto_jwt_access_default',
  });

  // Rutas de autenticación
  await app.register(authRoutes, { prefix: '/api/auth' });

  // Health check
  app.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return app;
}

async function start() {
  const app = await buildServer();
  const port = Number(process.env.PORT) || 3001;
  const host = process.env.HOST || '0.0.0.0';

  try {
    await app.listen({ port, host });
    console.log(`Servidor Fastify corriendo en http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

if (process.argv[1]?.includes('server')) {
  start();
}
