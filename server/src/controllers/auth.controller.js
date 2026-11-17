import { AuthModel } from '../models/auth.model.js';

export function createAuthController(service, config, csrf) {
  const establishSession = (req, res, result, status) => {
    res.cookie(config.sessionCookie, result.token, { ...config.cookieOptions, maxAge: config.ttl * 1000 });
    req.cookies[config.sessionCookie] = result.token;
    const csrfToken = csrf.generateCsrfToken(req, res, { overwrite: true });
    return res.status(status).json({ success: true, data: { user: result.user, csrfToken } });
  };
  return {
    csrf(req, res) { res.json({ success: true, data: { csrfToken: csrf.generateCsrfToken(req, res) } }); },
    async register(req, res, next) {
      try { establishSession(req, res, await service.register(req.body), 201); }
      catch (error) { next(error); }
    },
    async login(req, res, next) {
      try { establishSession(req, res, await service.login(req.body), 200); }
      catch (error) { next(error); }
    },
    me(req, res) { res.json({ success: true, data: { user: req.user, csrfToken: csrf.generateCsrfToken(req, res) } }); },
    async logout(req, res, next) {
      try {
        await AuthModel.revokeSession(req.sessionId);
        res.clearCookie(config.sessionCookie, config.cookieOptions);
        res.clearCookie(config.csrfCookie, config.cookieOptions);
        res.status(204).end();
      } catch (error) { next(error); }
    },
  };
}
