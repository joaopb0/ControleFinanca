export const DEFAULT_CATEGORY_COLORS = {
  Receita: '#10b981',
  Moradia: '#f97316',
  Alimentação: '#eab308',
  Transporte: '#06b6d4',
  Lazer: '#a855f7',
  Contas: '#64748b',
  Saúde: '#ef4444',
  Outros: '#94a3b8',
};

/**
 * Arredonda um número para 2 casas decimais usando deslocamento exponencial decimal simétrico
 * (round half away from zero / arredondamento comercial), evitando problemas de precisão IEEE 754.
 *
 * @param {number|string} num
 * @returns {number}
 */
export const round2 = (num) => {
  if (num === null || num === undefined || num === '') return 0;
  const n = Number(num);
  if (!Number.isFinite(n)) return 0;
  const sign = n < 0 ? -1 : 1;
  const abs = Math.abs(n);
  const [mantissa, exp = '0'] = abs.toString().split('e');
  const shifted = Math.round(Number(`${mantissa}e${Number(exp) + 2}`));
  const [sMantissa, sExp = '0'] = shifted.toString().split('e');
  const result = Number(`${sMantissa}e${Number(sExp) - 2}`);
  return (sign * result) || 0;
};

/**
 * Normaliza qualquer data suportada (ISO 'YYYY-MM-DD' ou brasileira 'DD/MM/YYYY') para 'YYYY-MM-DD'.
 *
 * @param {string} dateStr
 * @returns {string|null}
 */
export function normalizeDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();

  // Formato DD/MM/YYYY ou D/M/YYYY
  const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Formato ISO YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

/**
 * Gera o resumo consolidado com métricas financeiras e detalhamento por categoria.
 *
 * @param {Array<Object>} transactions Lista de transações
 * @param {Object} options Filtros { startDate, endDate, customColors }
 * @returns {Object} Resumo com period, totals, categoryBreakdown e filteredTransactions
 */
export function generateSummary(transactions = [], options = {}) {
  if (!Array.isArray(transactions)) {
    throw new TypeError('O parâmetro transactions deve ser um array.');
  }

  const { startDate, endDate, customColors = {} } = options;
  const normStart = startDate ? normalizeDate(startDate) : null;
  const normEnd = endDate ? normalizeDate(endDate) : null;

  if (normStart && normEnd && normStart > normEnd) {
    const err = new Error('A data inicial (startDate) não pode ser posterior à data final (endDate).');
    err.statusCode = 400;
    throw err;
  }

  // 1. Filtragem por data
  const filtered = transactions.filter((item) => {
    if (!item) return false;
    const itemDate = normalizeDate(item.date);
    if (!itemDate) return true;

    if (normStart && itemDate < normStart) return false;
    if (normEnd && itemDate > normEnd) return false;
    return true;
  });

  // 2. Determinação do período resultante
  let effectiveStart = normStart;
  let effectiveEnd = normEnd;

  if (!effectiveStart || !effectiveEnd) {
    const validDates = filtered
      .map((t) => normalizeDate(t.date))
      .filter(Boolean)
      .sort();

    if (validDates.length > 0) {
      if (!effectiveStart) effectiveStart = validDates[0];
      if (!effectiveEnd) effectiveEnd = validDates[validDates.length - 1];
    }
  }

  // 3. Agregação dos totais
  let totalIncome = 0;
  let totalExpenses = 0;
  const categoryMap = new Map();

  for (const tx of filtered) {
    const rawVal = Number(tx.value) || 0;
    const category = (tx.category && typeof tx.category === 'string' && tx.category.trim())
      ? tx.category.trim()
      : 'Outros';

    if (rawVal > 0) {
      totalIncome = round2(totalIncome + rawVal);
    } else if (rawVal < 0) {
      totalExpenses = round2(totalExpenses + Math.abs(rawVal));
    }

    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        category,
        rawSum: 0,
        count: 0,
        positiveSum: 0,
        negativeSum: 0,
      });
    }

    const catData = categoryMap.get(category);
    catData.rawSum = round2(catData.rawSum + rawVal);
    catData.count += 1;
    if (rawVal > 0) catData.positiveSum = round2(catData.positiveSum + rawVal);
    if (rawVal < 0) catData.negativeSum = round2(catData.negativeSum + Math.abs(rawVal));
  }

  const netBalance = round2(totalIncome - totalExpenses);
  const colors = { ...DEFAULT_CATEGORY_COLORS, ...customColors };

  // 4. Detalhamento e cálculo de percentuais por categoria
  const categoryBreakdown = [];

  for (const [category, data] of categoryMap.entries()) {
    const isIncome = data.rawSum > 0 || (data.rawSum === 0 && data.positiveSum > 0);
    const type = isIncome ? 'income' : 'expense';
    const amount = round2(Math.abs(data.rawSum));

    let percentage = 0;
    if (type === 'income' && totalIncome > 0) {
      percentage = round2((amount / totalIncome) * 100);
    } else if (type === 'expense' && totalExpenses > 0) {
      percentage = round2((amount / totalExpenses) * 100);
    }

    categoryBreakdown.push({
      category,
      type,
      amount,
      percentage,
      count: data.count,
      color: colors[category] || '#94a3b8',
    });
  }

  // Ordenar: despesas maiores primeiro, depois receitas maiores
  categoryBreakdown.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'expense' ? -1 : 1;
    }
    return b.amount - a.amount;
  });

  return {
    period: {
      startDate: effectiveStart || null,
      endDate: effectiveEnd || null,
    },
    totals: {
      income: totalIncome,
      expenses: totalExpenses,
      netBalance,
      transactionCount: filtered.length,
    },
    categoryBreakdown,
    filteredTransactions: filtered,
  };
}

export const reportService = {
  DEFAULT_CATEGORY_COLORS,
  round2,
  normalizeDate,
  generateSummary,
};

export default reportService;
