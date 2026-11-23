import { migrateAuthentication } from './001-authentication.js';
import { migrateUserCategories } from './002-user-categories.js';
import { migrateSpendingHistory } from './003-spending-history.js';

export async function runMigrations(connection) {
  const [lock] = await connection.query("SELECT GET_LOCK(CONCAT(DATABASE(), ':migrations'), 30) AS acquired");
  if (Number(lock[0].acquired) !== 1) throw new Error('MIGRATION_LOCK_TIMEOUT');
  try {
    await connection.query('CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(100) PRIMARY KEY, appliedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)');
    for (const [version, migrate] of [['001-authentication', migrateAuthentication], ['002-user-categories', migrateUserCategories], ['003-spending-history', migrateSpendingHistory]]) {
      const [rows] = await connection.query('SELECT version FROM schema_migrations WHERE version = ?', [version]);
      if (!rows.length) {
        await migrate(connection);
        await connection.query('INSERT INTO schema_migrations (version) VALUES (?)', [version]);
      }
    }
  } finally { await connection.query("SELECT RELEASE_LOCK(CONCAT(DATABASE(), ':migrations'))"); }
}
