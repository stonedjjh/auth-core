# Manual del Programador - Sistema de Autenticacion

Este documento describe la arquitectura, estructura de carpetas, dependencias y lineamientos para modificar o extender el sistema de autenticacion.

---

## Mapa de Rutas y Carpetas Clave

| Funcionalidad / Modulo | Ubicacion en el Proyecto | Descripcion |
| :--- | :--- | :--- |
| **Plantillas de Correo** | `backend/src/templates/emails/` | Aqui se definen y modifican las plantillas HTML y texto plano para bienvenida, recuperacion de clave y notificaciones de perfil. |
| **Configuracion de Correos & SMTP** | `.env` / `backend/src/config/mail.ts` | Configura los remitentes y credenciales SMTP diferenciados por plantilla. |
| **Proteccion contra Timing Attacks** | `backend/src/services/auth.service.ts` | Logica de comparacion de contrasenas constante con dummy hash. |
| **Componentes de UI / Pantallas** | `frontend/src/pages/` & `frontend/src/components/` | Interfaces de Login, Registro, 2FA y Recuperacion de clave usando `@stonedjjh/react-ui`. |
| **Definicion de Base de Datos y Migraciones** | `backend/src/database/` | Migraciones SQL y CLI multi-motor (SQLite, Postgres, MySQL) con borrado logico/fisico. |
| **Traducciones (i18n)** | `frontend/src/i18n/` | Archivos de traduccion para soporte multiidioma (`es.json`, `en.json`). |

---

## Como modificar las Plantillas de Email?
Para alterar el diseno o contenido de los correos:
1. Ve a la carpeta `backend/src/templates/emails/`.
2. Edita los archivos:
   - `welcome.html`: Plantilla de bienvenida y verificacion de cuenta.
   - `reset-password.html`: Plantilla con enlace de recuperacion de contrasena.
   - `security-alert.html`: Notificacion de cambio de datos o contrasena.
3. Puedes ajustar los remitentes correspondientes en tu archivo `.env`:
   - `MAIL_FROM_WELCOME="Bienvenida <bienvenida@tudominio.com>"`
   - `MAIL_FROM_RESET="Seguridad <seguridad@tudominio.com>"`
   - `MAIL_FROM_ALERT="Alertas <alertas@tudominio.com>"`

---

## Componentes y Modulos

### 1. AuthService
- **Ruta / Ubicacion:** `backend/src/services/auth.service.ts`
- **Dependencias:** `bcryptjs`, `otplib`, `qrcode`, `UserRepository`, `EmailService`
- **Funciones Principales / API:**
  - `register(username, email, password): Promise<{ user, verificationToken }>`: Registra usuario con hash seguro bcrypt y token de verificacion.
  - `login(identifier, password): Promise<{ user?, requires2FA, tempUserId? }>`: Mitiga timing attacks ejecutando hash ficticio si el usuario no existe.
  - `verifyLogin2FA(userId, code): Promise<UserEntity>`: Valida codigo TOTP de 6 digitos durante el inicio de sesion.
  - `setup2FA(userId): Promise<{ secret, qrCodeDataUrl }>`: Genera secreto TOTP y codigo QR en base64 para autenticadores (Google Authenticator, etc.).
  - `enable2FA(userId, code): Promise<void>`: Confirma y activa la proteccion 2FA tras validar un codigo inicial correcto.
  - `requestPasswordReset(email): Promise<void>`: Genera token de restablecimiento y remite correo con plantilla HTML.
  - `resetPassword(userId, token, newPassword): Promise<void>`: Actualiza contrasena e incrementa session_version para invalidar sesiones previas.

### 2. UserRepository
- **Ruta / Ubicacion:** `backend/src/repositories/user.repository.ts`
- **Dependencias:** `DatabaseAdapter` (`connection.ts`)
- **Funciones Principales / API:**
  - `findByEmail(email): Promise<UserEntity | null>`: Busca usuario activo por email ignorando registros con deleted_at si soft delete esta activo.
  - `findByUsername(username): Promise<UserEntity | null>`: Busca usuario por username.
  - `findById(id): Promise<UserEntity | null>`: Busca usuario por identificador unico UUID.
  - `create(user): Promise<UserEntity>`: Inserta el registro en la base de datos respectiva.
  - `updatePassword(id, hash): Promise<void>`: Actualiza password e incrementa version de sesion.
  - `setTwoFactor(id, secret, enabled): Promise<void>`: Habilita o deshabilita 2FA.
  - `delete(id): Promise<void>`: Ejecuta borrado logico (UPDATE deleted_at) o borrado fisico (DELETE) segun configuracion.

### 3. EmailService
- **Ruta / Ubicacion:** `backend/src/services/email.service.ts`
- **Dependencias:** `nodemailer`, `fs`, `path`
- **Funciones Principales / API:**
  - `sendEmail(options): Promise<boolean>`: Carga la plantilla HTML solicitada (`welcome.html`, `reset-password.html`, `security-alert.html`), interpola variables dinamicas e inyecta el remitente individual configurado en el archivo `.env`.

### 4. Rutas Fastify (AuthRoutes)
- **Ruta / Ubicacion:** `backend/src/routes/auth.routes.ts`
- **Prefijo:** `/api/auth`
- **Endpoints:**
  - `POST /register`: Registro de usuario con validacion Zod.
  - `POST /login`: Inicio de sesion, soporte rememberMe, emision de JWT Access Token en JSON y Refresh Token en Cookie httpOnly.
  - `POST /2fa/verify-login`: Verificacion de codigo TOTP para usuarios con 2FA activo.
  - `POST /refresh`: Renovacion de Access Token leyendo la Cookie httpOnly.
  - `POST /logout`: Limpieza de la Cookie httpOnly de sesion.
  - `POST /forgot-password`: Solicitud de restablecimiento.
  - `POST /reset-password`: Cambio de contrasena con token seguro.
  - `GET /me`: Consulta de perfil del usuario autenticado (Ruta protegida por JWT).
  - `POST /2fa/setup`: Generacion de secreto TOTP y codigo QR.
  - `POST /2fa/enable`: Confirmacion y activacion de 2FA.
