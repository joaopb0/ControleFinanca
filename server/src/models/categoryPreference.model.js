import { createHash, randomUUID } from 'node:crypto';
import { requireCategoryUser } from './category.model.js';
import { normalizeText } from '../utils/normalizeText.js';

export function descriptionHash(description) {
  return createHash('sha256').update(normalizeText(description)).digest('hex');
}

export const CategoryPreferenceModel = {
  async findById(userId, id, connection) {
    requireCategoryUser(userId);
    const [rows] = await connection.query(`SELECT p.id, p.description, p.categoryId, c.name AS category
      FROM category_preferences p JOIN user_categories c ON c.id = p.categoryId AND c.userId = p.userId
      WHERE p.userId = ? AND p.id = ? AND c.deletedAt IS NULL`, [userId, id]);
    return rows[0] || null;
  },
  async updateCategory(userId, id, categoryId, connection) {
    requireCategoryUser(userId);
    await connection.query('UPDATE category_preferences SET categoryId = ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ? AND id = ?', [categoryId, userId, id]);
    return CategoryPreferenceModel.findById(userId, id, connection);
  },
  async remove(userId, id, connection) {
    requireCategoryUser(userId);
    const [result] = await connection.query('DELETE FROM category_preferences WHERE userId = ? AND id = ?', [userId, id]);
    return result.affectedRows > 0;
  },
  async findByDescription(userId, description, connection) {
    requireCategoryUser(userId);
    const [rows] = await connection.query(`SELECT p.id, p.description, p.categoryId, c.name AS category
      FROM category_preferences p JOIN user_categories c ON c.id = p.categoryId AND c.userId = p.userId
      WHERE p.userId = ? AND p.descriptionHash = ? AND c.deletedAt IS NULL`, [userId, descriptionHash(description)]);
    return rows[0] || null;
  },
  async findAll(userId, connection) {
    requireCategoryUser(userId);
    const [rows] = await connection.query(`SELECT p.id, p.description, p.categoryId, c.name AS category
      FROM category_preferences p JOIN user_categories c ON c.id = p.categoryId AND c.userId = p.userId WHERE p.userId = ? AND c.deletedAt IS NULL`, [userId]);
    return rows;
  },
  async save(userId, { description, categoryId }, connection) {
    requireCategoryUser(userId);
    await connection.query(`INSERT INTO category_preferences (id, userId, categoryId, description, descriptionHash) VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), description = VALUES(description), updatedAt = CURRENT_TIMESTAMP`,
    [randomUUID(), userId, categoryId, description.trim(), descriptionHash(description)]);
    const [rows] = await connection.query('SELECT id FROM category_preferences WHERE userId = ? AND descriptionHash = ?', [userId, descriptionHash(description)]);
    return rows[0];
  },
};
