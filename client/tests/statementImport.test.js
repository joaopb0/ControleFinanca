import test from 'node:test';
import assert from 'node:assert/strict';
import { importStatements } from '../src/services/statementImport.js';
import { buildHistoryEntries } from '../src/services/historySummary.js';

const fallback = { id: 'other', name: 'Outros' };
const files = [{ name: 'banco-a.csv', size: 200 }, { name: 'banco-b.CSV', size: 100 }];

test('combina vários extratos sem deduplicar lançamentos e mantém IDs independentes', async () => {
  const uploaded = [];
  const row = { id: 'same-id', date: '2026-11-01', description: 'PIX', value: -10, categoryId: 'food', category: 'Alimentação', manualOverride: false };
  const rows = await importStatements(files, fallback, async (file) => {
    uploaded.push(file);
    return { dados: [row, row] };
  });
  assert.deepEqual(uploaded, files);
  assert.equal(rows.length, 4);
  assert.equal(new Set(rows.map(({ id }) => id)).size, 4);
  assert.deepEqual(rows.map(({ id: _id, ...rest }) => rest), [row, row, row, row].map(({ id: _id, ...rest }) => rest));
  assert.deepEqual(buildHistoryEntries(rows), [{ month: '2026-11', categoryId: 'food', incomeCents: 0, expenseCents: 4000 }]);
});

test('normaliza formatos anteriores e consolida meses diferentes', async () => {
  const rows = await importStatements(files, fallback, async (file) => ({ dados: file === files[0]
    ? [{ Data: '2026-10-01', Descricao: 'Compra', Valor: '-15' }]
    : [{ data: '2026-11-01', 'Descrição': 'Receita', valor: '30' }] }));
  assert.equal(rows[0].description, 'Compra');
  assert.equal(rows[1].description, 'Receita');
  assert.deepEqual(buildHistoryEntries(rows), [
    { month: '2026-10', categoryId: 'other', incomeCents: 0, expenseCents: 1500 },
    { month: '2026-11', categoryId: 'other', incomeCents: 3000, expenseCents: 0 },
  ]);
});

test('valida todo o lote antes de enviar qualquer arquivo', async () => {
  let calls = 0;
  const upload = async () => { calls += 1; };
  await assert.rejects(importStatements([...files, { name: 'imagem.png' }], fallback, upload), /imagem.png.*CSV/);
  await assert.rejects(importStatements([...files, { name: 'grande.csv', size: 5 * 1024 * 1024 + 1 }], fallback, upload), /grande.csv.*5 MB/);
  await assert.rejects(importStatements([], fallback, upload), /Selecione/);
  assert.equal(calls, 0);
});

test('uma falha identifica o arquivo e impede publicar resultados parciais', async () => {
  let published = false;
  const error = new Error('Falha de conexão');
  await assert.rejects((async () => {
    await importStatements(files, fallback, async (file) => {
      if (file === files[1]) throw error;
      return { dados: [{ value: -10 }] };
    });
    published = true;
  })(), (failure) => failure.message === 'banco-b.CSV: Falha de conexão' && failure.cause === error);
  assert.equal(published, false);
});

test('rejeita resposta inválida e aceita importação de um único arquivo', async () => {
  await assert.rejects(importStatements(files, fallback, async () => ({})), /banco-a.csv.*inválido/);
  const rows = await importStatements([files[0]], fallback, async () => ({ dados: [{ value: -1 }] }));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].categoryId, fallback.id);
});
