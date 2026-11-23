export const DEFAULT_CATEGORIES = [
  { key: 'housing', name: 'Moradia', color: '#f97316' },
  { key: 'food', name: 'Alimentação', color: '#eab308' },
  { key: 'transport', name: 'Transporte', color: '#06b6d4' },
  { key: 'leisure', name: 'Lazer', color: '#a855f7' },
  { key: 'bills', name: 'Contas', color: '#64748b' },
  { key: 'health', name: 'Saúde', color: '#ef4444' },
  { key: 'income', name: 'Receita', color: '#10b981' },
  { key: 'fallback', name: 'Outros', color: '#94a3b8' },
];

export function normalizeCategoryName(name) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}
