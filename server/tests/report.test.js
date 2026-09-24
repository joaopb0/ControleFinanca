import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  reportService,
  round2,
  normalizeDate,
  generateSummary,
} from '../src/services/report.service.js';
import {
  exportService,
  formatBRL,
  escapeCSV,
  generateCSV,
  generatePDF,
} from '../src/services/export.service.js';
import { reportController } from '../src/controllers/report.controller.js';

describe('Financial Report & Export Suite', () => {
  const sampleTransactions = [
    { id: '1', date: '02/09/2026', description: 'Salário mensal', value: 5000.0, category: 'Receita' },
    { id: '2', date: '03/09/2026', description: 'Aluguel apto', value: -1500.0, category: 'Moradia' },
    { id: '3', date: '04/09/2026', description: 'Supermercado', value: -500.0, category: 'Alimentação' },
    { id: '4', date: '05/09/2026', description: 'Restaurante', value: -200.0, category: 'Alimentação' },
    { id: '5', date: '15/09/2026', description: 'Freelance dev', value: 1200.0, category: 'Receita' },
    { id: '6', date: '25/09/2026', description: 'Conta de luz', value: -180.0, category: 'Contas' },
  ];

  describe('reportService: round2 (IEEE 754 Precision & Symmetric Rounding)', () => {
    it('deve arredondar 35.855 para 35.86 e preservar simetria para -35.855 -> -35.86', () => {
      assert.equal(round2(35.855), 35.86);
      assert.equal(round2(-35.855), -35.86);
    });

    it('deve arredondar corretamente outros empates clássicos (1.005, 0.075, etc.)', () => {
      assert.equal(round2(1.005), 1.01);
      assert.equal(round2(-1.005), -1.01);
      assert.equal(round2(0.075), 0.08);
      assert.equal(round2(-0.075), -0.08);
      assert.equal(round2(1.004), 1.0);
      assert.equal(round2(1.006), 1.01);
    });

    it('deve lidar com números inteiros e decimais regulares', () => {
      assert.equal(round2(100), 100);
      assert.equal(round2(100.5), 100.5);
      assert.equal(round2(100.55), 100.55);
      assert.equal(round2(100.554), 100.55);
      assert.equal(round2(100.555), 100.56);
      assert.equal(round2(-100.555), -100.56);
    });

    it('deve aceitar strings numéricas com coerção segura', () => {
      assert.equal(round2('35.855'), 35.86);
      assert.equal(round2('-35.855'), -35.86);
      assert.equal(round2('123.45'), 123.45);
    });

    it('deve retornar 0 para valores inválidos, nulos, vazios ou não-finitos', () => {
      assert.equal(round2(null), 0);
      assert.equal(round2(undefined), 0);
      assert.equal(round2(''), 0);
      assert.equal(round2('invalido'), 0);
      assert.equal(round2(NaN), 0);
      assert.equal(round2(Infinity), 0);
      assert.equal(round2(-Infinity), 0);
      assert.equal(round2(0), 0);
      assert.equal(round2(-0), 0);
    });

    it('deve lidar com números em notação científica', () => {
      assert.equal(round2(1e-7), 0);
      assert.equal(round2(1.234e2), 123.4);
    });
  });

  describe('reportService: normalizeDate', () => {
    it('deve normalizar datas no padrão brasileiro DD/MM/YYYY para YYYY-MM-DD', () => {
      assert.equal(normalizeDate('02/09/2026'), '2026-09-02');
      assert.equal(normalizeDate('25/12/2025'), '2025-12-25');
      assert.equal(normalizeDate('5/8/2026'), '2026-08-05');
    });

    it('deve preservar datas no padrão ISO YYYY-MM-DD', () => {
      assert.equal(normalizeDate('2026-09-02'), '2026-09-02');
      assert.equal(normalizeDate('2026-09-02T14:30:00.000Z'), '2026-09-02');
    });

    it('deve retornar null para datas inválidas ou não-string', () => {
      assert.equal(normalizeDate(''), null);
      assert.equal(normalizeDate(null), null);
      assert.equal(normalizeDate('data-invalida'), null);
    });
  });

  describe('reportService: generateSummary', () => {
    it('deve agregar receitas, despesas e saldo líquido com precisão', () => {
      const summary = generateSummary(sampleTransactions);

      assert.equal(summary.totals.income, 6200.0);
      assert.equal(summary.totals.expenses, 2380.0);
      assert.equal(summary.totals.netBalance, 3820.0);
      assert.equal(summary.totals.largestExpenseCategory, 'Moradia');
      assert.equal(summary.totals.largestExpenseAmount, 1500.0);
      assert.equal(summary.totals.transactionCount, 6);
    });

    it('deve calcular os subtotais e percentuais por categoria corretamente', () => {
      const summary = generateSummary(sampleTransactions);
      const breakdown = summary.categoryBreakdown;

      // Despesas: Moradia (1500), Alimentação (700), Contas (180). Total despesas: 2380
      const alimentacao = breakdown.find((c) => c.category === 'Alimentação');
      assert.ok(alimentacao);
      assert.equal(alimentacao.type, 'expense');
      assert.equal(alimentacao.amount, 700.0);
      assert.equal(alimentacao.count, 2);
      // 700 / 2380 * 100 = 29.41%
      assert.equal(alimentacao.percentage, 29.41);

      const moradia = breakdown.find((c) => c.category === 'Moradia');
      assert.ok(moradia);
      assert.equal(moradia.amount, 1500.0);
      // 1500 / 2380 * 100 = 63.03%
      assert.equal(moradia.percentage, 63.03);

      const receita = breakdown.find((c) => c.category === 'Receita');
      assert.ok(receita);
      assert.equal(receita.type, 'income');
      assert.equal(receita.amount, 6200.0);
      assert.equal(receita.percentage, 100.0);
    });

    it('deve filtrar transações por intervalo de datas', () => {
      const summary = generateSummary(sampleTransactions, {
        startDate: '2026-09-03',
        endDate: '2026-09-10',
      });

      // Transações no intervalo: #2 (03/09), #3 (04/09), #4 (05/09)
      assert.equal(summary.totals.transactionCount, 3);
      assert.equal(summary.totals.income, 0);
      assert.equal(summary.totals.expenses, 2200.0);
      assert.equal(summary.totals.netBalance, -2200.0);
    });

    it('deve lançar erro se startDate for posterior a endDate', () => {
      assert.throws(
        () => {
          generateSummary(sampleTransactions, {
            startDate: '2026-09-30',
            endDate: '2026-09-01',
          });
        },
        (err) => err.statusCode === 400
      );
    });

    it('deve lidar com lista vazia sem divisão por zero ou NaN', () => {
      const summary = generateSummary([]);

      assert.equal(summary.totals.income, 0);
      assert.equal(summary.totals.expenses, 0);
      assert.equal(summary.totals.netBalance, 0);
      assert.equal(summary.totals.transactionCount, 0);
      assert.deepEqual(summary.categoryBreakdown, []);
    });

    it('deve atribuir categoria "Outros" quando categoria for nula ou vazia', () => {
      const txs = [{ id: '1', date: '2026-09-01', description: 'Algo', value: -100.0, category: '' }];
      const summary = generateSummary(txs);

      assert.equal(summary.categoryBreakdown[0].category, 'Outros');
      assert.equal(summary.categoryBreakdown[0].amount, 100.0);
    });
  });

  describe('exportService: CSV Generation', () => {
    it('deve iniciar com UTF-8 BOM e conter delimitadores ";"', () => {
      const summary = generateSummary(sampleTransactions);
      const csv = generateCSV(summary, sampleTransactions);

      // Byte Order Mark
      assert.equal(csv.charCodeAt(0), 0xfeff);
      assert.ok(csv.includes(';'));
      assert.ok(csv.includes('RELATÓRIO FINANCEIRO - CONTROLEFINANCA'));
      assert.ok(csv.includes('Receitas Totais;6.200,00'));
      assert.ok(csv.includes('Despesas Totais;2.380,00'));
      assert.ok(csv.includes('Saldo Líquido;3.820,00'));
    });

    it('deve escapar ponto e vírgula e aspas conforme RFC 4180', () => {
      const txs = [
        { id: '1', date: '01/09/2026', description: 'Compra; com "aspas"', value: -50.0, category: 'Outros' },
      ];
      const summary = generateSummary(txs);
      const csv = generateCSV(summary, txs);

      assert.ok(csv.includes('"Compra; com ""aspas"""'));
    });

    it('formatBRL deve formatar números com vírgula decimal e ponto de milhar', () => {
      assert.equal(formatBRL(1234.56), '1.234,56');
      assert.equal(formatBRL(0), '0,00');
      assert.equal(formatBRL(-500.5), '-500,50');
    });

    it('escapeCSV deve tratar tipos com segurança', () => {
      assert.equal(escapeCSV(null), '');
      assert.equal(escapeCSV(undefined), '');
      assert.equal(escapeCSV('simples'), 'simples');
      assert.equal(escapeCSV('com;ponto'), '"com;ponto"');
      assert.equal(escapeCSV('com"aspas'), '"com""aspas"');
    });

    it('deve neutralizar injeção de fórmulas CSV (CWE-1236 / OWASP 15-29)', () => {
      // 1. Gatilhos comuns de fórmula (=, +, -, @, |)
      assert.equal(escapeCSV('=cmd|\'/C calc\'!A0'), "'=cmd|'/C calc'!A0");
      assert.equal(escapeCSV('=1+1'), "'=1+1");
      assert.equal(escapeCSV('+1+2'), "'+1+2");
      assert.equal(escapeCSV('+cmd|calc'), "'+cmd|calc");
      assert.equal(escapeCSV('-2+3'), "'-2+3");
      assert.equal(escapeCSV('-cmd|calc'), "'-cmd|calc");
      assert.equal(escapeCSV('@SUM(A1:B10)'), "'@SUM(A1:B10)");
      assert.equal(escapeCSV('|cmd|\'/C calc\'!A0'), "'|cmd|'/C calc'!A0");

      // 2. Caracteres de controle iniciais (\t, \r)
      assert.equal(escapeCSV('\t=cmd'), "'\t=cmd");
      assert.equal(escapeCSV('\r=cmd'), `"'\r=cmd"`);

      // 3. Fórmulas contendo delimitadores de CSV e aspas
      assert.equal(escapeCSV('=cmd;calc'), "\"'=cmd;calc\"");
      assert.equal(
        escapeCSV('=HYPERLINK("http://evil.com", "Click")'),
        "\"'=HYPERLINK(\"\"http://evil.com\"\", \"\"Click\"\")\""
      );
      assert.equal(escapeCSV('+calc;"test"'), "\"'+calc;\"\"test\"\"\"");

      // 4. Campos seguros não devem receber apóstrofo
      assert.equal(escapeCSV('Alimentação'), 'Alimentação');
      assert.equal(escapeCSV('12345'), '12345');
      assert.equal(escapeCSV(0), '0');
    });

    it('generateCSV deve neutralizar fórmulas maliciosas nas transações detalhadas', () => {
      const maliciousTxs = [
        { id: '1', date: '01/09/2026', description: '=cmd|\'/C calc\'!A0', value: -100.0, category: '=MaliciousCat' },
        { id: '2', date: '02/09/2026', description: '@SUM(1+1)*cmd', value: 200.0, category: 'Receita' },
        { id: '3', date: '03/09/2026', description: '+12345', value: -50.0, category: 'Outros' },
        { id: '4', date: '04/09/2026', description: '-2+3+cmd', value: -75.0, category: 'Outros' },
      ];

      const summary = generateSummary(maliciousTxs);
      const csv = generateCSV(summary, maliciousTxs);

      // As células de fórmula devem estar prefixadas por apóstrofo
      assert.ok(csv.includes(";'=cmd|'/C calc'!A0;"));
      assert.ok(csv.includes(";'=MaliciousCat;"));
      assert.ok(csv.includes(";'@SUM(1+1)*cmd;"));
      assert.ok(csv.includes(";'+12345;"));
      assert.ok(csv.includes(";'-2+3+cmd;"));

      // As fórmulas perigosas NÃO podem aparecer desprotegidas no início de células
      assert.ok(!csv.includes(';=cmd'));
      assert.ok(!csv.includes(';@SUM'));
      assert.ok(!csv.includes(';+12345'));
      assert.ok(!csv.includes(';-2+3+cmd'));
    });
  });

  describe('exportService: PDF Generation', () => {
    it('deve gerar buffer binário de PDF com assinatura %PDF-', async () => {
      const summary = generateSummary(sampleTransactions);
      const pdfBuffer = await generatePDF(summary, sampleTransactions);

      assert.ok(Buffer.isBuffer(pdfBuffer));
      assert.ok(pdfBuffer.length > 1000, `Buffer PDF muito pequeno (${pdfBuffer.length} bytes)`);

      // Assinatura mágica do PDF nos primeiros 5 bytes
      const magic = pdfBuffer.subarray(0, 5).toString('ascii');
      assert.equal(magic, '%PDF-');
    });

    it('deve gerar PDF com paginação em lotes maiores sem erros', async () => {
      // Cria 40 transações para forçar quebra de página
      const largeBatch = [];
      for (let i = 1; i <= 40; i++) {
        largeBatch.push({
          id: `tx-${i}`,
          date: '02/09/2026',
          description: `Transação de teste volumoso número ${i}`,
          value: i % 2 === 0 ? 100 * i : -50 * i,
          category: i % 2 === 0 ? 'Receita' : 'Alimentação',
        });
      }

      const summary = generateSummary(largeBatch);
      const pdfBuffer = await generatePDF(summary, largeBatch);

      assert.ok(Buffer.isBuffer(pdfBuffer));
      assert.ok(pdfBuffer.length > 5000);
    });
  });

  describe('reportController Integration', () => {
    function createMockRes() {
      const res = {
        statusCode: 200,
        headers: {},
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = data;
          return this;
        },
        setHeader(key, value) {
          this.headers[key] = value;
          return this;
        },
        send(data) {
          this.body = data;
          return this;
        },
        end(data) {
          this.body = data;
          return this;
        },
      };
      return res;
    }

    it('getSummary deve retornar 400 se transactions não for array', async () => {
      const req = { body: { transactions: 'invalido' } };
      const res = createMockRes();
      await reportController.getSummary(req, res, () => {});

      assert.equal(res.statusCode, 400);
      assert.equal(res.body.success, false);
    });

    it('getSummary deve retornar 200 com resumo financeiro para payload válido', async () => {
      const req = { body: { transactions: sampleTransactions } };
      const res = createMockRes();
      await reportController.getSummary(req, res, () => {});

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.totals.income, 6200.0);
    });

    it('exportCSV deve configurar headers de download e retornar string CSV', async () => {
      const req = { body: { transactions: sampleTransactions } };
      const res = createMockRes();
      await reportController.exportCSV(req, res, () => {});

      assert.equal(res.statusCode, 200);
      assert.equal(res.headers['Content-Type'], 'text/csv; charset=utf-8');
      assert.ok(res.headers['Content-Disposition'].includes('relatorio_financeiro.csv'));
      assert.equal(typeof res.body, 'string');
      assert.equal(res.body.charCodeAt(0), 0xfeff);
    });

    it('exportPDF deve configurar headers de download e retornar Buffer binário', async () => {
      const req = { body: { transactions: sampleTransactions } };
      const res = createMockRes();
      await reportController.exportPDF(req, res, () => {});

      assert.equal(res.statusCode, 200);
      assert.equal(res.headers['Content-Type'], 'application/pdf');
      assert.ok(res.headers['Content-Disposition'].includes('relatorio_financeiro.pdf'));
      assert.ok(Buffer.isBuffer(res.body));
      assert.equal(res.body.subarray(0, 5).toString('ascii'), '%PDF-');
    });
  });
});
