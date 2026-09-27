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

### 1. AuthService (Desacoplado via Adaptadores - Regla 6 estandar.md)
- **Ruta / Ubicacion:** `backend/src/services/auth.service.ts`
- **Dependencias:** `HashProvider` (`HashAdapter`), `TwoFactorProvider` (`TwoFactorAdapter`), `UserRepository`, `EmailService`
- **Arquitectura de Adaptadores (Anti-Corruption Layer):**
  - No importa directamente `bcryptjs`, `otplib` ni `qrcode`.
  - Recibe por inyección de dependencias `HashProvider` y `TwoFactorProvider`, lo que permite sustituir el algoritmo de hash (ej. bcrypt por Argon2) o el motor TOTP sin alterar la lógica de negocio ni romper los tests.
- **Funciones Principales / API:**
  - `register(username, email, password): Promise<{ user, verificationToken }>`: Registra usuario utilizando `hashProvider.hash()` y genera token criptográfico de verificación.
  - `login(identifier, password): Promise<{ user?, requires2FA, tempUserId? }>`: Mitiga timing attacks comparando contra el hash del usuario o `hashProvider.getDummyHash()` si el usuario no existe.
  - `verifyLogin2FA(userId, code): Promise<UserEntity>`: Valida código TOTP a través de `twoFactorProvider.verifyToken()`.
  - `setup2FA(userId): Promise<{ secret, qrCodeDataUrl }>`: Genera secreto y código QR en base64 mediante `twoFactorProvider`.
  - `enable2FA(userId, code): Promise<void>`: Confirma y activa la protección 2FA tras validar el código con `twoFactorProvider.verifyToken()`.
  - `requestPasswordReset(email): Promise<void>`: Genera token de restablecimiento y remite correo con plantilla HTML.
  - `resetPassword(userId, token, newPassword): Promise<void>`: Actualiza contraseña hasheada con `hashProvider.hash()` e incrementa session_version.

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

### 3. EmailService & BackgroundEmailQueue (Despacho No Bloqueante y Resiliente)
- **Rutas / Ubicaciones:**
  - Servicio: `backend/src/services/email.service.ts`
  - Cola Asíncrona: `backend/src/services/email.queue.ts`
  - Adaptador de Transporte: `backend/src/adapters/email.adapter.ts`
- **Dependencias:** `EmailProvider` (`NodemailerAdapter`), `BackgroundEmailQueue`, `fs`, `path`
- **Arquitectura de Despacho en Segundo Plano:**
  - Los métodos `sendWelcomeEmail`, `sendPasswordResetEmail` y `sendSecurityAlertEmail` no bloquean el ciclo de vida de la petición HTTP del usuario (tiempo de respuesta < 50ms).
  - Cada solicitud encola un trabajo (`EmailJob`) en la memoria de la aplicación para ser despachado por el worker asíncrono.
- **Política de Reintento Exponencial (Exponential Backoff):**
  - **Intentos Máximos:** Por defecto reintenta hasta un **máximo de 3 intentos** ante errores transitorios de red o timeouts SMTP.
  - **Cálculo del Retardo:** `delay = baseDelayMs * 2^(intento - 1)`.
    - Intento 1: inmediato.
    - Intento 2 (primer reintento): espera 1 segundo (`1000ms`).
    - Intento 3 (segundo reintento): espera 2 segundos (`2000ms`).
- **¿Dónde modificar los parámetros de reintento?**
  - Abre el archivo `backend/src/services/email.queue.ts`.
  - Localiza en la clase `BackgroundEmailQueue` las líneas:
    ```typescript
    // Parámetros de reintento configurables:
    public defaultMaxAttempts: number = 3;       // <-- Cambiar aquí el número máximo de reintentos
    public defaultBaseDelayMs: number = 1000;    // <-- Cambiar aquí el retardo base en milisegundos
    ```
  - También puedes pasar estos parámetros dinámicamente al invocar `queue.enqueue(message, maxAttempts, baseDelayMs)`.
- **Configuración de Credenciales SMTP:**
  - Se definen en `.env` mediante `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER` y `SMTP_PASS`.
  - Si falta alguna credencial, el `NodemailerAdapter` conmuta de forma segura a modo simulación imprimiendo el mensaje en consola sin lanzar excepciones.

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

### 5. ApiAdapter (Capa de Adaptador Cliente)
- **Ruta / Ubicacion:** `frontend/src/services/api.adapter.ts`
- **Dependencias:** fetch nativo encapsulado con soporte de `credentials: 'include'`
- **Funciones Principales / API:**
  - `get<T>(endpoint): Promise<ApiResponse<T>>`: Peticion GET tipada inyectando token de autorizacion si existe.
  - `post<T>(endpoint, body): Promise<ApiResponse<T>>`: Peticion POST tipada con serializacion JSON y manejo unificado de errores y desconexion por 401.

### 6. AuthContext & Provider
- **Ruta / Ubicacion:** `frontend/src/context/AuthContext.tsx`
- **Dependencias:** `ApiAdapter`, React 19 (`useState`, `useEffect`, `createContext`)
- **Funciones Principales / API:**
  - `useAuth()`: Hook de acceso al estado de autenticacion.
  - `loginSuccess(user, token)`: Almacena el usuario y el token de acceso en memoria volátil de la sesion cliente.
  - `logout()`: Ejecuta llamada POST a `/auth/logout` y limpia el estado en memoria.
  - `checkSession()`: Efecto de montaje para renovacion transparente via Cookie httpOnly a `/auth/refresh`.

### 7. Vistas de Usuario (React + @stonedjjh/react-ui)
- **Ruta / Ubicacion:** `frontend/src/pages/`
- **Componentes:**
  - `LoginView`: Formulario de acceso con soporte 2FA condicional y `rememberMe`. Utiliza notificaciones flotantes con `toast.error` y `toast.success`.
  - `RegisterView`: Formulario de registro con checklist en tiempo real de politicas activas y validacion de coincidencia.
  - `TwoFactorVerifyView`: Captura de codigo TOTP de 6 digitos durante el login.
  - `ForgotPasswordView`: Solicitud segura de recuperacion de clave.
  - `DashboardView`: Panel protegido que despliega datos del usuario, QR de activacion 2FA, clave secreta y telemetria de tokens en memoria.
- **Sistema de Notificaciones:** Se utiliza `ToastProvider` de `@stonedjjh/react-ui` eliminando espacios en blanco o slots artificiales en los formularios.

### 8. Modulo de Reglas de Seguridad de Contrasena (Modular y Extensible)
- **Ruta / Ubicacion:**
  - Backend: `backend/src/config/passwordRules.ts`
  - Frontend: `frontend/src/config/passwordRules.ts`
- **Descripcion:** Archivo declarativo donde el desarrollador puede comentar, descomentar o agregar nuevas reglas de complejidad de contrasena (longitud minima, mayusculas, minusculas, numeros, caracteres especiales, o reglas corporativas personalizadas).
- **Funciones Principales / API:**
  - `validatePassword(password: string): { valid: boolean; errors: string[] }`: Evalua la clave contra todas las reglas activas de la lista `PASSWORD_RULES`.

### 9. HashAdapter (Capa Anti-Corrupcion de Hashing Criptografico)
- **Ruta / Ubicacion:** `backend/src/adapters/hash.adapter.ts`
- **Dependencias:** `bcryptjs`
- **Interfaz del Adaptador (`HashProvider`):**
  - `hash(plainText: string, saltRounds?: number): Promise<string>`: Genera el hash de la contrasena con salt configurable (por defecto 10 rondas).
  - `compare(plainText: string, hash: string): Promise<boolean>`: Compara el texto plano con el hash provisto.
  - `getDummyHash(): string`: Retorna un hash precalculado de 10 rondas para neutralizar Timing Attacks sin consumo variable de CPU.
- **Objetivo Arquitectonico:** Aislar la libreria `bcryptjs`. Si en el futuro se migra a Argon2id o scrypt, solo se implementa una nueva clase que cumpla `HashProvider`.

### 10. TwoFactorAdapter (Capa Anti-Corrupcion de Autenticacion TOTP)
- **Ruta / Ubicacion:** `backend/src/adapters/twofactor.adapter.ts`
- **Dependencias:** `otplib`, `qrcode`
- **Interfaz del Adaptador (`TwoFactorProvider`):**
  - `generateSecret(): string`: Genera un secreto criptografico aleatorio codificado en base32.
  - `generateKeyUri(account: string, issuer: string, secret: string): string`: Crea el URI `otpauth://totp/...` compatible con estandares RFC 6238.
  - `generateQrCode(keyUri: string): Promise<string>`: Produce el Data URL en formato PNG base64 para renderizar directamente en un elemento `<img>`.
  - `verifyToken(rawToken: string, secret: string): boolean`: Sanitiza el token eliminando espacios o guiones y valida el codigo con una ventana de tolerancia horaria de +-60s (`window: [2, 2]`).
- **Objetivo Arquitectonico:** Desacoplar las librerias `otplib` y `qrcode` de los servicios y rutas del backend.

