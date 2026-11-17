import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { CsvImportModel } from '../src/models/csvImport.model.js';
import { csvImportService } from '../src/services/csvImport.service.js';
import { BASELINE_RULES } from '../src/models/classificationRule.model.js';

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
    const result = await csvImportService.parseCsvFile(filePath, BASELINE_RULES);

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
    const result = await csvImportService.parseCsvFile(filePath, BASELINE_RULES);

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

test('csvImportService deve mapear o extrato Sicredi e ignorar colunas técnicas e saldo', async () => {
  const filePath = path.join(os.tmpdir(), `sicredi-${Date.now()}.csv`);
  fs.writeFileSync(
    filePath,
    [
      'Data;Descricao;CodTransacao;Identificador;Tipo;Valor;Saldo',
      '23/09/2026;PAGAMENTO PIX - TICKET AND GO;664;id-1;DEBITO;- R$ 51,75;R$ 1.592,34',
      '16/09/2026;RECEBIMENTO PIX - GUILHERME;668;id-2;CREDITO;+ R$ 12,50;R$ 2.514,46',
    ].join('\n'),
    'utf8',
  );

  try {
    const result = await csvImportService.parseCsvFile(filePath, BASELINE_RULES);

    assert.equal(result.length, 2);
    assert.equal(result[0].date, '2026-09-23');
    assert.equal(result[0].description, 'PAGAMENTO PIX - TICKET AND GO');
    assert.equal(result[0].value, -51.75);
    assert.equal(result[1].value, 12.5);
    assert.equal(result[1].description, 'RECEBIMENTO PIX - GUILHERME');
    assert.equal(result[0].CodTransacao, undefined);
    assert.equal(result[0].saldo, undefined);
  } finally {
    fs.unlinkSync(filePath);
  }
});
