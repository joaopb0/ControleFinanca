// DDL MySQL faz commit implícito: cada passo é reexecutável após interrupção.
export async function migrateAuthentication(connection) {
  const [columns] = await connection.query('SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?, ?)', ['users', 'classification_rules']);
  const hasColumn = (table, column) => columns.some((row) => row.TABLE_NAME === table && row.COLUMN_NAME === column);
  const [duplicates] = await connection.query('SELECT COUNT(*) AS count FROM (SELECT LOWER(TRIM(email)) FROM users GROUP BY LOWER(TRIM(email)) HAVING COUNT(*) > 1) AS duplicates');
  if (Number(duplicates[0].count) > 0) throw new Error('MIGRATION_DUPLICATE_EMAIL: resolva e-mails legados duplicados antes de migrar.');
  if (!hasColumn('users', 'passwordHash')) await connection.query('ALTER TABLE users ADD COLUMN passwordHash VARCHAR(60) NULL');
  // Nenhuma credencial é atribuída a contas legadas.
  await connection.query('UPDATE users SET email = LOWER(TRIM(email)) WHERE BINARY email <> BINARY LOWER(TRIM(email))');
  if (!hasColumn('users', 'normalizedEmail')) await connection.query(`ALTER TABLE users ADD COLUMN normalizedEmail VARCHAR(255)
    GENERATED ALWAYS AS (LOWER(TRIM(email))) STORED, ADD UNIQUE KEY uq_users_normalized_email (normalizedEmail)`);
  if (!hasColumn('classification_rules', 'userId')) {
    // NULL é quarentena: regras antigas não têm proprietário verificável e não são expostas.
    await connection.query(`ALTER TABLE classification_rules ADD COLUMN userId VARCHAR(50) NULL,
      ADD INDEX idx_rules_user (userId, active, priority),
      ADD CONSTRAINT fk_rules_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE`);
  }
  await connection.query(`CREATE TABLE IF NOT EXISTS auth_sessions (
    id VARCHAR(50) PRIMARY KEY, userId VARCHAR(50) NOT NULL, expiresAt DATETIME NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_sessions_expiry (expiresAt),
    CONSTRAINT fk_session_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )`);
  await connection.query(`CREATE TABLE IF NOT EXISTS auth_rate_limits (
    bucket VARCHAR(64) PRIMARY KEY, attempts INT UNSIGNED NOT NULL, resetAt DATETIME NOT NULL,
    INDEX idx_auth_limit_expiry (resetAt)
  )`);
}
