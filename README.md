# Sistema de Autenticacion Fullstack (Fastify + React + @stonedjjh/react-ui)

Este proyecto implementa un sistema de autenticacion integral, seguro y desacoplado basado en **Fastify** (TypeScript) en el backend y **React 19** (Vite + `@stonedjjh/react-ui`) en el frontend.

---

## Documentacion del Proyecto

Para facilitar la navegacion del repositorio segun el rol del desarrollador, la documentacion esta organizada en:

1. **[Guia de Uso y Puesta en Marcha (GUIA_USO.md)](./GUIA_USO.md)**:
   - Instalacion y arranque en 3 pasos.
   - Catalogo completo de comandos CLI (migraciones interactivas, ejecucion en paralelo, pruebas).
   - Configuracion de variables de entorno y proveedores de correo (Mailtrap, Gmail, Brevo).
   - Resolucion de puertos en desarrollo (`FRONTEND_URL`).
2. **[Manual del Programador (MANUAL_PROGRAMADOR.md)](./MANUAL_PROGRAMADOR.md)**:
   - Arquitectura en capas y patrones aplicados (Anti-Corruption Layer con `HashAdapter`, `TwoFactorAdapter` y `EmailAdapter`).
   - Cola asincrona en segundo plano con retroceso exponencial (`BackgroundEmailQueue`).
   - Modulo declarativo de reglas de contrasena (`passwordRules.ts`).
   - Mapa de componentes, repositorios y contratos de API.

---

## Caracteristicas Principales

- **Arquitectura de Adaptadores (Regla 6 estandar.md):** Cero acoplamiento directo a librerias externas (`bcryptjs`, `otplib`, `nodemailer`, `@libsql/client`, `pg`, `mysql2`).
- **Autenticacion Segura JWT:** Access Token almacenado unicamente en memoria volatil y Refresh Token protegido en Cookie `httpOnly`, `sameSite: strict`.
- **Mitigacion de Timing Attacks:** Comparacion uniforme de contrasenas mediante hash dummy constante para usuarios no existentes.
- **Autenticacion en Dos Pasos (2FA TOTP):** Generacion de codigos QR, compatibilidad RFC 6238 y tolerancia horaria configurable de +-60s.
- **CLI Multi-Base de Datos:** SQLite, PostgreSQL y MySQL con migraciones automaticas y selector de borrado logico (`deleted_at`) vs borrado fisico.
- **Despacho de Correos No Bloqueante:** Cola asincrona con reintento exponencial (maximo 3 intentos) y remitentes configurables por plantilla.
- **Interfaz Moderna sin Layout Shift (CLS):** Construida con la libreria `@stonedjjh/react-ui` y notificaciones Toast flotantes.
- **Reglas de Contrasena Modulares:** Checklist en tiempo real editable declarativamente en backend y frontend.
