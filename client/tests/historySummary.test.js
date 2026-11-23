import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHistoryEntries, monthFromDate, valueToCents } from '../src/services/historySummary.js';

test('divide extrato entre meses, separando receitas e despesas da mesma categoria sem persistir descrições', () => {
  const result = buildHistoryEntries([
    { date: '2026-10-01', categoryId: 'food', value: -300, description: 'PIX com dados pessoais' },
    { date: '31/10/2026', categoryId: 'food', value: 50 },
    { date: '2026-11-01', categoryId: 'food', value: -200 },
    { date: '2026-10-02', categoryId: 'housing', value: -100 },
  ]);
  assert.deepEqual(result, [
    { month: '2026-10', categoryId: 'food', incomeCents: 5000, expenseCents: 30000 },
    { month: '2026-10', categoryId: 'housing', incomeCents: 0, expenseCents: 10000 },
    { month: '2026-11', categoryId: 'food', incomeCents: 0, expenseCents: 20000 },
  ]);
  assert.doesNotMatch(JSON.stringify(result), /description|PIX|date/);
});

test('centavos usam arredondamento comercial simétrico e somas sem erro binário', () => {
  assert.equal(valueToCents(1.005), 101);
  assert.equal(valueToCents(-35.855), -3586);
  assert.equal(valueToCents(1e-8), 0);
  const [entry] = buildHistoryEntries([0.1, 0.2, 0.3].map((value) => ({ date: '2026-10-01', categoryId: 'a', value })));
  assert.equal(entry.incomeCents, 60);
});

test('não atribui datas ausentes ou inválidas a um mês arbitrário', () => {
  assert.equal(monthFromDate('29/02/2024'), '2024-02');
  for (const date of ['', null, '2026-02-29', '2026-13-01', '31/04/2026', 'texto']) assert.throws(() => monthFromDate(date), /data|Data/);
  for (const value of [NaN, Infinity, '10', 1e15]) assert.throws(() => valueToCents(value), /valores/);
  assert.throws(() => buildHistoryEntries([]), /Não há/);
  assert.throws(() => buildHistoryEntries([{ date: '2026-10-01', value: 10 }]), /categoria/);
});
