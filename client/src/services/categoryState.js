export function reconcileCategories(transactions, categories) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const fallback = categories.find((category) => category.isFallback);
  if (!fallback) return transactions;
  return transactions.map((transaction) => {
    const category = byId.get(transaction.categoryId)
      || (!transaction.categoryId && categories.find((item) => item.name === transaction.category));
    return category
      ? { ...transaction, categoryId: category.id, category: category.name }
      : { ...transaction, categoryId: fallback.id, category: fallback.name, ruleId: null, matchedKeyword: null, preferenceId: null, manualOverride: false, isFallback: true };
  });
}

export function applyCategoryChoice(transactions, selected, category, remember, preferenceId = null) {
  return transactions.map((transaction) => {
    if (transaction.id !== selected.id) return transaction;
    // Toda escolha confirmada é individual, mesmo quando também salva um padrão.
    return { ...transaction, categoryId: category.id, category: category.name, manualOverride: true, ruleId: null, matchedKeyword: null, preferenceId: remember ? preferenceId : null, isFallback: false };
  });
}

export function removeTransaction(transactions, id) {
  if (!transactions.some((transaction) => transaction.id === id)) throw new Error('Lançamento não encontrado.');
  return transactions.filter((transaction) => transaction.id !== id);
}
