import { randomUUID } from 'node:crypto';
import { getDbPool } from '../config/database.js';
import { DEFAULT_CATEGORIES, normalizeCategoryName } from '../config/categories.js';

const columns = 'id, name, color, systemKey, deletedAt';
const format = (row) => row ? { ...row, isFallback: row.systemKey === 'fallback' } : null;

export function requireCategoryUser(userId) {
  if (typeof userId !== 'string' || !userId) throw new TypeError('A identidade autenticada é obrigatória para acessar categorias.');
}

export const CategoryModel = {
  async transaction(userId, operation) {
    requireCategoryUser(userId);
    const connection = await getDbPool().getConnection();
    try {
      await connection.beginTransaction();
      // Serializa catálogo, regras e preferências de uma mesma conta.
      const [users] = await connection.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [userId]);
      if (!users.length) throw Object.assign(new Error('Conta não encontrada.'), { statusCode: 404 });
      const result = await operation(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }
  },
  async findAll(userId, connection = getDbPool(), { includeDeleted = false } = {}) {
    requireCategoryUser(userId);
    const [rows] = await connection.query(`SELECT ${columns} FROM user_categories WHERE userId = ? ${includeDeleted ? '' : 'AND deletedAt IS NULL'} ORDER BY createdAt, name`, [userId]);
    return rows.map(format);
  },
  async findById(userId, id, connection = getDbPool(), { includeDeleted = false } = {}) {
    requireCategoryUser(userId);
    const [rows] = await connection.query(`SELECT ${columns} FROM user_categories WHERE userId = ? AND id = ? ${includeDeleted ? '' : 'AND deletedAt IS NULL'}`, [userId, id]);
    return format(rows[0]);
  },
  async findByName(userId, name, connection, { includeDeleted = false } = {}) {
    requireCategoryUser(userId);
    const [rows] = await connection.query(`SELECT ${columns} FROM user_categories WHERE userId = ? AND nameKey = ? ${includeDeleted ? '' : 'AND deletedAt IS NULL'} ORDER BY deletedAt DESC`, [userId, normalizeCategoryName(name)]);
    return format(rows[0]);
  },
  async create(userId, { name, color = '#94a3b8', systemKey = null }, connection) {
    requireCategoryUser(userId);
    const existing = await CategoryModel.findByName(userId, name, connection, { includeDeleted: true });
    if (existing?.deletedAt && !await CategoryModel.findByName(userId, name, connection)) {
      await connection.query('UPDATE user_categories SET deletedAt = NULL, name = ?, color = ? WHERE userId = ? AND id = ?', [name.trim(), color, userId, existing.id]);
      return CategoryModel.findById(userId, existing.id, connection);
    }
    const id = randomUUID();
    await connection.query('INSERT INTO user_categories (id, userId, name, nameKey, color, systemKey) VALUES (?, ?, ?, ?, ?, ?)',
      [id, userId, name.trim(), normalizeCategoryName(name), color, systemKey]);
    return CategoryModel.findById(userId, id, connection);
  },
  async resolve(userId, { categoryId, category }, connection) {
    requireCategoryUser(userId);
    if (categoryId !== undefined) {
      const found = typeof categoryId === 'string' && await CategoryModel.findById(userId, categoryId, connection);
      if (!found) throw Object.assign(new Error('Categoria não encontrada nesta conta.'), { statusCode: 404 });
      return found;
    }
    // Compatibilidade com clientes anteriores, que enviavam apenas o nome.
    if (typeof category !== 'string' || category.trim().length < 2 || category.trim().length > 100) {
      throw Object.assign(new Error('Informe uma categoria válida (2 a 100 caracteres).'), { statusCode: 400 });
    }
    return await CategoryModel.findByName(userId, category, connection)
      || CategoryModel.create(userId, { name: category }, connection);
  },
  async seedForUser(connection, userId) {
    requireCategoryUser(userId);
    const categories = await CategoryModel.findAll(userId, connection, { includeDeleted: true });
    for (const defaults of DEFAULT_CATEGORIES) {
      const saved = categories.find((category) => category.systemKey === defaults.key);
      if (saved) {
        if (saved.deletedAt) {
          let name = saved.name;
          let suffix = 1;
          while (await CategoryModel.findByName(userId, name, connection)) name = `${saved.name} (padrão ${suffix++})`;
          await connection.query('UPDATE user_categories SET deletedAt = NULL, name = ?, nameKey = ? WHERE userId = ? AND id = ?', [name, normalizeCategoryName(name), userId, saved.id]);
        }
        continue;
      }
      const existing = await CategoryModel.findByName(userId, defaults.name, connection);
      if (existing && !existing.systemKey) {
        await connection.query('UPDATE user_categories SET systemKey = ? WHERE userId = ? AND id = ?', [defaults.key, userId, existing.id]);
      } else {
        let name = defaults.name;
        let suffix = 1;
        while (await CategoryModel.findByName(userId, name, connection)) name = `${defaults.name} (padrão ${suffix++})`;
        await CategoryModel.create(userId, { ...defaults, name, systemKey: defaults.key }, connection);
      }
    }
  },
};
