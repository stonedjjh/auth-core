# 📖 Manual del Programador - Sistema de Autenticación

Este documento describe la arquitectura, estructura de carpetas, dependencias y lineamientos para modificar o extender el sistema de autenticación.

---

## 🗺️ Mapa de Rutas y Carpetas Clave

| Funcionalidad / Módulo | Ubicación en el Proyecto | Descripción |
| :--- | :--- | :--- |
| **Plantillas de Correo** | `backend/src/templates/emails/` | Aquí se definen y modifican las plantillas HTML y texto plano para bienvenida, recuperación de clave y notificaciones de perfil. |
| **Configuración de Correos & SMTP** | `.env` / `backend/src/config/mail.ts` | Configura los remitentes y credenciales SMTP diferenciados por plantilla. |
| **Protección contra Timing Attacks** | `backend/src/services/auth.service.ts` | Lógica de comparación de contraseñas constante con dummy hash. |
| **Componentes de UI / Pantallas** | `frontend/src/pages/` & `frontend/src/components/` | Interfaces de Login, Registro, 2FA y Recuperación de clave usando `@stonedjjh/react-ui`. |
| **Definición de Base de Datos y Migraciones** | `backend/src/database/` | Migraciones SQL y CLI multi-motor (SQLite, Postgres, MySQL) con borrado lógico/físico. |
| **Traducciones (i18n)** | `frontend/src/i18n/` | Archivos de traducción para soporte multiidioma (`es.json`, `en.json`). |

---

## 📧 ¿Cómo modificar las Plantillas de Email?
Para alterar el diseño o contenido de los correos:
1. Ve a la carpeta `backend/src/templates/emails/`.
2. Edita los archivos:
   - `welcome.html`: Plantilla de bienvenida y verificación de cuenta.
   - `reset-password.html`: Plantilla con enlace de recuperación de contraseña.
   - `security-alert.html`: Notificación de cambio de datos o contraseña.
3. Puedes ajustar los remitentes correspondientes en tu archivo `.env`:
   - `MAIL_FROM_WELCOME="Bienvenida <bienvenida@tudominio.com>"`
   - `MAIL_FROM_RESET="Seguridad <seguridad@tudominio.com>"`
   - `MAIL_FROM_ALERT="Alertas <alertas@tudominio.com>"`

---

## 🧩 Componentes y Módulos
*(Se irá completando automáticamente en cada paso del desarrollo)*
