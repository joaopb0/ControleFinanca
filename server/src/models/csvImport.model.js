const normalizeHeader = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

function normalizeDate(value) {
  if (value === null || value === undefined) return '';

  const raw = String(value).trim();
  if (!raw) return '';

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const [, year, month, day] = iso;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const brDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brDate) {
    const [, day, month, year] = brDate;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return raw;
}

function parseAmount(value) {
  if (value === null || value === undefined) return 0;

  const raw = String(value).trim();
  if (!raw) return 0;

  const normalized = raw.replace(/\s+/g, '').replace(/[^0-9,.-]/g, '');
  const lastComma = normalized.lastIndexOf(',');
  const lastDot = normalized.lastIndexOf('.');

  let sanitized = normalized;

  if (lastComma !== -1 && lastDot !== -1) {
    const lastSeparator = Math.max(lastComma, lastDot);
    const separator = lastSeparator === lastComma ? ',' : '.';
    const decimal = separator === ',' ? ',' : '.';
    sanitized = normalized.replace(/\./g, '').replace(/,/g, '.');
    if (decimal === ',') {
      sanitized = normalized.replace(/\./g, '').replace(/,/g, '.');
    }
  } else if (lastComma !== -1) {
    sanitized = normalized.replace(/,/g, '.');
  } else if (lastDot !== -1 && normalized.match(/\d+\.\d{3}$/)) {
    sanitized = normalized.replace(/\./g, '');
  }

  const numeric = Number(sanitized);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeTransactionType(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export const CsvImportModel = {
  normalizeCsvRow(row = {}) {
    if (!row || typeof row !== 'object') {
      return null;
    }

    const normalizedKeys = Object.fromEntries(
      Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]),
    );

    const date = normalizedKeys.date ?? normalizedKeys.datadebito ?? normalizedKeys.data ?? normalizedKeys.datalancamento ?? '';
    const title =
      normalizedKeys.title ??
      normalizedKeys.descricao ??
      normalizedKeys.description ??
      normalizedKeys.nome ??
      normalizedKeys.titulo ??
      normalizedKeys.detalhe ??
      '';
    const amount =
      normalizedKeys.amount ??
      normalizedKeys.valor ??
      normalizedKeys.value ??
      normalizedKeys.total ??
      normalizedKeys.valortransacao ??
      normalizedKeys.valorbruto ??
      0;
    const type = normalizeTransactionType(normalizedKeys.type ?? normalizedKeys.tipo);
    const parsedAmount = parseAmount(amount);
    const value = type === 'debito'
      ? -Math.abs(parsedAmount)
      : type === 'credito'
        ? Math.abs(parsedAmount)
        : parsedAmount;

    return {
      date: normalizeDate(date),
      description: String(title ?? '').trim(),
      value,
      category: 'Outros',
    };
  },
};

export default CsvImportModel;
