import { getDbPool, isDbConnected } from '../config/database.js';

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

// In-memory fallback copy
let memoryRules = BASELINE_RULES.map((rule) => ({
  ...rule,
  keywords: [...rule.keywords],
}));

/**
 * Normaliza um registro lido do banco de dados MySQL
 */
function formatDbRow(row) {
  if (!row) return null;
  let keywords = [];
  try {
    keywords = typeof row.keywords === 'string' ? JSON.parse(row.keywords) : row.keywords;
  } catch {
    keywords = Array.isArray(row.keywords) ? row.keywords : [];
  }

  return {
    id: String(row.id),
    name: row.name,
    category: row.category,
    keywords: Array.isArray(keywords) ? keywords : [],
    priority: Number(row.priority) || 0,
    active: Boolean(row.active),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

export const ClassificationRuleModel = {
  /**
   * Inicializa a tabela classification_rules no MySQL se o banco estiver conectado
   */
  initTable: async () => {
    if (!isDbConnected()) return;

    const pool = getDbPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS classification_rules (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        keywords JSON NOT NULL,
        priority INT DEFAULT 0,
        active BOOLEAN DEFAULT TRUE,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_rules_priority_active (active, priority DESC)
      )
    `);

    const [rows] = await pool.query('SELECT COUNT(*) as count FROM classification_rules');
    if (rows[0].count === 0) {
      for (const rule of BASELINE_RULES) {
        await pool.query(
          `INSERT INTO classification_rules (id, name, category, keywords, priority, active, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            rule.id,
            rule.name,
            rule.category,
            JSON.stringify(rule.keywords),
            rule.priority,
            rule.active ? 1 : 0,
          ]
        );
      }
      console.log('📦 Tabela `classification_rules` inicializada e populada com 8 regras base.');
    }
  },

  /**
   * Retorna todas as regras com filtros opcionais
   */
  findAll: async ({ activeOnly = false, category = null } = {}) => {
    if (!isDbConnected()) {
      let filtered = [...memoryRules];
      if (activeOnly) {
        filtered = filtered.filter((r) => r.active === true);
      }
      if (category && typeof category === 'string') {
        filtered = filtered.filter((r) => r.category.toLowerCase() === category.toLowerCase().trim());
      }
      return filtered.sort((a, b) => (b.priority - a.priority) || a.name.localeCompare(b.name));
    }

    const pool = getDbPool();
    const conditions = [];
    const params = [];

    if (activeOnly) {
      conditions.push('active = 1');
    }
    if (category && typeof category === 'string') {
      conditions.push('LOWER(category) = LOWER(?)');
      params.push(category.trim());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM classification_rules ${whereClause} ORDER BY priority DESC, createdAt DESC, name ASC`;
    const [rows] = await pool.query(query, params);
    return rows.map(formatDbRow);
  },

  /**
   * Busca uma regra pelo ID
   */
  findById: async (id) => {
    if (!isDbConnected()) {
      const rule = memoryRules.find((r) => r.id === id);
      return rule ? { ...rule, keywords: [...rule.keywords] } : null;
    }

    const pool = getDbPool();
    const [rows] = await pool.query('SELECT * FROM classification_rules WHERE id = ?', [id]);
    return rows[0] ? formatDbRow(rows[0]) : null;
  },

  /**
   * Cria uma nova regra de classificação
   */
  create: async ({ name, category, keywords, priority = 0, active = true }) => {
    const id = `rule-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const cleanKeywords = Array.isArray(keywords)
      ? keywords.map((k) => String(k).trim()).filter(Boolean)
      : [];
    const numPriority = Number(priority) || 0;
    const boolActive = Boolean(active);

    const newRule = {
      id,
      name: String(name).trim(),
      category: String(category).trim(),
      keywords: cleanKeywords,
      priority: numPriority,
      active: boolActive,
      createdAt: now,
      updatedAt: now,
    };

    if (!isDbConnected()) {
      memoryRules.unshift(newRule);
      return { ...newRule, keywords: [...newRule.keywords] };
    }

    const pool = getDbPool();
    await pool.query(
      `INSERT INTO classification_rules (id, name, category, keywords, priority, active, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id,
        newRule.name,
        newRule.category,
        JSON.stringify(cleanKeywords),
        numPriority,
        boolActive ? 1 : 0,
      ]
    );

    return newRule;
  },

  /**
   * Atualiza uma regra existente pelo ID
   */
  update: async (id, fields = {}) => {
    const existing = await ClassificationRuleModel.findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated = {
      ...existing,
      ...(fields.name !== undefined && { name: String(fields.name).trim() }),
      ...(fields.category !== undefined && { category: String(fields.category).trim() }),
      ...(fields.keywords !== undefined && {
        keywords: Array.isArray(fields.keywords)
          ? fields.keywords.map((k) => String(k).trim()).filter(Boolean)
          : existing.keywords,
      }),
      ...(fields.priority !== undefined && { priority: Number(fields.priority) || 0 }),
      ...(fields.active !== undefined && { active: Boolean(fields.active) }),
      updatedAt: now,
    };

    if (!isDbConnected()) {
      const index = memoryRules.findIndex((r) => r.id === id);
      if (index !== -1) {
        memoryRules[index] = { ...updated, keywords: [...updated.keywords] };
      }
      return updated;
    }

    const pool = getDbPool();
    await pool.query(
      `UPDATE classification_rules
       SET name = ?, category = ?, keywords = ?, priority = ?, active = ?, updatedAt = NOW()
       WHERE id = ?`,
      [
        updated.name,
        updated.category,
        JSON.stringify(updated.keywords),
        updated.priority,
        updated.active ? 1 : 0,
        id,
      ]
    );

    return updated;
  },

  /**
   * Remove uma regra pelo ID
   */
  delete: async (id) => {
    if (!isDbConnected()) {
      const index = memoryRules.findIndex((r) => r.id === id);
      if (index === -1) return false;
      memoryRules.splice(index, 1);
      return true;
    }

    const pool = getDbPool();
    const [result] = await pool.query('DELETE FROM classification_rules WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  /**
   * Restaura todas as regras para o conjunto inicial (seed baseline)
   */
  resetToDefaults: async () => {
    memoryRules = BASELINE_RULES.map((rule) => ({
      ...rule,
      keywords: [...rule.keywords],
    }));

    if (!isDbConnected()) {
      return [...memoryRules];
    }

    const pool = getDbPool();
    await pool.query('DELETE FROM classification_rules');
    for (const rule of BASELINE_RULES) {
      await pool.query(
        `INSERT INTO classification_rules (id, name, category, keywords, priority, active, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          rule.id,
          rule.name,
          rule.category,
          JSON.stringify(rule.keywords),
          rule.priority,
          rule.active ? 1 : 0,
        ]
      );
    }
    return ClassificationRuleModel.findAll();
  },
};

export default ClassificationRuleModel;
