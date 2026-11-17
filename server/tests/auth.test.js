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
