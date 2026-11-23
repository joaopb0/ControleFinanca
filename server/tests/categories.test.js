import test from 'node:test';
import assert from 'node:assert/strict';
import { CategoryModel } from '../src/models/category.model.js';
import { categoryService, validateCategory } from '../src/services/category.service.js';
import { classifyBatch, classifyItem, normalizeText } from '../src/services/classifier.service.js';
import { CategoryPreferenceModel, descriptionHash } from '../src/models/categoryPreference.model.js';

test('validação de categorias restringe nome e cor e não aceita campos de propriedade', () => {
  assert.deepEqual(validateCategory({ name: '  Educação ', color: '#AbCdEf', userId: 'outro', systemKey: 'fallback' }), { name: 'Educação', color: '#abcdef' });
  for (const body of [{ name: 'x', color: '#abcdef' }, { name: 'x'.repeat(101), color: '#abcdef' }, { name: 'Educação', color: 'red' }, null]) {
    assert.throws(() => validateCategory(body), { statusCode: 400 });
  }
});

test('acesso ao catálogo rejeita identidade ausente antes de consultar MySQL', async () => {
  await assert.rejects(CategoryModel.findAll(null), /identidade autenticada/);
  await assert.rejects(CategoryModel.findById({}, 'id'), /identidade autenticada/);
  await assert.rejects(CategoryModel.transaction(undefined, () => {}), /identidade autenticada/);
  await assert.rejects(CategoryPreferenceModel.findByDescription(null, 'PIX', {}), /identidade autenticada/);
  await assert.rejects(CategoryPreferenceModel.findById(null, 'id', {}), /identidade autenticada/);
  await assert.rejects(CategoryPreferenceModel.updateCategory(null, 'id', 'category', {}), /identidade autenticada/);
  await assert.rejects(CategoryPreferenceModel.remove(null, 'id', {}), /identidade autenticada/);
});

test('consulta de padrão valida a descrição antes de acessar persistência', () => {
  for (const description of ['', ' ', null, {}, 'a'.repeat(4001)]) {
    assert.throws(() => categoryService.getPreference('user', { description }), { statusCode: 400 });
  }
});

test('escolhas confirmadas para PIX iguais resistem à reclassificação, enquanto nova importação usa o padrão', async () => {
  const categories = [{ id: 'food', name: 'Alimentação' }, { id: 'housing', name: 'Moradia' }];
  const preference = { id: 'pref', categoryId: 'housing', category: 'Moradia' };
  const context = { categories, preferences: new Map([['pix para joao', preference]]) };
  const rows = [
    { id: '1', description: 'PIX para João', categoryId: 'food', category: 'Alimentação', manualOverride: true },
    { id: '2', description: 'PIX para João', categoryId: 'housing', category: 'Moradia', manualOverride: true },
  ];
  const result = await classifyBatch(rows, [], context);
  assert.deepEqual(result.data.map((row) => row.categoryId), ['food', 'housing']);
  assert.equal(classifyItem('PIX para João', [], context).categoryId, 'housing');
});

test('preferências exatas têm precedência e fallback usa identidade estável após renomeação', async () => {
  const rules = [{ id: 'rule', categoryId: 'food', category: 'Alimentação', keywords: ['mercado'], active: true, priority: 1000 }];
  const preference = { id: 'pref', categoryId: 'personal', category: 'Compras da casa', description: 'Mercádo Central' };
  const context = { fallback: { id: 'fallback', name: 'Não classificado' }, preferences: new Map([[normalizeText(preference.description), preference]]) };
  assert.equal(classifyItem('  MERCADO CENTRAL ', rules, context).categoryId, 'personal');
  assert.equal(classifyItem('Mercado Central filial', rules, context).categoryId, 'food');
  assert.equal(classifyItem('Sem correspondência', rules, context).category, 'Não classificado');
  assert.equal(classifyItem('', rules, context).categoryId, 'fallback');
  assert.equal(descriptionHash('Mercádo Central'), descriptionHash('  MERCADO CENTRAL '));
  assert.notEqual(descriptionHash('Mercado Central'), descriptionHash('Mercado Central filial'));
  const batch = await classifyBatch(['Mercado Central', 'Mercado Central filial', 'XYZ'], rules, context);
  assert.deepEqual(batch.summary, { total: 3, classified: 2, fallbackCount: 1 });
});

test('reclassificação preserva exceção local e não herda metadados de uma classificação anterior', async () => {
  const result = await classifyBatch([
    { description: 'Mercado', categoryId: 'manual', category: 'Exceção', manualOverride: true },
    { description: 'XYZ', category: 'Antiga', preferenceId: 'stale' },
  ], [], { fallback: { id: 'fallback', name: 'Outros' } });
  assert.equal(result.data[0].category, 'Exceção');
  assert.equal(result.data[0].manualOverride, true);
  assert.equal(result.data[1].preferenceId, null);
  assert.equal(result.data[1].isFallback, true);
});

test('exceção local usa o nome atual da categoria e não aceita identidade de categoria de outra conta', async () => {
  const context = { categories: [{ id: 'own', name: 'Atualizada' }, { id: 'fallback', name: 'Outros', isFallback: true }], fallback: { id: 'fallback', name: 'Outros' } };
  const result = await classifyBatch([
    { description: 'ABC', categoryId: 'own', category: 'Nome antigo', manualOverride: true },
    { description: 'XYZ', categoryId: 'foreign', category: 'Outra conta', manualOverride: true },
  ], [], context);
  assert.equal(result.data[0].category, 'Atualizada');
  assert.equal(result.data[1].categoryId, 'fallback');
});
