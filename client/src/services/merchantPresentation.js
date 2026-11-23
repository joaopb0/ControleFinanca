const ALLOWED_LOGO_HOSTS = new Set(['cdn.brandfetch.io', 'asset.brandfetch.io']);

function normalizeForComparison(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function getSafeLogoUrl(rawUrl) {
  if (typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 500) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return null;
    if (parsed.username || parsed.password || parsed.port) return null;
    if (!ALLOWED_LOGO_HOSTS.has(parsed.hostname.toLowerCase())) return null;
    if (parsed.pathname.includes('..') || parsed.pathname.includes('\\')) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function getMerchantInitials(name) {
  const words = String(name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function getMerchantDisplay(transaction) {
  const rawDescription = typeof transaction?.description === 'string'
    ? transaction.description.trim()
    : '';
  const merchant = transaction?.merchant && typeof transaction.merchant === 'object'
    ? transaction.merchant
    : null;
  const merchantName = typeof merchant?.name === 'string' ? merchant.name.trim() : '';
  const hasMerchant = Boolean(merchantName);
  const logoUrl = hasMerchant ? getSafeLogoUrl(merchant.logoUrl) : null;
  const domain = hasMerchant && typeof merchant.domain === 'string' ? merchant.domain.trim() : '';
  const industry = hasMerchant && typeof merchant.industry === 'string' ? merchant.industry.trim() : '';

  const showSecondaryDescription = Boolean(
    hasMerchant
    && rawDescription
    && normalizeForComparison(merchantName) !== normalizeForComparison(rawDescription),
  );

  return {
    hasMerchant,
    primaryLabel: hasMerchant ? merchantName : rawDescription,
    originalDescription: rawDescription,
    secondaryDescription: showSecondaryDescription ? rawDescription : '',
    logoUrl,
    initials: hasMerchant ? getMerchantInitials(merchantName) : '',
    domain,
    industry,
    altText: hasMerchant ? `Logotipo de ${merchantName}` : '',
  };
}
