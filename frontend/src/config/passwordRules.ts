/**
 * Configuracion de Reglas de Seguridad para Contrasenas (Frontend)
 *
 * El usuario/desarrollador puede COMENTAR, DESCOMENTAR o AGREGAR nuevas reglas
 * segun las politicas de seguridad requeridas por el proyecto.
 */

export interface PasswordRule {
  id: string;
  label: string;
  errorMessage: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  // 1. Longitud minima
  {
    id: 'minLength',
    label: 'Minimo 8 caracteres',
    errorMessage: 'La contrasena debe tener al menos 8 caracteres.',
    test: (password: string) => password.length >= 8,
  },

  // 2. Al menos una letra mayuscula
  {
    id: 'hasUppercase',
    label: 'Al menos una letra mayuscula (A-Z)',
    errorMessage: 'Debe contener al menos una letra mayuscula.',
    test: (password: string) => /[A-Z]/.test(password),
  },

  // 3. Al menos una letra minuscula
  {
    id: 'hasLowercase',
    label: 'Al menos una letra minuscula (a-z)',
    errorMessage: 'Debe contener al menos una letra minuscula.',
    test: (password: string) => /[a-z]/.test(password),
  },

  // 4. Al menos un numero
  {
    id: 'hasNumber',
    label: 'Al menos un numero (0-9)',
    errorMessage: 'Debe contener al menos un numero.',
    test: (password: string) => /\d/.test(password),
  },

  // 5. Al menos un caracter especial
  {
    id: 'hasSpecialChar',
    label: 'Al menos un caracter especial (!@#$%^&*...)',
    errorMessage: 'Debe contener al menos un caracter especial.',
    test: (password: string) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
  },

  // Reglas personalizadas adicionales (ejemplos comentados):
  // {
  //   id: 'noSpaces',
  //   label: 'Sin espacios en blanco',
  //   errorMessage: 'La contrasena no puede contener espacios en blanco.',
  //   test: (password: string) => !/\s/.test(password),
  // },
];

/**
 * Valida una contrasena contra todas las reglas activas.
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const rule of PASSWORD_RULES) {
    if (!rule.test(password)) {
      errors.push(rule.errorMessage);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
