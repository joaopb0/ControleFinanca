import { CategoryModel } from '../models/category.model.js';
import { CategoryPreferenceModel } from '../models/categoryPreference.model.js';
import { normalizeCategoryName } from '../config/categories.js';
import { normalizeText } from '../utils/normalizeText.js';

const fail = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }); };

function validateDescription(body) {
  if (typeof body?.description !== 'string' || !normalizeText(body.description) || body.description.length > 4000) fail(400, 'Informe uma descrição de até 4000 caracteres.');
  return body.description;
}

export function validateCategory(body) {
  if (typeof body?.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 100) fail(400, 'O nome deve conter entre 2 e 100 caracteres.');
  if (typeof body.color !== 'string' || !/^#[a-f0-9]{6}$/i.test(body.color)) fail(400, 'Informe uma cor hexadecimal válida.');
  return { name: body.name.trim(), color: body.color.toLowerCase() };
}

async function mutation(userId, operation) {
  try { return await CategoryModel.transaction(userId, operation); }
  catch (error) {
    if (error.code === 'ER_DUP_ENTRY') fail(409, 'Já existe uma categoria com esse nome.');
    throw error;
  }
}

export const categoryService = {
  listPreferences(userId) {
    return CategoryModel.transaction(userId, (connection) => CategoryPreferenceModel.findAll(userId, connection));
  },
  updatePreference(userId, id, body) {
    if (typeof body?.categoryId !== 'string' || !body.categoryId) fail(400, 'Informe uma categoria.');
    return mutation(userId, async (connection) => {
      if (!await CategoryPreferenceModel.findById(userId, id, connection)) fail(404, 'Padrão pessoal não encontrado.');
      const category = await CategoryModel.findById(userId, body.categoryId, connection);
      if (!category) fail(404, 'Categoria não encontrada nesta conta.');
      return CategoryPreferenceModel.updateCategory(userId, id, category.id, connection);
    });
  },
  removePreference(userId, id) {
    return mutation(userId, async (connection) => {
      if (!await CategoryPreferenceModel.remove(userId, id, connection)) fail(404, 'Padrão pessoal não encontrado.');
      return { id };
    });
  },
  list: (userId) => CategoryModel.findAll(userId),
  create(userId, body) {
    const fields = validateCategory(body);
    return mutation(userId, (connection) => CategoryModel.create(userId, fields, connection));
  },
  update(userId, id, body) {
    const fields = validateCategory(body);
    return mutation(userId, async (connection) => {
      if (!await CategoryModel.findById(userId, id, connection)) fail(404, 'Categoria não encontrada.');
      await connection.query('UPDATE user_categories SET name = ?, nameKey = ?, color = ? WHERE userId = ? AND id = ?',
        [fields.name, normalizeCategoryName(fields.name), fields.color, userId, id]);
      // Mantém o contrato anterior (category como texto) durante a transição.
      await connection.query('UPDATE classification_rules SET category = ? WHERE userId = ? AND categoryId = ?', [fields.name, userId, id]);
      return CategoryModel.findById(userId, id, connection);
    });
  },
  remove(userId, id) {
    return mutation(userId, async (connection) => {
      const category = await CategoryModel.findById(userId, id, connection);
      if (!category) fail(404, 'Categoria não encontrada.');
      if (category.isFallback) fail(400, 'A categoria de fallback não pode ser excluída.');
      await connection.query('DELETE FROM classification_rules WHERE userId = ? AND categoryId = ?', [userId, id]);
      await connection.query('DELETE FROM category_preferences WHERE userId = ? AND categoryId = ?', [userId, id]);
      await connection.query('UPDATE user_categories SET deletedAt = UTC_TIMESTAMP() WHERE userId = ? AND id = ?', [userId, id]);
      return { id };
    });
  },
  savePreference(userId, body) {
    validateDescription(body);
    if (typeof body.categoryId !== 'string') fail(400, 'Informe uma categoria.');
    return mutation(userId, async (connection) => {
      const category = await CategoryModel.findById(userId, body.categoryId, connection);
      if (!category) fail(404, 'Categoria não encontrada nesta conta.');
      const preference = await CategoryPreferenceModel.save(userId, body, connection);
      return { id: preference.id, description: body.description.trim(), categoryId: category.id, category: category.name };
    });
  },
  getPreference(userId, body) {
    const description = validateDescription(body);
    return CategoryModel.transaction(userId, (connection) => CategoryPreferenceModel.findByDescription(userId, description, connection));
  },
};
