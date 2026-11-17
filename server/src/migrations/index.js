import { migrateAuthentication } from './001-authentication.js';

export async function runMigrations(connection) {
  const [lock] = await connection.query("SELECT GET_LOCK(CONCAT(DATABASE(), ':migrations'), 30) AS acquired");
  if (Number(lock[0].acquired) !== 1) throw new Error('MIGRATION_LOCK_TIMEOUT');
  try {
    await connection.query('CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(100) PRIMARY KEY, appliedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)');
    const [rows] = await connection.query('SELECT version FROM schema_migrations WHERE version = ?', ['001-authentication']);
    if (!rows.length) {
      await migrateAuthentication(connection);
      await connection.query('INSERT INTO schema_migrations (version) VALUES (?)', ['001-authentication']);
    }
  } finally { await connection.query("SELECT RELEASE_LOCK(CONCAT(DATABASE(), ':migrations'))"); }
}
