import { ClassificationRuleModel } from '../models/classificationRule.model.js';

function parseKeywords(input) {
  if (Array.isArray(input)) {
    return input.map((k) => String(k).trim()).filter((k) => k.length > 0);
  }
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
  }
  return [];
}

export const classificationRuleController = {
  /**
   * GET /api/classification-rules
   * Lista todas as regras de classificação com filtros opcionais
   */
  getAll: async (req, res, next) => {
    try {
      const activeOnly = req.query.active === 'true';
      const category = req.query.category || null;

      const rules = await ClassificationRuleModel.findAll({ activeOnly, category });
      return res.status(200).json({
        success: true,
        count: rules.length,
        data: rules,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/classification-rules/:id
   * Busca uma regra pelo ID
   */
  getById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const rule = await ClassificationRuleModel.findById(id);

      if (!rule) {
        return res.status(404).json({
          success: false,
          error: {
            message: `Regra de classificação com ID ${id} não foi encontrada.`,
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: rule,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/classification-rules
   * Cria uma nova regra de classificação
   */
  create: async (req, res, next) => {
    try {
      const { name, category, keywords, priority, active } = req.body || {};

      const cleanName = typeof name === 'string' ? name.trim() : '';
      const cleanCategory = typeof category === 'string' ? category.trim() : '';
      const cleanKeywords = parseKeywords(keywords);

      if (!cleanName || cleanName.length < 2 || !cleanCategory || cleanCategory.length < 2 || cleanKeywords.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Campos obrigatórios inválidos: 'name', 'category' e 'keywords' (com pelo menos uma palavra-chave) são obrigatórios.",
          },
        });
      }

      const numPriority = priority !== undefined ? Number(priority) : 0;
      const boolActive = active !== undefined ? Boolean(active) : true;

      const newRule = await ClassificationRuleModel.create({
        name: cleanName,
        category: cleanCategory,
        keywords: cleanKeywords,
        priority: isNaN(numPriority) ? 0 : numPriority,
        active: boolActive,
      });

      return res.status(201).json({
        success: true,
        message: 'Regra de classificação criada com sucesso!',
        data: newRule,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/classification-rules/:id
   * Atualiza uma regra de classificação existente
   */
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const existing = await ClassificationRuleModel.findById(id);

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: {
            message: `Regra de classificação com ID ${id} não foi encontrada.`,
          },
        });
      }

      const { name, category, keywords, priority, active } = req.body || {};
      const updates = {};

      if (name !== undefined) {
        const cleanName = String(name).trim();
        if (cleanName.length < 2) {
          return res.status(400).json({
            success: false,
            error: { message: "O campo 'name' deve conter pelo menos 2 caracteres." },
          });
        }
        updates.name = cleanName;
      }

      if (category !== undefined) {
        const cleanCategory = String(category).trim();
        if (cleanCategory.length < 2) {
          return res.status(400).json({
            success: false,
            error: { message: "O campo 'category' deve conter pelo menos 2 caracteres." },
          });
        }
        updates.category = cleanCategory;
      }

      if (keywords !== undefined) {
        const cleanKeywords = parseKeywords(keywords);
        if (cleanKeywords.length === 0) {
          return res.status(400).json({
            success: false,
            error: { message: "O campo 'keywords' deve conter pelo menos uma palavra-chave válida." },
          });
        }
        updates.keywords = cleanKeywords;
      }

      if (priority !== undefined) {
        const numPriority = Number(priority);
        updates.priority = isNaN(numPriority) ? 0 : numPriority;
      }

      if (active !== undefined) {
        updates.active = Boolean(active);
      }

      const updatedRule = await ClassificationRuleModel.update(id, updates);

      return res.status(200).json({
        success: true,
        message: 'Regra de classificação atualizada com sucesso!',
        data: updatedRule,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/classification-rules/:id
   * Exclui uma regra de classificação
   */
  delete: async (req, res, next) => {
    try {
      const { id } = req.params;
      const deleted = await ClassificationRuleModel.delete(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: {
            message: `Regra com ID ${id} não encontrada para exclusão.`,
          },
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Regra de classificação excluída com sucesso.',
        data: { id },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/classification-rules/reset
   * Restaura o conjunto de regras para o seed inicial
   */
  resetDefaults: async (req, res, next) => {
    try {
      const resetRules = await ClassificationRuleModel.resetToDefaults();
      return res.status(200).json({
        success: true,
        message: 'Regras de classificação restauradas para o padrão inicial.',
        data: resetRules,
      });
    } catch (error) {
      next(error);
    }
  },
};

export default classificationRuleController;
