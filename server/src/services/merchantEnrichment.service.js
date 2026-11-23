import { normalizeText } from '../utils/normalizeText.js';

const BRANDFETCH_SEARCH_BASE_URL = 'https://api.brandfetch.io/v2/search/';
const BRANDFETCH_BRAND_BASE_URL = 'https://api.brandfetch.io/v2/brands/domain/';
const ALLOWED_LOGO_HOSTS = new Set(['cdn.brandfetch.io', 'asset.brandfetch.io']);

const DEFAULT_TIMEOUT_MS = 3000;
const MIN_TIMEOUT_MS = 500;
const MAX_TIMEOUT_MS = 10000;
const DEFAULT_CONCURRENCY = 4;
const MIN_CONCURRENCY = 1;
const MAX_CONCURRENCY = 10;
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
const DEFAULT_NOT_FOUND_TTL_MS = 10 * 60 * 1000; // 10 minutos
const DEFAULT_CACHE_MAX_SIZE = 500;
const DEFAULT_MAX_UNIQUE_LOOKUPS = 50;
const DEFAULT_BATCH_BUDGET_MS = 8000;
const MAX_RESPONSE_BYTES = 256 * 1024;
const RATE_LIMIT_COOLDOWN_MS = 60 * 1000;
const AUTH_ERROR_COOLDOWN_MS = 5 * 60 * 1000;

const CONTROL_CHARS_RE = /[\u0000-\u001f\u007f]/g;
const DOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
const IPV4_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const PRIVATE_TLDS = new Set(['local', 'localhost', 'internal', 'lan', 'home', 'arpa', 'example', 'invalid']);

const CORPORATE_INDICATOR_RE = /\b(?:ltda|s\/a|s\.a\.|eireli|comercio|servicos|pagamentos|supermercado|mercado|farmacia|drogaria|restaurante|posto|store|shop|ticket|tech|lab|clinica|hotel|cinema|academia|escola|telecom|energia|digital|pay|bank)\b|\.(?:com|com\.br|net|org|io|app)\b/i;

const P2P_TRANSFER_PREFIX_RE = /^(?:recebimento\s+pix|pix\s+recebido|pix\s+enviado|envio\s+pix|transf(?:erencia)?\s+(?:pix|recebida|enviada|entre\s+contas|eletronica)|ted\b|doc\b|tev\b)/i;
const PIX_QR_PREFIX_RE = /^(?:pix\s+qr\s*code|qr\s*code\s+pix|compra\s+pix|pix\s+pagamento\s+qr)\s*[-*:/]?\s+/i;
const PIX_GENERIC_PREFIX_RE = /^(?:pagamento\s+pix|pix)\s*[-*:/]?\s+/i;

const NON_MERCHANT_BANKING_RE = /^(?:salario|proventos|dividendos|rendimento|resgate|aplicacao|investimento|deposito|saque|iof|juros|multa|encargos|tarifa|anuidade|estorno|reembolso|devolucao|pagamento\s+(?:de\s+)?(?:fatura|boleto|titulo)|fatura\s+cartao|pagto\s+fatura|credito\s+em\s+conta|saldo\s+anterior|aluguel|condominio)\b/i;

const CHANNEL_WRAPPER_RE = /^(?:compra\s+(?:no\s+)?(?:debito|credito|cartao|elo|visa|master(?:card)?)|debito\s+(?:visa|master(?:card)?|elo)|credito\s+(?:visa|master(?:card)?|elo)|pagamento\s+cartao|assinatura|recorrencia)\s*[-*:/]?\s+/i;

// Prefixos curtos só indicam intermediador quando seguidos explicitamente de '*'.
const SHORT_INTERMEDIARY_RE = /^(?:pg|pag|mp|pp|sq|ec|ebn|dm|dl|sp)\s*\*\s*(.+)$/i;

// Nomes completos de intermediadores de pagamento seguidos de delimitador e nome da loja.
const NAMED_INTERMEDIARY_RE = /^(?:mercado\s*pago|mercpago|mpago|pagseguro|pagbank|pags|paypal|ebanx|dlocal|ppro|adyen|stripe|sumup|stone|cielo|rede|getnet|ton|izettle|zettle|asaas|vindi|iugu|hotmart|kiwify|eduzz|picpay|ame|nupay|recargapay|appmax|yampy|cloudwalk|infinitepay|shopify|square)\s*(?:\*|[-/:])\s*(.+)$/i;

const OPERATIONAL_ASTERISK_SUFFIXES = new Set([
  'trip', 'pedido', 'order', 'ride', 'pending', 'help', 'compra', 'assinatura',
  'bill', 'sub', 'subscription', 'renewal', 'online', 'br', 'bra', 'brasil',
  'brazil', 'app', 'web', 'pay', 'digital', 'servicos', 'servico', 'pagamento',
  'pagamentos', 'delivery', 'club', 'loja', 'store', 'mktp', 'marketplace',
  'storefront', 'charge', 'invoice', 'fatura', 'mensal', 'anual',
]);

const GENERIC_NON_BRAND_TERMS = new Set([
  'store', 'loja', 'shop', 'shopping', 'mercado', 'supermercado', 'hipermercado',
  'padaria', 'farmacia', 'drogaria', 'restaurante', 'lanchonete', 'pizzaria',
  'cafeteria', 'cafe', 'bar', 'posto', 'combustivel', 'gasolina', 'estacionamento',
  'transporte', 'viagem', 'hotel', 'cinema', 'academia', 'escola', 'faculdade',
  'clinica', 'hospital', 'laboratorio', 'otica', 'petshop', 'salao', 'barbearia',
  'almoco', 'jantar', 'lanche', 'compra', 'compras', 'pagamento', 'pagamentos',
  'servico', 'servicos', 'produto', 'produtos', 'vendas', 'varejo', 'online',
  'digital', 'app', 'web', 'site', 'internet', 'assinatura', 'mensalidade',
  'conta', 'conta de luz', 'conta de agua', 'energia', 'agua', 'gas', 'telefone',
  'celular', 'aluguel', 'condominio', 'boleto', 'fatura', 'cartao', 'credito',
  'debito', 'pix', 'transferencia', 'salario', 'salario mensal', 'receita',
  'despesa', 'outros', 'geral', 'diversos', 'taxa', 'tarifa', 'imposto',
  'seguro', 'saude', 'lazer', 'moradia', 'alimentacao', 'educacao', 'vestuario',
  'eletronicos', 'moveis', 'casa', 'brasil', 'brazil', 'comercio', 'empresa',
  'cliente', 'usuario', 'consumo', 'pedido', 'pedidos', 'entrega', 'frete',
]);

const GENERIC_STOP_WORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'no', 'na', 'nos', 'nas', 'em', 'e', 'o', 'a',
  'os', 'as', 'para', 'por', 'com', 'via',
]);

function clampInt(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function stripDiacritics(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeTokens(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function toCompactAlphaNum(value) {
  return normalizeText(value).replace(/[^a-z0-9]/g, '');
}

function extractDomainRoot(domain) {
  const clean = String(domain || '').toLowerCase().replace(/^www\./, '');
  const parts = clean.split('.').filter(Boolean);
  return parts[0] || '';
}

export function sanitizeText(value, maxLength = 120) {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(CONTROL_CHARS_RE, '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLength);
}

export function sanitizeDomain(value) {
  if (typeof value !== 'string') return null;
  const cleaned = value
    .replace(CONTROL_CHARS_RE, '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split(/[/?#]/)[0];

  if (!cleaned || cleaned.length > 253 || !DOMAIN_RE.test(cleaned) || IPV4_RE.test(cleaned)) {
    return null;
  }

  const tld = cleaned.split('.').at(-1);
  if (!tld || PRIVATE_TLDS.has(tld)) {
    return null;
  }

  return cleaned;
}

export function sanitizeLogoUrl(rawUrl, forbiddenSecrets = []) {
  if (typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 500 || CONTROL_CHARS_RE.test(trimmed)) return null;

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:') return null;
  if (parsed.username || parsed.password || parsed.port) return null;
  if (!ALLOWED_LOGO_HOSTS.has(parsed.hostname.toLowerCase())) return null;
  if (parsed.pathname.includes('..') || parsed.pathname.includes('\\')) return null;

  // Substitui fallback lettermark por 404 para permitir o fallback visual próprio da interface.
  if (parsed.pathname.includes('/fallback/lettermark/')) {
    parsed.pathname = parsed.pathname.replace('/fallback/lettermark/', '/fallback/404/');
  }

  // Garante que nenhuma chave privada seja refletida acidentalmente na URL.
  for (const secret of forbiddenSecrets) {
    if (secret && parsed.toString().includes(secret)) {
      return null;
    }
  }

  for (const key of [...parsed.searchParams.keys()]) {
    if (/^(?:api[_-]?key|secret|token|auth(?:orization)?)$/i.test(key)) {
      return null;
    }
  }

  return parsed.toString();
}

function extractInlineDomain(text) {
  const match = text.match(/\b((?:[a-z0-9-]+\.)+(?:com\.br|com|net|org|io|app|co|br|tv|me|gg|ai))(?:\/[^\s*]*)?\b/i);
  if (!match) return null;
  return sanitizeDomain(match[1]);
}

function isOperationalRightPart(rightPart) {
  if (!rightPart) return true;
  const tokens = normalizeTokens(rightPart);
  if (!tokens.length) return true;
  if (OPERATIONAL_ASTERISK_SUFFIXES.has(tokens[0])) return true;
  if (/\d{3,}/.test(rightPart)) return true;
  if (/^[a-z0-9]{6,}$/i.test(rightPart) && /\d/.test(rightPart)) return true;
  return false;
}

function isOnlyGenericWords(text) {
  const normalized = normalizeTokens(text).join(' ');
  if (!normalized) return true;
  if (GENERIC_NON_BRAND_TERMS.has(normalized)) return true;

  const significantTokens = normalizeTokens(text).filter((token) => !GENERIC_STOP_WORDS.has(token));
  if (!significantTokens.length) return true;
  return significantTokens.every((token) => GENERIC_NON_BRAND_TERMS.has(token));
}

function stripTrailingLocation(text) {
  const locationRe = /\s+(?:(?:sao\s+paulo|rio\s+de\s+janeiro|belo\s+horizonte|curitiba|porto\s+alegre|brasilia|campinas|fortaleza|salvador|recife|manaus|goiania|florianopolis|osasco|barueri|guarulhos)\s+)?(?:(?:sp|rj|mg|pr|rs|df|ba|pe|ce|sc|go|am|pa|es|mt|ms|rn|pb|al|se|pi|ma|to|ro|ac|ap|rr)\s+)?(?:br|bra|brasil)\s*$/i;
  const stripped = text.replace(locationRe, '').trim();
  return stripped.length >= 3 ? stripped : text;
}

/**
 * Extrai o nome comercial candidato de uma descrição bancária,
 * diferenciando intermediadores de pagamento de estabelecimentos reais
 * e evitando consultas para transferências pessoais (ex.: PIX de pessoa física).
 */
export function extractMerchantCandidate(rawDescription) {
  if (typeof rawDescription !== 'string') return null;
  const trimmed = rawDescription.replace(CONTROL_CHARS_RE, ' ').replace(/\s+/g, ' ').trim();
  if (trimmed.length < 2) return null;

  const ascii = stripDiacritics(trimmed);

  // 1. Transferências pessoais (PIX recebido/enviado, TED, DOC) não devem gerar busca de marca.
  if (P2P_TRANSFER_PREFIX_RE.test(ascii) && !CORPORATE_INDICATOR_RE.test(ascii)) {
    return null;
  }

  // 2. Operações bancárias genéricas sem estabelecimento comercial identificável.
  if (NON_MERCHANT_BANKING_RE.test(ascii)) {
    return null;
  }

  let working = ascii;
  let viaIntermediary = false;

  // 3. PIX QR Code / Compra PIX pode apontar para estabelecimento; PIX genérico exige marcador empresarial.
  if (PIX_QR_PREFIX_RE.test(working)) {
    working = working.replace(PIX_QR_PREFIX_RE, '').trim();
  } else if (PIX_GENERIC_PREFIX_RE.test(working)) {
    const remainder = working.replace(PIX_GENERIC_PREFIX_RE, '').trim();
    if (!CORPORATE_INDICATOR_RE.test(remainder)) {
      return null;
    }
    working = remainder;
  }

  // 4. Remove prefixos descritivos de cartão/meio de pagamento e intermediadores (até 2 camadas).
  for (let pass = 0; pass < 2; pass += 1) {
    if (CHANNEL_WRAPPER_RE.test(working)) {
      working = working.replace(CHANNEL_WRAPPER_RE, '').trim();
    }

    const shortMatch = working.match(SHORT_INTERMEDIARY_RE);
    if (shortMatch) {
      working = shortMatch[1].trim();
      viaIntermediary = true;
      continue;
    }

    const namedMatch = working.match(NAMED_INTERMEDIARY_RE);
    if (namedMatch) {
      working = namedMatch[1].trim();
      viaIntermediary = true;
    }
  }

  if (!working) return null;

  // 5. Separa "EMPRESA *DETALHE" (ex.: UBER *TRIP, IFOOD*PEDIDO) quando a esquerda é o estabelecimento.
  if (working.includes('*')) {
    const [leftRaw, ...restParts] = working.split('*');
    const left = leftRaw.trim();
    const right = restParts.join(' ').trim();
    const leftCompact = toCompactAlphaNum(left);

    if (leftCompact.length >= 2) {
      if (isOperationalRightPart(right)) {
        working = left;
      } else if (isOnlyGenericWords(left) && right) {
        working = right;
      } else if (right) {
        working = `${left} ${right}`;
      } else {
        working = left;
      }
    } else if (right) {
      working = right;
    }
  }

  // 6. Identifica domínio explícito (ex.: APPLE.COM/BILL, NETFLIX.COM, AMAZON.COM.BR).
  const domainHint = extractInlineDomain(working);
  if (domainHint) {
    const withoutDomain = working
      .replace(new RegExp(`${domainHint.replace(/\./g, '\\.')}(?:/[^\\s]*)?`, 'i'), '')
      .trim();
    const withoutLocation = stripTrailingLocation(withoutDomain);
    if (!withoutLocation || isOnlyGenericWords(withoutLocation) || isOperationalRightPart(withoutLocation)) {
      return {
        query: domainHint,
        normalizedKey: domainHint,
        domainHint,
        viaIntermediary,
      };
    }
  }

  // 7. Remove códigos de transação, parcelas, datas, documentos e sufixos jurídicos/geográficos.
  working = working
    .replace(/\b(?:parc(?:ela)?\s*)?\d{1,2}\s*\/\s*\d{1,2}\b/gi, ' ')
    .replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g, ' ')
    .replace(/\b(?:final|cartao|card)\s*\d{4}\b/gi, ' ')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, ' ')
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, ' ')
    .replace(/#[a-z0-9]+/gi, ' ')
    .replace(/\b[a-z]{1,2}\d{5,}\b/gi, ' ')
    .replace(/\b\d{4,}\b/g, ' ')
    .replace(/[/_|]+/g, ' ')
    .replace(/^[-.\s]+|[-.\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  working = stripTrailingLocation(working);
  working = working
    .replace(/\b(?:ltda|s\/a|s\.a\.|eireli|mei|epp|me|inc|llc|corp|ltd|gmbh)\b\.?$/gi, '')
    .replace(/^[-.\s]+|[-.\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // 8. Valida se restou um nome comercial minimamente identificável.
  if (!working || working.length > 60) return null;
  const compact = toCompactAlphaNum(working);
  if (compact.length < 3 || !/[a-z]{2,}/i.test(working)) return null;
  if (isOnlyGenericWords(working)) return null;

  const normalizedKey = normalizeTokens(working).join(' ');
  if (!normalizedKey || normalizedKey.length < 3) return null;

  return {
    query: working,
    normalizedKey,
    domainHint: null,
    viaIntermediary,
  };
}

/**
 * Seleciona e valida o melhor resultado retornado pela Brand Search API,
 * rejeitando correspondências fracas ou não confiáveis.
 */
export function selectBestBrandMatch(items, candidate, forbiddenSecrets = []) {
  if (!Array.isArray(items) || !items.length || !candidate) return null;

  const candTokens = normalizeTokens(candidate.domainHint ? extractDomainRoot(candidate.domainHint) : candidate.query);
  const candNorm = candTokens.join(' ');
  const candCompact = candTokens.join('');
  const domainHint = candidate.domainHint ? sanitizeDomain(candidate.domainHint) : null;
  const domainHintRoot = domainHint ? extractDomainRoot(domainHint) : null;

  if (!candCompact) return null;

  let best = null;

  items.forEach((rawItem, index) => {
    if (!rawItem || typeof rawItem !== 'object') return;

    const name = sanitizeText(rawItem.name, 120);
    const domain = sanitizeDomain(rawItem.domain);
    if (!name || !domain) return;

    const brandTokens = normalizeTokens(name);
    const brandNorm = brandTokens.join(' ');
    const brandCompact = brandTokens.join('');
    const domainRoot = extractDomainRoot(domain);

    let confidence = null;
    let rankScore = 0;

    if (domainHint && domain === domainHint) {
      confidence = 'high';
      rankScore = 100;
    } else if (domainHintRoot && domainRoot === domainHintRoot) {
      confidence = 'high';
      rankScore = 95;
    } else if (candCompact === brandCompact) {
      confidence = 'high';
      rankScore = 92;
    } else if (candCompact.length >= 3 && candCompact === domainRoot) {
      confidence = 'high';
      rankScore = 90;
    } else if (
      candTokens.length >= 1
      && candNorm.length >= 4
      && brandNorm.startsWith(`${candNorm} `)
    ) {
      confidence = domainRoot === candCompact ? 'high' : 'medium';
      rankScore = confidence === 'high' ? 85 : 70;
    } else if (
      candTokens.length >= 2
      && brandTokens.length >= 1
      && brandCompact.length >= 4
      && candNorm.startsWith(`${brandNorm} `)
      && domainRoot === brandCompact
    ) {
      confidence = 'medium';
      rankScore = 65;
    }

    if (!confidence) return;

    const logoUrl = sanitizeLogoUrl(rawItem.icon, forbiddenSecrets);
    const claimedBonus = rawItem.claimed === true ? 4 : 0;
    const logoBonus = logoUrl ? 2 : 0;
    const positionPenalty = Math.min(index, 10) * 0.1;
    const score = rankScore + claimedBonus + logoBonus - positionPenalty;

    if (!best || score > best.score) {
      best = {
        score,
        merchant: {
          name,
          domain,
          logoUrl,
          industry: null,
          confidence,
        },
      };
    }
  });

  return best ? best.merchant : null;
}

class BoundedTtlCache {
  constructor({ maxSize = DEFAULT_CACHE_MAX_SIZE } = {}) {
    this.maxSize = maxSize;
    this.entries = new Map();
  }

  get(key, now = Date.now()) {
    const entry = this.entries.get(key);
    if (!entry) return { hit: false, value: null };
    if (entry.expiresAt <= now) {
      this.entries.delete(key);
      return { hit: false, value: null };
    }
    // Atualiza ordem LRU.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return { hit: true, value: entry.value };
  }

  set(key, value, ttlMs, now = Date.now(), maxSize = this.maxSize) {
    this.maxSize = maxSize;
    if (this.maxSize <= 0 || ttlMs <= 0) return;
    if (this.entries.has(key)) {
      this.entries.delete(key);
    } else {
      while (this.entries.size >= this.maxSize) {
        const oldestKey = this.entries.keys().next().value;
        if (oldestKey === undefined) break;
        this.entries.delete(oldestKey);
      }
    }
    this.entries.set(key, { value, expiresAt: now + ttlMs });
  }

  clear() {
    this.entries.clear();
  }

  get size() {
    return this.entries.size;
  }
}

async function readBoundedJson(response, maxBytes = MAX_RESPONSE_BYTES) {
  const contentLength = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw Object.assign(new Error('Resposta do provedor excede o tamanho máximo permitido.'), { code: 'PAYLOAD_TOO_LARGE' });
  }

  const text = await response.text();
  if (Buffer.byteLength(text, 'utf8') > maxBytes) {
    throw Object.assign(new Error('Resposta do provedor excede o tamanho máximo permitido.'), { code: 'PAYLOAD_TOO_LARGE' });
  }

  return JSON.parse(text);
}

function resolveEnvConfig(overrides = {}) {
  const clientId = overrides.clientId !== undefined
    ? String(overrides.clientId || '').trim()
    : String(process.env.BRANDFETCH_CLIENT_ID || '').trim();
  const apiKey = overrides.apiKey !== undefined
    ? String(overrides.apiKey || '').trim()
    : String(process.env.BRANDFETCH_API_KEY || '').trim();

  return {
    clientId,
    apiKey,
    timeoutMs: clampInt(overrides.timeoutMs ?? process.env.MERCHANT_ENRICHMENT_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, MIN_TIMEOUT_MS, MAX_TIMEOUT_MS),
    concurrency: clampInt(overrides.concurrency ?? process.env.MERCHANT_ENRICHMENT_CONCURRENCY, DEFAULT_CONCURRENCY, MIN_CONCURRENCY, MAX_CONCURRENCY),
    cacheTtlMs: clampInt(overrides.cacheTtlMs ?? process.env.MERCHANT_ENRICHMENT_CACHE_TTL_MS, DEFAULT_CACHE_TTL_MS, 1000, 7 * 24 * 60 * 60 * 1000),
    notFoundTtlMs: clampInt(overrides.notFoundTtlMs, DEFAULT_NOT_FOUND_TTL_MS, 1000, 24 * 60 * 60 * 1000),
    cacheMaxSize: clampInt(overrides.cacheMaxSize ?? process.env.MERCHANT_ENRICHMENT_CACHE_MAX_SIZE, DEFAULT_CACHE_MAX_SIZE, 0, 5000),
    maxUniqueLookupsPerBatch: clampInt(overrides.maxUniqueLookupsPerBatch, DEFAULT_MAX_UNIQUE_LOOKUPS, 1, 200),
    batchBudgetMs: clampInt(overrides.batchBudgetMs, DEFAULT_BATCH_BUDGET_MS, 500, 30000),
    fetchImpl: overrides.fetchImpl || globalThis.fetch,
    now: overrides.now || (() => Date.now()),
  };
}

export function createMerchantEnrichmentService(overrides = {}) {
  const initialConfig = resolveEnvConfig(overrides);
  const cache = new BoundedTtlCache({ maxSize: initialConfig.cacheMaxSize });
  const pending = new Map();
  let searchPausedUntil = 0;
  let brandApiPausedUntil = 0;

  const getRuntimeConfig = () => (Object.keys(overrides).length > 0 ? initialConfig : resolveEnvConfig());

  async function fetchOptionalIndustry(domain, config) {
    if (!config.apiKey || !domain || typeof config.fetchImpl !== 'function') return null;
    if (config.now() < brandApiPausedUntil) return null;

    try {
      const url = `${BRANDFETCH_BRAND_BASE_URL}${encodeURIComponent(domain)}`;
      const response = await config.fetchImpl(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        redirect: 'error',
        signal: AbortSignal.timeout(config.timeoutMs),
      });

      if (response.status === 401 || response.status === 402 || response.status === 403 || response.status === 429) {
        brandApiPausedUntil = config.now() + AUTH_ERROR_COOLDOWN_MS;
        return null;
      }

      if (!response.ok) return null;

      const payload = await readBoundedJson(response);
      const industries = payload?.company?.industries;
      if (!Array.isArray(industries) || !industries.length) return null;
      return sanitizeText(industries[0]?.name, 100);
    } catch {
      return null;
    }
  }

  async function lookupCandidate(candidate, config) {
    const cached = cache.get(candidate.normalizedKey, config.now());
    if (cached.hit) return cached.value;

    if (pending.has(candidate.normalizedKey)) {
      return pending.get(candidate.normalizedKey);
    }

    if (!config.clientId || typeof config.fetchImpl !== 'function') {
      return null;
    }

    if (config.now() < searchPausedUntil) {
      return null;
    }

    const requestPromise = (async () => {
      try {
        const searchUrl = `${BRANDFETCH_SEARCH_BASE_URL}${encodeURIComponent(candidate.query)}?c=${encodeURIComponent(config.clientId)}`;
        const response = await config.fetchImpl(searchUrl, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          redirect: 'error',
          signal: AbortSignal.timeout(config.timeoutMs),
        });

        if (response.status === 429) {
          searchPausedUntil = config.now() + RATE_LIMIT_COOLDOWN_MS;
          return null;
        }

        if (response.status === 401 || response.status === 403) {
          searchPausedUntil = config.now() + AUTH_ERROR_COOLDOWN_MS;
          return null;
        }

        if (response.status === 404) {
          cache.set(candidate.normalizedKey, null, config.notFoundTtlMs, config.now(), config.cacheMaxSize);
          return null;
        }

        if (!response.ok) {
          return null;
        }

        const payload = await readBoundedJson(response);
        if (!Array.isArray(payload)) {
          return null;
        }

        const forbiddenSecrets = config.apiKey ? [config.apiKey] : [];
        const matched = selectBestBrandMatch(payload, candidate, forbiddenSecrets);

        if (!matched) {
          cache.set(candidate.normalizedKey, null, config.notFoundTtlMs, config.now(), config.cacheMaxSize);
          return null;
        }

        if (config.apiKey && matched.domain) {
          matched.industry = await fetchOptionalIndustry(matched.domain, config);
        }

        cache.set(candidate.normalizedKey, matched, config.cacheTtlMs, config.now(), config.cacheMaxSize);
        return matched;
      } catch {
        // Falhas transitórias (timeout, rede, resposta inválida) não impedem a importação
        // nem envenenam o cache negativo permanente.
        return null;
      } finally {
        pending.delete(candidate.normalizedKey);
      }
    })();

    pending.set(candidate.normalizedKey, requestPromise);
    return requestPromise;
  }

  async function enrichDescription(description) {
    const candidate = extractMerchantCandidate(description);
    if (!candidate) return null;
    const config = getRuntimeConfig();
    return lookupCandidate(candidate, config);
  }

  async function enrichTransactions(transactions = []) {
    if (!Array.isArray(transactions) || !transactions.length) {
      return Array.isArray(transactions) ? transactions : [];
    }

    const config = getRuntimeConfig();
    const extracted = transactions.map((transaction) => extractMerchantCandidate(transaction?.description));

    // Deduplica estabelecimentos únicos dentro do lote sem armazenar descrições financeiras brutas.
    const uniqueCandidates = new Map();
    for (const candidate of extracted) {
      if (!candidate || uniqueCandidates.has(candidate.normalizedKey)) continue;
      uniqueCandidates.set(candidate.normalizedKey, candidate);
    }

    const resultsByKey = new Map();
    const keysToFetch = [];

    for (const [key, candidate] of uniqueCandidates.entries()) {
      const cached = cache.get(key, config.now());
      if (cached.hit) {
        resultsByKey.set(key, cached.value);
      } else if (keysToFetch.length < config.maxUniqueLookupsPerBatch) {
        keysToFetch.push([key, candidate]);
      } else {
        resultsByKey.set(key, null);
      }
    }

    if (keysToFetch.length > 0 && config.clientId && typeof config.fetchImpl === 'function') {
      const deadline = config.now() + config.batchBudgetMs;
      let cursor = 0;

      const workerCount = Math.min(config.concurrency, keysToFetch.length);
      const workers = Array.from({ length: workerCount }, async () => {
        while (cursor < keysToFetch.length) {
          if (config.now() >= deadline || config.now() < searchPausedUntil) break;
          const currentIndex = cursor;
          cursor += 1;
          const [key, candidate] = keysToFetch[currentIndex];
          const merchant = await lookupCandidate(candidate, config);
          resultsByKey.set(key, merchant);
        }
      });

      await Promise.all(workers);
    }

    return transactions.map((transaction, index) => {
      const candidate = extracted[index];
      const merchant = candidate ? (resultsByKey.get(candidate.normalizedKey) ?? null) : null;
      return {
        ...transaction,
        merchant: merchant ? { ...merchant } : null,
      };
    });
  }

  return {
    extractMerchantCandidate,
    selectBestBrandMatch,
    enrichDescription,
    enrichTransactions,
    clearCache() {
      cache.clear();
      pending.clear();
      searchPausedUntil = 0;
      brandApiPausedUntil = 0;
    },
    getCacheSize() {
      return cache.size;
    },
  };
}

export const merchantEnrichmentService = createMerchantEnrichmentService();

export default merchantEnrichmentService;
