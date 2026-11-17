import assert from 'node:assert/strict';
import { test } from 'node:test';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json' },
});
const csrfResponse = () => json({ success: true, data: { csrfToken: 'csrf-anonymous' } });
const user = { id: 'user-a', name: 'Pessoa Teste', email: 'pessoa@example.test' };
const sessionResponse = () => json({ success: true, data: { user, csrfToken: 'csrf-authenticated' } });

async function setup(t, implementation) {
  const client = await import(`../src/services/api.js?test=${encodeURIComponent(t.name)}`);
  t.mock.method(globalThis, 'fetch', implementation);
  return client;
}

test('login envia cookies e CSRF e adota somente a identidade retornada pelo servidor', async (t) => {
  const calls = [];
  const client = await setup(t, async (url, config) => {
    calls.push({ url, config });
    return url.endsWith('/auth/csrf') ? csrfResponse() : sessionResponse();
  });
  const result = await client.login({ email: user.email, password: 'senha ficticia de teste' });
  assert.deepEqual(result, user);
  assert.equal(calls.length, 2);
  assert.ok(calls[0].url.endsWith('/auth/csrf'));
  assert.ok(calls[1].url.endsWith('/auth/login'));
  for (const { config } of calls) assert.equal(config.credentials, 'include');
  assert.equal(calls[1].config.headers.get('X-CSRF-Token'), 'csrf-anonymous');
  assert.equal(calls[1].config.headers.get('Content-Type'), 'application/json');
  assert.deepEqual(JSON.parse(calls[1].config.body), { email: user.email, password: 'senha ficticia de teste' });
});

test('cadastro estabelece sessão e requisições privadas usam o CSRF renovado', async (t) => {
  const calls = [];
  const client = await setup(t, async (url, config) => {
    calls.push({ url, config });
    if (url.endsWith('/auth/csrf')) return csrfResponse();
    if (url.endsWith('/auth/register')) return sessionResponse();
    return json({ success: true, data: [] });
  });
  assert.deepEqual(await client.register({ ...user, password: 'senha ficticia de teste' }), user);
  await client.createRule({ name: 'Regra própria' });
  assert.equal(calls.length, 3);
  assert.equal(calls[2].config.headers.get('X-CSRF-Token'), 'csrf-authenticated');
  assert.equal(calls[2].config.credentials, 'include');
});

test('restauração consulta o servidor uma vez para chamadas concorrentes e envia cookies', async (t) => {
  let calls = 0;
  const client = await setup(t, async (url, config) => {
    calls += 1;
    assert.ok(url.endsWith('/auth/me'));
    assert.equal(config.method, 'GET');
    assert.equal(config.credentials, 'include');
    return sessionResponse();
  });
  const [first, second] = await Promise.all([client.getCurrentUser(), client.getCurrentUser()]);
  assert.deepEqual(first, user);
  assert.deepEqual(second, user);
  assert.equal(calls, 1);
});

test('upload multipart usa cookies e CSRF sem sobrescrever o boundary do navegador', async (t) => {
  const client = await setup(t, async (url, config) => {
    if (url.endsWith('/auth/csrf')) return csrfResponse();
    assert.ok(url.endsWith('/upload-csv'));
    assert.equal(config.credentials, 'include');
    assert.equal(config.headers.get('X-CSRF-Token'), 'csrf-anonymous');
    assert.equal(config.headers.has('Content-Type'), false);
    assert.ok(config.body instanceof FormData);
    assert.equal(await config.body.get('file').text(), 'data,valor\n2026-01-01,10');
    return json({ transactions: [] });
  });
  assert.deepEqual(await client.uploadCsv(new File(['data,valor\n2026-01-01,10'], 'extrato.csv')), { transactions: [] });
});

test('exportação exige sessão e token CSRF; 401 notifica a aplicação antes de baixar', async (t) => {
  let expired = 0;
  const client = await setup(t, async (url, config) => {
    if (url.endsWith('/auth/csrf')) return csrfResponse();
    assert.ok(url.endsWith('/reports/export/pdf'));
    assert.equal(config.credentials, 'include');
    assert.equal(config.headers.get('X-CSRF-Token'), 'csrf-anonymous');
    return json({ error: { message: 'Sessão expirada.' } }, 401);
  });
  client.onUnauthorized(() => { expired += 1; });
  await assert.rejects(client.downloadReportPDF({ transactions: [] }), { status: 401, message: 'Sessão expirada.' });
  assert.equal(expired, 1);
});

test('falha de login mantém o erro de credenciais sem disparar expiração de sessão', async (t) => {
  const client = await setup(t, async (url) => url.endsWith('/auth/csrf')
    ? csrfResponse()
    : json({ error: { message: 'E-mail ou senha inválidos.' } }, 401));
  let expired = false;
  client.onUnauthorized(() => { expired = true; });
  await assert.rejects(client.login({ email: user.email, password: 'incorreta' }), { status: 401, message: 'E-mail ou senha inválidos.' });
  assert.equal(expired, false);
});

test('logout aceita 204 e limpa o CSRF para a próxima autenticação', async (t) => {
  let csrfCalls = 0;
  const client = await setup(t, async (url) => {
    if (url.endsWith('/auth/csrf')) { csrfCalls += 1; return csrfResponse(); }
    if (url.endsWith('/auth/logout')) return new Response(null, { status: 204 });
    return sessionResponse();
  });
  await client.login({ email: user.email, password: 'senha ficticia de teste' });
  await client.logout();
  await client.login({ email: user.email, password: 'senha ficticia de teste' });
  assert.equal(csrfCalls, 2);
});

test('logout bloqueia resposta tardia de dados privados da conta anterior', async (t) => {
  let resolveRules;
  const client = await setup(t, async (url) => {
    if (url.endsWith('/auth/csrf')) return csrfResponse();
    if (url.endsWith('/auth/login')) return sessionResponse();
    if (url.endsWith('/auth/logout')) return new Response(null, { status: 204 });
    return new Promise((resolve) => { resolveRules = resolve; });
  });
  await client.login({ email: user.email, password: 'senha ficticia de teste' });
  const pendingRules = client.fetchRules();
  await client.logout();
  const rejected = assert.rejects(pendingRules, { status: 401, message: 'A sessão mudou. Tente novamente.' });
  resolveRules(json({ data: [{ name: 'Regra privada antiga' }] }));
  await rejected;
});

test('falha de logout não invalida silenciosamente a sessão local', async (t) => {
  let csrfCalls = 0;
  const client = await setup(t, async (url, config) => {
    if (url.endsWith('/auth/csrf')) { csrfCalls += 1; return csrfResponse(); }
    if (url.endsWith('/auth/login')) return sessionResponse();
    if (url.endsWith('/auth/logout')) return json({ error: { message: 'Banco indisponível.' } }, 503);
    assert.equal(config.headers.get('X-CSRF-Token'), 'csrf-authenticated');
    return json({ success: true });
  });
  await client.login({ email: user.email, password: 'senha ficticia de teste' });
  await assert.rejects(client.logout(), { status: 503 });
  await client.createRule({ name: 'Teste' });
  assert.equal(csrfCalls, 1);
});

test('CSRF ausente na resposta bloqueia alterações em vez de enviar requisição insegura', async (t) => {
  let calls = 0;
  const client = await setup(t, async () => {
    calls += 1;
    return json({ success: true, data: {} });
  });
  await assert.rejects(client.createRule({ name: 'Teste' }), { status: 502 });
  assert.equal(calls, 1);
});

test('erros de conexão e resposta inválida têm feedback compreensível', async (t) => {
  const client = await setup(t, async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(client.fetchRules(), { status: 0, message: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.' });
  globalThis.fetch.mock.mockImplementation(async () => new Response('<html>Gateway</html>', { headers: { 'content-type': 'text/html' } }));
  await assert.rejects(client.fetchRules(), { message: 'A API retornou uma resposta inválida. Verifique a configuração do backend.' });
});

test('troca de sessão descarta restauração antiga e consulta novamente a identidade atual', async (t) => {
  let finishPrevious;
  let calls = 0;
  const client = await setup(t, async () => {
    calls += 1;
    if (calls === 1) return new Promise((resolve) => { finishPrevious = resolve; });
    return sessionResponse();
  });
  const previous = client.getCurrentUser();
  client.clearSessionState();
  const current = client.getCurrentUser();
  const rejection = assert.rejects(previous, { status: 401 });
  finishPrevious(json({ data: { user: { ...user, id: 'previous-user' }, csrfToken: 'previous-csrf' } }));
  assert.deepEqual(await current, user);
  await rejection;
  assert.equal(calls, 2);
});
