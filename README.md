# Sistema de Autenticación Fullstack (Fastify + React + @stonedjjh/react-ui)

Este proyecto implementa un sistema de autenticación completo y seguro basado en Fastify (TypeScript) y React (Vite + `@stonedjjh/react-ui`).

## Características
- Autenticación con JWT (Access token en memoria, Refresh token en Cookie httpOnly).
- Mitigación de timing attacks al verificar contraseñas.
- 2FA mediante TOTP.
- Integración de Google OAuth.
- CLI multi-motor de Base de Datos (SQLite, PostgreSQL, MySQL) y selección de borrado lógico vs físico.
- Prevención de layout shift (CLS).
- Soporte multiidioma (i18n).
- Plantillas de correo parametrizables y multi-remitente.
