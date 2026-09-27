/**
 * Interfaz y Adaptador para servicios de Hashing criptográfico
 * Regla 6 (estandar.md) - Anti-Corruption Layer
 * Desacopla la lógica de negocio de la librería externa concreta (bcryptjs, argon2, scrypt, etc.)
 */

import bcrypt from 'bcryptjs';

export interface HashProvider {
  hash(plainText: string, saltRounds?: number): Promise<string>;
  compare(plainText: string, hash: string): Promise<boolean>;
  getDummyHash(): string;
}

export class BcryptAdapter implements HashProvider {
  private readonly defaultSaltRounds: number;
  private readonly dummyHash: string;

  constructor(saltRounds: number = 10) {
    this.defaultSaltRounds = saltRounds;
    // Hash dummy precalculado (10 rounds de bcrypt) para mitigar Timing Attacks
    this.dummyHash = '$2a$10$w8TKnk2V0w1e.Qj5vOQhzeXWJp2b7rU0bK6XvR7N/ZkRlmqR6g/C2';
  }

  async hash(plainText: string, saltRounds?: number): Promise<string> {
    const salt = await bcrypt.genSalt(saltRounds ?? this.defaultSaltRounds);
    return bcrypt.hash(plainText, salt);
  }

  async compare(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }

  getDummyHash(): string {
    return this.dummyHash;
  }
}
