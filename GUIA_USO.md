# Guia de Uso y Puesta en Marcha - Sistema de Autenticacion Fullstack

Esta guia explica como instalar, configurar, migrar y ejecutar el sistema de autenticacion fullstack (Fastify + React 19 + `@stonedjjh/react-ui`).

---

## 1. Requisitos Previos

- **Node.js**: Version 20.x o superior (LTS recomendada).
- **pnpm**: Version 9.x o superior. Si no lo tienes instalado globalmente:
  ```bash
  npm install -g pnpm
  ```
- **Motores de Base de Datos Soportados**:
  - **SQLite**: No requiere software adicional ni configuracion previa de servidor (viene listo para desarrollo local con archivo local `database.sqlite`).
  - **PostgreSQL / MySQL**: Opcional para entornos productivos o despliegues dedicados.

---

## 2. Instalacion en 3 Pasos

### Paso 1: Clonar o situarse en el directorio del proyecto e instalar dependencias
```bash
pnpm install
```

### Paso 2: Crear el archivo de variables de entorno `.env`
Copia el archivo de plantilla `.env.example` para crear tu `.env` local:
```bash
# En Windows (PowerShell):
Copy-Item .env.example .env

# En Linux / macOS:
cp .env.example .env
```

### Paso 3: Configurar puertos y entorno en `.env`
Por defecto, el archivo `.env` viene configurado para desarrollo rapido con **SQLite**:
- **Backend:** Escucha en el puerto `3001` (`http://localhost:3001`).
- **Frontend:** Por defecto inicia en `http://localhost:5173`.
- **Nota sobre puertos ocupados:** Si el puerto `5173` esta en uso en tu maquina por otra aplicacion, Vite se movera a otro puerto (ej. `5176`). En ese caso, abre tu archivo `.env` y ajusta la variable:
  ```env
  FRONTEND_URL=http://localhost:5176
  ```
  Esto garantizara que los enlaces de confirmacion de cuenta y reseteo de clave generados por correo lleven al puerto correcto.

---

## 3. Catalogo de Comandos CLI

El proyecto esta organizado como un monorepo administrado por **pnpm**. A continuacion se detallan todos los comandos disponibles desde la raiz del proyecto:

### A. Gestion de Base de Datos y Migraciones (CLI Multi-Motor)

El sistema cuenta con un generador interactivo y automatico de esquemas DDL para **SQLite**, **PostgreSQL** y **MySQL**, con soporte de borrado logico (`deleted_at`) o borrado fisico:

```bash
# Ejecutar el CLI interactivo de migraciones:
pnpm migrate:cli
```
- **Modo Interactivo:** Te preguntara que motor deseas utilizar y si requieres borrado logico o fisico.
- **Modo No Interactivo / Automatizado (CI/CD):** Puedes definir las variables en `.env` o en la linea de comandos:
  ```bash
  # Ejemplo ejecutando migracion directa sobre SQLite con borrado logico:
  DB_ENGINE=sqlite DB_SOFT_DELETE=true pnpm migrate:cli
  ```

---

### B. Ejecucion en Desarrollo

```bash
# Iniciar Backend y Frontend simultaneamente en paralelo:
pnpm dev

# Iniciar unicamente el servidor Backend Fastify:
pnpm dev:backend

# Iniciar unicamente la aplicacion Frontend Vite:
pnpm dev:frontend
```

---

### C. Calidad, Pruebas y Compilacion

```bash
# Ejecutar la suite completa de pruebas unitarias y de integracion:
pnpm test

# Ejecutar pruebas unicamente del backend:
pnpm --filter backend test

# Ejecutar pruebas unicamente del frontend:
pnpm --filter frontend test

# Compilar todos los paquetes para produccion (verificacion de tipos TypeScript estricto):
pnpm build
```

---

## 4. Configuracion del Servicio de Correo Electronico

El sistema utiliza una **cola asincrona en segundo plano** (`BackgroundEmailQueue`) que despacha correos sin bloquear las peticiones HTTP del usuario.

### Modo 1: Desarrollo sin servidor de correo (Modo Simulacion)
Si dejas las credenciales SMTP vacias en el `.env`, el sistema simulara el envio de correos imprimiendo los mensajes y URLs generadas en la terminal del backend.

### Modo 2: Previsualizacion con Mailtrap Sandbox (Recomendado para pruebas locales)
1. Registrate gratis en [Mailtrap.io](https://mailtrap.io/).
2. Copia tus credenciales en el archivo `.env`:
   ```env
   SMTP_HOST=sandbox.smtp.mailtrap.io
   SMTP_PORT=2525
   SMTP_SECURE=false
   SMTP_USER=tu_usuario_mailtrap
   SMTP_PASS=tu_password_mailtrap
   ```

### Modo 3: Envio de correos reales (Gmail o Brevo)
- **Gmail (con contrasena de aplicacion de 16 caracteres):**
  ```env
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=465
  SMTP_SECURE=true
  SMTP_USER=tu_cuenta@gmail.com
  SMTP_PASS=tu_clave_de_aplicacion_sin_espacios
  ```
- **Brevo / Sendinblue (Gratis 300 correos al dia):**
  ```env
  SMTP_HOST=smtp-relay.brevo.com
  SMTP_PORT=587
  SMTP_SECURE=false
  SMTP_USER=tu_correo_brevo
  SMTP_PASS=tu_master_smtp_key
  ```

---

## 5. Caracteristicas de Seguridad Incluidas

1. **Tokens Duales JWT:**
   - **Access Token:** Emitido en memoria volátil del navegador (no en LocalStorage para prevenir robo via XSS).
   - **Refresh Token:** Almacenado en una Cookie protegida con directivas `httpOnly`, `sameSite: strict` y `path: /api/auth`.
2. **Mitigacion de Timing Attacks:**
   - La comparacion criptografica de contrasenas ejecuta un hash de costo idéntico cuando un usuario no existe, evitando que atacantes deduzcan correos registrados por diferencia de milisegundos.
3. **Autenticacion en Dos Pasos (2FA TOTP):**
   - Compatible con Google Authenticator, Microsoft Authenticator y Authy.
   - Ventana de tolerancia horaria (`window: [2, 2]`) para prevenir falsos negativos por micro-desfases de reloj.
4. **Politicas de Complejidad de Contrasena Modulares:**
   - Configurables de forma declarativa tanto en frontend como en backend (`passwordRules.ts`).
