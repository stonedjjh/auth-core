/**
 * Interfaz y Adaptador para servicios de Transporte de Correo Electrónico
 * Regla 6 (estandar.md) - Anti-Corruption Layer
 * Desacopla la lógica de negocio y plantillas de la librería externa nodemailer o APIs de correo.
 */

import nodemailer from 'nodemailer';

export interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  html: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<boolean>;
  isConfigured(): boolean;
}

export class NodemailerAdapter implements EmailProvider {
  private transporter: nodemailer.Transporter | null = null;
  private configured: boolean = false;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
      this.configured = true;
    } else {
      // Modo simulación en desarrollo local si faltan credenciales
      this.transporter = null;
      this.configured = false;
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async send(message: EmailMessage): Promise<boolean> {
    if (this.transporter && this.configured) {
      await this.transporter.sendMail({
        from: message.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
      });
      return true;
    }

    // Modo simulación / consola para desarrollo local
    console.log(`\n[SIMULACION EMAIL] De: ${message.from} | Para: ${message.to} | Asunto: ${message.subject}`);
    return true;
  }
}
