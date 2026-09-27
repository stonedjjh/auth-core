import { getDatabaseAdapter } from '../database/connection.js';

export interface UserEntity {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  is_verified: number | boolean;
  two_factor_secret: string | null;
  two_factor_enabled: number | boolean;
  google_id: string | null;
  remember_token: string | null;
  session_version: number;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export class UserRepository {
  private get adapter() {
    return getDatabaseAdapter();
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const isSoftDelete = this.adapter.isSoftDeleteEnabled();
    const sql = isSoftDelete
      ? `SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND deleted_at IS NULL LIMIT 1`
      : `SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`;

    const rows = await this.adapter.query<UserEntity>(sql, [email.trim()]);
    return rows[0] || null;
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    const isSoftDelete = this.adapter.isSoftDeleteEnabled();
    const sql = isSoftDelete
      ? `SELECT * FROM users WHERE LOWER(username) = LOWER(?) AND deleted_at IS NULL LIMIT 1`
      : `SELECT * FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1`;

    const rows = await this.adapter.query<UserEntity>(sql, [username.trim()]);
    return rows[0] || null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const isSoftDelete = this.adapter.isSoftDeleteEnabled();
    const sql = isSoftDelete
      ? `SELECT * FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`
      : `SELECT * FROM users WHERE id = ? LIMIT 1`;

    const rows = await this.adapter.query<UserEntity>(sql, [id]);
    return rows[0] || null;
  }

  async findByGoogleId(googleId: string): Promise<UserEntity | null> {
    const isSoftDelete = this.adapter.isSoftDeleteEnabled();
    const sql = isSoftDelete
      ? `SELECT * FROM users WHERE google_id = ? AND deleted_at IS NULL LIMIT 1`
      : `SELECT * FROM users WHERE google_id = ? LIMIT 1`;

    const rows = await this.adapter.query<UserEntity>(sql, [googleId]);
    return rows[0] || null;
  }

  async create(user: Omit<UserEntity, 'created_at' | 'updated_at' | 'session_version'> & { session_version?: number }): Promise<UserEntity> {
    const sql = `
      INSERT INTO users (id, username, email, password_hash, is_verified, two_factor_secret, two_factor_enabled, google_id, remember_token, session_version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const sessionVersion = user.session_version ?? 1;
    const isVerifiedNum = typeof user.is_verified === 'boolean' ? (user.is_verified ? 1 : 0) : user.is_verified;
    const twoFactorEnabledNum = typeof user.two_factor_enabled === 'boolean' ? (user.two_factor_enabled ? 1 : 0) : user.two_factor_enabled;

    await this.adapter.execute(sql, [
      user.id,
      user.username.trim(),
      user.email.toLowerCase().trim(),
      user.password_hash,
      isVerifiedNum,
      user.two_factor_secret,
      twoFactorEnabledNum,
      user.google_id,
      user.remember_token,
      sessionVersion,
    ]);

    const created = await this.findById(user.id);
    if (!created) throw new Error('Error al recuperar el usuario creado');
    return created;
  }

  async updatePassword(id: string, newPasswordHash: string): Promise<void> {
    const sql = `UPDATE users SET password_hash = ?, session_version = session_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await this.adapter.execute(sql, [newPasswordHash, id]);
  }

  async setTwoFactor(id: string, secret: string | null, enabled: boolean): Promise<void> {
    const sql = `UPDATE users SET two_factor_secret = ?, two_factor_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await this.adapter.execute(sql, [secret, enabled ? 1 : 0, id]);
  }

  async setVerified(id: string): Promise<void> {
    const sql = `UPDATE users SET is_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await this.adapter.execute(sql, [id]);
  }

  async updateRememberToken(id: string, token: string | null): Promise<void> {
    const sql = `UPDATE users SET remember_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await this.adapter.execute(sql, [token, id]);
  }

  async delete(id: string): Promise<void> {
    if (this.adapter.isSoftDeleteEnabled()) {
      const sql = `UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`;
      await this.adapter.execute(sql, [id]);
    } else {
      const sql = `DELETE FROM users WHERE id = ?`;
      await this.adapter.execute(sql, [id]);
    }
  }
}
