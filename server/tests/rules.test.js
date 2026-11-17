import { describe, it, before, beforeEach, after } from 'node:test';
import { randomUUID } from 'node:crypto';
import { getDbPool, initDatabase } from '../src/config/database.js';
import assert from 'node:assert/strict';
import { ClassificationRuleModel, BASELINE_RULES } from '../src/models/classificationRule.model.js';
import { classificationRuleController } from '../src/controllers/classificationRule.controller.js';

// Persistence is exercised only against an explicitly selected disposable MySQL.
describe('Classification Rules Real MySQL & Controller Suite', {
  skip: process.env.AUTH_TEST_DATABASE !== '1' ? 'Requires AUTH_TEST_DATABASE=1 and a local *_test schema' : false,
}, () => {
  const userId = randomUUID();
  const otherId = randomUUID();
  const legacyId = randomUUID();
  let pool;
  let ruleIds;

  before(async () => {
    assert.match(process.env.DB_NAME || '', /_test$/);
    assert.ok(['localhost', '127.0.0.1', '::1'].includes(process.env.DB_HOST));
    assert.equal(await initDatabase(), true);
    pool = getDbPool();
    await pool.query('INSERT INTO users (id, name, email) VALUES (?, ?, ?), (?, ?, ?)', [
      userId, 'Rules Test', userId + '@example.test', otherId, 'Other Rules Test', otherId + '@example.test',
    ]);
    await ClassificationRuleModel.resetToDefaults(otherId);
    await pool.query('INSERT INTO classification_rules (id, name, category, keywords, userId) VALUES (?, ?, ?, ?, NULL)', [
      legacyId, 'Unattributed legacy rule', 'Legacy', JSON.stringify(['legacy-private-keyword']),
    ]);
  });

  beforeEach(async () => {
    const rules = await ClassificationRuleModel.resetToDefaults(userId);
    ruleIds = new Map(BASELINE_RULES.map((base) => [base.id, rules.find((rule) => rule.name === base.name).id]));
  });

  after(async () => {
    if (!pool) return;
    try {
      await pool.query('DELETE FROM classification_rules WHERE userId IN (?, ?) OR id = ?', [userId, otherId, legacyId]);
      await pool.query('DELETE FROM users WHERE id IN (?, ?)', [userId, otherId]);
    } finally {
      await pool.end();
    }
  });

  describe('ClassificationRuleModel', () => {
    it('deve listar todas as 8 regras base por padrão', async () => {
      const rules = await ClassificationRuleModel.findAll(userId);
      assert.equal(rules.length, 8);
      assert.equal(rules.length, BASELINE_RULES.length);
      assert.equal(new Set(rules.map((rule) => rule.id)).size, 8);
      assert.ok(rules.every((rule) => !BASELINE_RULES.some((base) => base.id === rule.id)));
    });

    it('deve ordenar as regras por prioridade decrescente', async () => {
      const rules = await ClassificationRuleModel.findAll(userId);
      for (let i = 0; i < rules.length - 1; i++) {
        assert.ok(
          rules[i].priority >= rules[i + 1].priority,
          `Regra ${rules[i].name} (prioridade ${rules[i].priority}) deveria ter prioridade >= regra ${rules[i + 1].name} (prioridade ${rules[i + 1].priority})`
        );
      }
    });

    it('deve filtrar regras por activeOnly e category', async () => {
      await ClassificationRuleModel.update(userId, ruleIds.get('rule-lazer'), { active: false });
      const activeRules = await ClassificationRuleModel.findAll(userId, { activeOnly: true });
      assert.equal(activeRules.length, 7);
      assert.ok(activeRules.every((r) => r.active === true));

      const foodRules = await ClassificationRuleModel.findAll(userId, { category: 'Alimentação' });
      assert.equal(foodRules.length, 1);
      assert.equal(foodRules[0].category, 'Alimentação');
    });

    it('deve encontrar uma regra pelo ID', async () => {
      const rule = await ClassificationRuleModel.findById(userId, ruleIds.get('rule-alimentacao'));
      assert.ok(rule);
      assert.equal(rule.id, ruleIds.get('rule-alimentacao'));
      assert.equal(rule.category, 'Alimentação');
    });

    it('deve retornar null para ID inexistente', async () => {
      const rule = await ClassificationRuleModel.findById(userId, 'rule-nao-existe');
      assert.equal(rule, null);
    });

    it('deve criar uma nova regra com sucesso', async () => {
      const newRule = await ClassificationRuleModel.create(userId, {
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

      const all = await ClassificationRuleModel.findAll(userId);
      assert.equal(all.length, 9);
    });

    it('deve atualizar uma regra existente', async () => {
      const updated = await ClassificationRuleModel.update(userId, ruleIds.get('rule-moradia'), {
        name: 'Habitação e Reformas',
        priority: 40,
      });

      assert.ok(updated);
      assert.equal(updated.name, 'Habitação e Reformas');
      assert.equal(updated.priority, 40);

      const fetched = await ClassificationRuleModel.findById(userId, ruleIds.get('rule-moradia'));
      assert.equal(fetched.name, 'Habitação e Reformas');
      assert.equal(fetched.priority, 40);
    });

    it('deve retornar null ao atualizar regra inexistente', async () => {
      const result = await ClassificationRuleModel.update(userId, 'rule-fantasma', { name: 'Fantasma' });
      assert.equal(result, null);
    });

    it('deve excluir uma regra com sucesso', async () => {
      const deleted = await ClassificationRuleModel.delete(userId, ruleIds.get('rule-outros'));
      assert.equal(deleted, true);

      const fetched = await ClassificationRuleModel.findById(userId, ruleIds.get('rule-outros'));
      assert.equal(fetched, null);

      const all = await ClassificationRuleModel.findAll(userId);
      assert.equal(all.length, 7);
    });

    it('deve retornar false ao excluir regra inexistente', async () => {
      const deleted = await ClassificationRuleModel.delete(userId, 'rule-fantasma');
      assert.equal(deleted, false);
    });

    it('deve resetar regras para as 8 originais com resetToDefaults', async () => {
      await ClassificationRuleModel.delete(userId, ruleIds.get('rule-receita'));
      await ClassificationRuleModel.delete(userId, ruleIds.get('rule-lazer'));
      let current = await ClassificationRuleModel.findAll(userId);
      assert.equal(current.length, 6);

      await ClassificationRuleModel.resetToDefaults(userId);
      current = await ClassificationRuleModel.findAll(userId);
      assert.equal(current.length, 8);
    });
  });

  it('não permite ler, alterar ou excluir regra particular de outra conta', async () => {
    const rule = await ClassificationRuleModel.create(otherId, { name: 'Particular', category: 'Privada', keywords: ['segredo'] });
    assert.equal(await ClassificationRuleModel.findById(userId, rule.id), null);
    assert.equal(await ClassificationRuleModel.update(userId, rule.id, { name: 'Invadida' }), null);
    assert.equal(await ClassificationRuleModel.delete(userId, rule.id), false);
    assert.equal((await ClassificationRuleModel.findById(otherId, rule.id)).name, 'Particular');
    await ClassificationRuleModel.delete(otherId, rule.id);
  });

  it('reset não altera regras de outra conta nem revela regras antigas sem proprietário', async () => {
    const otherRules = await ClassificationRuleModel.findAll(otherId);
    await ClassificationRuleModel.resetToDefaults(userId);
    assert.deepEqual(await ClassificationRuleModel.findAll(otherId), otherRules);
    assert.equal(await ClassificationRuleModel.findById(userId, legacyId), null);
    assert.equal(await ClassificationRuleModel.findById(otherId, legacyId), null);
    assert.equal(await ClassificationRuleModel.delete(userId, legacyId), false);
    assert.ok((await ClassificationRuleModel.findAll(userId)).every((rule) => rule.id !== legacyId));
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
      const req = { user: { id: userId }, body: { name: '', category: '', keywords: [] } };
      const res = createMockRes();
      await classificationRuleController.create(req, res, (error) => { throw error; });

      assert.equal(res.statusCode, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.message.includes('obrigatórios'));
    });

    it('deve rejeitar criação quando keywords estiver vazio', async () => {
      const req = { user: { id: userId }, body: { name: 'Teste', category: 'Lazer', keywords: [] } };
      const res = createMockRes();
      await classificationRuleController.create(req, res, (error) => { throw error; });

      assert.equal(res.statusCode, 400);
      assert.equal(res.body.success, false);
    });

    it('deve retornar 404 ao buscar ID inexistente', async () => {
      const req = { user: { id: userId }, params: { id: 'nao-existe' } };
      const res = createMockRes();
      await classificationRuleController.getById(req, res, (error) => { throw error; });

      assert.equal(res.statusCode, 404);
      assert.equal(res.body.success, false);
    });

    it('deve retornar 404 ao atualizar ID inexistente', async () => {
      const req = { user: { id: userId }, params: { id: 'nao-existe' }, body: { name: 'Novo Nome' } };
      const res = createMockRes();
      await classificationRuleController.update(req, res, (error) => { throw error; });

      assert.equal(res.statusCode, 404);
      assert.equal(res.body.success, false);
    });

    it('deve retornar 404 ao deletar ID inexistente', async () => {
      const req = { user: { id: userId }, params: { id: 'nao-existe' } };
      const res = createMockRes();
      await classificationRuleController.delete(req, res, (error) => { throw error; });

      assert.equal(res.statusCode, 404);
      assert.equal(res.body.success, false);
    });

    it('deve criar regra com sucesso via controller (status 201)', async () => {
      const req = { user: { id: userId },
        body: {
          userId: otherId,
          name: 'Nova Regra Teste',
          category: 'Teste',
          keywords: ['palavra1', 'palavra2'],
          priority: 5,
        },
      };
      const res = createMockRes();
      await classificationRuleController.create(req, res, (error) => { throw error; });

      assert.equal(res.statusCode, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.name, 'Nova Regra Teste');
      assert.equal(await ClassificationRuleModel.findById(otherId, res.body.data.id), null);
      assert.ok(await ClassificationRuleModel.findById(userId, res.body.data.id));
    });
  });
});


describe('Classification rules identity boundary without a database', () => {
  it('rejects missing or untrusted identity before querying persistence', async () => {
    await assert.rejects(ClassificationRuleModel.findAll(), /identidade autenticada/);
    await assert.rejects(ClassificationRuleModel.create(null, {}), /identidade autenticada/);
    await assert.rejects(ClassificationRuleModel.update(undefined, 'rule-id'), /identidade autenticada/);
    await assert.rejects(ClassificationRuleModel.delete({}, 'rule-id'), /identidade autenticada/);
    await assert.rejects(ClassificationRuleModel.resetToDefaults(), /identidade autenticada/);
  });
});
