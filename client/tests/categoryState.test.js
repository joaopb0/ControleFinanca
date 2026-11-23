import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileCategories, applyCategoryChoice, removeTransaction } from '../src/services/categoryState.js';

const fallback = { id: 'fallback-a', name: 'Sem categoria', isFallback: true };
const food = { id: 'food-a', name: 'Compras da casa' };
const rows = [
  { id: '1', description: 'Mercádo Central', categoryId: food.id, category: 'Alimentação' },
  { id: '2', description: '  MERCADO CENTRAL ', categoryId: food.id, category: 'Alimentação' },
  { id: '3', description: 'Mercado Central', categoryId: fallback.id, category: fallback.name, manualOverride: true },
  { id: '4', description: 'Mercado Central filial', categoryId: fallback.id, category: fallback.name },
];

test('renomear mantém identidade e exceções; excluir move para o fallback e remove associações antigas', () => {
  const renamed = reconcileCategories(rows, [fallback, food]);
  assert.equal(renamed[0].category, food.name);
  assert.equal(renamed[0].categoryId, food.id);
  assert.equal(renamed[2].manualOverride, true);
  const deleted = reconcileCategories(renamed, [fallback]);
  assert.equal(deleted[0].categoryId, fallback.id);
  assert.equal(deleted[0].category, fallback.name);
  assert.equal(deleted[0].manualOverride, false);
  assert.equal(deleted[0].ruleId, null);
  assert.equal(deleted[0].isFallback, true);
  assert.equal(rows[0].category, 'Alimentação', 'não modifica o array original');
});

test('salvar padrão altera somente o lançamento selecionado, mesmo com descrições iguais', () => {
  const changed = applyCategoryChoice(rows, rows[0], fallback, true, 'preference-1');
  assert.equal(changed[0].categoryId, fallback.id);
  assert.equal(changed[0].preferenceId, 'preference-1');
  assert.equal(changed[0].manualOverride, true, 'escolha explícita permanece protegida no extrato aberto');
  assert.equal(changed[1], rows[1]);
  assert.equal(changed[2], rows[2]);
  assert.equal(changed[3], rows[3], 'não usa correspondência parcial');
});

test('escolha sem memorizar altera apenas o lançamento e pode ser substituída explicitamente', () => {
  const changed = applyCategoryChoice(rows, rows[0], fallback, false);
  assert.equal(changed[0].manualOverride, true);
  assert.equal(changed[1], rows[1]);
  const remembered = applyCategoryChoice(changed, changed[0], food, true);
  assert.equal(remembered[0].manualOverride, true);
  assert.equal(remembered[0].categoryId, food.id);
});

test('duas escolhas de categoria para a mesma descrição permanecem independentes', () => {
  const first = applyCategoryChoice(rows, rows[0], fallback, true, 'preference-1');
  const second = applyCategoryChoice(first, first[1], food, false);
  assert.equal(second[0], first[0]);
  assert.equal(second[0].categoryId, fallback.id);
  assert.equal(second[1].categoryId, food.id);
  assert.ok(second[0].manualOverride && second[1].manualOverride);
  assert.equal(second[1].preferenceId, null);
});

test('excluir usa o identificador e preserva os demais registros com a mesma descrição', () => {
  const result = removeTransaction(rows, '1');
  assert.equal(result.length, rows.length - 1);
  assert.ok(result.every((row) => row.id !== '1'));
  assert.equal(result[0], rows[1]);
  assert.equal(result[1], rows[2]);
  assert.equal(rows.length, 4, 'não modifica a lista original');
  assert.throws(() => removeTransaction(rows, 'inexistente'), /não encontrado/);
});

test('excluir o último lançamento deixa o extrato vazio', () => {
  assert.deepEqual(removeTransaction([rows[0]], rows[0].id), []);
});
