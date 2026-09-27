import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { generateUsersTableSql, DatabaseEngine } from './schema.js';
import { getDatabaseAdapter } from './connection.js';

function askQuestion(rl: readline.Interface, query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('\n======================================================');
  console.log('CLI DE CONFIGURACION Y MIGRACION DE AUTENTICACION');
  console.log('======================================================\n');

  // 1. Preguntar motor de base de datos
  console.log('Seleccione el motor de base de datos que desea utilizar:');
  console.log('  1) SQLite (Local, sin configuración de servidor)');
  console.log('  2) PostgreSQL');
  console.log('  3) MySQL');
  const dbChoice = (await askQuestion(rl, 'Ingrese opción [1, 2 o 3] (Por defecto 1): ')).trim();

  let engine: DatabaseEngine = 'sqlite';
  if (dbChoice === '2') engine = 'postgres';
  else if (dbChoice === '3') engine = 'mysql';

  // 2. Preguntar tipo de borrado
  console.log('\nSeleccione la política de borrado para usuarios:');
  console.log('  1) Borrado lógico (Soft delete con campo deleted_at - Recomendado)');
  console.log('  2) Borrado físico permanente');
  const deleteChoice = (await askQuestion(rl, 'Ingrese opción [1 o 2] (Por defecto 1): ')).trim();
  const enableSoftDelete = deleteChoice !== '2';

  // 3. Variables de conexión adicionales si no es sqlite
  let dbHost = 'localhost';
  let dbPort = engine === 'postgres' ? '5432' : '3306';
  let dbUser = engine === 'postgres' ? 'postgres' : 'root';
  let dbPassword = '';
  let dbName = 'login_db';

  if (engine !== 'sqlite') {
    dbHost = (await askQuestion(rl, `Host de la base de datos [${dbHost}]: `)).trim() || dbHost;
    dbPort = (await askQuestion(rl, `Puerto [${dbPort}]: `)).trim() || dbPort;
    dbUser = (await askQuestion(rl, `Usuario [${dbUser}]: `)).trim() || dbUser;
    dbPassword = (await askQuestion(rl, 'Contraseña: ')).trim();
    dbName = (await askQuestion(rl, `Nombre de la base de datos [${dbName}]: `)).trim() || dbName;
  }

  rl.close();

  // Actualizar o crear .env
  const envPath = path.resolve(process.cwd(), '.env');
  const envContent = [
    `# Configuración de Base de Datos generada por CLI`,
    `DB_ENGINE=${engine}`,
    `DB_SOFT_DELETE=${enableSoftDelete}`,
    engine === 'sqlite' ? `DB_FILE=database.sqlite` : ``,
    engine !== 'sqlite' ? `DB_HOST=${dbHost}` : ``,
    engine !== 'sqlite' ? `DB_PORT=${dbPort}` : ``,
    engine !== 'sqlite' ? `DB_USER=${dbUser}` : ``,
    engine !== 'sqlite' ? `DB_PASSWORD=${dbPassword}` : ``,
    engine !== 'sqlite' ? `DB_NAME=${dbName}` : ``,
    `\n# Configuración de Seguridad y JWT`,
    `JWT_ACCESS_SECRET=cambiar_en_produccion_super_secreto_access_${Date.now()}`,
    `JWT_REFRESH_SECRET=cambiar_en_produccion_super_secreto_refresh_${Date.now()}`,
    `COOKIE_SECRET=cambiar_en_produccion_cookie_secret_${Date.now()}`,
    `SESSION_EXPIRES_DAYS=30`,
    `\n# Configuración de Plantillas y Correo Electrónico`,
    `SMTP_HOST=smtp.mailtrap.io`,
    `SMTP_PORT=2525`,
    `SMTP_USER=`,
    `SMTP_PASS=`,
    `MAIL_FROM_WELCOME="Bienvenido al Sistema <bienvenida@tudominio.com>"`,
    `MAIL_FROM_RESET="Seguridad y Recuperación <seguridad@tudominio.com>"`,
    `MAIL_FROM_ALERT="Alertas de Cuenta <alertas@tudominio.com>"`,
    `\n# Google OAuth (Opcional)`,
    `GOOGLE_CLIENT_ID=`,
    `GOOGLE_CLIENT_SECRET=`,
  ].filter(Boolean).join('\n');

  fs.writeFileSync(envPath, envContent, 'utf-8');
  console.log(`\nArchivo .env configurado correctamente.`);

  // Generar y ejecutar el DDL
  const sql = generateUsersTableSql({ engine, enableSoftDelete });
  console.log('\nEjecutando script de migración SQL...');

  process.env.DB_ENGINE = engine;
  process.env.DB_SOFT_DELETE = String(enableSoftDelete);
  if (engine === 'sqlite') process.env.DB_FILE = path.resolve(process.cwd(), 'database.sqlite');
  else {
    process.env.DB_HOST = dbHost;
    process.env.DB_PORT = dbPort;
    process.env.DB_USER = dbUser;
    process.env.DB_PASSWORD = dbPassword;
    process.env.DB_NAME = dbName;
  }

  try {
    const adapter = getDatabaseAdapter();
    // Ejecutar statements separados si aplica
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await adapter.execute(stmt);
    }
    await adapter.close();

    console.log('Migración ejecutada con éxito. Tabla "users" lista para operar.');
    console.log(`   - Motor: ${engine}`);
    console.log(`   - Borrado Lógico (Soft Delete): ${enableSoftDelete ? 'Habilitado (campo deleted_at)' : 'Deshabilitado (Borrado físico)'}\n`);
  } catch (err: any) {
    console.error('Error ejecutando la migración:', err.message);
  }
}

main().catch(console.error);
