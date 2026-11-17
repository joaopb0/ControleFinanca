import dotenv from 'dotenv';
dotenv.config();

export function getAuthConfig() {
  const production = process.env.NODE_ENV === 'production';
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) throw new Error('JWT_SECRET deve conter pelo menos 32 bytes aleatórios.');
  const ttl = Number(process.env.SESSION_TTL_SECONDS || 604800);
  if (!Number.isInteger(ttl) || ttl < 900 || ttl > 604800) throw new Error('SESSION_TTL_SECONDS deve estar entre 900 e 604800.');
  const sameSite = process.env.COOKIE_SAME_SITE || (production ? 'none' : 'lax');
  if (!['lax', 'strict', 'none'].includes(sameSite) || (!production && sameSite === 'none')) throw new Error('COOKIE_SAME_SITE inválido: none exige HTTPS em produção.');
  const origins = (process.env.CLIENT_URL || (production ? '' : 'http://localhost:5173')).split(',').map((v) => v.trim()).filter(Boolean);
  if (!origins.length || origins.some((origin) => {
    try {
      const url = new URL(origin);
      return url.origin !== origin || (production ? url.protocol !== 'https:' : !['http:', 'https:'].includes(url.protocol));
    } catch { return true; }
  })) throw new Error('CLIENT_URL deve conter origens completas autorizadas, sem caminho.');
  return {
    secret, ttl, origins, issuer: 'controlefinanca-api', audience: 'controlefinanca-client',
    sessionCookie: production ? '__Host-cf_session' : 'cf_session',
    csrfCookie: production ? '__Host-cf_csrf' : 'cf_csrf',
    cookieOptions: { httpOnly: true, secure: production, sameSite, path: '/' },
  };
}
