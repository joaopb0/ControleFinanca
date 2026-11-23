import { randomUUID } from 'node:crypto';
import { getDbPool } from '../config/database.js';
import { CategoryModel } from './category.model.js';
import { DEFAULT_CATEGORIES } from '../config/categories.js';

export const BASELINE_RULES = [
  {
    id: 'rule-receita',
    name: 'Receitas e Proventos',
    category: 'Receita',
    keywords: [
      'salario', 'salário', 'remuneracao', 'remuneração', 'pix recebido',
      'rendimento', 'dividendos', 'freelance', 'venda', 'estorno',
      'ted recebida', 'transferencia recebida', 'transferência recebida',
      'pro-labore', 'deposito', 'depósito', 'provento'
    ],
    priority: 30,
    active: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'rule-alimentacao',
    name: 'Alimentação e Restaurantes',
    category: 'Alimentação',
    keywords: [
      'mercado', 'supermercado', 'restaurante', 'lanche', 'lanchonete',
      'padaria', 'pao de acucar', 'pão de açúcar', 'ifood', 'acougue',
      'açougue', 'cafe', 'café', 'feira', 'pizzaria', 'hamburguer',
      'alelo', 'vr refeicao', 'carrefour', 'extra'
    ],
    priority: 20,
    active: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'rule-saude',
    name: 'Saúde e Cuidados',
    category: 'Saúde',
    keywords: [
      'farmacia', 'farmácia', 'drogaria', 'hospital', 'clinica',
      'clínica', 'medico', 'médico', 'consulta', 'exame', 'dentista',
      'plano de saude', 'plano de saúde', 'remedio', 'remédio',
      'laboratorio', 'laboratório', 'otica', 'ótica'
    ],
    priority: 15,
    active: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'rule-transporte',
    name: 'Transporte e Mobilidade',
    category: 'Transporte',
    keywords: [
      'uber', '99app', '99pop', '99 taxi', '99taxis', '99corrida',
      '99 corrida', '99 moto', '99moto', '99*', '99 tecnologia',
      'corrida 99', 'app 99', 'motorista 99', 'viagem 99',
      'combustivel', 'combustível', 'posto', 'gasolina', 'etanol',
      'estacionamento', 'pedagio', 'pedágio', 'metro', 'metrô',
      'onibus', 'ônibus', 'passagem', 'bilhete unico', 'bilhete único',
      'ipiranga', 'shell', 'petrobras'
    ],
    priority: 15,
    active: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'rule-moradia',
    name: 'Moradia e Habitação',
    category: 'Moradia',
    keywords: [
      'aluguel', 'condominio', 'condomínio', 'iptu', 'imobiliaria',
      'imobiliária', 'imovel', 'imóvel', 'habitacao', 'habitação',
      'reforma', 'gas encanado', 'gás encanado'
    ],
    priority: 10,
    active: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'rule-contas',
    name: 'Contas e Utilidades',
    category: 'Contas',
    keywords: [
      'energia', 'luz', 'agua', 'água', 'gas', 'gás', 'internet',
      'telefone', 'celular', 'fatura', 'boleto', 'cartao', 'cartão',
      'tarifa', 'anuidade', 'enel', 'sabesp', 'claro', 'vivo', 'tim'
    ],
    priority: 10,
    active: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'rule-lazer',
    name: 'Lazer e Entretenimento',
    category: 'Lazer',
    keywords: [
      'cinema', 'netflix', 'spotify', 'streaming', 'filmes', 'show',
      'teatro', 'viagem', 'hotel', 'steam', 'playstation', 'jogos',
      'livraria', 'clube', 'bar'
    ],
    priority: 10,
    active: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'rule-outros',
    name: 'Outros (Fallback Padrão)',
    category: 'Outros',
    keywords: ['diversos', 'tarifa avulsa', 'servico', 'correios', 'papelaria'],
    priority: 0,
    active: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
];

// Every persisted rule belongs to one authenticated user. Legacy NULL owners
// are intentionally excluded until ownership can be established independently.
function requireUserId(userId) {
  if (typeof userId !== 'string' || !userId) {
    throw new TypeError('A identidade autenticada é obrigatória para acessar regras.');
  }
}

function formatDbRow(row) {
  if (!row) return null;
  const keywords = typeof row.keywords === 'string' ? JSON.parse(row.keywords) : row.keywords;
  return {
    id: String(row.id),
    name: row.name,
    category: row.category,
    categoryId: row.categoryId,
    keywords: Array.isArray(keywords) ? keywords : [],
    priority: Number(row.priority),
    active: Boolean(row.active),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

const ruleColumns = 'id, name, category, categoryId, keywords, priority, active, createdAt, updatedAt';
const availableCategory = '(categoryId IS NULL OR EXISTS (SELECT 1 FROM user_categories c WHERE c.id = classification_rules.categoryId AND c.userId = classification_rules.userId AND c.deletedAt IS NULL))';

export const ClassificationRuleModel = {
  // The caller owns the transaction, including user creation during registration.
  seedForUser: async (connection, userId) => {
    requireUserId(userId);
    // Lock the parent row so simultaneous reset operations cannot duplicate seeds.
    await connection.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [userId]);
    await CategoryModel.seedForUser(connection, userId);
    const categories = await CategoryModel.findAll(userId, connection);
    for (const rule of BASELINE_RULES) {
      const systemKey = DEFAULT_CATEGORIES.find((category) => category.name === rule.category).key;
      const category = categories.find((item) => item.systemKey === systemKey);
      await connection.query(
        'INSERT INTO classification_rules (id, userId, name, category, categoryId, keywords, priority, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [randomUUID(), userId, rule.name, category.name, category.id, JSON.stringify(rule.keywords), rule.priority, rule.active ? 1 : 0],
      );
    }
  },

  findAll: async (userId, { activeOnly = false, category = null } = {}, connection = getDbPool()) => {
    requireUserId(userId);
    const conditions = ['userId = ?', availableCategory];
    const params = [userId];
    if (activeOnly) conditions.push('active = 1');
    if (typeof category === 'string' && category.trim()) {
      conditions.push('LOWER(category) = LOWER(?)');
      params.push(category.trim());
    }
    const [rows] = await connection.query(
      'SELECT ' + ruleColumns + ' FROM classification_rules WHERE ' + conditions.join(' AND ') + ' ORDER BY priority DESC, createdAt DESC, name ASC',
      params,
    );
    return rows.map(formatDbRow);
  },

  findById: async (userId, id, connection = getDbPool()) => {
    requireUserId(userId);
    const [rows] = await connection.query(
      'SELECT ' + ruleColumns + ' FROM classification_rules WHERE userId = ? AND id = ? AND ' + availableCategory,
      [userId, id],
    );
    return formatDbRow(rows[0]);
  },

  create: async (userId, { name, category, categoryId, keywords, priority = 0, active = true }) => {
    requireUserId(userId);
    return CategoryModel.transaction(userId, async (connection) => {
      const target = await CategoryModel.resolve(userId, { categoryId, category }, connection);
      const id = randomUUID();
      await connection.query(
        'INSERT INTO classification_rules (id, userId, name, category, categoryId, keywords, priority, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, userId, name.trim(), target.name, target.id, JSON.stringify(keywords), priority, active ? 1 : 0],
      );
      return ClassificationRuleModel.findById(userId, id, connection);
    });
  },

  update: async (userId, id, fields = {}) => {
    requireUserId(userId);
    return CategoryModel.transaction(userId, async (connection) => {
      const existing = await ClassificationRuleModel.findById(userId, id, connection);
      if (!existing) return null;
      const target = await CategoryModel.resolve(userId,
        fields.categoryId !== undefined || fields.category !== undefined ? fields : { categoryId: existing.categoryId }, connection);
      const updated = { ...existing, ...fields };
      await connection.query(
        'UPDATE classification_rules SET name = ?, category = ?, categoryId = ?, keywords = ?, priority = ?, active = ?, updatedAt = NOW() WHERE userId = ? AND id = ?',
        [updated.name, target.name, target.id, JSON.stringify(updated.keywords), updated.priority, updated.active ? 1 : 0, userId, id],
      );
      return ClassificationRuleModel.findById(userId, id, connection);
    });
  },

  delete: async (userId, id) => {
    requireUserId(userId);
    return CategoryModel.transaction(userId, async (connection) => {
      const [result] = await connection.query('DELETE FROM classification_rules WHERE userId = ? AND id = ?', [userId, id]);
      return result.affectedRows > 0;
    });
  },

  resetToDefaults: async (userId) => {
    requireUserId(userId);
    const connection = await getDbPool().getConnection();
    try {
      await connection.beginTransaction();
      await connection.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [userId]);
      await connection.query('DELETE FROM classification_rules WHERE userId = ?', [userId]);
      await ClassificationRuleModel.seedForUser(connection, userId);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return ClassificationRuleModel.findAll(userId);
  },
};

export default ClassificationRuleModel;
