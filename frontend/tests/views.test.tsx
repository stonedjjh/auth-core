import React, { act } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoginView } from '../src/pages/LoginView';
import { RegisterView } from '../src/pages/RegisterView';
import { ForgotPasswordView } from '../src/pages/ForgotPasswordView';
import { TwoFactorVerifyView } from '../src/pages/TwoFactorVerifyView';
import { AuthProvider } from '../src/context/AuthContext';

describe('Batería de Pruebas de Interfaz Frontend (React + @stonedjjh/react-ui)', () => {
  /**
   * Smoke Test de Pantalla de Login
   * Qué se evalúa: Renderizado de los elementos clave de la vista de inicio de sesión.
   * Qué se necesita: Montar LoginView dentro de AuthProvider.
   * Resultado esperado: Presencia de 3 a 5 elementos clave (título, campo correo/usuario, campo contraseña, botón entrar, link de registro).
   */
  it('Login: Despliega correctamente los campos del formulario y acciones principales', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <LoginView onNavigate={() => {}} onRequires2FA={() => {}} />
        </AuthProvider>
      );
    });

    // 1. Título principal
    expect(screen.getByText('Iniciar Sesion')).toBeDefined();
    // 2. Input de identificador (correo o usuario)
    expect(screen.getByPlaceholderText('usuario@ejemplo.com')).toBeDefined();
    // 3. Input de contraseña
    expect(screen.getByPlaceholderText('Ingresa tu contrasena')).toBeDefined();
    // 4. Botón de envío
    expect(screen.getByRole('button', { name: /entrar/i })).toBeDefined();
    // 5. Botón/Enlace de registro
    expect(screen.getByRole('button', { name: /registrate aqui/i })).toBeDefined();
  });

  /**
   * Smoke Test de Pantalla de Registro
   * Qué se evalúa: Renderizado de los campos obligatorios de registro de usuario.
   * Qué se necesita: Montar RegisterView dentro de AuthProvider.
   * Resultado esperado: Presencia de campos de usuario, email, contraseñas y botón de registro.
   */
  it('Registro: Despliega todos los campos de captura de credenciales y confirmación', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <RegisterView onNavigate={() => {}} />
        </AuthProvider>
      );
    });

    expect(screen.getByText('Crear Cuenta')).toBeDefined();
    expect(screen.getByPlaceholderText('ej. juan_perez')).toBeDefined();
    expect(screen.getByPlaceholderText('usuario@ejemplo.com')).toBeDefined();
    expect(screen.getByPlaceholderText('Ingresa tu clave')).toBeDefined();
    expect(screen.getByPlaceholderText('Repite la contrasena')).toBeDefined();
    expect(screen.getByRole('button', { name: /registrarse/i })).toBeDefined();
  });

  /**
   * Smoke Test de Pantalla de Recuperación de Contraseña
   * Qué se evalúa: Renderizado de la vista de restablecimiento de clave.
   * Qué se necesita: Montar ForgotPasswordView.
   * Resultado esperado: Título explicativo, input de correo y botón de envío.
   */
  it('Recuperación: Muestra formulario accesible para solicitar enlace de reseteo', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <ForgotPasswordView onNavigate={() => {}} />
        </AuthProvider>
      );
    });

    expect(screen.getByText('Recuperar Contrasena')).toBeDefined();
    expect(screen.getByPlaceholderText('usuario@ejemplo.com')).toBeDefined();
    expect(screen.getByRole('button', { name: /enviar enlace/i })).toBeDefined();
  });

  /**
   * Smoke Test de Verificación en Dos Pasos (2FA)
   * Qué se evalúa: Despliegue de la pantalla de código TOTP con campo de 6 dígitos.
   * Qué se necesita: Montar TwoFactorVerifyView con tempUserId.
   * Resultado esperado: Input formateado de código y botón de verificación.
   */
  it('2FA: Muestra interfaz de verificación de 6 dígitos para autenticación de dos factores', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <TwoFactorVerifyView tempUserId="dummy-user-id" onNavigate={() => {}} />
        </AuthProvider>
      );
    });

    expect(screen.getByText('Verificacion de Dos Pasos')).toBeDefined();
    expect(screen.getByPlaceholderText('123456')).toBeDefined();
    expect(screen.getByRole('button', { name: /verificar y continuar/i })).toBeDefined();
  });
});
