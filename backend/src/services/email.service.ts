import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EmailProvider, NodemailerAdapter, EmailMessage } from '../adapters/email.adapter.js';
import { BackgroundEmailQueue } from './email.queue.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class EmailService {
  private emailProvider: EmailProvider;
  private queue: BackgroundEmailQueue;

  constructor(emailProvider?: EmailProvider) {
    this.emailProvider = emailProvider || new NodemailerAdapter();
    this.queue = new BackgroundEmailQueue(this.emailProvider);
  }

  private renderTemplate(templateName: string, variables: Record<string, string>): string {
    const templatePath = path.resolve(__dirname, '../templates/emails', `${templateName}.html`);
    let content = fs.readFileSync(templatePath, 'utf-8');

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, value);
    }
    return content;
  }

  /**
   * Envia correo de bienvenida en segundo plano
   */
  async sendWelcomeEmail(to: string, username: string, verificationUrl: string): Promise<boolean> {
    const from = process.env.MAIL_FROM_WELCOME || 'Bienvenida <bienvenida@tudominio.com>';
    const html = this.renderTemplate('welcome', {
      username,
      email: to,
      verificationUrl,
    });

    this.queue.enqueue({
      from,
      to,
      subject: '¡Bienvenido a nuestra plataforma! Confirma tu cuenta',
      html,
    });
    return true;
  }

  /**
   * Envia correo de restablecimiento de contrasena en segundo plano
   */
  async sendPasswordResetEmail(to: string, username: string, resetUrl: string, expiresIn = '15 minutos'): Promise<boolean> {
    const from = process.env.MAIL_FROM_RESET || 'Seguridad <seguridad@tudominio.com>';
    const html = this.renderTemplate('reset-password', {
      username,
      resetUrl,
      expiresIn,
    });

    this.queue.enqueue({
      from,
      to,
      subject: 'Recuperación de Contraseña',
      html,
    });
    return true;
  }

  /**
   * Envia alerta de seguridad en segundo plano
   */
  async sendSecurityAlertEmail(to: string, username: string, eventDescription: string): Promise<boolean> {
    const from = process.env.MAIL_FROM_ALERT || 'Alertas de Cuenta <alertas@tudominio.com>';
    const html = this.renderTemplate('security-alert', {
      username,
      eventDescription,
      timestamp: new Date().toLocaleString(),
    });

    this.queue.enqueue({
      from,
      to,
      subject: 'Alerta de Seguridad en tu Cuenta',
      html,
    });
    return true;
  }

  /**
   * Permite acceder a la cola para inspeccionar o personalizar reintentos en tests
   */
  getQueue(): BackgroundEmailQueue {
    return this.queue;
  }
}

