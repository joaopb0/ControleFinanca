import { createHash } from 'node:crypto';
import { CategoryModel } from '../models/category.model.js';
import { HistoryModel } from '../models/history.model.js';
import { escapeCSV, formatBRL } from './export.service.js';

export const MAX_HISTORY_CENTS = 1_000_000_000_000;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const fail = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }); };
export function validateHistoryMonth(month) {
  if (typeof month !== 'string' || !/^(?:19\d{2}|[2-9]\d{3})-(?:0[1-9]|1[0-2])$/.test(month)) fail(400, 'Informe um mês válido no formato AAAA-MM.');
  return month;
}
export function validateHistoryPayload(body, saving = false) {
  if (!uuid.test(body?.batchId || '') || !Array.isArray(body?.entries) || !body.entries.length || body.entries.length > 2000) fail(400, 'Resumo mensal inválido ou limite de 2000 categorias por extrato excedido.');
  const seen = new Set();
  const totals = new Map();
  const entries = body.entries.map((entry) => {
    const month = validateHistoryMonth(entry?.month);
    if (!uuid.test(entry.categoryId || '') || [entry.incomeCents, entry.expenseCents].some((value) => !Number.isSafeInteger(value) || value < 0 || value > MAX_HISTORY_CENTS) || entry.incomeCents + entry.expenseCents === 0) fail(400, 'Categoria ou valores em centavos inválidos.');
    const key = `${month}:${entry.categoryId.toLowerCase()}`;
    if (seen.has(key)) fail(400, 'Categoria repetida no mesmo mês.');
    seen.add(key);
    const total = (totals.get(month) || 0) + entry.incomeCents + entry.expenseCents;
    if (total > MAX_HISTORY_CENTS) fail(400, 'O valor mensal excede o limite permitido.');
    totals.set(month, total);
    return { month, categoryId: entry.categoryId.toLowerCase(), incomeCents: entry.incomeCents, expenseCents: entry.expenseCents };
  }).sort((a, b) => a.month.localeCompare(b.month) || a.categoryId.localeCompare(b.categoryId));
  const payload = { batchId: body.batchId.toLowerCase(), entries };
  if (saving) {
    if (!uuid.test(body.requestId || '') || !Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0 || !Number.isSafeInteger(body.expectedHistoryVersion) || body.expectedHistoryVersion < 0 || typeof body.confirmOverlap !== 'boolean') fail(400, 'Confirmação de salvamento inválida.');
    Object.assign(payload, { requestId: body.requestId.toLowerCase(), expectedRevision: body.expectedRevision, expectedHistoryVersion: body.expectedHistoryVersion, confirmOverlap: body.confirmOverlap });
  }
  return payload;
}
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const payloadHash = (payload) => hash({ batchId: payload.batchId, entries: payload.entries });

export function summarizeHistory(entries) {
  const months = new Map();
  for (const entry of entries) {
    if (!months.has(entry.month)) months.set(entry.month, { month: entry.month, incomeCents: 0, expenseCents: 0, categories: new Map() });
    const month = months.get(entry.month);
    if (!month.categories.has(entry.categoryId)) month.categories.set(entry.categoryId, { categoryId: entry.categoryId, categoryName: entry.categoryName, color: entry.color, archived: entry.archived, incomeCents: 0, expenseCents: 0 });
    const category = month.categories.get(entry.categoryId);
    for (const key of ['incomeCents', 'expenseCents']) {
      month[key] += entry[key];
      category[key] += entry[key];
    }
    if (!Number.isSafeInteger(month.incomeCents + month.expenseCents) || month.incomeCents + month.expenseCents > MAX_HISTORY_CENTS) fail(400, 'O valor mensal acumulado excede o limite permitido.');
  }
  return [...months.values()].sort((a, b) => b.month.localeCompare(a.month)).map((month) => ({ ...month, balanceCents: month.incomeCents - month.expenseCents,
    categories: [...month.categories.values()].map((category) => ({ ...category, balanceCents: category.incomeCents - category.expenseCents })) }));
}

/** Projeção dos agregados persistidos no contrato visual do dashboard existente. */
export function buildHistoryReport(months, query = {}) {
  const categories = new Map();
  let incomeCents = 0;
  let expenseCents = 0;
  for (const month of [...months].sort((a, b) => a.month.localeCompare(b.month))) {
    incomeCents += month.incomeCents;
    expenseCents += month.expenseCents;
    for (const item of month.categories) {
      if (!categories.has(item.categoryId)) categories.set(item.categoryId, { ...item, incomeCents: 0, expenseCents: 0 });
      const category = categories.get(item.categoryId);
      category.incomeCents += item.incomeCents;
      category.expenseCents += item.expenseCents;
      category.archived ||= item.archived;
    }
  }
  const breakdown = [];
  let largest = null;
  for (const category of categories.values()) {
    if (category.expenseCents > (largest?.expenseCents || 0)) largest = category;
    for (const [type, cents, total] of [['expense', category.expenseCents, expenseCents], ['income', category.incomeCents, incomeCents]]) {
      if (!cents) continue;
      breakdown.push({ categoryKey: `${category.categoryId}:${type}`, categoryId: category.categoryId, category: category.categoryName,
        type, amount: cents / 100, percentage: total ? Math.round(cents / total * 10000) / 100 : 0,
        count: null, color: category.color, archived: category.archived });
    }
  }
  breakdown.sort((a, b) => (a.type === b.type ? b.amount - a.amount : a.type === 'expense' ? -1 : 1));
  const ordered = months.map((month) => month.month).sort();
  const first = query.from || ordered[0];
  const last = query.to || ordered.at(-1);
  const lastDay = last ? new Date(Date.UTC(Number(last.slice(0, 4)), Number(last.slice(5)), 0)).getUTCDate() : null;
  return {
    period: { startDate: first ? `${first}-01` : null, endDate: last ? `${last}-${lastDay}` : null, precision: 'month' },
    totals: { income: incomeCents / 100, expenses: expenseCents / 100, netBalance: (incomeCents - expenseCents) / 100,
      largestExpenseCategory: largest?.categoryName || 'Outros', largestExpenseAmount: (largest?.expenseCents || 0) / 100,
      transactionCount: null, monthCount: months.length },
    categoryBreakdown: breakdown,
    months: ordered,
  };
}

async function preview(userId, payload, connection) {
  const contribution = await HistoryModel.contribution(userId, payload.batchId, connection);
  const existing = await HistoryModel.entries(userId, connection);
  const previous = existing.filter((entry) => entry.contributionId === payload.batchId);
  const categories = await CategoryModel.findAll(userId, connection, { includeDeleted: true });
  const enriched = payload.entries.map((entry) => {
    const category = categories.find((item) => item.id === entry.categoryId);
    const old = previous.find((item) => item.month === entry.month && item.categoryId === entry.categoryId);
    if (!category || (category.deletedAt && !old)) fail(404, 'Categoria não encontrada entre as categorias disponíveis desta conta.');
    return { ...entry, categoryName: old?.categoryName || category.name, color: old?.color || category.color, archived: Boolean(category.deletedAt), contributionId: payload.batchId };
  });
  const others = existing.filter((entry) => entry.contributionId !== payload.batchId);
  const current = summarizeHistory(existing);
  const incoming = summarizeHistory(enriched);
  const projected = summarizeHistory([...others, ...enriched]);
  const months = [...new Set([...previous, ...enriched].map((entry) => entry.month))].sort();
  const total = (list, month) => list.find((item) => item.month === month) || { incomeCents: 0, expenseCents: 0, balanceCents: 0 };
  const mode = contribution?.payloadHash === payloadHash(payload) ? 'unchanged' : contribution ? 'update' : 'create';
  return { batchId: payload.batchId, revision: contribution?.revision || 0, historyVersion: await HistoryModel.version(userId, connection), mode,
    requiresOverlapConfirmation: mode !== 'unchanged' && others.some((entry) => months.includes(entry.month)),
    months: months.map((month) => ({ month, current: total(current, month), incoming: total(incoming, month), projected: total(projected, month) })), entries: enriched };
}

export const historyService = {
  async report(userId, query = {}) {
    const { months } = await historyService.list(userId, query);
    return buildHistoryReport(months, query);
  },
  preview(userId, body) {
    const payload = validateHistoryPayload(body);
    return CategoryModel.transaction(userId, async (connection) => {
      const result = await preview(userId, payload, connection);
      const { entries, ...response } = result;
      return response;
    });
  },
  save(userId, body) {
    const payload = validateHistoryPayload(body, true);
    return CategoryModel.transaction(userId, async (connection) => {
      const requestHash = hash(payload);
      const receipt = await HistoryModel.receipt(userId, payload.requestId, connection);
      if (receipt) {
        if (receipt.payloadHash !== requestHash) fail(409, 'Esta solicitação já foi utilizada para outro resumo.');
        return { batchId: receipt.contributionId, revision: Number(receipt.revision), alreadySaved: true };
      }
      const result = await preview(userId, payload, connection);
      if (payload.expectedRevision !== result.revision || payload.expectedHistoryVersion !== result.historyVersion) fail(409, 'O histórico mudou. Revise os valores atualizados antes de confirmar novamente.');
      if (result.requiresOverlapConfirmation && !payload.confirmOverlap) fail(409, 'Confirme que estes valores ainda não foram contabilizados nos meses indicados.');
      const revision = result.mode === 'unchanged' ? result.revision : result.revision + 1;
      if (result.mode !== 'unchanged') {
        await HistoryModel.replace(userId, payload, revision, payloadHash(payload), result.entries, connection);
        await HistoryModel.bumpVersion(userId, connection);
      }
      await HistoryModel.recordReceipt(userId, payload, requestHash, revision, connection);
      return { batchId: payload.batchId, revision, alreadySaved: result.mode === 'unchanged' };
    });
  },
  list(userId, query = {}) {
    const from = query.from ? validateHistoryMonth(query.from) : null;
    const to = query.to ? validateHistoryMonth(query.to) : null;
    if (from && to && from > to) fail(400, 'O mês inicial deve ser anterior ao mês final.');
    return CategoryModel.transaction(userId, async (connection) => {
      const entries = await HistoryModel.entries(userId, connection);
      return { months: summarizeHistory(entries.filter((entry) => (!from || entry.month >= from) && (!to || entry.month <= to))) };
    });
  },
  remove(userId, month) {
    if (month !== undefined) validateHistoryMonth(month);
    return CategoryModel.transaction(userId, async (connection) => {
      await HistoryModel.remove(userId, month, connection);
      return { deleted: true };
    });
  },
  async exportCSV(userId, query) {
    const { months } = await historyService.list(userId, query);
    const rows = [['Mês', 'Categoria', 'Receitas', 'Despesas', 'Saldo']];
    for (const month of months) for (const category of month.categories) rows.push([month.month, category.categoryName,
      formatBRL(category.incomeCents / 100), formatBRL(category.expenseCents / 100), formatBRL(category.balanceCents / 100)]);
    return '\uFEFF' + rows.map((row) => row.map(escapeCSV).join(';')).join('\r\n');
  },
};
