import { ClassificationRuleModel } from '../models/classificationRule.model.js';

/**
 * Normaliza um texto para comparação fonética e gráfica:
 * 1. Decompõe caracteres acentuados usando forma NFD (Unicode Normalization Form D)
 * 2. Remove os diacríticos combinantes (faixa \u0300-\u036f)
 * 3. Converte para minúsculas
 * 4. Remove espaços em branco nas extremidades
 *
 * @param {string} text
 * @returns {string}
 */
export function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Classifica uma única transação ou descrição com base em uma lista de regras ordenadas.
 *
 * @param {Object|string} item Objeto de transação { description, ... } ou string de descrição
 * @param {Array<Object>} rules Lista de regras ativas pré-ordenadas por prioridade decrescente
 * @returns {Object} Dados de classificação { category, ruleId, matchedKeyword }
 */
export function classifyItem(item, rules = []) {
  const description = typeof item === 'string'
    ? item
    : (item && typeof item.description === 'string' ? item.description : '');

  const normDesc = normalizeText(description);

  if (!normDesc) {
    return {
      category: 'Outros',
      ruleId: null,
      matchedKeyword: null,
    };
  }

  for (const rule of rules) {
    if (!rule || !rule.active) continue;
    const keywords = Array.isArray(rule.keywords) ? rule.keywords : [];

    for (const kw of keywords) {
      const normKw = normalizeText(kw);
      if (normKw && normDesc.includes(normKw)) {
        return {
          category: rule.category,
          ruleId: rule.id,
          matchedKeyword: kw,
        };
      }
    }
  }

  // Fallback obrigatório quando nenhuma regra corresponder
  return {
    category: 'Outros',
    ruleId: null,
    matchedKeyword: null,
  };
}

/**
 * Classifica um lote de transações ou descrições.
 *
 * @param {Array<Object|string>} items Lista de transações ou strings
 * @param {Array<Object>|null} customRules Regras fornecidas ou null para buscar do modelo
 * @returns {Promise<Object>} { data, summary: { total, classified, fallbackCount } }
 */
export async function classifyBatch(items = [], customRules = null) {
  if (!Array.isArray(items)) {
    throw new TypeError('O parâmetro items deve ser um array.');
  }

  let activeRules = customRules;
  if (!activeRules) {
    activeRules = await ClassificationRuleModel.findAll({ activeOnly: true });
  } else {
    activeRules = activeRules
      .filter((r) => r && r.active)
      .sort((a, b) => (Number(b.priority) || 0) - (Number(a.priority) || 0));
  }

  let classifiedCount = 0;
  let fallbackCount = 0;

  const data = items.map((item, index) => {
    const isString = typeof item === 'string';
    const classification = classifyItem(item, activeRules);

    if (classification.ruleId !== null) {
      classifiedCount++;
    } else {
      fallbackCount++;
    }

    if (isString) {
      return {
        id: String(index + 1),
        description: item,
        category: classification.category,
        ruleId: classification.ruleId,
        matchedKeyword: classification.matchedKeyword,
      };
    }

    return {
      ...item,
      category: classification.category,
      ruleId: classification.ruleId,
      matchedKeyword: classification.matchedKeyword,
    };
  });

  return {
    data,
    summary: {
      total: items.length,
      classified: classifiedCount,
      fallbackCount,
    },
  };
}

export const classifierService = {
  normalizeText,
  classifyItem,
  classifyBatch,
};

export default classifierService;
