import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const enabled = process.env.AUTH_TEST_DATABASE === '1';
const origin = 'http://localhost:5173';

test('configuração de autenticação exige segredo e cookies seguros na produção', async () => {
  const { getAuthConfig } = await import('../src/config/auth.js');
  const keys = ['NODE_ENV', 'JWT_SECRET', 'CLIENT_URL', 'COOKIE_SAME_SITE', 'SESSION_TTL_SECONDS'];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    process.env.NODE_ENV = 'production';
    process.env.CLIENT_URL = 'https://frontend.example.test';
    delete process.env.COOKIE_SAME_SITE;
    delete process.env.SESSION_TTL_SECONDS;
    delete process.env.JWT_SECRET;
    assert.throws(getAuthConfig, /JWT_SECRET/);
    process.env.JWT_SECRET = randomBytes(8).toString('hex');
    assert.throws(getAuthConfig, /JWT_SECRET/);
    process.env.JWT_SECRET = randomBytes(48).toString('hex');
    const config = getAuthConfig();
    assert.equal(config.cookieOptions.httpOnly, true);
    assert.equal(config.cookieOptions.secure, true);
    assert.equal(config.cookieOptions.sameSite, 'none');
    assert.equal(config.cookieOptions.path, '/');
    assert.ok(config.sessionCookie.startsWith('__Host-'));
    assert.equal(config.cookieOptions.domain, undefined);
    process.env.CLIENT_URL = 'http://frontend.example.test';
    assert.throws(getAuthConfig, /CLIENT_URL/);
    process.env.CLIENT_URL = 'https://frontend.example.test/path';
    assert.throws(getAuthConfig, /CLIENT_URL/);
  } finally {
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});

test('sem MySQL o cadastro falha de forma segura, inclusive fora da produção', () => {
  const script = `
    import { once } from 'node:events';
    import { createApp } from './src/app.js';
    import { getDbPool } from './src/config/database.js';
    const origin = 'http://localhost:5173';
    const server = createApp().listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
      const base = 'http://127.0.0.1:' + server.address().port + '/api';
      const csrf = await fetch(base + '/auth/csrf', { headers: { Origin: origin } });
      let status = csrf.status;
      let data = await csrf.json();
      if (csrf.status === 200) {
        const cookie = csrf.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
        const response = await fetch(base + '/auth/register', {
          method: 'POST',
          headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json', 'X-CSRF-Token': data.data.csrfToken },
          body: JSON.stringify({name:'Banco indisponível', email:'offline@example.test', password:process.env.TEST_PASSWORD}),
        });
        status = response.status;
        data = await response.json();
      }
      console.log('DB_OUTAGE_RESULT=' + JSON.stringify({status, data}));
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
      await getDbPool().end();
    }
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    env: {
      ...process.env,
      NODE_ENV: 'test', DB_HOST: '127.0.0.1', DB_PORT: '1',
      DB_USER: 'offline_test', DB_PASSWORD: randomBytes(24).toString('hex'), DB_NAME: 'offline_auth_test',
      JWT_SECRET: randomBytes(48).toString('hex'), CLIENT_URL: origin,
      TEST_PASSWORD: randomBytes(24).toString('hex'), COOKIE_SAME_SITE: 'lax',
    },
    encoding: 'utf8', timeout: 15000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  const line = result.stdout.split(/\r?\n/).find((entry) => entry.startsWith('DB_OUTAGE_RESULT='));
  assert.ok(line, result.stdout);
  const response = JSON.parse(line.slice('DB_OUTAGE_RESULT='.length));
  assert.equal(response.status, 503);
  assert.equal(response.data.success, false);
  assert.doesNotMatch(JSON.stringify(response.data), /passwordHash|SELECT|INSERT|stack|ECONNREFUSED/i);
});

function assertPublicUser(user) {
  assert.equal(typeof user.id, 'string');
  assert.equal(typeof user.name, 'string');
  assert.equal(typeof user.email, 'string');
  const forbidden = /password|hash|secret|token|session/i;
  for (const key of Object.keys(user)) assert.doesNotMatch(key, forbidden);
}

function browser(baseUrl) {
  const cookies = new Map();
  let csrfToken;
  return {
    cookies,
    get csrfToken() { return csrfToken; },
    get cookieHeader() { return [...cookies].map(([name, value]) => `${name}=${value}`).join('; '); },
    async request(path, { method = 'GET', body, csrf = true, requestOrigin = origin, headers = {} } = {}) {
      const requestHeaders = { ...headers };
      if (requestOrigin !== null) requestHeaders.Origin = requestOrigin;
      if (!Object.hasOwn(requestHeaders, 'Cookie') && cookies.size) requestHeaders.Cookie = this.cookieHeader;
      if (csrf && csrfToken) requestHeaders['X-CSRF-Token'] = csrfToken;
      if (body !== undefined && !(body instanceof FormData)) requestHeaders['Content-Type'] = 'application/json';
      const response = await fetch(`${baseUrl}/api${path}`, {
        method,
        headers: requestHeaders,
        body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
      });
      const setCookies = response.headers.getSetCookie();
      for (const cookie of setCookies) {
        const [pair] = cookie.split(';');
        const separator = pair.indexOf('=');
        const name = pair.slice(0, separator);
        const value = pair.slice(separator + 1);
        if (!value || /max-age=0/i.test(cookie)) cookies.delete(name);
        else cookies.set(name, value);
      }
      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await response.json()
        : response.status === 204 ? null : Buffer.from(await response.arrayBuffer());
      if (data?.data?.csrfToken) csrfToken = data.data.csrfToken;
      return { status: response.status, headers: response.headers, data, setCookies };
    },
    async initialize() {
      const response = await this.request('/auth/csrf');
      assert.equal(response.status, 200);
      assert.equal(typeof csrfToken, 'string');
      assert.ok(csrfToken.length > 20);
    },
  };
}

test('Autenticação HTTP com MySQL real e isolamento entre contas', {
  skip: enabled ? false : 'Defina AUTH_TEST_DATABASE=1 e DB_NAME terminado em _test para MySQL isolado.',
  timeout: 120000,
}, async (t) => {
  assert.match(process.env.DB_NAME || '', /_test$/,
    'A integração exige schema descartável terminado em _test.');
  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(process.env.DB_HOST),
    'A integração aceita somente uma instância MySQL local de teste.');
  process.env.NODE_ENV = 'test';
  process.env.CLIENT_URL = origin;
  process.env.JWT_SECRET ||= randomBytes(48).toString('hex');

  // A fresh schema also isolates persistent rate-limit buckets from earlier runs.
  const originalSchema = process.env.DB_NAME;
  const schema = `cf_auth_${randomUUID().replaceAll('-', '')}_test`;
  assert.match(schema, /^cf_auth_[a-f0-9]+_test$/);
  const admin = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  });
  let createdSchema = false;
  let pool;
  let server;
  t.after(async () => {
    try {
      if (server) {
        server.closeAllConnections();
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      }
      if (pool) await pool.end();
      // Only the randomly named schema created by this test can be removed.
      if (createdSchema) await admin.query(`DROP DATABASE \`${schema}\``);
    } finally {
      process.env.DB_NAME = originalSchema;
      await admin.end();
    }
  });
  await admin.query(`CREATE DATABASE \`${schema}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  createdSchema = true;
  process.env.DB_NAME = schema;

  const { initDatabase, getDbPool } = await import('../src/config/database.js');
  const { createApp } = await import('../src/app.js');
  pool = getDbPool();
  assert.equal(await initDatabase(), true, 'É necessária conexão MySQL real e migration aplicada.');
  server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const alice = browser(baseUrl);
  const bob = browser(baseUrl);
  const anonymous = browser(baseUrl);
  const suffix = randomUUID();
  const password = `aA!${randomBytes(18).toString('hex')}`;
  const aliceEmail = `alice-${suffix}@example.test`;
  const bobEmail = `bob-${suffix}@example.test`;
  let aliceUser;
  let bobUser;
  let aliceRule;
  await Promise.all([alice.initialize(), bob.initialize(), anonymous.initialize()]);

  await t.test('cadastro valida dados sem criar contas ou aceitar credenciais truncadas', async () => {
    const invalidBodies = [
      {},
      { name: 'A', email: aliceEmail, password },
      { name: 'Alice', email: 'email-invalido', password },
      { name: 'Alice', email: aliceEmail, password: 'curta' },
      { name: 'Alice', email: aliceEmail, password: 'á'.repeat(40) },
      { name: ['Alice'], email: aliceEmail, password },
      { name: 'Alice', email: { value: aliceEmail }, password },
    ];
    for (const body of invalidBodies) {
      const response = await anonymous.request('/auth/register', { method: 'POST', body });
      assert.equal(response.status, 400, JSON.stringify(body));
      assert.equal(response.data.success, false);
    }
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [aliceEmail]);
    assert.equal(rows.length, 0);
  });

  await t.test('cadastro cria conta normalizada e sessão em cookie HttpOnly', async () => {
    const oldCsrf = alice.csrfToken;
    const response = await alice.request('/auth/register', {
      method: 'POST', body: { name: ' Alice Teste ', email: ` ${aliceEmail.toUpperCase()} `, password, role: 'admin' },
    });
    assert.equal(response.status, 201);
    aliceUser = response.data.data.user;
    assertPublicUser(aliceUser);
    assert.equal(aliceUser.name, 'Alice Teste');
    assert.equal(aliceUser.email, aliceEmail);
    assert.notEqual(aliceUser.role, 'admin');
    assert.notEqual(alice.csrfToken, oldCsrf);
    const sessionCookie = response.setCookies.find((cookie) => /httponly/i.test(cookie) && cookie.split(';')[0].split('=')[1].includes('.'));
    assert.ok(sessionCookie, 'JWT deve existir somente em cookie HttpOnly.');
    assert.match(sessionCookie, /samesite=lax/i);
    assert.match(sessionCookie, /path=\//i);
    assert.doesNotMatch(JSON.stringify(response.data), /password|\$2[aby]\$|eyJ/);
    const [stored] = await pool.query('SELECT passwordHash FROM users WHERE id = ?', [aliceUser.id]);
    assert.match(stored[0].passwordHash, /^\$2[aby]\$/);
    assert.notEqual(stored[0].passwordHash, password);
    assert.equal((await alice.request('/classification-rules/reset', {
      method: 'POST', csrf: false, headers: { 'X-CSRF-Token': oldCsrf },
    })).status, 403, 'Token CSRF anterior ao cadastro não autoriza a nova sessão.');
  });

  await t.test('e-mail duplicado normalizado retorna 409', async () => {
    const response = await anonymous.request('/auth/register', {
      method: 'POST', body: { name: 'Duplicada', email: aliceEmail.toUpperCase(), password },
    });
    assert.equal(response.status, 409);
    assert.doesNotMatch(JSON.stringify(response.data), /sql|duplicate entry|passwordHash/i);
  });

  await t.test('sessão é recuperada ao abrir outra instância do cliente', async () => {
    const restored = browser(baseUrl);
    const response = await restored.request('/auth/me', { headers: { Cookie: alice.cookieHeader } });
    assert.equal(response.status, 200);
    assert.equal(response.data.data.user.id, aliceUser.id);
    assertPublicUser(response.data.data.user);
    assert.equal(typeof response.data.data.csrfToken, 'string');
    assert.match(response.headers.get('cache-control'), /no-store/);
  });

  await t.test('todas as funcionalidades privadas recusam cliente sem autenticação', async () => {
    const endpoints = [
      ['GET', '/auth/me'], ['POST', '/auth/logout'],
      ['GET', '/users'], ['GET', '/users/qualquer'], ['POST', '/users'], ['DELETE', '/users/qualquer'],
      ['GET', '/classification-rules'], ['GET', '/classification-rules/qualquer'],
      ['POST', '/classification-rules'], ['PUT', '/classification-rules/qualquer'],
      ['DELETE', '/classification-rules/qualquer'], ['POST', '/classification-rules/reset'],
      ['POST', '/classifier/classify'], ['POST', '/classifier/test'],
      ['POST', '/reports/summary'], ['POST', '/reports/export/csv'], ['POST', '/reports/export/pdf'],
      ['POST', '/upload-csv'],
    ];
    for (const [method, path] of endpoints) {
      const response = await anonymous.request(path, { method, ...(method === 'GET' ? {} : { body: {} }) });
      assert.equal(response.status, 401, `${method} ${path}`);
    }
  });

  await t.test('CSRF exige token e origem válidos inclusive em login e cadastro', async () => {
    const body = { email: aliceEmail, password };
    assert.equal((await anonymous.request('/auth/login', { method: 'POST', body, csrf: false })).status, 403);
    assert.equal((await anonymous.request('/auth/register', {
      method: 'POST', body: { name: 'Ataque', email: `csrf-${suffix}@example.test`, password }, csrf: false,
    })).status, 403);
    assert.equal((await alice.request('/classification-rules/reset', { method: 'POST', csrf: false })).status, 403);
    assert.equal((await alice.request('/classification-rules/reset', { method: 'POST', requestOrigin: 'https://evil.example' })).status, 403);
    assert.equal((await alice.request('/classification-rules/reset', { method: 'POST', requestOrigin: null })).status, 403);
  });

  await t.test('segunda conta recebe seus próprios padrões com IDs distintos', async () => {
    const response = await bob.request('/auth/register', {
      method: 'POST', body: { name: 'Bob Teste', email: bobEmail, password },
    });
    assert.equal(response.status, 201);
    bobUser = response.data.data.user;
    const aliceRules = (await alice.request('/classification-rules')).data.data;
    const bobRules = (await bob.request('/classification-rules')).data.data;
    assert.equal(aliceRules.length, 8);
    assert.equal(bobRules.length, 8);
    assert.equal(aliceRules.some((rule) => bobRules.some((other) => other.id === rule.id)), false);
    const aliceCategories = (await alice.request('/categories')).data.data;
    const bobCategories = (await bob.request('/categories')).data.data;
    assert.equal(aliceCategories.length, 8);
    assert.equal(bobCategories.length, 8);
    assert.ok(aliceRules.every((rule) => aliceCategories.some((category) => category.id === rule.categoryId)));
    assert.equal(aliceCategories.some((category) => bobCategories.some((other) => other.id === category.id)), false);
  });

  await t.test('regras personalizadas usam identidade autenticada e impedem IDOR em CRUD', async () => {
    const response = await alice.request('/classification-rules', {
      method: 'POST', body: { name: 'Particular Alice', category: 'Segredo Alice', keywords: ['exclusivoalice'], priority: 100, userId: bobUser.id },
    });
    assert.equal(response.status, 201);
    aliceRule = response.data.data;
    assert.equal((await alice.request(`/classification-rules/${aliceRule.id}`)).status, 200);
    assert.equal((await bob.request(`/classification-rules/${aliceRule.id}`)).status, 404);
    assert.equal((await bob.request(`/classification-rules/${aliceRule.id}`, { method: 'PUT', body: { name: 'Invadida', userId: aliceUser.id } })).status, 404);
    assert.equal((await bob.request(`/classification-rules/${aliceRule.id}`, { method: 'DELETE' })).status, 404);
    const bobRules = (await bob.request('/classification-rules')).data.data;
    assert.equal(bobRules.some((rule) => rule.id === aliceRule.id), false);
    const ownUpdate = await alice.request(`/classification-rules/${aliceRule.id}`, { method: 'PUT', body: { name: 'Alice atualizada' } });
    assert.equal(ownUpdate.status, 200);
  });

  await t.test('classificador e importação consultam somente regras da conta autenticada', async () => {
    const aliceMatch = await alice.request('/classifier/test', { method: 'POST', body: { description: 'exclusivoalice' } });
    const bobMatch = await bob.request('/classifier/test', { method: 'POST', body: { description: 'exclusivoalice' } });
    assert.equal(aliceMatch.data.data.category, 'Segredo Alice');
    assert.equal(bobMatch.data.data.category, 'Outros');
    const batch = await bob.request('/classifier/classify', { method: 'POST', body: { descriptions: ['exclusivoalice'], userId: aliceUser.id } });
    assert.equal(batch.status, 200);
    assert.equal(batch.data.data[0].category, 'Outros');
    for (const [client, expected] of [[alice, 'Segredo Alice'], [bob, 'Outros']]) {
      const form = new FormData();
      form.append('file', new Blob(['date;title;amount\n2026-09-01;exclusivoalice;-10,00\n'], { type: 'text/csv' }), 'extrato.csv');
      const imported = await client.request('/upload-csv', { method: 'POST', body: form });
      assert.equal(imported.status, 200);
      const records = imported.data.data || imported.data.transactions || imported.data.dados;
      assert.equal(records[0].category, expected);
    }
  });

  await t.test('restaurar padrões e excluir regra só afeta a própria conta', async () => {
    assert.equal((await bob.request('/classification-rules/reset', { method: 'POST', body: { userId: aliceUser.id } })).status, 200);
    assert.equal((await alice.request(`/classification-rules/${aliceRule.id}`)).status, 200);
    assert.equal((await alice.request(`/classification-rules/${aliceRule.id}`, { method: 'DELETE' })).status, 200);
    assert.equal((await alice.request(`/classification-rules/${aliceRule.id}`)).status, 404);
    assert.equal((await bob.request('/classification-rules')).data.data.length, 8);
  });

  await t.test('histórico HTTP exige sessão e CSRF e isola totais, exportação e exclusão por conta', async () => {
    assert.equal((await anonymous.request('/history')).status, 401);
    assert.equal((await anonymous.request('/history/report')).status, 401);
    const category = (await alice.request('/categories')).data.data[0];
    const payload = { batchId: randomUUID(), entries: [{ month: '2026-10', categoryId: category.id, incomeCents: 5000, expenseCents: 1000 }], userId: bobUser.id };
    assert.equal((await alice.request('/history/preview', { method: 'POST', body: payload, csrf: false })).status, 403);
    const preview = await alice.request('/history/preview', { method: 'POST', body: payload });
    assert.equal(preview.status, 200);
    assert.equal(preview.data.data.mode, 'create');
    assert.equal((await alice.request('/history')).data.data.months.length, 0, 'prévia não grava totais');
    const body = { ...payload, requestId: randomUUID(), expectedRevision: preview.data.data.revision, expectedHistoryVersion: preview.data.data.historyVersion, confirmOverlap: false };
    const responses = await Promise.all([alice.request('/history/contributions', { method: 'POST', body }), alice.request('/history/contributions', { method: 'POST', body })]);
    assert.ok(responses.every((response) => response.status === 200));
    assert.equal((await alice.request('/history')).data.data.months[0].incomeCents, 5000);
    const dashboard = await alice.request('/history/report?from=2026-10&to=2026-10');
    assert.equal(dashboard.status, 200);
    assert.equal(dashboard.data.data.totals.income, 50);
    assert.equal(dashboard.data.data.totals.expenses, 10);
    assert.equal(dashboard.data.data.categoryBreakdown.length, 2);
    assert.equal(dashboard.data.data.totals.transactionCount, null);
    assert.equal((await bob.request('/history/report')).data.data.totals.expenses, 0);
    assert.equal((await alice.request('/history/report?from=2026-11&to=2026-10')).status, 400);
    const reportPDF = await alice.request('/history/report/pdf?from=2026-10&to=2026-10');
    assert.equal(reportPDF.status, 200);
    assert.equal(reportPDF.data.subarray(0, 5).toString(), '%PDF-');
    const reportCSV = await alice.request('/history/report/csv?from=2026-10&to=2026-10');
    assert.equal(reportCSV.status, 200);
    assert.match(reportCSV.data.toString('utf8'), /Meses no período/);
    assert.doesNotMatch(reportCSV.data.toString('utf8'), /LANÇAMENTOS DETALHADOS/);
    assert.equal((await bob.request(`/history?userId=${aliceUser.id}`)).data.data.months.length, 0);
    assert.equal((await bob.request('/history/preview', { method: 'POST', body: { ...payload, userId: aliceUser.id } })).status, 404);
    assert.equal((await alice.request('/history?from=2026-13')).status, 400);
    const csv = await alice.request('/history/export/csv');
    assert.equal(csv.status, 200);
    assert.match(csv.headers.get('content-type'), /text\/csv/);
    assert.match(csv.data.toString('utf8'), /2026-10/);
    await bob.request('/history', { method: 'DELETE' });
    assert.equal((await alice.request('/history')).data.data.months.length, 1);
    assert.equal((await alice.request('/history/months/2026-10', { method: 'DELETE', csrf: false })).status, 403);
    assert.equal((await alice.request('/history/months/2026-10', { method: 'DELETE' })).status, 200);
    assert.equal((await alice.request('/history')).data.data.months.length, 0);
  });

  await t.test('gestão de padrões pessoais lista, edita e exclui somente preferências da sessão', async () => {
    assert.equal((await anonymous.request('/categories/preferences')).status, 401);
    assert.equal((await anonymous.request('/categories/preferences/foreign', { method: 'PUT', body: { categoryId: 'foreign' } })).status, 401);
    assert.equal((await anonymous.request('/categories/preferences/foreign', { method: 'DELETE' })).status, 401);
    const aliceCategories = (await alice.request('/categories')).data.data;
    const bobCategories = (await bob.request('/categories')).data.data;
    const food = aliceCategories.find((category) => category.name === 'Alimentação');
    const leisure = aliceCategories.find((category) => category.name === 'Lazer');
    const saved = await alice.request('/categories/preferences', { method: 'PUT', body: { description: 'Mercado para evento', categoryId: leisure.id } });
    assert.equal(saved.status, 200);
    const id = saved.data.data.id;
    const endpoint = `/categories/preferences/${id}`;
    const list = await alice.request('/categories/preferences?userId=' + bobUser.id);
    assert.equal(list.status, 200);
    assert.ok(list.data.data.some((item) => item.id === id && item.categoryId === leisure.id));
    assert.ok(!list.data.data.some((item) => 'userId' in item || 'descriptionHash' in item));
    assert.ok(!(await bob.request('/categories/preferences')).data.data.some((item) => item.id === id));
    assert.equal((await bob.request(endpoint, { method: 'PUT', body: { categoryId: bobCategories[0].id, userId: aliceUser.id } })).status, 404);
    assert.equal((await bob.request(endpoint, { method: 'DELETE' })).status, 404);
    assert.equal((await alice.request(endpoint, { method: 'PUT', body: { categoryId: bobCategories[0].id } })).status, 404);
    assert.equal((await alice.request(endpoint, { method: 'PUT', body: {} })).status, 400);
    assert.equal((await alice.request(endpoint, { method: 'PUT', body: { categoryId: food.id }, csrf: false })).status, 403);
    assert.equal((await alice.request(endpoint, { method: 'DELETE', csrf: false })).status, 403);
    const updated = await alice.request(endpoint, { method: 'PUT', body: { categoryId: food.id, description: 'Não deve mudar', userId: bobUser.id } });
    assert.equal(updated.status, 200);
    assert.equal(updated.data.data.categoryId, food.id);
    assert.equal(updated.data.data.description, 'Mercado para evento');
    assert.equal((await alice.request('/classification-rules/reset', { method: 'POST' })).status, 200);
    assert.ok((await alice.request('/categories/preferences')).data.data.some((item) => item.id === id));
    const matched = await alice.request('/classifier/test', { method: 'POST', body: { description: ' MERCÁDO PARA EVENTO ' } });
    assert.equal(matched.data.data.preferenceId, id);
    assert.equal((await alice.request(endpoint, { method: 'DELETE' })).status, 200);
    assert.equal((await alice.request(endpoint, { method: 'DELETE' })).status, 404);
    assert.equal((await alice.request(endpoint, { method: 'PUT', body: { categoryId: food.id } })).status, 404);
    assert.ok(!(await alice.request('/categories/preferences')).data.data.some((item) => item.id === id));
    const classified = await alice.request('/classifier/test', { method: 'POST', body: { description: 'Mercado para evento' } });
    assert.equal(classified.data.data.categoryId, food.id);
    assert.ok(!classified.data.data.preferenceId);
  });

  await t.test('catálogo pessoal, preferências, importação, renomeação e exclusão preservam isolamento', async () => {
    assert.equal((await anonymous.request('/categories')).status, 401);
    assert.equal((await anonymous.request('/categories/preferences/lookup', { method: 'POST', body: { description: 'Mercado Central' } })).status, 401);
    assert.equal((await alice.request('/categories/preferences/lookup', { method: 'POST', body: { description: '' } })).status, 400);
    assert.equal((await alice.request('/categories/preferences/lookup', { method: 'POST', body: { description: 'Sem preferência' } })).data.data, null);
    const bobBefore = (await bob.request('/categories')).data.data;
    const create = await alice.request('/categories', { method: 'POST', body: { name: 'Educação pessoal', color: '#aabbcc', userId: bobUser.id, systemKey: 'fallback' } });
    assert.equal(create.status, 201);
    const category = create.data.data;
    assert.equal(category.systemKey, null);
    assert.equal(category.isFallback, false);
    assert.equal((await alice.request('/categories', { method: 'POST', body: { name: ' EDUCACAO PESSOAL ', color: '#aabbcc' } })).status, 409);
    assert.equal((await alice.request('/categories', { method: 'POST', body: { name: 'Inválida', color: 'red' } })).status, 400);
    assert.equal((await bob.request(`/categories/${category.id}`, { method: 'PUT', body: { name: 'Invadida', color: '#112233' } })).status, 404);
    assert.equal((await bob.request(`/categories/${category.id}`, { method: 'DELETE' })).status, 404);
    assert.equal((await bob.request('/categories/preferences', { method: 'PUT', body: { description: 'Mercado Central', categoryId: category.id } })).status, 404);
    const duplicateInOtherAccount = await bob.request('/categories', { method: 'POST', body: { name: category.name, color: '#112233' } });
    assert.equal(duplicateInOtherAccount.status, 201);
    assert.equal((await bob.request(`/categories/${duplicateInOtherAccount.data.data.id}`, { method: 'DELETE' })).status, 200);

    const rule = await alice.request('/classification-rules', { method: 'POST', body: { name: 'Mensalidade pessoal', category: category.name, categoryId: category.id, keywords: ['mensalidade pessoal'], priority: 90 } });
    assert.equal(rule.status, 201);
    const bobCategory = bobBefore[0];
    assert.equal((await alice.request('/classification-rules', { method: 'POST', body: { name: 'Não autorizada', category: bobCategory.name, categoryId: bobCategory.id, keywords: ['segredo'] } })).status, 404);
    assert.equal((await alice.request('/categories/preferences', { method: 'PUT', body: { description: 'Mercádo Central', categoryId: category.id } })).status, 200);
    const lookup = await alice.request('/categories/preferences/lookup', { method: 'POST', body: { description: ' MERCADO CENTRAL ', userId: bobUser.id } });
    assert.equal(lookup.status, 200);
    assert.equal(lookup.data.data.categoryId, category.id);
    assert.equal((await bob.request('/categories/preferences/lookup', { method: 'POST', body: { description: 'Mercado Central', userId: aliceUser.id } })).data.data, null);
    assert.equal((await alice.request('/categories/preferences/lookup', { method: 'POST', body: { description: 'Mercado Central' }, csrf: false })).status, 403);
    const preferred = await alice.request('/classifier/test', { method: 'POST', body: { description: '  MERCADO CENTRAL ' } });
    assert.equal(preferred.data.data.categoryId, category.id);
    assert.ok(preferred.data.data.preferenceId);
    assert.equal(preferred.data.data.isFallback, false);
    assert.equal((await bob.request('/classifier/test', { method: 'POST', body: { description: 'Mercado Central' } })).data.data.category, 'Alimentação');

    const renamed = await alice.request(`/categories/${category.id}`, { method: 'PUT', body: { name: 'Formação', color: '#123456' } });
    assert.equal(renamed.status, 200);
    assert.equal(renamed.data.data.id, category.id);
    assert.equal((await alice.request(`/classification-rules/${rule.data.data.id}`)).data.data.category, 'Formação');
    const form = new FormData();
    form.append('file', new Blob(['date;title;amount\n2026-09-01;MERCADO CENTRAL;-10,00\n2026-09-02;mensalidade pessoal;-50,00\n']), 'extrato.csv');
    const imported = await alice.request('/upload-csv', { method: 'POST', body: form });
    assert.equal(imported.status, 200);
    assert.ok(imported.data.dados.every((row) => row.category === 'Formação' && row.categoryId === category.id));

    const fallback = (await alice.request('/categories')).data.data.find((item) => item.isFallback);
    assert.equal((await alice.request(`/categories/${fallback.id}`, { method: 'DELETE' })).status, 400);
    assert.equal((await alice.request(`/categories/${fallback.id}`, { method: 'PUT', body: { name: 'Não classificado', color: '#445566' } })).status, 200);
    assert.equal((await alice.request('/classifier/test', { method: 'POST', body: { description: 'XYZ sem regra' } })).data.data.category, 'Não classificado');
    assert.equal((await alice.request(`/categories/${category.id}`, { method: 'DELETE' })).status, 200);
    assert.equal((await alice.request(`/classification-rules/${rule.data.data.id}`)).status, 404);
    const [preferences] = await pool.query('SELECT id FROM category_preferences WHERE userId = ? AND categoryId = ?', [aliceUser.id, category.id]);
    assert.equal(preferences.length, 0);
    assert.equal((await alice.request('/classifier/test', { method: 'POST', body: { description: 'Mercado Central' } })).data.data.category, 'Alimentação');
    assert.deepEqual((await bob.request('/categories')).data.data, bobBefore);
    // Volta apenas o nome do fallback da fixture para os testes posteriores.
    await alice.request(`/categories/${fallback.id}`, { method: 'PUT', body: { name: 'Outros', color: '#94a3b8' } });
  });

  await t.test('restaurar padrões preserva fallback renomeado mesmo quando seu nome coincide com categoria excluída', async () => {
    const categories = (await alice.request('/categories')).data.data;
    const fallback = categories.find((category) => category.isFallback);
    const housing = categories.find((category) => category.systemKey === 'housing');
    assert.equal((await alice.request(`/categories/${housing.id}`, { method: 'DELETE' })).status, 200);
    assert.equal((await alice.request(`/categories/${fallback.id}`, { method: 'PUT', body: { name: 'Moradia', color: '#445566' } })).status, 200);
    const reset = await alice.request('/classification-rules/reset', { method: 'POST' });
    assert.equal(reset.status, 200);
    assert.equal(reset.data.data.length, 8);
    const after = (await alice.request('/categories')).data.data;
    assert.equal(after.filter((category) => category.isFallback).length, 1);
    assert.equal(after.find((category) => category.isFallback).id, fallback.id);
    assert.equal((await alice.request('/classifier/test', { method: 'POST', body: { description: 'XYZ sem regra' } })).data.data.categoryId, fallback.id);
    assert.equal((await alice.request(`/categories/${fallback.id}`, { method: 'DELETE' })).status, 400);
    await alice.request(`/categories/${fallback.id}`, { method: 'PUT', body: { name: 'Outros', color: '#94a3b8' } });
  });

  await t.test('endpoints antigos de usuários só exibem a própria conta e recusam cadastro sem senha', async () => {
    const users = await alice.request('/users');
    assert.equal(users.status, 200);
    assert.equal(users.data.data.length, 1);
    assert.equal(users.data.data[0].id, aliceUser.id);
    assertPublicUser(users.data.data[0]);
    assert.equal((await alice.request(`/users/${bobUser.id}`)).status, 404);
    assert.equal((await alice.request(`/users/${bobUser.id}`, { method: 'DELETE' })).status, 404);
    assert.equal((await alice.request('/users', { method: 'POST', body: { name: 'Atalho', email: `atalho-${suffix}@example.test` } })).status, 405);
  });

  await t.test('relatórios e exportações funcionam com sessão autenticada', async () => {
    const body = { transactions: [{ id: '1', date: '2026-09-01', description: 'Lançamento teste', value: -10, category: 'Outros' }] };
    assert.equal((await alice.request('/reports/summary', { method: 'POST', body })).status, 200);
    const csv = await alice.request('/reports/export/csv', { method: 'POST', body });
    assert.equal(csv.status, 200);
    assert.match(csv.headers.get('content-type'), /text\/csv/);
    assert.match(csv.data.toString('utf8'), /Lançamento teste/);
    const pdf = await alice.request('/reports/export/pdf', { method: 'POST', body });
    assert.equal(pdf.status, 200);
    assert.equal(pdf.data.subarray(0, 5).toString(), '%PDF-');
  });

  await t.test('logout revoga sessão no banco inclusive contra replay do cookie anterior', async () => {
    const cookieBeforeLogout = alice.cookieHeader;
    const response = await alice.request('/auth/logout', { method: 'POST' });
    assert.equal(response.status, 204);
    assert.equal((await alice.request('/auth/me')).status, 401);
    const attacker = browser(baseUrl);
    assert.equal((await attacker.request('/auth/me', { headers: { Cookie: cookieBeforeLogout } })).status, 401);
  });

  await t.test('login válido normaliza e-mail e cria nova sessão recuperável', async () => {
    await alice.initialize();
    const oldCsrf = alice.csrfToken;
    const response = await alice.request('/auth/login', { method: 'POST', body: { email: ` ${aliceEmail.toUpperCase()} `, password } });
    assert.equal(response.status, 200);
    assert.equal(response.data.data.user.id, aliceUser.id);
    assertPublicUser(response.data.data.user);
    assert.equal((await alice.request('/auth/me')).status, 200);
    assert.equal((await alice.request('/classification-rules/reset', {
      method: 'POST', csrf: false, headers: { 'X-CSRF-Token': oldCsrf },
    })).status, 403, 'Token CSRF anterior ao login não autoriza a nova sessão.');
  });

  await t.test('senha incorreta e usuário inexistente devolvem erro genérico equivalente', async () => {
    const wrong = await anonymous.request('/auth/login', { method: 'POST', body: { email: aliceEmail, password: `${password}errada` } });
    const missing = await anonymous.request('/auth/login', { method: 'POST', body: { email: `missing-${suffix}@example.test`, password } });
    assert.equal(wrong.status, 401);
    assert.equal(missing.status, 401);
    assert.deepEqual(wrong.data, missing.data);
  });

  await t.test('registros legados sem hash válido não podem autenticar', async () => {
    const legacyId = randomUUID();
    const legacyEmail = `legacy-${suffix}@example.test`;
    await pool.query('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [legacyId, 'Legado Teste', legacyEmail]);
    const response = await anonymous.request('/auth/login', { method: 'POST', body: { email: legacyEmail, password } });
    assert.equal(response.status, 401);
    await pool.query('UPDATE users SET passwordHash = ? WHERE id = ?', ['hash-invalido', legacyId]);
    const malformed = await anonymous.request('/auth/login', { method: 'POST', body: { email: legacyEmail, password } });
    assert.equal(malformed.status, 401);
  });

  await t.test('JWT adulterado não concede acesso', async () => {
    const tampered = [...alice.cookies].map(([name, value]) => {
      if (value.split('.').length !== 3) return `${name}=${value}`;
      const parts = value.split('.');
      parts[1] = Buffer.from(JSON.stringify({ sub: bobUser.id, exp: Math.floor(Date.now() / 1000) + 86400 })).toString('base64url');
      return `${name}=${parts.join('.')}`;
    }).join('; ');
    assert.equal((await anonymous.request('/auth/me', { headers: { Cookie: tampered } })).status, 401);
  });

  await t.test('JWT exige expiração, emissor, audiência e algoritmo esperados', async () => {
    const { default: jwt } = await import('jsonwebtoken');
    const session = [...alice.cookies].find(([, value]) => value.split('.').length === 3);
    assert.ok(session);
    const [cookieName, token] = session;
    const payload = jwt.decode(token);
    assert.equal(typeof payload, 'object');
    const now = Math.floor(Date.now() / 1000);
    const badTokens = [
      jwt.sign({ ...payload, exp: now - 60 }, process.env.JWT_SECRET, { algorithm: 'HS256' }),
      jwt.sign({ ...payload, iss: 'outro-emissor' }, process.env.JWT_SECRET, { algorithm: 'HS256' }),
      jwt.sign({ ...payload, aud: 'outro-cliente' }, process.env.JWT_SECRET, { algorithm: 'HS256' }),
      jwt.sign({ ...payload, nbf: now + 600 }, process.env.JWT_SECRET, { algorithm: 'HS256' }),
      jwt.sign(payload, process.env.JWT_SECRET, { algorithm: 'HS384' }),
    ];
    for (const badToken of badTokens) {
      const response = await anonymous.request('/auth/me', { headers: { Cookie: `${cookieName}=${badToken}` } });
      assert.equal(response.status, 401);
    }
    assert.equal((await alice.request('/auth/me')).status, 200);
  });

  await t.test('sessão expirada no banco é recusada mesmo com JWT ainda válido', async () => {
    await pool.query('UPDATE auth_sessions SET expiresAt = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 SECOND) WHERE userId = ?', [aliceUser.id]);
    assert.equal((await alice.request('/auth/me')).status, 401);
    assert.equal((await bob.request('/auth/me')).status, 200);
  });

  await t.test('tentativas excessivas de login são limitadas com 429 e Retry-After', async () => {
    const email = `rate-${suffix}@example.test`;
    let last;
    for (let i = 0; i < 12; i += 1) {
      last = await anonymous.request('/auth/login', { method: 'POST', body: { email, password } });
      if (last.status === 429) break;
      assert.equal(last.status, 401);
    }
    assert.equal(last.status, 429);
    assert.ok(Number(last.headers.get('retry-after')) > 0);
    assert.equal((await bob.request('/auth/me')).status, 200, 'Rate limit de login não revoga sessões válidas.');
  });

  await t.test('cadastros concorrentes do mesmo e-mail criam só uma conta completa', async () => {
    const first = browser(baseUrl);
    const second = browser(baseUrl);
    await Promise.all([first.initialize(), second.initialize()]);
    const email = `concurrent-${suffix}@example.test`;
    const responses = await Promise.all([first, second].map((client) => client.request('/auth/register', {
      method: 'POST', body: { name: 'Concorrência Teste', email, password },
    })));
    assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
    const [users] = await pool.query('SELECT id FROM users WHERE normalizedEmail = ?', [email]);
    assert.equal(users.length, 1);
    const [rules] = await pool.query('SELECT COUNT(*) AS count FROM classification_rules WHERE userId = ?', [users[0].id]);
    const [sessions] = await pool.query('SELECT COUNT(*) AS count FROM auth_sessions WHERE userId = ?', [users[0].id]);
    assert.equal(Number(rules[0].count), 8);
    assert.equal(Number(sessions[0].count), 1);
  });

  await t.test('respostas de produção emitem cookies host-only Secure/HttpOnly/SameSite=None', async (productionTest) => {
    const keys = ['NODE_ENV', 'CLIENT_URL', 'COOKIE_SAME_SITE'];
    const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    const productionOrigin = 'https://frontend.example.test';
    let productionApp;
    try {
      process.env.NODE_ENV = 'production';
      process.env.CLIENT_URL = productionOrigin;
      delete process.env.COOKIE_SAME_SITE;
      productionApp = createApp();
    } finally {
      for (const key of keys) {
        if (previous[key] === undefined) delete process.env[key];
        else process.env[key] = previous[key];
      }
    }
    const productionServer = productionApp.listen(0, '127.0.0.1');
    productionTest.after(async () => {
      productionServer.closeAllConnections();
      await new Promise((resolve, reject) => productionServer.close((error) => error ? reject(error) : resolve()));
    });
    await once(productionServer, 'listening');
    const client = browser(`http://127.0.0.1:${productionServer.address().port}`);
    // Node fetch inspects server headers here; this is not a browser HTTPS-policy test.
    const csrf = await client.request('/auth/csrf', { requestOrigin: productionOrigin });
    assert.equal(csrf.status, 200);
    const login = await client.request('/auth/login', {
      method: 'POST', requestOrigin: productionOrigin, body: { email: bobEmail, password },
    });
    assert.equal(login.status, 200);
    assert.equal(login.headers.get('access-control-allow-origin'), productionOrigin);
    assert.equal(login.headers.get('access-control-allow-credentials'), 'true');
    const sessionCookie = login.setCookies.find((cookie) => cookie.startsWith('__Host-cf_session='));
    const csrfCookie = login.setCookies.find((cookie) => cookie.startsWith('__Host-cf_csrf='));
    assert.ok(sessionCookie);
    assert.ok(csrfCookie);
    for (const cookie of [sessionCookie, csrfCookie]) {
      assert.match(cookie, /; Secure/i);
      assert.match(cookie, /; HttpOnly/i);
      assert.match(cookie, /; SameSite=None/i);
      assert.match(cookie, /; Path=\//i);
      assert.doesNotMatch(cookie, /; Domain=/i);
    }
  });
});
