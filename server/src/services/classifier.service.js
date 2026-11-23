
import { normalizeText } from '../utils/normalizeText.js';
export { normalizeText } from '../utils/normalizeText.js';

/**
 * Classifica uma única transação ou descrição com base em uma lista de regras ordenadas.
 *
 * @param {Object|string} item Objeto de transação { description, ... } ou string de descrição
 * @param {Array<Object>} rules Lista de regras ativas pré-ordenadas por prioridade decrescente
 * @returns {Object} Dados de classificação { category, ruleId, matchedKeyword }
 */
export function classifyItem(item, rules = [], { preferences = new Map(), fallback = null } = {}) {
  const description = typeof item === 'string'
    ? item
    : (item && typeof item.description === 'string' ? item.description : '');

  const normDesc = normalizeText(description);
  const fallbackResult = { category: fallback?.name || 'Outros', ...(fallback && { categoryId: fallback.id }), ruleId: null, matchedKeyword: null, isFallback: true };
  const preference = preferences.get(normDesc);
  if (preference) return { category: preference.category, categoryId: preference.categoryId, ruleId: null, matchedKeyword: null, preferenceId: preference.id, isFallback: false };

  if (!normDesc) {
    return fallbackResult;
  }

  for (const rule of rules) {
    if (!rule || !rule.active) continue;
    const keywords = Array.isArray(rule.keywords) ? rule.keywords : [];

    for (const kw of keywords) {
      const normKw = normalizeText(kw);
      if (normKw && normDesc.includes(normKw)) {
        return {
          category: rule.category,
          ...(rule.categoryId && { categoryId: rule.categoryId }),
          ruleId: rule.id,
          matchedKeyword: kw,
          isFallback: false,
        };
      }
    }
  }

  // Fallback obrigatório quando nenhuma regra corresponder
  return fallbackResult;
}

/**
 * Classifica um lote de transações ou descrições.
 *
 * @param {Array<Object|string>} items Lista de transações ou strings
 * @param {Array<Object>} customRules Regras explícitas, obtidas pelo controller com a identidade da sessão
 * @returns {Promise<Object>} { data, summary: { total, classified, fallbackCount } }
 */
export async function classifyBatch(items = [], customRules = [], options = {}) {
  if (!Array.isArray(items)) {
    throw new TypeError('O parâmetro items deve ser um array.');
  }

  if (!Array.isArray(customRules)) throw new TypeError('As regras devem ser fornecidas explicitamente.');
  const activeRules = customRules.filter((r) => r && r.active)
    .sort((a, b) => (Number(b.priority) || 0) - (Number(a.priority) || 0));

  let classifiedCount = 0;
  let fallbackCount = 0;

  const data = items.map((item, index) => {
    const isString = typeof item === 'string';
    // Exceções manuais pertencem somente ao extrato aberto, nunca à importação.
    const manualCategory = options.categories?.find((category) => category.id === item?.categoryId);
    const classification = item?.manualOverride && (!options.categories || manualCategory)
      ? { category: manualCategory?.name || item.category, categoryId: item.categoryId, ruleId: null, matchedKeyword: null, isFallback: false }
      : classifyItem(item, activeRules, options);

    if (!classification.isFallback) {
      classifiedCount++;
    } else {
      fallbackCount++;
    }

    if (isString) {
      return {
        id: String(index + 1),
        description: item,
        ...classification,
      };
    }

    return {
      ...item,
      ...classification,
      preferenceId: classification.preferenceId ?? null,
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
