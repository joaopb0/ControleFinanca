import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const serverRoot = fileURLToPath(new URL('../', import.meta.url));

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('em produção, DB_* prevalece sobre DATABASE_URL e indisponibilidade retorna 503', async () => {
  process.env.NODE_ENV = 'production';
  process.env.DB_HOST = '127.0.0.1';
  process.env.DB_PORT = '1';
  process.env.DB_USER = 'test';
  process.env.DB_PASSWORD = 'temporary';
  process.env.DB_NAME = 'test';
  process.env.DATABASE_URL = 'mysql://obsolete:ignored@127.0.0.1:2/obsolete';

  const { getDbPool, initDatabase, isDbConnected } = await import('../src/config/database.js');
  const { healthController } = await import('../src/controllers/health.controller.js');
  const dbPool = getDbPool();

  try {
    assert.equal(dbPool.pool.config.connectionConfig.host, '127.0.0.1');
    assert.equal(dbPool.pool.config.connectionConfig.port, 1);

    assert.equal(await initDatabase({ maxAttempts: 2, retryDelayMs: 1 }), false);
    assert.equal(isDbConnected(), false);

    const productionResponse = createResponse();
    await healthController.check({}, productionResponse);
    assert.equal(productionResponse.statusCode, 503);
    assert.equal(productionResponse.body.status, 'error');

    process.env.NODE_ENV = 'development';
    const localResponse = createResponse();
    await healthController.check({}, localResponse);
    assert.equal(localResponse.statusCode, 200);
    assert.match(localResponse.body.database, /Modo Contingência/);
  } finally {
    await dbPool.end();
  }
});

test('em produção, configuração ausente impede a API de abrir a porta', () => {
  const result = spawnSync(process.execPath, ['src/server.js'], {
    cwd: serverRoot,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      DB_HOST: '',
      DB_USER: 'test',
      DB_PASSWORD: 'temporary',
      DB_NAME: 'test',
    },
    encoding: 'utf8',
    timeout: 10000,
  });

  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.stdout, /Servidor Back-end rodando/);
  assert.match(result.stderr, /MySQL indisponível/);
});
