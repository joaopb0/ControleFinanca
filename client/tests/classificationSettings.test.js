import test from 'node:test';
import assert from 'node:assert/strict';
import { combineClassificationSettings, groupCategoryPreferences } from '../src/services/classificationSettings.js';

test('listagem inclui preferências antigas sem tratá-las como palavras-chave', () => {
  const preference = { id: 'same-id', description: 'Mercado Central', categoryId: 'personal', category: 'Lazer' };
  const rule = { id: 'same-id', name: 'Mercados', categoryId: 'food', keywords: ['mercado'], priority: 20, active: true };
  const [exact, keywords] = combineClassificationSettings([rule], [preference]);
  assert.equal(exact.type, 'exact');
  assert.equal(exact.preferenceId, preference.id);
  assert.equal(exact.name, preference.description);
  assert.equal(exact.categoryId, 'personal');
  assert.equal(exact.active, true);
  assert.deepEqual(exact.keywords, []);
  assert.equal(keywords.type, 'keywords');
  assert.deepEqual(keywords.keywords, ['mercado']);
  assert.notEqual(exact.id, keywords.id);
  assert.equal(preference.type, undefined);
  assert.equal(rule.type, undefined);
});

test('agrupa por identificador de categoria, preservando todos os padrões individuais', () => {
  const preferences = [
    { id: '3', categoryId: 'food', category: 'Alimentação', description: 'Padaria' },
    { id: '1', categoryId: 'food', category: 'Alimentação', description: 'Mercado' },
    { id: '2', categoryId: 'leisure', category: 'Lazer', description: 'Mercado' },
  ];
  const groups = groupCategoryPreferences(preferences);
  assert.deepEqual(groups.map(({ id, total }) => ({ id, total })), [{ id: 'food', total: 2 }, { id: 'leisure', total: 1 }]);
  assert.deepEqual(groups[0].items.map(({ id }) => id), ['1', '3']);
  assert.equal(preferences[0].id, '3');
  assert.equal(groups.flatMap(({ items }) => items).length, 3);
});

test('busca em todas as descrições e categorias ignora acentos e mantém contagem total', () => {
  const preferences = [
    { id: '1', categoryId: 'food', category: 'Alimentação', description: 'Café Central' },
    { id: '2', categoryId: 'food', category: 'Alimentação', description: 'Mercado' },
    { id: '3', categoryId: 'leisure', category: 'Lazer', description: 'CAFÉ DA PRAÇA' },
  ];
  const groups = groupCategoryPreferences(preferences, '  cafe ');
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.map(({ total, items }) => [total, items.length]), [[2, 1], [1, 1]]);
  assert.equal(groupCategoryPreferences(preferences, 'alimentacao')[0].items.length, 2);
  assert.deepEqual(groupCategoryPreferences(preferences, 'inexistente'), []);
  assert.deepEqual(groupCategoryPreferences([]), []);
});

test('editar categoria e excluir padrão atualiza grupos sem alterar outros registros', () => {
  const preferences = [
    { id: '1', categoryId: 'food', category: 'Alimentação', description: 'Mercado' },
    { id: '2', categoryId: 'food', category: 'Alimentação', description: 'Padaria' },
  ];
  const moved = preferences.map((item) => item.id === '1' ? { ...item, categoryId: 'leisure', category: 'Lazer' } : item);
  assert.deepEqual(groupCategoryPreferences(moved).map(({ total }) => total), [1, 1]);
  const remaining = groupCategoryPreferences(moved.filter(({ id }) => id !== '1'));
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].items[0].id, '2');
});

test('lista vazia é distinta de resposta inválida', () => {
  assert.deepEqual(combineClassificationSettings([], []), []);
  for (const [rules, preferences] of [[null, []], [[], undefined], [{}, []]]) {
    assert.throws(() => combineClassificationSettings(rules, preferences), /formato inválido/);
  }
});
