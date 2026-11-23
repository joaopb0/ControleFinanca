import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import { historyService, validateHistoryPayload, summarizeHistory, buildHistoryReport } from '../src/services/history.service.js';

const categoryId = randomUUID();
const batchId = randomUUID();
const entry = (month, expenseCents, incomeCents = 0) => ({ month, categoryId, expenseCents, incomeCents });

test('dashboard do histórico agrega categorias sem compensar receitas e despesas nem inventar lançamentos', () => {
  const months = summarizeHistory([
    { month: '2026-10', categoryId: 'a', categoryName: 'Alimentação', color: '#123456', incomeCents: 5000, expenseCents: 30000, archived: true },
    { month: '2026-11', categoryId: 'a', categoryName: 'Nome novo', color: '#123456', incomeCents: 2000, expenseCents: 15000, archived: true },
    { month: '2026-11', categoryId: 'b', categoryName: 'Moradia', color: '#123456', incomeCents: 0, expenseCents: 20000 },
  ]);
  const report = buildHistoryReport(months);
  assert.equal(report.totals.income, 70);
  assert.equal(report.totals.expenses, 650);
  assert.equal(report.totals.netBalance, -580);
  assert.equal(report.totals.largestExpenseCategory, 'Alimentação');
  assert.equal(report.totals.largestExpenseAmount, 450);
  assert.equal(report.totals.monthCount, 2);
  assert.equal(report.totals.transactionCount, null);
  assert.equal(report.categoryBreakdown.length, 3);
  assert.ok(report.categoryBreakdown.every((item) => item.count === null));
  assert.equal(new Set(report.categoryBreakdown.map((item) => item.categoryKey)).size, 3);
  assert.equal(report.period.startDate, '2026-10-01');
  assert.equal(report.period.endDate, '2026-11-30');
  assert.equal(buildHistoryReport([], { from: '2024-02', to: '2024-02' }).period.endDate, '2024-02-29');
  assert.equal(buildHistoryReport([]).totals.expenses, 0);
  assert.ok(!Object.hasOwn(report, 'filteredTransactions'));
});

test('histórico valida meses, centavos, duplicatas e constrói DTO sem campos pessoais adicionais', () => {
  const body = { batchId, entries: [entry('2026-10', 30000)], userId: 'outro', transactions: [{ description: 'não persistir' }] };
  assert.deepEqual(Object.keys(validateHistoryPayload(body)).sort(), ['batchId', 'entries']);
  for (const entries of [[entry('2026-13', 10)], [entry('2026-10', -1)], [entry('2026-10', 1.1)], [entry('2026-10', 0)], [entry('2026-10', 10), entry('2026-10', 20)]]) {
    assert.throws(() => validateHistoryPayload({ batchId, entries }), { statusCode: 400 });
  }
  const months = summarizeHistory([
    { ...entry('2026-10', 30000, 10000), categoryName: 'Nome histórico' },
    { ...entry('2026-10', 15000, 5000), categoryName: 'Nome novo' },
    { ...entry('2026-11', 20000), categoryName: 'Nome novo' },
  ]);
  assert.equal(months[1].expenseCents, 45000);
  assert.equal(months[1].incomeCents, 15000);
  assert.equal(months[1].balanceCents, -30000);
  assert.equal(months[1].categories[0].categoryName, 'Nome histórico');
});

test('histórico real: soma, idempotência, revisões, categorias arquivadas e exclusão por usuário', {
  skip: process.env.AUTH_TEST_DATABASE === '1' ? false : 'Requer MySQL local de teste.', timeout: 60000,
}, async (t) => {
  assert.match(process.env.DB_NAME || '', /_test$/);
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(process.env.DB_HOST));
  const schema = `cf_history_${randomUUID().replaceAll('-', '')}_test`;
  const admin = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER, password: process.env.DB_PASSWORD });
  let created = false;
  let db;
  t.after(async () => {
    try { if (db) await db.closeDatabase(); if (created) await admin.query(`DROP DATABASE \`${schema}\``); }
    finally { await admin.end(); }
  });
  await admin.query(`CREATE DATABASE \`${schema}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  created = true;
  process.env.DB_NAME = schema;
  db = await import('../src/config/database.js');
  assert.equal(await db.initDatabase(), true);
  const pool = db.getDbPool();
  const alice = randomUUID();
  const bob = randomUUID();
  await pool.query('INSERT INTO users (id, name, email) VALUES (?, ?, ?), (?, ?, ?)', [alice, 'Alice', `${alice}@example.test`, bob, 'Bob', `${bob}@example.test`]);
  const { CategoryModel } = await import('../src/models/category.model.js');
  const { categoryService } = await import('../src/services/category.service.js');
  for (const user of [alice, bob]) await CategoryModel.transaction(user, (connection) => CategoryModel.seedForUser(connection, user));
  const category = (await CategoryModel.findAll(alice)).find((item) => item.systemKey === 'food');
  const bobCategory = (await CategoryModel.findAll(bob))[0];
  const first = { batchId: randomUUID(), entries: [{ month: '2026-10', categoryId: category.id, incomeCents: 10000, expenseCents: 30000 }, { month: '2026-11', categoryId: category.id, incomeCents: 0, expenseCents: 20000 }] };
  const save = async (user, payload, acknowledged = false, requestId = randomUUID()) => {
    const preview = await historyService.preview(user, payload);
    const body = { ...payload, requestId, expectedRevision: preview.revision, expectedHistoryVersion: preview.historyVersion, confirmOverlap: acknowledged };
    return { result: await historyService.save(user, body), body };
  };
  const saved = await save(alice, first);
  assert.equal(saved.result.revision, 1);
  assert.equal((await historyService.preview(alice, first)).mode, 'unchanged');
  assert.equal((await historyService.save(alice, saved.body)).alreadySaved, true);
  assert.deepEqual((await historyService.list(bob)).months, []);
  const second = { batchId: randomUUID(), entries: [{ month: '2026-10', categoryId: category.id, incomeCents: 5000, expenseCents: 15000 }] };
  await assert.rejects(save(alice, second), { statusCode: 409 });
  const secondSaved = await save(alice, second, true);
  assert.equal((await historyService.list(alice)).months[1].expenseCents, 45000);
  assert.equal((await historyService.list(alice)).months[1].incomeCents, 15000);
  const october = await historyService.report(alice, { from: '2026-10', to: '2026-10' });
  assert.equal(october.totals.expenses, 450);
  assert.equal(october.totals.income, 150);
  assert.equal(october.totals.monthCount, 1);
  assert.equal((await historyService.report(alice, { from: '2026-12', to: '2026-12' })).totals.monthCount, 0);
  assert.equal((await historyService.report(bob)).totals.expenses, 0);
  await historyService.save(alice, secondSaved.body);
  assert.equal((await historyService.list(alice)).months[1].expenseCents, 45000);
  const changed = { ...first, entries: [{ ...first.entries[0], expenseCents: 10000 }] };
  const updated = await save(alice, changed, true);
  assert.equal(updated.result.revision, 2);
  const afterUpdate = (await historyService.list(alice)).months;
  assert.equal(afterUpdate.length, 1, 'atualização remove somente meses retirados desta contribuição');
  assert.equal(afterUpdate[0].expenseCents, 25000);
  await historyService.save(alice, saved.body);
  assert.equal((await historyService.list(alice)).months[0].expenseCents, 25000, 'retry antigo não restaura versão anterior');
  await assert.rejects(historyService.save(alice, { ...saved.body, entries: [entry('2026-10', 999)] }), { statusCode: 409 });
  await assert.rejects(historyService.preview(bob, first), { statusCode: 404 });
  await assert.rejects(historyService.preview(alice, { ...first, entries: [{ ...first.entries[0], categoryId: bobCategory.id }] }), { statusCode: 404 });
  const race = { batchId: randomUUID(), entries: [{ ...first.entries[0], expenseCents: 1000 }] };
  const preview = await historyService.preview(alice, race);
  const raceBody = { ...race, requestId: randomUUID(), expectedRevision: preview.revision, expectedHistoryVersion: preview.historyVersion, confirmOverlap: true };
  const responses = await Promise.all([historyService.save(alice, raceBody), historyService.save(alice, raceBody)]);
  assert.ok(responses.some((response) => response.alreadySaved));
  await assert.rejects(historyService.save(alice, { ...raceBody, requestId: randomUUID() }), { statusCode: 409 });

  await categoryService.update(alice, category.id, { name: 'Renomeada', color: '#123456' });
  assert.equal((await historyService.list(alice)).months[0].categories[0].categoryName, 'Alimentação');
  await categoryService.remove(alice, category.id);
  assert.equal(await CategoryModel.findById(alice, category.id), null);
  const [archived] = await pool.query('SELECT deletedAt FROM user_categories WHERE userId = ? AND id = ?', [alice, category.id]);
  assert.ok(archived[0].deletedAt);
  assert.ok((await historyService.list(alice)).months[0].categories[0].archived);
  const csv = await historyService.exportCSV(alice, {});
  assert.ok(csv.startsWith('\uFEFF'));
  assert.match(csv, /Alimentação/);
  assert.doesNotMatch(csv, /description|PIX|password|requestId/);
  const [columns] = await pool.query('SHOW COLUMNS FROM history_entries');
  assert.ok(columns.every((column) => !/description|transaction|file|recipient/i.test(column.Field)));
  const restored = await categoryService.create(alice, { name: 'Renomeada', color: '#123456' });
  assert.equal(restored.id, category.id);
  assert.equal((await historyService.list(alice)).months[0].expenseCents, 26000);

  await historyService.remove(bob);
  assert.equal((await historyService.list(alice)).months.length, 1);
  await historyService.remove(alice, '2026-10');
  assert.deepEqual((await historyService.list(alice)).months, []);
  await assert.rejects(historyService.save(alice, updated.body), { statusCode: 409 }, 'retry posterior à exclusão não ressuscita dados');
  await save(alice, first);
  await historyService.remove(alice);
  assert.deepEqual((await historyService.list(alice)).months, []);
  await save(alice, first);
  await pool.query('DELETE FROM users WHERE id = ?', [alice]);
  const [remaining] = await pool.query('SELECT userId FROM history_entries WHERE userId = ?', [alice]);
  assert.equal(remaining.length, 0);
});
