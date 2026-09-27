/**
 * Interfaz y Adaptador para servicios de Doble Factor de Autenticación (2FA / TOTP)
 * Regla 6 (estandar.md) - Anti-Corruption Layer
 * Desacopla la lógica de negocio de las librerías concretas otplib y qrcode.
 */

import { authenticator } from 'otplib';
import QRCode from 'qrcode';

export interface TwoFactorProvider {
  generateSecret(): string;
  generateKeyUri(account: string, issuer: string, secret: string): string;
  generateQrCode(keyUri: string): Promise<string>;
  verifyToken(rawToken: string, secret: string): boolean;
}

export class OtplibAdapter implements TwoFactorProvider {
  constructor(windowTolerance: [number, number] = [2, 2]) {
    authenticator.options = { window: windowTolerance };
  }

  generateSecret(): string {
    return authenticator.generateSecret();
  }

  generateKeyUri(account: string, issuer: string, secret: string): string {
    return authenticator.keyuri(account, issuer, secret);
  }

  async generateQrCode(keyUri: string): Promise<string> {
    return QRCode.toDataURL(keyUri);
  }

  verifyToken(rawToken: string, secret: string): boolean {
    if (!rawToken || !secret) return false;
    const cleanToken = rawToken.trim().replace(/\s+/g, '');
    return authenticator.check(cleanToken, secret);
  }
}
