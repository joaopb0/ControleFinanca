export async function migrateSpendingHistory(connection) {
  const [columns] = await connection.query('SHOW COLUMNS FROM user_categories');
  if (!columns.some((column) => column.Field === 'deletedAt')) await connection.query('ALTER TABLE user_categories ADD COLUMN deletedAt DATETIME NULL');
  const [indexes] = await connection.query('SHOW INDEX FROM user_categories');
  if (indexes.some((index) => index.Key_name === 'uq_category_name')) await connection.query('ALTER TABLE user_categories DROP INDEX uq_category_name');
  if (!columns.some((column) => column.Field === 'activeNameKey')) {
    await connection.query(`ALTER TABLE user_categories ADD COLUMN activeNameKey VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
      GENERATED ALWAYS AS (IF(deletedAt IS NULL, nameKey, NULL)) STORED`);
  }
  if (!indexes.some((index) => index.Key_name === 'uq_category_active_name')) await connection.query('ALTER TABLE user_categories ADD UNIQUE KEY uq_category_active_name (userId, activeNameKey)');
  await connection.query(`CREATE TABLE IF NOT EXISTS history_versions (
    userId VARCHAR(50) PRIMARY KEY, revision BIGINT UNSIGNED NOT NULL DEFAULT 0,
    CONSTRAINT fk_history_version_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )`);
  await connection.query(`CREATE TABLE IF NOT EXISTS history_contributions (
    id VARCHAR(50) NOT NULL, userId VARCHAR(50) NOT NULL, revision INT UNSIGNED NOT NULL,
    payloadHash CHAR(64) CHARACTER SET ascii NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (userId, id), CONSTRAINT fk_history_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )`);
  await connection.query(`CREATE TABLE IF NOT EXISTS history_entries (
    userId VARCHAR(50) NOT NULL, contributionId VARCHAR(50) NOT NULL, month CHAR(7) NOT NULL,
    categoryId VARCHAR(50) NOT NULL, categoryName VARCHAR(100) NOT NULL, color CHAR(7) NOT NULL,
    incomeCents BIGINT UNSIGNED NOT NULL, expenseCents BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (userId, contributionId, month, categoryId), INDEX idx_history_month (userId, month),
    CONSTRAINT fk_history_entry FOREIGN KEY (userId, contributionId) REFERENCES history_contributions(userId, id) ON DELETE CASCADE
  )`);
  // A categoria é uma referência histórica validada pelo service. Arquivá-la não apaga totais.
  await connection.query(`CREATE TABLE IF NOT EXISTS history_requests (
    userId VARCHAR(50) NOT NULL, requestId VARCHAR(50) NOT NULL, contributionId VARCHAR(50) NOT NULL,
    payloadHash CHAR(64) CHARACTER SET ascii NOT NULL, revision INT UNSIGNED NOT NULL,
    PRIMARY KEY (userId, requestId),
    CONSTRAINT fk_history_request FOREIGN KEY (userId, contributionId) REFERENCES history_contributions(userId, id) ON DELETE CASCADE
  )`);
}
