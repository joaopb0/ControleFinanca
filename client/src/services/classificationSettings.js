export function combineClassificationSettings(rules, preferences) {
  if (!Array.isArray(rules) || !Array.isArray(preferences)) throw new Error('A API retornou configurações em formato inválido.');
  return [
    ...preferences.map((preference) => ({ ...preference, id: `preference:${preference.id}`, preferenceId: preference.id,
      type: 'exact', name: preference.description, keywords: [], active: true })),
    ...rules.map((rule) => ({ ...rule, type: 'keywords' })),
  ];
}

export function groupCategoryPreferences(preferences, search = '') {
  const normalize = (value) => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
  const query = normalize(search);
  const groups = new Map();
  for (const preference of preferences) {
    let group = groups.get(preference.categoryId);
    if (!group) {
      group = { id: preference.categoryId, name: preference.category, total: 0, items: [] };
      groups.set(preference.categoryId, group);
    }
    group.total += 1;
    if (!query || normalize(preference.description).includes(query) || normalize(preference.category).includes(query)) group.items.push(preference);
  }
  return [...groups.values()].filter((group) => group.items.length)
    .map((group) => ({ ...group, items: [...group.items].sort((a, b) => a.description.localeCompare(b.description, 'pt-BR') || a.id.localeCompare(b.id)) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
