import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ClassificationRuleModel, BASELINE_RULES } from '../src/models/classificationRule.model.js';
import { classificationRuleController } from '../src/controllers/classificationRule.controller.js';

describe('Classification Rules Model & Controller Suite', () => {
  beforeEach(async () => {
    await ClassificationRuleModel.resetToDefaults();
  });

  describe('ClassificationRuleModel', () => {
    it('deve listar todas as 8 regras base por padrão', async () => {
      const rules = await ClassificationRuleModel.findAll();
      assert.equal(rules.length, 8);
      assert.equal(rules.length, BASELINE_RULES.length);
    });

    it('deve ordenar as regras por prioridade decrescente', async () => {
      const rules = await ClassificationRuleModel.findAll();
      for (let i = 0; i < rules.length - 1; i++) {
        assert.ok(
          rules[i].priority >= rules[i + 1].priority,
          `Regra ${rules[i].name} (prioridade ${rules[i].priority}) deveria ter prioridade >= regra ${rules[i + 1].name} (prioridade ${rules[i + 1].priority})`
        );
      }
    });

    it('deve filtrar regras por activeOnly e category', async () => {
      const activeRules = await ClassificationRuleModel.findAll({ activeOnly: true });
      assert.ok(activeRules.every((r) => r.active === true));

      const foodRules = await ClassificationRuleModel.findAll({ category: 'Alimentação' });
      assert.equal(foodRules.length, 1);
      assert.equal(foodRules[0].category, 'Alimentação');
    });

    it('deve encontrar uma regra pelo ID', async () => {
      const rule = await ClassificationRuleModel.findById('rule-alimentacao');
      assert.ok(rule);
      assert.equal(rule.id, 'rule-alimentacao');
      assert.equal(rule.category, 'Alimentação');
    });

    it('deve retornar null para ID inexistente', async () => {
      const rule = await ClassificationRuleModel.findById('rule-nao-existe');
      assert.equal(rule, null);
    });

    it('deve criar uma nova regra com sucesso', async () => {
      const newRule = await ClassificationRuleModel.create({
        name: 'Investimentos Cripto',
        category: 'Investimentos',
        keywords: ['binance', 'bitcoin', 'crypto'],
        priority: 25,
        active: true,
      });

      assert.ok(newRule.id);
      assert.equal(newRule.name, 'Investimentos Cripto');
      assert.equal(newRule.category, 'Investimentos');
      assert.deepEqual(newRule.keywords, ['binance', 'bitcoin', 'crypto']);
      assert.equal(newRule.priority, 25);
      assert.equal(newRule.active, true);

      const all = await ClassificationRuleModel.findAll();
      assert.equal(all.length, 9);
    });

    it('deve atualizar uma regra existente', async () => {
      const updated = await ClassificationRuleModel.update('rule-moradia', {
        name: 'Habitação e Reformas',
        priority: 40,
      });

      assert.ok(updated);
      assert.equal(updated.name, 'Habitação e Reformas');
      assert.equal(updated.priority, 40);

      const fetched = await ClassificationRuleModel.findById('rule-moradia');
      assert.equal(fetched.name, 'Habitação e Reformas');
      assert.equal(fetched.priority, 40);
    });

    it('deve retornar null ao atualizar regra inexistente', async () => {
      const result = await ClassificationRuleModel.update('rule-fantasma', { name: 'Fantasma' });
      assert.equal(result, null);
    });

    it('deve excluir uma regra com sucesso', async () => {
      const deleted = await ClassificationRuleModel.delete('rule-outros');
      assert.equal(deleted, true);

      const fetched = await ClassificationRuleModel.findById('rule-outros');
      assert.equal(fetched, null);

      const all = await ClassificationRuleModel.findAll();
      assert.equal(all.length, 7);
    });

    it('deve retornar false ao excluir regra inexistente', async () => {
      const deleted = await ClassificationRuleModel.delete('rule-fantasma');
      assert.equal(deleted, false);
    });

    it('deve resetar regras para as 8 originais com resetToDefaults', async () => {
      await ClassificationRuleModel.delete('rule-receita');
      await ClassificationRuleModel.delete('rule-lazer');
      let current = await ClassificationRuleModel.findAll();
      assert.equal(current.length, 6);

      await ClassificationRuleModel.resetToDefaults();
      current = await ClassificationRuleModel.findAll();
      assert.equal(current.length, 8);
    });
  });

  describe('classificationRuleController Validation', () => {
    // Helper para mock de res
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

    it('deve rejeitar criação sem campos obrigatórios com status 400', async () => {
      const req = { body: { name: '', category: '', keywords: [] } };
      const res = createMockRes();
      await classificationRuleController.create(req, res, () => {});

      assert.equal(res.statusCode, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.message.includes('obrigatórios'));
    });

    it('deve rejeitar criação quando keywords estiver vazio', async () => {
      const req = { body: { name: 'Teste', category: 'Lazer', keywords: [] } };
      const res = createMockRes();
      await classificationRuleController.create(req, res, () => {});

      assert.equal(res.statusCode, 400);
      assert.equal(res.body.success, false);
    });

    it('deve retornar 404 ao buscar ID inexistente', async () => {
      const req = { params: { id: 'nao-existe' } };
      const res = createMockRes();
      await classificationRuleController.getById(req, res, () => {});

      assert.equal(res.statusCode, 404);
      assert.equal(res.body.success, false);
    });

    it('deve retornar 404 ao atualizar ID inexistente', async () => {
      const req = { params: { id: 'nao-existe' }, body: { name: 'Novo Nome' } };
      const res = createMockRes();
      await classificationRuleController.update(req, res, () => {});

      assert.equal(res.statusCode, 404);
      assert.equal(res.body.success, false);
    });

    it('deve retornar 404 ao deletar ID inexistente', async () => {
      const req = { params: { id: 'nao-existe' } };
      const res = createMockRes();
      await classificationRuleController.delete(req, res, () => {});

      assert.equal(res.statusCode, 404);
      assert.equal(res.body.success, false);
    });

    it('deve criar regra com sucesso via controller (status 201)', async () => {
      const req = {
        body: {
          name: 'Nova Regra Teste',
          category: 'Teste',
          keywords: ['palavra1', 'palavra2'],
          priority: 5,
        },
      };
      const res = createMockRes();
      await classificationRuleController.create(req, res, () => {});

      assert.equal(res.statusCode, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.name, 'Nova Regra Teste');
    });
  });
});
