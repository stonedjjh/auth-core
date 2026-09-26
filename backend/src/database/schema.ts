export type DatabaseEngine = 'sqlite' | 'postgres' | 'mysql';

export interface MigrationOptions {
  engine: DatabaseEngine;
  enableSoftDelete: boolean;
}

/**
 * Genera el DDL de creación de la tabla users adaptado al motor de base de datos y tipo de borrado.
 */
export function generateUsersTableSql(options: MigrationOptions): string {
  const { engine, enableSoftDelete } = options;

  if (engine === 'sqlite') {
    return `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_verified INTEGER NOT NULL DEFAULT 0,
  two_factor_secret TEXT,
  two_factor_enabled INTEGER NOT NULL DEFAULT 0,
  google_id TEXT UNIQUE,
  remember_token TEXT,
  session_version INTEGER NOT NULL DEFAULT 1,
  ${enableSoftDelete ? 'deleted_at TEXT DEFAULT NULL,' : ''}
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
${enableSoftDelete ? 'CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);' : ''}
    `.trim();
  }

  if (engine === 'postgres') {
    return `
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  two_factor_secret VARCHAR(255),
  two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  google_id VARCHAR(255) UNIQUE,
  remember_token VARCHAR(255),
  session_version INTEGER NOT NULL DEFAULT 1,
  ${enableSoftDelete ? 'deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,' : ''}
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
${enableSoftDelete ? 'CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);' : ''}
    `.trim();
  }

  // MySQL
  return `
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  two_factor_secret VARCHAR(255) DEFAULT NULL,
  two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0,
  google_id VARCHAR(255) UNIQUE DEFAULT NULL,
  remember_token VARCHAR(255) DEFAULT NULL,
  session_version INT NOT NULL DEFAULT 1,
  ${enableSoftDelete ? 'deleted_at DATETIME DEFAULT NULL,' : ''}
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
${enableSoftDelete ? 'CREATE INDEX idx_users_deleted_at ON users(deleted_at);' : ''}
  `.trim();
}
