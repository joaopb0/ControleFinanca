import { classifierService } from '../services/classifier.service.js';
import { ClassificationRuleModel } from '../models/classificationRule.model.js';

const MAX_BATCH_SIZE = 5000;

export const classifierController = {
  /**
   * POST /api/classifier/classify
   * Classifica uma lista de transações ou descrições contra as regras ativas
   */
  classify: async (req, res, next) => {
    try {
      const { transactions, descriptions, customRules } = req.body || {};

      let items = null;
      if (Array.isArray(transactions)) {
        items = transactions;
      } else if (Array.isArray(descriptions)) {
        items = descriptions;
      }

      if (!items) {
        return res.status(400).json({
          success: false,
          error: {
            message: "O corpo da requisição deve conter um array 'transactions' ou 'descriptions'.",
          },
        });
      }

      if (items.length > MAX_BATCH_SIZE) {
        return res.status(400).json({
          success: false,
          error: {
            message: `O limite máximo por lote é de ${MAX_BATCH_SIZE} itens para proteção de processamento.`,
          },
        });
      }

      const result = await classifierService.classifyBatch(items, customRules);

      return res.status(200).json({
        success: true,
        data: result.data,
        summary: result.summary,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/classifier/test
   * Testa uma única descrição contra as regras ativas
   */
  testMatch: async (req, res, next) => {
    try {
      const { description } = req.body || {};

      if (description === undefined || description === null || typeof description !== 'string') {
        return res.status(400).json({
          success: false,
          error: {
            message: "O campo 'description' é obrigatório e deve ser uma string.",
          },
        });
      }

      const activeRules = await ClassificationRuleModel.findAll({ activeOnly: true });
      const classification = classifierService.classifyItem(description, activeRules);

      const matchedRule = classification.ruleId
        ? activeRules.find((r) => r.id === classification.ruleId)
        : null;

      return res.status(200).json({
        success: true,
        data: {
          description,
          category: classification.category,
          ruleId: classification.ruleId,
          matchedKeyword: classification.matchedKeyword,
          matchedRuleName: matchedRule ? matchedRule.name : null,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};

export default classifierController;
