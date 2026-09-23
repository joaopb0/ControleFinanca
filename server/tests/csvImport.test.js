import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { CsvImportModel } from '../src/models/csvImport.model.js';
import { csvImportService } from '../src/services/csvImport.service.js';

test('CsvImportModel deve mapear colunas date, title e amount para o padrão do sistema', () => {
  const row = {
    date: '2026-09-12',
    title: 'Mercado Extra',
    amount: '-145,90',
  };

  const result = CsvImportModel.normalizeCsvRow(row);

  assert.equal(result.date, '2026-09-12');
  assert.equal(result.description, 'Mercado Extra');
  assert.equal(result.value, -145.9);
  assert.equal(result.category, 'Outros');
});

test('csvImportService deve ler CSV com separador ; e classificar registros automaticamente', async () => {
  const filePath = path.join(os.tmpdir(), `extrato-${Date.now()}.csv`);
  fs.writeFileSync(
    filePath,
    'date;title;amount\n12/09/2026;Supermercado Extra;245,50\n05/09/2026;Salário mensal;5800\n',
    'utf8',
  );

  try {
    const result = await csvImportService.parseCsvFile(filePath);

    assert.equal(result.length, 2);
    assert.equal(result[0].description, 'Supermercado Extra');
    assert.equal(result[0].category, 'Alimentação');
    assert.equal(result[1].description, 'Salário mensal');
    assert.equal(result[1].category, 'Receita');
  } finally {
    fs.unlinkSync(filePath);
  }
});

test('csvImportService deve ler CSV padrão com separador , e colunas date,title,amount', async () => {
  const filePath = path.join(os.tmpdir(), `extrato-comma-${Date.now()}.csv`);
  fs.writeFileSync(
    filePath,
    'date,title,amount\n2026-09-12,Supermercado Extra,-245,50\n2026-09-05,Salário mensal,5800\n',
    'utf8',
  );

  try {
    const result = await csvImportService.parseCsvFile(filePath);

    assert.equal(result.length, 2);
    assert.equal(result[0].description, 'Supermercado Extra');
    assert.equal(result[0].value, -245.5);
    assert.equal(result[0].category, 'Alimentação');
    assert.equal(result[1].description, 'Salário mensal');
    assert.equal(result[1].category, 'Receita');
  } finally {
    fs.unlinkSync(filePath);
  }
});
