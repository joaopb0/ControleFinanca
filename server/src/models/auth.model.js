import { createHash } from 'node:crypto';
import { getDbPool } from '../config/database.js';

export const AuthModel = {
  async findCredentials(email) {
    const [rows] = await getDbPool().execute('SELECT id, name, email, role, createdAt, passwordHash FROM users WHERE normalizedEmail = ?', [email]);
    return rows[0] || null;
  },
  async createUser(connection, { id, name, email, passwordHash }) {
    await connection.execute('INSERT INTO users (id, name, email, passwordHash) VALUES (?, ?, ?, ?)', [id, name, email, passwordHash]);
  },
  async createSession(connection, { id, userId, ttl }) {
    await connection.execute('INSERT INTO auth_sessions (id, userId, expiresAt) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND))', [id, userId, ttl]);
  },
  async findSession(id, userId) {
    const [rows] = await getDbPool().execute(`SELECT u.id, u.name, u.email, u.role, u.createdAt FROM auth_sessions s JOIN users u ON u.id = s.userId
      WHERE s.id = ? AND s.userId = ? AND s.expiresAt > UTC_TIMESTAMP() AND u.passwordHash IS NOT NULL`, [id, userId]);
    return rows[0] || null;
  },
  async revokeSession(id) { await getDbPool().execute('DELETE FROM auth_sessions WHERE id = ?', [id]); },
  async consumeLimit(key, maximum, windowSeconds = 900) {
    const bucket = createHash('sha256').update(key).digest('hex');
    const connection = await getDbPool().getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(`INSERT INTO auth_rate_limits (bucket, attempts, resetAt) VALUES (?, 1, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND))
        ON DUPLICATE KEY UPDATE attempts = IF(resetAt <= UTC_TIMESTAMP(), 1, LEAST(attempts + 1, 1000000)),
          resetAt = IF(resetAt <= UTC_TIMESTAMP(), VALUES(resetAt), resetAt)`, [bucket, windowSeconds]);
      const [rows] = await connection.execute('SELECT attempts, GREATEST(1, TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), resetAt)) AS retryAfter FROM auth_rate_limits WHERE bucket = ?', [bucket]);
      await connection.commit();
      return { allowed: rows[0].attempts <= maximum, retryAfter: rows[0].retryAfter };
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  },
};
