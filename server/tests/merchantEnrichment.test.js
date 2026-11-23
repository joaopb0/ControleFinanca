import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  createMerchantEnrichmentService,
  extractMerchantCandidate,
  sanitizeLogoUrl,
} from '../src/services/merchantEnrichment.service.js';
import { csvImportService } from '../src/services/csvImport.service.js';
import { BASELINE_RULES } from '../src/models/classificationRule.model.js';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function createBrandfetchMock(catalog = {}, brandDetails = {}) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    const parsed = new URL(url);

    if (parsed.pathname.startsWith('/v2/search/')) {
      const query = decodeURIComponent(parsed.pathname.replace('/v2/search/', '')).toLowerCase();
      const response = catalog[query];
      if (typeof response === 'function') return response(url, options);
      return jsonResponse(response ?? []);
    }

    if (parsed.pathname.startsWith('/v2/brands/domain/')) {
      const domain = decodeURIComponent(parsed.pathname.replace('/v2/brands/domain/', '')).toLowerCase();
      const response = brandDetails[domain];
      if (typeof response === 'function') return response(url, options);
      return response ? jsonResponse(response) : jsonResponse({ message: 'Not Found' }, 404);
    }

    return jsonResponse({ message: 'Not Found' }, 404);
  };

  return { fetchImpl, calls };
}

test('identifica UBER *TRIP, PG *NETFLIX e SPOTIFY com nomes limpos e logotipos oficiais', async () => {
  const { fetchImpl, calls } = createBrandfetchMock({
    uber: [{
      name: 'Uber',
      domain: 'uber.com',
      claimed: true,
      icon: 'https://cdn.brandfetch.io/ididqtKuQi/w/128/h/128/fallback/lettermark/icon.webp?c=test-client-id',
    }],
    netflix: [{
      name: 'Netflix',
      domain: 'netflix.com',
      claimed: true,
      icon: 'https://cdn.brandfetch.io/ideQwN5lBE/w/128/h/128/fallback/lettermark/icon.webp?c=test-client-id',
    }],
    spotify: [{
      name: 'Spotify',
      domain: 'spotify.com',
      claimed: true,
      icon: 'https://cdn.brandfetch.io/id20mQyGeY/w/128/h/128/fallback/lettermark/icon.webp?c=test-client-id',
    }],
  });

  const service = createMerchantEnrichmentService({
    clientId: 'test-client-id',
    fetchImpl,
  });

  const [uber, netflix, spotify] = await service.enrichTransactions([
    { id: '1', description: 'UBER *TRIP', value: -28.9, category: 'Transporte' },
    { id: '2', description: 'PG *NETFLIX', value: -55.9, category: 'Lazer' },
    { id: '3', description: 'SPOTIFY', value: -21.9, category: 'Lazer' },
  ]);

  assert.equal(calls.length, 3);
  assert.equal(uber.description, 'UBER *TRIP');
  assert.deepEqual(uber.merchant, {
    name: 'Uber',
    domain: 'uber.com',
    logoUrl: 'https://cdn.brandfetch.io/ididqtKuQi/w/128/h/128/fallback/404/icon.webp?c=test-client-id',
    industry: null,
    confidence: 'high',
  });

  assert.equal(netflix.description, 'PG *NETFLIX');
  assert.deepEqual(netflix.merchant, {
    name: 'Netflix',
    domain: 'netflix.com',
    logoUrl: 'https://cdn.brandfetch.io/ideQwN5lBE/w/128/h/128/fallback/404/icon.webp?c=test-client-id',
    industry: null,
    confidence: 'high',
  });

  assert.equal(spotify.description, 'SPOTIFY');
  assert.deepEqual(spotify.merchant, {
    name: 'Spotify',
    domain: 'spotify.com',
    logoUrl: 'https://cdn.brandfetch.io/id20mQyGeY/w/128/h/128/fallback/404/icon.webp?c=test-client-id',
    industry: null,
    confidence: 'high',
  });
});

test('identifica descrições com prefixos de intermediadores sem atribuir cobrança da loja ao intermediador', async () => {
  const { fetchImpl, calls } = createBrandfetchMock({
    amazon: [{
      name: 'Amazon',
      domain: 'amazon.com',
      claimed: true,
      icon: 'https://cdn.brandfetch.io/idawOgYbbG/w/128/h/128/icon.webp?c=test-client-id',
    }],
    ifood: [{
      name: 'iFood',
      domain: 'ifood.com.br',
      claimed: true,
      icon: 'https://cdn.brandfetch.io/idifood/w/128/h/128/icon.webp?c=test-client-id',
    }],
    kabum: [{
      name: 'KaBuM!',
      domain: 'kabum.com.br',
      claimed: true,
      icon: 'https://cdn.brandfetch.io/idkabum/w/128/h/128/icon.webp?c=test-client-id',
    }],
  });

  const service = createMerchantEnrichmentService({
    clientId: 'test-client-id',
    fetchImpl,
  });

  const results = await service.enrichTransactions([
    { id: '1', description: 'PAG*AMAZON' },
    { id: '2', description: 'IFOOD*PEDIDO' },
    { id: '3', description: 'MERCADO PAGO*KABUM' },
    { id: '4', description: 'MERCADO PAGO*STORE' },
    { id: '5', description: 'MERCADO PAGO*LOJADESCONHECIDA' },
  ]);

  assert.equal(results[0].merchant?.name, 'Amazon');
  assert.equal(results[1].merchant?.name, 'iFood');
  assert.equal(results[2].merchant?.name, 'KaBuM!');
  // "STORE" é genérico e não gera consulta nem atribuição incorreta ao Mercado Pago.
  assert.equal(results[3].merchant, null);
  assert.equal(results[4].merchant, null);
  assert.equal(calls.length, 4);
  assert.equal(calls.some((call) => call.url.toLowerCase().includes('mercado')), false);
});

test('não consulta a API externa para recebimento PIX de pessoa física nem descrições sem empresa identificável', async () => {
  const { fetchImpl, calls } = createBrandfetchMock({});
  const service = createMerchantEnrichmentService({
    clientId: 'test-client-id',
    fetchImpl,
  });

  const descriptions = [
    'RECEBIMENTO PIX - GUILHERME',
    'PIX RECEBIDO - MARIA SILVA',
    'PIX ENVIADO - CARLOS EDUARDO',
    'PAGAMENTO PIX - JOAO PEDRO',
    'TRANSFERENCIA ENTRE CONTAS',
    'Salário mensal',
    'Aluguel',
    'Supermercado',
    'Compra',
    '123456',
    '',
  ];

  const results = await service.enrichTransactions(
    descriptions.map((description, index) => ({ id: String(index + 1), description })),
  );

  assert.equal(calls.length, 0);
  for (let i = 0; i < results.length; i += 1) {
    assert.equal(results[i].merchant, null);
    assert.equal(results[i].description, descriptions[i]);
  }
});

test('retorna empresa identificada com logoUrl null quando não houver logotipo disponível ou URL não for confiável', async () => {
  const { fetchImpl } = createBrandfetchMock({
    padariacentral: [{
      name: 'Padaria Central',
      domain: 'padariacentral.com.br',
      claimed: false,
      icon: null,
    }],
    lojateste: [{
      name: 'Loja Teste',
      domain: 'lojateste.com.br',
      claimed: false,
      icon: 'http://evil.example/logo.png',
    }],
  });

  const service = createMerchantEnrichmentService({
    clientId: 'test-client-id',
    fetchImpl,
  });

  const [noLogo, untrustedLogo] = await service.enrichTransactions([
    { id: '1', description: 'PADARIACENTRAL' },
    { id: '2', description: 'LOJATESTE' },
  ]);

  assert.deepEqual(noLogo.merchant, {
    name: 'Padaria Central',
    domain: 'padariacentral.com.br',
    logoUrl: null,
    industry: null,
    confidence: 'high',
  });
  assert.equal(untrustedLogo.merchant?.name, 'Loja Teste');
  assert.equal(untrustedLogo.merchant?.logoUrl, null);
  assert.equal(sanitizeLogoUrl('javascript:alert(1)'), null);
  assert.equal(sanitizeLogoUrl('https://attacker.example/icon.png'), null);
});

test('lida com API indisponível (erro de rede ou HTTP 503) sem interromper o processamento', async () => {
  const service503 = createMerchantEnrichmentService({
    clientId: 'test-client-id',
    fetchImpl: async () => jsonResponse({ error: 'service unavailable' }, 503),
  });
  const serviceNetwork = createMerchantEnrichmentService({
    clientId: 'test-client-id',
    fetchImpl: async () => {
      throw new TypeError('fetch failed');
    },
  });

  const [res503] = await service503.enrichTransactions([{ id: '1', description: 'SPOTIFY', value: -21.9 }]);
  const [resNet] = await serviceNetwork.enrichTransactions([{ id: '2', description: 'PG *NETFLIX', value: -55.9 }]);

  assert.equal(res503.description, 'SPOTIFY');
  assert.equal(res503.value, -21.9);
  assert.equal(res503.merchant, null);
  assert.equal(resNet.description, 'PG *NETFLIX');
  assert.equal(resNet.merchant, null);
});

test('lida com timeout na API externa sem travar a importação', async () => {
  const service = createMerchantEnrichmentService({
    clientId: 'test-client-id',
    timeoutMs: 500,
    fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => {
        reject(signal.reason || new DOMException('The operation was aborted due to timeout', 'TimeoutError'));
      });
    }),
  });

  const [tx] = await service.enrichTransactions([{ id: '1', description: 'UBER *TRIP', value: -30 }]);
  assert.equal(tx.description, 'UBER *TRIP');
  assert.equal(tx.merchant, null);
});

test('rejeita respostas inválidas do provedor e correspondências sem relação com o estabelecimento', async () => {
  const { fetchImpl } = createBrandfetchMock({
    brokenjson: () => new Response('{invalid-json', { status: 200 }),
    notarray: () => jsonResponse({ name: 'Netflix' }, 200),
    padariabairro: [{
      name: 'Totally Unrelated Corp',
      domain: 'unrelated.com',
      claimed: true,
      icon: 'https://cdn.brandfetch.io/id/w/128/h/128/icon.webp?c=test-client-id',
    }],
  });

  const service = createMerchantEnrichmentService({
    clientId: 'test-client-id',
    fetchImpl,
  });

  const results = await service.enrichTransactions([
    { id: '1', description: 'BROKENJSON' },
    { id: '2', description: 'NOTARRAY' },
    { id: '3', description: 'PADARIABAIRRO' },
  ]);

  assert.equal(results[0].merchant, null);
  assert.equal(results[1].merchant, null);
  assert.equal(results[2].merchant, null);
});

test('deduplica estabelecimentos no mesmo lote, usa cache com TTL/LRU e respeita limite de concorrência', async () => {
  let currentTime = 1_000_000;
  let activeRequests = 0;
  let maxConcurrentRequests = 0;

  const { fetchImpl, calls } = createBrandfetchMock({
    netflix: async () => {
      activeRequests += 1;
      maxConcurrentRequests = Math.max(maxConcurrentRequests, activeRequests);
      await new Promise((resolve) => setTimeout(resolve, 15));
      activeRequests -= 1;
      return jsonResponse([{
        name: 'Netflix',
        domain: 'netflix.com',
        claimed: true,
        icon: 'https://cdn.brandfetch.io/id_nf/w/128/h/128/icon.webp?c=test-client-id',
      }]);
    },
    spotify: async () => {
      activeRequests += 1;
      maxConcurrentRequests = Math.max(maxConcurrentRequests, activeRequests);
      await new Promise((resolve) => setTimeout(resolve, 15));
      activeRequests -= 1;
      return jsonResponse([{
        name: 'Spotify',
        domain: 'spotify.com',
        claimed: true,
        icon: 'https://cdn.brandfetch.io/id_sp/w/128/h/128/icon.webp?c=test-client-id',
      }]);
    },
    uber: async () => {
      activeRequests += 1;
      maxConcurrentRequests = Math.max(maxConcurrentRequests, activeRequests);
      await new Promise((resolve) => setTimeout(resolve, 15));
      activeRequests -= 1;
      return jsonResponse([{
        name: 'Uber',
        domain: 'uber.com',
        claimed: true,
        icon: 'https://cdn.brandfetch.io/id_ub/w/128/h/128/icon.webp?c=test-client-id',
      }]);
    },
  });

  const service = createMerchantEnrichmentService({
    clientId: 'test-client-id',
    concurrency: 2,
    cacheTtlMs: 60_000,
    cacheMaxSize: 2,
    fetchImpl,
    now: () => currentTime,
  });

  // Lote com múltiplas ocorrências de Netflix e Uber sob descrições diferentes.
  const firstBatch = await service.enrichTransactions([
    { id: '1', description: 'PG *NETFLIX' },
    { id: '2', description: 'PAG*NETFLIX 02/12' },
    { id: '3', description: 'UBER *TRIP' },
    { id: '4', description: 'UBER *PENDING' },
    { id: '5', description: 'SPOTIFY' },
  ]);

  assert.equal(calls.length, 3, 'cada estabelecimento único deve ser consultado apenas uma vez no lote');
  assert.ok(maxConcurrentRequests <= 2, 'concorrência máxima deve ser respeitada');
  assert.equal(firstBatch[0].merchant?.name, 'Netflix');
  assert.equal(firstBatch[1].merchant?.name, 'Netflix');
  assert.equal(firstBatch[2].merchant?.name, 'Uber');
  assert.equal(firstBatch[3].merchant?.name, 'Uber');
  assert.equal(firstBatch[4].merchant?.name, 'Spotify');
  assert.equal(service.getCacheSize(), 2, 'limite máximo do cache LRU deve ser respeitado');

  // Nova consulta dentro do TTL para item ainda em cache não gera nova chamada HTTP.
  await service.enrichTransactions([{ id: '6', description: 'SPOTIFY' }]);
  assert.equal(calls.length, 3);

  // Após expiração do TTL, consulta novamente.
  currentTime += 61_000;
  await service.enrichTransactions([{ id: '7', description: 'SPOTIFY' }]);
  assert.equal(calls.length, 4);
});

test('interrompe novas chamadas no lote ao receber HTTP 429 (rate limit) e não envia dados financeiros à API', async () => {
  const { fetchImpl, calls } = createBrandfetchMock({
    netflix: () => jsonResponse({ message: 'rate limited' }, 429),
    spotify: () => jsonResponse([{ name: 'Spotify', domain: 'spotify.com', icon: null }]),
  });

  const service = createMerchantEnrichmentService({
    clientId: 'test-client-id',
    concurrency: 1,
    fetchImpl,
  });

  const results = await service.enrichTransactions([
    { id: '1', date: '2026-10-01', description: 'PG *NETFLIX', value: -55.9 },
    { id: '2', date: '2026-10-02', description: 'SPOTIFY', value: -21.9 },
  ]);

  assert.equal(calls.length, 1, 'após 429 o serviço pausa novas chamadas imediatamente');
  assert.equal(calls[0].url.includes('55.9'), false);
  assert.equal(calls[0].url.includes('2026-10-01'), false);
  assert.equal(calls[0].url.includes('PG'), false);
  assert.equal(results[0].merchant, null);
  assert.equal(results[1].merchant, null);
});

test('enriquece industry opcionalmente via Brand API sem expor a chave privada Bearer nas respostas', async () => {
  const secretKey = 'bf_secret_test_key_never_expose';
  const { fetchImpl, calls } = createBrandfetchMock(
    {
      netflix: [{
        name: 'Netflix',
        domain: 'netflix.com',
        claimed: true,
        icon: 'https://cdn.brandfetch.io/ideQwN5lBE/w/128/h/128/icon.webp?c=test-client-id',
      }],
    },
    {
      'netflix.com': {
        name: 'Netflix',
        domain: 'netflix.com',
        company: {
          industries: [{ name: 'Entertainment', slug: 'entertainment' }],
        },
      },
    },
  );

  const service = createMerchantEnrichmentService({
    clientId: 'test-client-id',
    apiKey: secretKey,
    fetchImpl,
  });

  const [tx] = await service.enrichTransactions([{ id: '1', description: 'PG *NETFLIX' }]);

  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.headers.Authorization, `Bearer ${secretKey}`);
  assert.equal(tx.merchant?.industry, 'Entertainment');
  assert.equal(JSON.stringify(tx).includes(secretKey), false);
});

test('integração com csvImportService preserva descrição original, valores, regras e preferências pessoais', async () => {
  const filePath = path.join(os.tmpdir(), `extrato-enrichment-${Date.now()}.csv`);
  fs.writeFileSync(
    filePath,
    [
      'date;title;amount',
      '10/10/2026;UBER *TRIP;-32,40',
      '11/10/2026;PG *NETFLIX;-55,90',
      '12/10/2026;SPOTIFY;-21,90',
      '13/10/2026;RECEBIMENTO PIX - GUILHERME;150,00',
    ].join('\n'),
    'utf8',
  );

  const { fetchImpl, calls } = createBrandfetchMock({
    uber: [{
      name: 'Uber',
      domain: 'uber.com',
      claimed: true,
      icon: 'https://cdn.brandfetch.io/id_uber/w/128/h/128/fallback/lettermark/icon.webp?c=test-client-id',
    }],
    netflix: [{
      name: 'Netflix',
      domain: 'netflix.com',
      claimed: true,
      icon: 'https://cdn.brandfetch.io/id_netflix/w/128/h/128/fallback/lettermark/icon.webp?c=test-client-id',
    }],
    spotify: [{
      name: 'Spotify',
      domain: 'spotify.com',
      claimed: true,
      icon: 'https://cdn.brandfetch.io/id_spotify/w/128/h/128/fallback/lettermark/icon.webp?c=test-client-id',
    }],
  });

  const mockEnricher = createMerchantEnrichmentService({
    clientId: 'test-client-id',
    fetchImpl,
  });

  // Preferência pessoal baseada na descrição ORIGINAL "pg *netflix"
  const preferences = new Map([
    ['pg *netflix', { id: 'pref-1', category: 'Assinaturas', categoryId: 'cat-sub' }],
  ]);

  try {
    const rows = await csvImportService.parseCsvFile(filePath, BASELINE_RULES, {
      preferences,
      merchantEnrichment: mockEnricher,
    });

    assert.equal(rows.length, 4);
    assert.equal(calls.length, 3, 'RECEBIMENTO PIX - GUILHERME não deve gerar consulta externa');

    // Preserva descrição original, valor e classificação automática por regra
    assert.equal(rows[0].description, 'UBER *TRIP');
    assert.equal(rows[0].value, -32.4);
    assert.equal(rows[0].category, 'Transporte');
    assert.equal(rows[0].merchant?.name, 'Uber');

    // Preferência pessoal continua correspondendo à descrição original "PG *NETFLIX"
    assert.equal(rows[1].description, 'PG *NETFLIX');
    assert.equal(rows[1].value, -55.9);
    assert.equal(rows[1].category, 'Assinaturas');
    assert.equal(rows[1].preferenceId, 'pref-1');
    assert.equal(rows[1].merchant?.name, 'Netflix');

    // Spotify preservado e enriquecido
    assert.equal(rows[2].description, 'SPOTIFY');
    assert.equal(rows[2].category, 'Lazer');
    assert.equal(rows[2].merchant?.name, 'Spotify');

    // PIX de pessoa física sem enriquecimento empresarial
    assert.equal(rows[3].description, 'RECEBIMENTO PIX - GUILHERME');
    assert.equal(rows[3].value, 150);
    assert.equal(rows[3].merchant, null);
  } finally {
    fs.unlinkSync(filePath);
  }
});

test('extractMerchantCandidate extrai corretamente domínios e códigos de transação ruidosos', () => {
  assert.equal(extractMerchantCandidate('APPLE.COM/BILL')?.normalizedKey, 'apple.com');
  assert.equal(extractMerchantCandidate('SPOTIFY P123456789')?.normalizedKey, 'spotify');
  assert.equal(extractMerchantCandidate('EBN *SPOTIFY 02/12')?.normalizedKey, 'spotify');
  assert.equal(extractMerchantCandidate('UBER *TRIP HELP.UBER.COM')?.normalizedKey, 'uber');
});
