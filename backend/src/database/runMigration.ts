import { generateUsersTableSql } from './schema.js';
import { getDatabaseAdapter } from './connection.js';

export async function runMigration(engine: 'sqlite' | 'postgres' | 'mysql' = 'sqlite', enableSoftDelete = true) {
  process.env.DB_ENGINE = engine;
  process.env.DB_SOFT_DELETE = String(enableSoftDelete);
  
  const sql = generateUsersTableSql({ engine, enableSoftDelete });
  const adapter = getDatabaseAdapter();

  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    await adapter.execute(stmt);
  }

  console.log(`Migracion completada para ${engine} (Soft Delete: ${enableSoftDelete})`);
}

// Ejecutar si es llamado directamente
if (process.argv[1]?.includes('runMigration')) {
  runMigration('sqlite', true)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
