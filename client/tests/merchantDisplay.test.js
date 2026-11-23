import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

import {
  getMerchantDisplay,
  getMerchantInitials,
  getSafeLogoUrl,
} from '../src/services/merchantPresentation.js';
import { importStatements } from '../src/services/statementImport.js';
import { reconcileCategories, applyCategoryChoice } from '../src/services/categoryState.js';

let vite;
let TransactionsTable;
let TransactionDetails;
let ClassifiedPreviewTable;

before(async () => {
  vite = await createServer({
    root: path.resolve(import.meta.dirname, '..'),
    logLevel: 'silent',
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true },
    appType: 'custom',
  });

  ({ TransactionsTable } = await vite.ssrLoadModule('/src/components/import/TransactionsTable.jsx'));
  ({ TransactionDetails } = await vite.ssrLoadModule('/src/components/import/TransactionDetails.jsx'));
  ({ ClassifiedPreviewTable } = await vite.ssrLoadModule('/src/components/classifier/ClassifiedPreviewTable.jsx'));
});

after(async () => {
  if (vite) await vite.close();
});

test('merchantPresentation valida URLs de logotipo, gera iniciais e define exibição da descrição secundária', () => {
  assert.equal(
    getSafeLogoUrl('https://cdn.brandfetch.io/id_nf/w/128/h/128/fallback/404/icon.webp?c=abc'),
    'https://cdn.brandfetch.io/id_nf/w/128/h/128/fallback/404/icon.webp?c=abc',
  );
  assert.equal(getSafeLogoUrl('http://cdn.brandfetch.io/icon.webp'), null);
  assert.equal(getSafeLogoUrl('https://evil.example/logo.png'), null);
  assert.equal(getSafeLogoUrl('javascript:alert(1)'), null);

  assert.equal(getMerchantInitials('Netflix'), 'NE');
  assert.equal(getMerchantInitials('Mercado Livre'), 'ML');

  const netflixDisplay = getMerchantDisplay({
    description: 'PG *NETFLIX',
    merchant: {
      name: 'Netflix',
      domain: 'netflix.com',
      logoUrl: 'https://cdn.brandfetch.io/id_nf/w/128/h/128/icon.webp',
      industry: 'Entertainment',
      confidence: 'high',
    },
  });
  assert.equal(netflixDisplay.primaryLabel, 'Netflix');
  assert.equal(netflixDisplay.secondaryDescription, 'PG *NETFLIX');
  assert.equal(netflixDisplay.altText, 'Logotipo de Netflix');

  const spotifyDisplay = getMerchantDisplay({
    description: 'SPOTIFY',
    merchant: { name: 'Spotify', domain: 'spotify.com', logoUrl: null, industry: null, confidence: 'high' },
  });
  assert.equal(spotifyDisplay.primaryLabel, 'Spotify');
  assert.equal(spotifyDisplay.secondaryDescription, '');
  assert.equal(spotifyDisplay.initials, 'SP');
});

test('TransactionsTable exibe logotipo quando disponível, nome comercial limpo e descrição original secundária', () => {
  const transactions = [
    {
      id: 'tx-1',
      date: '2026-10-10',
      description: 'PG *NETFLIX',
      value: -55.9,
      category: 'Lazer',
      categoryId: 'cat-lazer',
      merchant: {
        name: 'Netflix',
        domain: 'netflix.com',
        logoUrl: 'https://cdn.brandfetch.io/ideQwN5lBE/w/128/h/128/fallback/404/icon.webp?c=demo',
        industry: null,
        confidence: 'high',
      },
    },
    {
      id: 'tx-2',
      date: '2026-10-11',
      description: 'UBER *TRIP',
      value: -28.9,
      category: 'Transporte',
      categoryId: 'cat-transporte',
      merchant: {
        name: 'Uber',
        domain: 'uber.com',
        logoUrl: null,
        industry: null,
        confidence: 'high',
      },
    },
    {
      id: 'tx-3',
      date: '2026-10-12',
      description: 'RECEBIMENTO PIX - GUILHERME',
      value: 150,
      category: 'Receita',
      categoryId: 'cat-receita',
      merchant: null,
    },
  ];

  const html = renderToStaticMarkup(createElement(TransactionsTable, {
    transactions,
    colors: { Lazer: '#8b5cf6', Transporte: '#3b82f6', Receita: '#10b981' },
    onEdit: () => {},
    onDelete: () => {},
  }));

  // 1. Logotipo oficial com lazy loading e texto alternativo acessível
  assert.match(html, /<img[^>]+src="https:\/\/cdn\.brandfetch\.io\/ideQwN5lBE\/w\/128\/h\/128\/fallback\/404\/icon\.webp\?c=demo"/);
  assert.match(html, /alt="Logotipo de Netflix"/);
  assert.match(html, /loading="lazy"/);
  assert.ok(html.includes('Netflix'));
  assert.ok(html.includes('PG *NETFLIX'));

  // 2. Fallback por iniciais quando empresa identificada não tem logotipo (sem <img> extra)
  assert.equal((html.match(/<img\b/g) || []).length, 1);
  assert.ok(html.includes('>UB<'));
  assert.ok(html.includes('Uber'));
  assert.ok(html.includes('UBER *TRIP'));

  // 3. Fallback visual genérico quando não houver empresa identificada
  assert.ok(html.includes('RECEBIMENTO PIX - GUILHERME'));
});

test('TransactionDetails exibe estabelecimento, domínio e setor preservando a descrição original', () => {
  const enrichedHtml = renderToStaticMarkup(createElement(TransactionDetails, {
    transaction: {
      id: 'tx-1',
      date: '2026-10-10',
      description: 'PG *NETFLIX',
      value: -55.9,
      merchant: {
        name: 'Netflix',
        domain: 'netflix.com',
        logoUrl: 'https://cdn.brandfetch.io/ideQwN5lBE/w/128/h/128/icon.webp',
        industry: 'Entertainment',
        confidence: 'high',
      },
    },
  }));

  assert.ok(enrichedHtml.includes('Estabelecimento'));
  assert.ok(enrichedHtml.includes('Netflix'));
  assert.ok(enrichedHtml.includes('netflix.com'));
  assert.ok(enrichedHtml.includes('Entertainment'));
  assert.ok(enrichedHtml.includes('Descrição original'));
  assert.ok(enrichedHtml.includes('PG *NETFLIX'));
  assert.match(enrichedHtml, /alt="Logotipo de Netflix"/);

  const plainHtml = renderToStaticMarkup(createElement(TransactionDetails, {
    transaction: {
      id: 'tx-2',
      date: '2026-10-12',
      description: 'RECEBIMENTO PIX - GUILHERME',
      value: 150,
      merchant: null,
    },
  }));

  assert.equal(plainHtml.includes('Estabelecimento'), false);
  assert.ok(plainHtml.includes('Descrição'));
  assert.ok(plainHtml.includes('RECEBIMENTO PIX - GUILHERME'));
});

test('ClassifiedPreviewTable, importStatements e categoryState preservam metadados de merchant sem alterar descrição original', async () => {
  const merchant = {
    name: 'Spotify',
    domain: 'spotify.com',
    logoUrl: 'https://cdn.brandfetch.io/id_sp/w/128/h/128/icon.webp',
    industry: null,
    confidence: 'high',
  };

  const imported = await importStatements(
    [{ name: 'extrato.csv', size: 120 }],
    { id: 'fallback-id', name: 'Outros' },
    async () => ({
      dados: [{
        date: '2026-10-15',
        description: 'SPOTIFY',
        value: -21.9,
        category: 'Lazer',
        categoryId: 'cat-lazer',
        merchant,
      }],
    }),
  );

  assert.equal(imported[0].description, 'SPOTIFY');
  assert.deepEqual(imported[0].merchant, merchant);

  const categories = [
    { id: 'cat-lazer', name: 'Entretenimento', color: '#8b5cf6', isFallback: false },
    { id: 'fallback-id', name: 'Outros', color: '#94a3b8', isFallback: true },
  ];
  const reconciled = reconcileCategories(imported, categories);
  assert.deepEqual(reconciled[0].merchant, merchant);

  const updated = applyCategoryChoice(reconciled, reconciled[0], categories[1], false);
  assert.deepEqual(updated[0].merchant, merchant);
  assert.equal(updated[0].description, 'SPOTIFY');

  const previewHtml = renderToStaticMarkup(createElement(ClassifiedPreviewTable, {
    transactions: imported,
    categoryColors: { Lazer: '#8b5cf6' },
  }));
  assert.ok(previewHtml.includes('Spotify'));
  assert.match(previewHtml, /alt="Logotipo de Spotify"/);
});
