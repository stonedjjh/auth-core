import { createClient, Client } from '@libsql/client';
import pg from 'pg';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export type DatabaseEngine = 'sqlite' | 'postgres' | 'mysql';

export interface DatabaseAdapter {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<{ affectedRows: number }>;
  close(): Promise<void>;
  getEngine(): DatabaseEngine;
  isSoftDeleteEnabled(): boolean;
}

let activeAdapter: DatabaseAdapter | null = null;

export function getDatabaseAdapter(): DatabaseAdapter {
  if (activeAdapter) return activeAdapter;

  const engine = (process.env.DB_ENGINE || 'sqlite') as DatabaseEngine;
  const enableSoftDelete = process.env.DB_SOFT_DELETE === 'true';

  if (engine === 'sqlite') {
    const rawFile = process.env.DB_FILE || 'database.sqlite';
    const dbUrl = rawFile.startsWith('file:') ? rawFile : `file:${path.resolve(process.cwd(), rawFile)}`;
    const client: Client = createClient({ url: dbUrl });

    activeAdapter = {
      getEngine: () => 'sqlite',
      isSoftDeleteEnabled: () => enableSoftDelete,
      async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
        const res = await client.execute({ sql, args: params });
        return res.rows as unknown as T[];
      },
      async execute(sql: string, params: any[] = []): Promise<{ affectedRows: number }> {
        const res = await client.execute({ sql, args: params });
        return { affectedRows: res.rowsAffected };
      },
      async close(): Promise<void> {
        client.close();
        activeAdapter = null;
      },
    };
    return activeAdapter;
  }

  if (engine === 'postgres') {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    activeAdapter = {
      getEngine: () => 'postgres',
      isSoftDeleteEnabled: () => enableSoftDelete,
      async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
        let paramIndex = 1;
        const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
        const res = await pool.query(pgSql, params);
        return res.rows as T[];
      },
      async execute(sql: string, params: any[] = []): Promise<{ affectedRows: number }> {
        let paramIndex = 1;
        const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
        const res = await pool.query(pgSql, params);
        return { affectedRows: res.rowCount ?? 0 };
      },
      async close(): Promise<void> {
        await pool.end();
        activeAdapter = null;
      },
    };
    return activeAdapter;
  }

  // MySQL
  const poolPromise = mysql.createPool({
    uri: process.env.DATABASE_URL,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
  });

  activeAdapter = {
    getEngine: () => 'mysql',
    isSoftDeleteEnabled: () => enableSoftDelete,
    async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
      const [rows] = await poolPromise.query(sql, params);
      return rows as T[];
    },
    async execute(sql: string, params: any[] = []): Promise<{ affectedRows: number }> {
      const [result]: any = await poolPromise.execute(sql, params);
      return { affectedRows: result.affectedRows ?? 0 };
    },
    async close(): Promise<void> {
      await poolPromise.end();
      activeAdapter = null;
    },
  };

  return activeAdapter;
}
