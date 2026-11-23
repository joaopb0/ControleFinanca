import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';

test('Migration de autenticação preserva tabelas e registros legados e pode ser repetida', {
  skip: process.env.AUTH_TEST_DATABASE === '1' ? false : 'Requer MySQL local isolado com AUTH_TEST_DATABASE=1.',
  timeout: 30000,
}, async (t) => {
  assert.match(process.env.DB_NAME || '', /_test$/);
  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(process.env.DB_HOST));
  const schema = `cf_migration_${randomUUID().replaceAll('-', '')}_test`;
  assert.match(schema, /^cf_migration_[a-f0-9]+_test$/);
  const admin = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  let pool;
  let createdSchema = false;
  t.after(async () => {
    try {
      if (pool) await pool.end();
      // The schema was generated and created by this test; no existing schema is removed.
      if (createdSchema) await admin.query(`DROP DATABASE \`${schema}\``);
    } finally {
      await admin.end();
    }
  });
  await admin.query(`CREATE DATABASE \`${schema}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  createdSchema = true;
  await admin.changeUser({ database: schema });
  await admin.query(`CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(100) DEFAULT 'Desenvolvedor',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  await admin.query(`CREATE TABLE classification_rules (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    keywords JSON NOT NULL,
    priority INT DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_rules_priority_active (active, priority DESC)
  )`);
  const legacyId = randomUUID();
  const legacyRuleId = randomUUID();
  await admin.query('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [legacyId, 'Registro legado', ' LEGACY@example.test ']);
  await admin.query('INSERT INTO classification_rules (id, name, category, keywords) VALUES (?, ?, ?, ?)',
    [legacyRuleId, 'Regra particular antiga', 'Reservada', JSON.stringify(['legado'])]);

  // Leading whitespace allowed a distinct legacy row despite the old email UNIQUE key.
  const conflictingId = randomUUID();
  await admin.query('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [conflictingId, 'Conflito legado', 'legacy@example.test']);
  const { migrateAuthentication } = await import('../src/migrations/001-authentication.js');
  await assert.rejects(migrateAuthentication(admin), /MIGRATION_DUPLICATE_EMAIL/);
  const [beforeColumns] = await admin.query("SHOW COLUMNS FROM users LIKE 'passwordHash'");
  assert.equal(beforeColumns.length, 0, 'Colisão aborta antes de alterar o schema ou criar credenciais.');
  const [beforeUsers] = await admin.query('SELECT id FROM users');
  assert.equal(beforeUsers.length, 2, 'Nenhuma conta conflitante é mesclada ou apagada.');
  await admin.query('DELETE FROM users WHERE id = ?', [conflictingId]);

  await migrateAuthentication(admin);
  const ownedRuleId = randomUUID();
  await admin.query('INSERT INTO classification_rules (id, userId, name, category, keywords, priority) VALUES (?, ?, ?, ?, ?, ?)',
    [ownedRuleId, legacyId, 'Mensalidade personalizada', 'Educação personalizada', JSON.stringify(['mensalidade']), 77]);

  process.env.DB_NAME = schema;
  process.env.NODE_ENV = 'test';
  const { initDatabase, getDbPool } = await import('../src/config/database.js');
  const { ClassificationRuleModel } = await import('../src/models/classificationRule.model.js');
  pool = getDbPool();
  assert.equal(await initDatabase(), true);
  assert.equal(await initDatabase(), true, 'Segunda inicialização deve ser idempotente.');
  const [users] = await admin.query('SELECT id, name, email, passwordHash FROM users');
  assert.equal(users.length, 1, 'Migration não cria contas padrão.');
  assert.equal(users[0].id, legacyId);
  assert.equal(users[0].name, 'Registro legado');
  assert.equal(users[0].email, 'legacy@example.test');
  assert.equal(users[0].passwordHash, null, 'Migration não inventa senha para registro legado.');
  const [rules] = await admin.query('SELECT id, userId, categoryId, priority FROM classification_rules');
  assert.equal(rules.length, 2);
  assert.equal(rules.find((rule) => rule.id === legacyRuleId).userId, null, 'Propriedade desconhecida não é atribuída a outra conta.');
  assert.equal(rules.find((rule) => rule.id === legacyRuleId).categoryId, null);
  const owned = rules.find((rule) => rule.id === ownedRuleId);
  assert.equal(owned.userId, legacyId);
  assert.ok(owned.categoryId);
  assert.equal(owned.priority, 77);
  const visible = await ClassificationRuleModel.findAll(legacyId);
  assert.equal(visible.length, 1, 'Somente a regra com proprietário conhecido fica visível.');
  assert.equal(visible[0].category, 'Educação personalizada');
  const [categories] = await admin.query('SELECT id, name FROM user_categories WHERE userId = ?', [legacyId]);
  assert.equal(categories.length, 9);
  assert.equal(categories.find((category) => category.id === owned.categoryId).name, 'Educação personalizada');
  await assert.rejects(
    admin.query('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [randomUUID(), 'Duplicada', 'legacy@example.test']),
    { code: 'ER_DUP_ENTRY' },
  );
  await assert.rejects(
    admin.query('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [randomUUID(), 'Duplicada normalizada', ' LEGACY@example.test']),
    { code: 'ER_DUP_ENTRY' },
  );
});
