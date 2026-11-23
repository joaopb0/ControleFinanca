import test from 'node:test';
import assert from 'node:assert/strict';
import { getCurrentMonth, getMonthlyPeriod } from '../src/services/reportPeriod.js';

test('mês atual usa o calendário de São Paulo inclusive na virada de mês em UTC', () => {
  assert.equal(getCurrentMonth(new Date('2026-12-01T01:00:00Z')), '2026-11');
  assert.equal(getCurrentMonth(new Date('2026-12-01T04:00:00Z')), '2026-12');
});

test('atalhos mensais cobrem mês atual, todos os meses e três meses com virada de ano', () => {
  const today = new Date('2026-01-20T12:00:00Z');
  assert.deepEqual(getMonthlyPeriod('current_month', today), { startDate: '2026-01', endDate: '2026-01' });
  assert.deepEqual(getMonthlyPeriod('all', today), { startDate: '', endDate: '' });
  assert.deepEqual(getMonthlyPeriod('last_three_months', today), { startDate: '2025-11', endDate: '2026-01' });
});
