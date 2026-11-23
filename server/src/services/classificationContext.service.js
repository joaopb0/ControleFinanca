import { CategoryModel } from '../models/category.model.js';
import { CategoryPreferenceModel } from '../models/categoryPreference.model.js';
import { ClassificationRuleModel } from '../models/classificationRule.model.js';
import { normalizeText } from './classifier.service.js';

export function loadClassificationContext(userId) {
  return CategoryModel.transaction(userId, async (connection) => {
    const rules = await ClassificationRuleModel.findAll(userId, { activeOnly: true }, connection);
    const categories = await CategoryModel.findAll(userId, connection);
    const preferences = await CategoryPreferenceModel.findAll(userId, connection);
    const fallback = categories.find((category) => category.isFallback);
    if (!fallback) throw new Error('Categoria de fallback ausente.');
    return { rules, categories, fallback, preferences: new Map(preferences.map((preference) => [normalizeText(preference.description), preference])) };
  });
}
