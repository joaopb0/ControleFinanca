import { AuthModel } from '../models/auth.model.js';
import { httpError } from '../services/auth.service.js';

export function requireAuthentication(service, config) {
  return async (req, res, next) => {
    try {
      const token = req.cookies[config.sessionCookie];
      if (!token) throw httpError(401, 'Faça login para continuar.');
      const session = await service.authenticate(token);
      req.user = session.user;
      req.sessionId = session.sessionId;
      next();
    } catch (error) {
      if (error.statusCode === 401) res.clearCookie(config.sessionCookie, config.cookieOptions);
      next(error);
    }
  };
}

export function authRateLimit() {
  return async (req, res, next) => {
    try {
      const ipLimit = await AuthModel.consumeLimit(`ip:${req.ip}`, 30);
      if (!ipLimit.allowed) {
        res.set('Retry-After', String(ipLimit.retryAfter));
        throw httpError(429, 'Muitas tentativas. Aguarde antes de tentar novamente.');
      }
      if (typeof req.body?.email === 'string' && req.body.email.length <= 254) {
        const accountLimit = await AuthModel.consumeLimit(`account:${req.body.email.trim().toLowerCase()}`, 10);
        if (!accountLimit.allowed) {
          res.set('Retry-After', String(accountLimit.retryAfter));
          throw httpError(429, 'Muitas tentativas. Aguarde antes de tentar novamente.');
        }
      }
      next();
    } catch (error) { next(error); }
  };
}
