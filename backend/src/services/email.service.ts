import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST || 'smtp.mailtrap.io';
    const port = Number(process.env.SMTP_PORT) || 2525;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        auth: { user, pass },
      });
    } else {
      // Modo log para desarrollo local sin credenciales SMTP
      this.transporter = null;
    }
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

  async sendWelcomeEmail(to: string, username: string, verificationUrl: string): Promise<boolean> {
    const from = process.env.MAIL_FROM_WELCOME || 'Bienvenida <bienvenida@tudominio.com>';
    const html = this.renderTemplate('welcome', {
      username,
      email: to,
      verificationUrl,
    });

    return this.sendMail(from, to, '¡Bienvenido a nuestra plataforma! Confirma tu cuenta', html);
  }

  async sendPasswordResetEmail(to: string, username: string, resetUrl: string, expiresIn = '15 minutos'): Promise<boolean> {
    const from = process.env.MAIL_FROM_RESET || 'Seguridad <seguridad@tudominio.com>';
    const html = this.renderTemplate('reset-password', {
      username,
      resetUrl,
      expiresIn,
    });

    return this.sendMail(from, to, 'Recuperación de Contraseña', html);
  }

  async sendSecurityAlertEmail(to: string, username: string, eventDescription: string): Promise<boolean> {
    const from = process.env.MAIL_FROM_ALERT || 'Alertas de Cuenta <alertas@tudominio.com>';
    const html = this.renderTemplate('security-alert', {
      username,
      eventDescription,
      timestamp: new Date().toLocaleString(),
    });

    return this.sendMail(from, to, 'Alerta de Seguridad en tu Cuenta', html);
  }

  private async sendMail(from: string, to: string, subject: string, html: string): Promise<boolean> {
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from,
          to,
          subject,
          html,
        });
        return true;
      } catch (err) {
        console.error('Error enviando correo SMTP:', err);
        return false;
      }
    } else {
      // Entorno de desarrollo / Simulación
      console.log(`\n[SIMULACION EMAIL] De: ${from} | Para: ${to} | Asunto: ${subject}`);
      return true;
    }
  }
}
