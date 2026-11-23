import { randomUUID } from 'node:crypto';
import { DEFAULT_CATEGORIES, normalizeCategoryName } from '../config/categories.js';

// A migração não depende do model atual, que pode exigir colunas de versões futuras.
async function resolveCategory(connection, userId, name, defaults = {}) {
  const [rows] = await connection.query('SELECT id, name FROM user_categories WHERE userId = ? AND nameKey = ?', [userId, normalizeCategoryName(name)]);
  if (rows[0]) return rows[0];
  const id = randomUUID();
  await connection.query('INSERT INTO user_categories (id, userId, name, nameKey, color, systemKey) VALUES (?, ?, ?, ?, ?, ?)',
    [id, userId, name, normalizeCategoryName(name), defaults.color || '#94a3b8', defaults.key || null]);
  return { id, name };
}

// DDL reexecutável; backfill transacional antes de registrar a versão.
export async function migrateUserCategories(connection) {
  await connection.query(`CREATE TABLE IF NOT EXISTS user_categories (
    id VARCHAR(50) PRIMARY KEY, userId VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL, nameKey VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    color CHAR(7) NOT NULL, systemKey VARCHAR(20) NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_category_user_id (userId, id), UNIQUE KEY uq_category_name (userId, nameKey),
    UNIQUE KEY uq_category_system (userId, systemKey),
    CONSTRAINT fk_category_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )`);
  const [columns] = await connection.query("SHOW COLUMNS FROM classification_rules LIKE 'categoryId'");
  if (!columns.length) {
    await connection.query(`ALTER TABLE classification_rules ADD COLUMN categoryId VARCHAR(50) NULL,
      ADD INDEX idx_rule_category (userId, categoryId),
      ADD CONSTRAINT fk_rule_category FOREIGN KEY (userId, categoryId) REFERENCES user_categories(userId, id) ON DELETE CASCADE`);
  }
  await connection.query(`CREATE TABLE IF NOT EXISTS category_preferences (
    id VARCHAR(50) PRIMARY KEY, userId VARCHAR(50) NOT NULL, categoryId VARCHAR(50) NOT NULL,
    description TEXT NOT NULL, descriptionHash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_preference_description (userId, descriptionHash),
    CONSTRAINT fk_preference_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_preference_category FOREIGN KEY (userId, categoryId) REFERENCES user_categories(userId, id) ON DELETE CASCADE
  )`);
  await connection.beginTransaction();
  try {
    const [users] = await connection.query('SELECT id FROM users ORDER BY id FOR UPDATE');
    for (const user of users) {
      for (const category of DEFAULT_CATEGORIES) await resolveCategory(connection, user.id, category.name, category);
      const [rules] = await connection.query('SELECT id, category FROM classification_rules WHERE userId = ? AND categoryId IS NULL', [user.id]);
      for (const rule of rules) {
        const category = await resolveCategory(connection, user.id, rule.category);
        await connection.query('UPDATE classification_rules SET categoryId = ?, category = ? WHERE userId = ? AND id = ?', [category.id, category.name, user.id, rule.id]);
      }
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}
