import crypto from 'crypto';
import { UserRepository, UserEntity } from '../repositories/user.repository.js';
import { EmailService } from './email.service.js';
import { HashProvider, BcryptAdapter } from '../adapters/hash.adapter.js';
import { TwoFactorProvider, OtplibAdapter } from '../adapters/twofactor.adapter.js';

export interface TokenPayload {
  userId: string;
  email: string;
  username: string;
  sessionVersion: number;
}

export class AuthService {
  private userRepo: UserRepository;
  private emailService: EmailService;
  private hashProvider: HashProvider;
  private twoFactorProvider: TwoFactorProvider;

  constructor(
    userRepo?: UserRepository,
    emailService?: EmailService,
    hashProvider?: HashProvider,
    twoFactorProvider?: TwoFactorProvider
  ) {
    this.userRepo = userRepo || new UserRepository();
    this.emailService = emailService || new EmailService();
    this.hashProvider = hashProvider || new BcryptAdapter();
    this.twoFactorProvider = twoFactorProvider || new OtplibAdapter();
  }

  /**
   * Registro de nuevo usuario
   */
  async register(username: string, email: string, password: string): Promise<{ user: Omit<UserEntity, 'password_hash' | 'two_factor_secret'>; verificationToken: string }> {
    const existingEmail = await this.userRepo.findByEmail(email);
    if (existingEmail) {
      throw new Error('El correo electrónico ya se encuentra registrado.');
    }

    const existingUser = await this.userRepo.findByUsername(username);
    if (existingUser) {
      throw new Error('El nombre de usuario ya se encuentra en uso.');
    }

    const passwordHash = await this.hashProvider.hash(password);
    const userId = crypto.randomUUID();
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const created = await this.userRepo.create({
      id: userId,
      username,
      email,
      password_hash: passwordHash,
      is_verified: false,
      two_factor_secret: null,
      two_factor_enabled: false,
      google_id: null,
      remember_token: verificationToken,
      session_version: 1,
    });

    // Enviar correo de bienvenida con verificación
    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verificationUrl = `${frontendBaseUrl}/verify?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    await this.emailService.sendWelcomeEmail(email, username, verificationUrl);

    const { password_hash, two_factor_secret, ...safeUser } = created;
    return { user: safeUser, verificationToken };
  }

  /**
   * Login seguro con mitigación de Timing Attacks
   * Siempre tarda el mismo tiempo de cómputo de hashing tanto si el usuario existe como si no.
   */
  async login(identifier: string, password: string): Promise<{ requires2FA?: boolean; tempUserId?: string; user?: Omit<UserEntity, 'password_hash' | 'two_factor_secret'> }> {
    const isEmail = identifier.includes('@');
    const user = isEmail
      ? await this.userRepo.findByEmail(identifier)
      : await this.userRepo.findByUsername(identifier);

    // Si el usuario existe, usamos su hash; si no, comparamos contra el hash dummy provisto por el adapter
    const hashToCompare = user ? user.password_hash : this.hashProvider.getDummyHash();
    const isValid = await this.hashProvider.compare(password, hashToCompare);

    if (!user || !isValid) {
      throw new Error('Credenciales inválidas');
    }

    // Verificar si requiere 2FA
    if (Boolean(user.two_factor_enabled)) {
      return {
        requires2FA: true,
        tempUserId: user.id,
      };
    }

    const { password_hash, two_factor_secret, ...safeUser } = user;
    return { user: safeUser };
  }

  /**
   * Verificar código TOTP (2FA) en login
   */
  async verifyLogin2FA(userId: string, rawCode: string): Promise<Omit<UserEntity, 'password_hash' | 'two_factor_secret'>> {
    const user = await this.userRepo.findById(userId);
    if (!user || !user.two_factor_secret) {
      throw new Error('Usuario o configuración de 2FA no válida.');
    }

    const isValid = this.twoFactorProvider.verifyToken(rawCode, user.two_factor_secret);
    if (!isValid) {
      throw new Error('Código de verificación 2FA incorrecto o expirado.');
    }

    const { password_hash, two_factor_secret, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Iniciar configuración de 2FA (genera secreto y QR)
   */
  async setup2FA(userId: string): Promise<{ secret: string; qrCodeDataUrl: string }> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new Error('Usuario no encontrado.');

    const secret = this.twoFactorProvider.generateSecret();
    const otpauth = this.twoFactorProvider.generateKeyUri(user.email, 'SistemaSeguro', secret);
    const qrCodeDataUrl = await this.twoFactorProvider.generateQrCode(otpauth);

    // Guardar secreto provisionalmente
    await this.userRepo.setTwoFactor(userId, secret, false);

    return { secret, qrCodeDataUrl };
  }

  /**
   * Confirmar y activar 2FA
   */
  async enable2FA(userId: string, rawCode: string): Promise<boolean> {
    const user = await this.userRepo.findById(userId);
    if (!user || !user.two_factor_secret) throw new Error('No hay configuración de 2FA pendiente.');

    const isValid = this.twoFactorProvider.verifyToken(rawCode, user.two_factor_secret);
    if (!isValid) throw new Error('Código inválido. Asegúrate de ingresar el código actual de 6 dígitos.');

    await this.userRepo.setTwoFactor(userId, user.two_factor_secret, true);
    await this.emailService.sendSecurityAlertEmail(user.email, user.username, 'Se ha activado la verificación en 2 pasos (2FA) en tu cuenta.');
    return true;
  }

  /**
   * Desactivar 2FA
   */
  async disable2FA(userId: string): Promise<boolean> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new Error('Usuario no encontrado.');

    await this.userRepo.setTwoFactor(userId, null, false);
    await this.emailService.sendSecurityAlertEmail(user.email, user.username, 'Se ha desactivado la verificación en 2 pasos (2FA) en tu cuenta.');
    return true;
  }

  /**
   * Solicitar restablecimiento de contraseña
   */
  async requestPasswordReset(email: string): Promise<boolean> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      // Devolver true para no filtrar si el email existe o no (anti-enumeration)
      return true;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    await this.userRepo.updateRememberToken(user.id, resetToken);

    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendBaseUrl}/reset-password?token=${resetToken}&id=${user.id}`;
    await this.emailService.sendPasswordResetEmail(user.email, user.username, resetUrl);
    return true;
  }

  /**
   * Restablecer contraseña con token
   */
  async resetPassword(userId: string, token: string, newPassword: string): Promise<boolean> {
    const user = await this.userRepo.findById(userId);
    if (!user || !user.remember_token || user.remember_token !== token) {
      throw new Error('El token de restablecimiento es inválido o ha caducado.');
    }

    const passwordHash = await this.hashProvider.hash(newPassword);

    await this.userRepo.updatePassword(user.id, passwordHash);
    await this.userRepo.updateRememberToken(user.id, null);

    await this.emailService.sendSecurityAlertEmail(user.email, user.username, 'Tu contraseña ha sido restablecida exitosamente.');
    return true;
  }

  /**
   * Login o Registro simplificado con Google OAuth
   */
  async loginWithGoogle(googleId: string, email: string, name: string): Promise<Omit<UserEntity, 'password_hash' | 'two_factor_secret'>> {
    let user = await this.userRepo.findByGoogleId(googleId);

    if (!user) {
      // Verificar si ya existe por email
      user = await this.userRepo.findByEmail(email);
      if (user) {
        // Enlazar google_id
        await this.userRepo.setVerified(user.id);
      } else {
        // Crear nuevo usuario de Google
        const randomPass = crypto.randomBytes(24).toString('hex');
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(randomPass, salt);

        user = await this.userRepo.create({
          id: crypto.randomUUID(),
          username: name.toLowerCase().replace(/\s+/g, '_') + '_' + Math.floor(Math.random() * 1000),
          email,
          password_hash: passwordHash,
          is_verified: true,
          two_factor_secret: null,
          two_factor_enabled: false,
          google_id: googleId,
          remember_token: null,
          session_version: 1,
        });

        await this.emailService.sendWelcomeEmail(email, user.username, 'http://localhost:5174/login');
      }
    }

    const { password_hash, two_factor_secret, ...safeUser } = user;
    return safeUser;
  }
}
