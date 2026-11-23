import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeText,
  classifyItem,
  classifyBatch,
} from '../src/services/classifier.service.js';
import { ClassificationRuleModel, BASELINE_RULES } from '../src/models/classificationRule.model.js';
import { classifierController } from '../src/controllers/classifier.controller.js';
import { CategoryModel } from '../src/models/category.model.js';
import { CategoryPreferenceModel } from '../src/models/categoryPreference.model.js';

function mockCategoryContext() {
  mock.method(CategoryModel, 'transaction', async (userId, operation) => {
    assert.equal(userId, 'authenticated-user');
    return operation({});
  });
  mock.method(CategoryModel, 'findAll', async () => [{ id: 'fallback', name: 'Outros', isFallback: true }]);
  mock.method(CategoryPreferenceModel, 'findAll', async () => []);
}

describe('Classifier Engine & Normalization Suite', () => {

  describe('normalizeText', () => {
    it('deve remover diacríticos e acentos corretamente (NFD)', () => {
      assert.equal(normalizeText('Pão de Açúcar'), 'pao de acucar');
      assert.equal(normalizeText('Farmácia'), 'farmacia');
      assert.equal(normalizeText('Crédito & Débito'), 'credito & debito');
      assert.equal(normalizeText('ÁÉÍÓÚ âêîôû ãõ ç'), 'aeiou aeiou ao c');
    });

    it('deve converter para minúsculas e aparar espaços em branco', () => {
      assert.equal(normalizeText('  SUPERMERCADO EXTRA  '), 'supermercado extra');
      assert.equal(normalizeText('\tUBER DO BRASIL\n'), 'uber do brasil');
    });

    it('deve retornar string vazia para entradas nulas, indefinidas ou não-string', () => {
      assert.equal(normalizeText(null), '');
      assert.equal(normalizeText(undefined), '');
      assert.equal(normalizeText(''), '');
      assert.equal(normalizeText(123), '');
      assert.equal(normalizeText({}), '');
    });
  });

  describe('classifyItem', () => {
    it('deve classificar uma descrição contendo palavra-chave da regra', async () => {
      const rules = BASELINE_RULES;
      const result = classifyItem('Supermercado Pão de Açúcar', rules);

      assert.equal(result.category, 'Alimentação');
      assert.ok(result.ruleId);
      assert.ok(result.matchedKeyword);
    });

    it('deve respeitar a prioridade de regras com maior prioridade vencendo', () => {
      const mockRules = [
        {
          id: 'rule-low',
          category: 'Transporte',
          keywords: ['posto'],
          priority: 5,
          active: true,
        },
        {
          id: 'rule-high',
          category: 'Alimentação',
          keywords: ['posto'],
          priority: 50,
          active: true,
        },
      ];

      // Ordenadas por prioridade desc
      const sorted = [...mockRules].sort((a, b) => b.priority - a.priority);
      const result = classifyItem('Abastecimento no Posto Shell', sorted);

      assert.equal(result.category, 'Alimentação');
      assert.equal(result.ruleId, 'rule-high');
    });

    it('deve ignorar regras inativas', () => {
      const mockRules = [
        {
          id: 'rule-inactive',
          category: 'Lazer',
          keywords: ['cinema'],
          priority: 100,
          active: false,
        },
        {
          id: 'rule-active',
          category: 'Outros',
          keywords: ['shopping'],
          priority: 1,
          active: true,
        },
      ];

      const result = classifyItem('Ingresso cinema no shopping', mockRules);
      assert.equal(result.category, 'Outros');
      assert.equal(result.ruleId, 'rule-active');
    });

    it('deve atribuir o fallback "Outros" quando nenhuma regra corresponder', async () => {
      const rules = BASELINE_RULES;
      const result = classifyItem('Pagamento misterioso 987654 xyz', rules);

      assert.equal(result.category, 'Outros');
      assert.equal(result.ruleId, null);
      assert.equal(result.matchedKeyword, null);
    });

    it('deve atribuir o fallback "Outros" para descrição vazia ou nula', async () => {
      const rules = BASELINE_RULES;

      assert.equal(classifyItem('', rules).category, 'Outros');
      assert.equal(classifyItem('   ', rules).category, 'Outros');
      assert.equal(classifyItem({ description: '' }, rules).category, 'Outros');
      assert.equal(classifyItem(null, rules).category, 'Outros');
    });
  });

  describe('classifyBatch', () => {
    it('deve classificar lote de transações completas preservando campos originais', async () => {
      const transactions = [
        { id: 'tx-1', date: '02/09/2026', description: 'Mercado Central', value: -150.0 },
        { id: 'tx-2', date: '05/09/2026', description: 'Uber viagem SP', value: -35.5 },
        { id: 'tx-3', date: '10/09/2026', description: 'Compra Loja Inexistente', value: -80.0 },
      ];

      const result = await classifyBatch(transactions, BASELINE_RULES);

      assert.equal(result.summary.total, 3);
      assert.equal(result.summary.classified, 2);
      assert.equal(result.summary.fallbackCount, 1);

      assert.equal(result.data[0].id, 'tx-1');
      assert.equal(result.data[0].date, '02/09/2026');
      assert.equal(result.data[0].value, -150.0);
      assert.equal(result.data[0].category, 'Alimentação');
      assert.ok(result.data[0].matchedKeyword);

      assert.equal(result.data[1].category, 'Transporte');
      assert.equal(result.data[2].category, 'Outros');
      assert.equal(result.data[2].ruleId, null);
    });

    it('deve aceitar array de strings de descrições', async () => {
      const descriptions = ['Salário mensal', 'Farmácia Raia', 'Algo desconhecido'];
      const result = await classifyBatch(descriptions, BASELINE_RULES);

      assert.equal(result.summary.total, 3);
      assert.equal(result.summary.classified, 2);
      assert.equal(result.summary.fallbackCount, 1);

      assert.equal(result.data[0].category, 'Receita');
      assert.equal(result.data[1].category, 'Saúde');
      assert.equal(result.data[2].category, 'Outros');
    });

    it('deve lidar com lote vazio sem erros', async () => {
      const result = await classifyBatch([], BASELINE_RULES);
      assert.equal(result.summary.total, 0);
      assert.equal(result.summary.classified, 0);
      assert.equal(result.summary.fallbackCount, 0);
      assert.deepEqual(result.data, []);
    });

    it('deve classificar com precisão os 8 exemplos do mockData oficial', async () => {
      const mockTransactions = [
        { id: '1', date: '02/09/2026', description: 'Supermercado Pão de Açúcar', value: -245.5 },
        { id: '2', date: '03/09/2026', description: 'Transferência Recebida - Salário', value: 5800.0 },
        { id: '3', date: '04/09/2026', description: 'Restaurante Sabor & Arte', value: -78.9 },
        { id: '4', date: '05/09/2026', description: 'Posto Shell Combustível', value: -180.0 },
        { id: '5', date: '06/09/2026', description: 'Aluguel Apartamento', value: -1800.0 },
        { id: '6', date: '07/09/2026', description: 'Farmácia Drogasil', value: -124.3 },
        { id: '7', date: '08/09/2026', description: 'Conta de Luz Enel', value: -210.4 },
        { id: '8', date: '09/09/2026', description: 'Cinema Shopping Lazer', value: -64.0 },
      ];

      const result = await classifyBatch(mockTransactions, BASELINE_RULES);

      assert.equal(result.summary.total, 8);
      assert.equal(result.summary.classified, 8);
      assert.equal(result.summary.fallbackCount, 0);

      const categories = result.data.map((t) => t.category);
      assert.deepEqual(categories, [
        'Alimentação',
        'Receita',
        'Alimentação',
        'Transporte',
        'Moradia',
        'Saúde',
        'Contas',
        'Lazer',
      ]);
    });
  });

  describe('Regressão de Colisão de Palavras-Chave (Finding 3: Bare 99 Refinement)', () => {
    it('não deve classificar "Boleto Condomínio 9923" como Transporte', async () => {
      const rules = BASELINE_RULES;
      const result = classifyItem('Boleto Condomínio 9923', rules);

      assert.notEqual(result.category, 'Transporte');
      assert.notEqual(result.matchedKeyword, '99');
      // Deve classificar como Moradia ou Contas (regras legítimas com prioridade 10)
      assert.ok(['Moradia', 'Contas'].includes(result.category));
    });

    it('não deve interceptar outras transações com dígitos 99 como Transporte', async () => {
      const rules = BASELINE_RULES;

      const testCases = [
        { desc: 'Supermercado R$ 199.90', expectedNot: 'Transporte', expected: 'Alimentação' },
        { desc: 'Fatura Cartão Final 9912', expectedNot: 'Transporte', expected: 'Contas' },
        { desc: 'Consulta Médica Sala 99', expectedNot: 'Transporte', expected: 'Saúde' },
        { desc: 'Aluguel Apartamento 99', expectedNot: 'Transporte', expected: 'Moradia' },
        { desc: 'Conta de Luz Enel 99001', expectedNot: 'Transporte', expected: 'Contas' },
        { desc: 'Cinema Sala 99', expectedNot: 'Transporte', expected: 'Lazer' },
        { desc: 'Compra Avulsa 99', expectedNot: 'Transporte', expected: 'Outros' },
      ];

      for (const tc of testCases) {
        const res = classifyItem(tc.desc, rules);
        assert.notEqual(res.category, tc.expectedNot, `Descrição "${tc.desc}" não deveria ser ${tc.expectedNot}`);
        assert.equal(res.category, tc.expected, `Descrição "${tc.desc}" deveria ser ${tc.expected}`);
      }
    });

    it('deve classificar corretamente os 14 descritivos brasileiros de mobilidade da 99 como Transporte', async () => {
      const rules = BASELINE_RULES;

      const mobility99Cases = [
        '99app *corrida',
        '99POP *SAO PAULO',
        '99 Taxi Centro',
        '99taxis sp',
        '99corrida centro',
        '99 corrida aeroporto',
        '99 moto entrega',
        '99moto corrida',
        '99*MOTORISTA',
        '99 Tecnologia Ltda',
        'Corrida 99 realizada',
        'App 99 viagem',
        'Motorista 99 parceiro',
        'Viagem 99 trabalho',
      ];

      for (const desc of mobility99Cases) {
        const res = classifyItem(desc, rules);
        assert.equal(res.category, 'Transporte', `"${desc}" deve ser classificado como Transporte`);
        assert.equal(res.ruleId, 'rule-transporte');
      }
    });
  });

  describe('classifierController Unit', () => {
    function createMockRes() {
      const res = {
        statusCode: 200,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = data;
          return this;
        },
      };
      return res;
    }

    it('classify deve rejeitar requisição sem transactions nem descriptions com 400', async () => {
      const req = { user: { id: 'authenticated-user' }, body: {} };
      const res = createMockRes();
      await classifierController.classify(req, res, (error) => { throw error; });

      assert.equal(res.statusCode, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.message.includes('transactions'));
    });

    it('classify usa a identidade autenticada para buscar regras e preserva o resumo', async (t) => {
      t.after(() => mock.restoreAll());
      mockCategoryContext();
      mock.method(ClassificationRuleModel, 'findAll', async (userId) => {
        assert.equal(userId, 'authenticated-user');
        return BASELINE_RULES;
      });
      const req = { user: { id: 'authenticated-user' },
        body: {
          transactions: [
            { id: '1', date: '02/09/2026', description: 'Supermercado Extra', value: -200.0 },
          ],
        },
      };
      const res = createMockRes();
      await classifierController.classify(req, res, (error) => { throw error; });

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data[0].category, 'Alimentação');
      assert.equal(res.body.summary.total, 1);
      assert.equal(res.body.summary.classified, 1);
      assert.equal(res.body.summary.fallbackCount, 0);
    });

    it('classify deve rejeitar lote maior que 5000 itens com status 400', async () => {
      const tooMany = new Array(5001).fill('teste');
      const req = { user: { id: 'authenticated-user' }, body: { descriptions: tooMany } };
      const res = createMockRes();
      await classifierController.classify(req, res, (error) => { throw error; });

      assert.equal(res.statusCode, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.message.includes('5000'));
    });

    it('testMatch consulta somente as regras da identidade autenticada', async (t) => {
      t.after(() => mock.restoreAll());
      mockCategoryContext();
      mock.method(ClassificationRuleModel, 'findAll', async (userId) => {
        assert.equal(userId, 'authenticated-user');
        return BASELINE_RULES;
      });
      const req = { user: { id: 'authenticated-user' }, body: { description: 'Uber viagem centro' } };
      const res = createMockRes();
      await classifierController.testMatch(req, res, (error) => { throw error; });

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.category, 'Transporte');
      assert.ok(res.body.data.matchedKeyword);
      assert.ok(res.body.data.matchedRuleName);
    });

    it('testMatch deve retornar 400 quando description for omitida', async () => {
      const req = { user: { id: 'authenticated-user' }, body: {} };
      const res = createMockRes();
      await classifierController.testMatch(req, res, (error) => { throw error; });

      assert.equal(res.statusCode, 400);
      assert.equal(res.body.success, false);
    });
  });
});
