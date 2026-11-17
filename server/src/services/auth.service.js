import { randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthModel } from '../models/auth.model.js';
import { UserModel } from '../models/user.model.js';
import { ClassificationRuleModel } from '../models/classificationRule.model.js';
import { getDbPool } from '../config/database.js';

export function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

export function validateCredentials(body, registration = false) {
  const { name, email, password } = body || {};
  if (typeof email !== 'string' || email.trim().length > 254 ||
      !/^[A-Za-z0-9.!#$%&'*+\-/=?^_`{|}~]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/.test(email.trim()) ||
      typeof password !== 'string' || password.length < (registration ? 12 : 1) || Buffer.byteLength(password, 'utf8') > 72) {
    throw httpError(400, 'Informe um e-mail válido e uma senha de 12 caracteres ou mais (máximo 72 bytes).');
  }
  if (registration && (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100)) {
    throw httpError(400, 'O nome deve conter entre 2 e 100 caracteres.');
  }
  return { name: registration ? name.trim() : undefined, email: email.trim().toLowerCase(), password };
}

export function createAuthService(config) {
  // Hash aleatório sem conta associada para equalizar o trabalho de login inexistente.
  const dummyHash = bcrypt.hash(randomBytes(32).toString('hex'), 12);
  function sessionToken(userId, id) {
    return jwt.sign({}, config.secret, { algorithm: 'HS256', subject: userId, jwtid: id,
      expiresIn: config.ttl, issuer: config.issuer, audience: config.audience });
  }
  return {
    async register(body) {
      const fields = validateCredentials(body, true);
      const passwordHash = await bcrypt.hash(fields.password, 12);
      const userId = randomUUID();
      const sessionId = randomUUID();
      const connection = await getDbPool().getConnection();
      try {
        await connection.beginTransaction();
        await AuthModel.createUser(connection, { ...fields, passwordHash, id: userId });
        await ClassificationRuleModel.seedForUser(connection, userId);
        await AuthModel.createSession(connection, { id: sessionId, userId, ttl: config.ttl });
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        if (error.code === 'ER_DUP_ENTRY') throw httpError(409, 'Este e-mail já está cadastrado.');
        throw error;
      } finally { connection.release(); }
      return { user: await UserModel.findById(userId), token: sessionToken(userId, sessionId) };
    },
    async login(body) {
      const { email, password } = validateCredentials(body);
      const user = await AuthModel.findCredentials(email);
      const validHash = typeof user?.passwordHash === 'string' && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(user.passwordHash);
      const matches = await bcrypt.compare(password, validHash ? user.passwordHash : await dummyHash);
      if (!validHash || !matches) throw httpError(401, 'E-mail ou senha inválidos.');
      const sessionId = randomUUID();
      await AuthModel.createSession(getDbPool(), { id: sessionId, userId: user.id, ttl: config.ttl });
      return { user: await UserModel.findById(user.id), token: sessionToken(user.id, sessionId) };
    },
    async authenticate(token) {
      let claims;
      try {
        claims = jwt.verify(token, config.secret, { algorithms: ['HS256'], issuer: config.issuer, audience: config.audience });
      } catch { throw httpError(401, 'Sessão inválida ou expirada. Faça login novamente.'); }
      if (typeof claims.sub !== 'string' || typeof claims.jti !== 'string' || typeof claims.exp !== 'number') throw httpError(401, 'Sessão inválida.');
      const user = await AuthModel.findSession(claims.jti, claims.sub);
      if (!user) throw httpError(401, 'Sessão inválida ou expirada. Faça login novamente.');
      return { user, sessionId: claims.jti };
    },
  };
}
