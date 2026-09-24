import fs from 'node:fs';
import { CsvImportModel } from '../models/csvImport.model.js';
import { ClassificationRuleModel } from '../models/classificationRule.model.js';
import { classifyItem } from './classifier.service.js';

function detectCsvSeparator(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean).slice(0, 5).join('\n');

  if (!content) return ';';

  const candidates = [';', ',', '\t'];
  const score = candidates.map((delimiter) => ({
    delimiter,
    count: (content.match(new RegExp(`\\${delimiter}`, 'g')) || []).length,
  }));

  score.sort((a, b) => b.count - a.count);
  return score[0]?.count ? score[0].delimiter : ';';
}

function parseCsvLine(line, delimiter) {
  const cells = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (insideQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function normalizeCsvRowFromText(rawLine, delimiter, headers = []) {
  const parsedCells = parseCsvLine(rawLine, delimiter);

  if (headers.length > 0 && parsedCells.length === headers.length) {
    return Object.fromEntries(headers.map((header, index) => [header, parsedCells[index]]));
  }

  const cells = parsedCells.filter((cell) => cell !== '');
  if (cells.length < 3) return null;

  let date = cells[0];
  let amount = cells[cells.length - 1];
  let title = cells.slice(1, cells.length - 1).join(delimiter).trim();

  if (cells.length > 3) {
    const secondLast = cells[cells.length - 2];
    const last = cells[cells.length - 1];
    const isDecimalSplit = /^-?\d+$/.test(secondLast) && /^\d+$/.test(last);

    if (isDecimalSplit) {
      amount = `${secondLast},${last}`;
      title = cells.slice(1, -2).join(delimiter).trim();
    }
  }

  if (!title) {
    title = cells[1] || '';
  }

  return {
    date,
    title,
    amount,
  };
}

export const csvImportService = {
  parseCsvFile: async (filePath) => {
    if (!filePath) {
      throw new Error('Arquivo CSV não informado.');
    }

    const rules = await ClassificationRuleModel.findAll({ activeOnly: true });
    const rows = [];
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');

    if (lines.length < 2) {
      return rows;
    }

    const separator = detectCsvSeparator(filePath);
    const headers = parseCsvLine(lines[0], separator).map((header) => header.trim());

    for (let index = 1; index < lines.length; index += 1) {
      const rawLine = lines[index];
      const row = normalizeCsvRowFromText(rawLine, separator, headers);
      if (!row) continue;

      const normalized = CsvImportModel.normalizeCsvRow(row);

      if (!normalized) continue;

      const classification = classifyItem(normalized.description, rules);
      rows.push({
        ...normalized,
        id: `csv-${Date.now()}-${rows.length + 1}`,
        category: classification.category,
        ruleId: classification.ruleId,
        matchedKeyword: classification.matchedKeyword,
      });
    }

    return rows;
  },
};

export default csvImportService;
