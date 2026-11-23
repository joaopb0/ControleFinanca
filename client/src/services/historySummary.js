const MAX_CENTS = 1_000_000_000_000;

export function monthFromDate(value) {
  if (typeof value !== 'string') throw new Error('Existem lançamentos sem data válida.');
  const raw = value.trim();
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const [year, month, day] = iso ? iso.slice(1).map(Number) : br ? [Number(br[3]), Number(br[2]), Number(br[1])] : [];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (!year || year < 1900 || year > 9999 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error(`Data inválida no extrato: ${raw || 'não informada'}. Corrija o arquivo antes de salvar.`);
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function valueToCents(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > MAX_CENTS / 100) throw new Error('Existem valores inválidos ou acima do limite no extrato.');
  const [mantissa, exponent = '0'] = Math.abs(value).toString().split('e');
  const [whole, fraction = ''] = mantissa.split('.');
  const digits = BigInt(whole + fraction);
  const shift = 2 + Number(exponent) - fraction.length;
  const divisor = 10n ** BigInt(Math.max(0, -shift));
  const cents = shift >= 0 ? digits * 10n ** BigInt(shift) : digits / divisor + (digits % divisor * 2n >= divisor ? 1n : 0n);
  return Number(cents) * (value < 0 ? -1 : 1);
}

/** DTO explícito: nenhuma descrição, nome de arquivo ou movimentação sai daqui. */
export function buildHistoryEntries(transactions) {
  if (!Array.isArray(transactions) || transactions.length > 10000) throw new Error('O limite para salvar um extrato é de 10000 lançamentos.');
  const groups = new Map();
  for (const transaction of transactions) {
    const month = monthFromDate(transaction.date);
    if (typeof transaction.categoryId !== 'string' || !transaction.categoryId) throw new Error('Existem lançamentos sem uma categoria válida.');
    const cents = valueToCents(transaction.value);
    if (!cents) continue;
    const key = `${month}:${transaction.categoryId}`;
    if (!groups.has(key)) groups.set(key, { month, categoryId: transaction.categoryId, incomeCents: 0, expenseCents: 0 });
    const entry = groups.get(key);
    if (cents > 0) entry.incomeCents += cents;
    else entry.expenseCents += Math.abs(cents);
    if (entry.incomeCents + entry.expenseCents > MAX_CENTS) throw new Error('Os valores do extrato excedem o limite permitido.');
  }
  if (!groups.size) throw new Error('Não há receitas ou despesas para registrar no histórico.');
  if (groups.size > 2000) throw new Error('O limite é de 2000 combinações de mês e categoria por extrato.');
  return [...groups.values()].sort((a, b) => a.month.localeCompare(b.month) || a.categoryId.localeCompare(b.categoryId));
}

export const formatCents = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
export const formatMonth = (month) => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`));
