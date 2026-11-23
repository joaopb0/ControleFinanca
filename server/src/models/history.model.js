import { requireCategoryUser } from './category.model.js';

export const HistoryModel = {
  async version(userId, connection) {
    requireCategoryUser(userId);
    await connection.query('INSERT IGNORE INTO history_versions (userId) VALUES (?)', [userId]);
    const [rows] = await connection.query('SELECT revision FROM history_versions WHERE userId = ?', [userId]);
    return Number(rows[0].revision);
  },
  async bumpVersion(userId, connection) {
    await HistoryModel.version(userId, connection);
    await connection.query('UPDATE history_versions SET revision = revision + 1 WHERE userId = ?', [userId]);
  },
  async contribution(userId, id, connection) {
    requireCategoryUser(userId);
    const [rows] = await connection.query('SELECT id, revision, payloadHash FROM history_contributions WHERE userId = ? AND id = ?', [userId, id]);
    return rows[0] ? { ...rows[0], revision: Number(rows[0].revision) } : null;
  },
  async entries(userId, connection) {
    requireCategoryUser(userId);
    const [rows] = await connection.query(`SELECT e.*, c.deletedAt IS NOT NULL AS archived FROM history_entries e
      JOIN history_contributions h ON h.userId = e.userId AND h.id = e.contributionId
      LEFT JOIN user_categories c ON c.userId = e.userId AND c.id = e.categoryId
      WHERE e.userId = ? ORDER BY e.month, h.createdAt, h.id, e.categoryId`, [userId]);
    return rows.map((row) => ({ ...row, incomeCents: Number(row.incomeCents), expenseCents: Number(row.expenseCents), archived: Boolean(row.archived) }));
  },
  async receipt(userId, requestId, connection) {
    requireCategoryUser(userId);
    const [rows] = await connection.query('SELECT contributionId, payloadHash, revision FROM history_requests WHERE userId = ? AND requestId = ?', [userId, requestId]);
    return rows[0];
  },
  async replace(userId, payload, revision, payloadHash, entries, connection) {
    requireCategoryUser(userId);
    await connection.query(`INSERT INTO history_contributions (id, userId, revision, payloadHash) VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE revision = VALUES(revision), payloadHash = VALUES(payloadHash), updatedAt = CURRENT_TIMESTAMP`, [payload.batchId, userId, revision, payloadHash]);
    await connection.query('DELETE FROM history_entries WHERE userId = ? AND contributionId = ?', [userId, payload.batchId]);
    for (const entry of entries) {
      await connection.query(`INSERT INTO history_entries (userId, contributionId, month, categoryId, categoryName, color, incomeCents, expenseCents)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [userId, payload.batchId, entry.month, entry.categoryId, entry.categoryName, entry.color, entry.incomeCents, entry.expenseCents]);
    }
  },
  async recordReceipt(userId, payload, hash, revision, connection) {
    await connection.query('INSERT INTO history_requests (userId, requestId, contributionId, payloadHash, revision) VALUES (?, ?, ?, ?, ?)', [userId, payload.requestId, payload.batchId, hash, revision]);
  },
  async remove(userId, month, connection) {
    requireCategoryUser(userId);
    if (month) {
      const [affected] = await connection.query('SELECT DISTINCT contributionId FROM history_entries WHERE userId = ? AND month = ?', [userId, month]);
      await connection.query('DELETE FROM history_entries WHERE userId = ? AND month = ?', [userId, month]);
      for (const row of affected) {
        // Invalida a revisão, inclusive quando o extrato ainda contém outros meses.
        await connection.query("UPDATE history_contributions SET revision = revision + 1, payloadHash = '' WHERE userId = ? AND id = ?", [userId, row.contributionId]);
        await connection.query('DELETE FROM history_requests WHERE userId = ? AND contributionId = ?', [userId, row.contributionId]);
      }
      await connection.query(`DELETE h FROM history_contributions h WHERE h.userId = ? AND NOT EXISTS
        (SELECT 1 FROM history_entries e WHERE e.userId = h.userId AND e.contributionId = h.id)`, [userId]);
    } else {
      await connection.query('DELETE FROM history_contributions WHERE userId = ?', [userId]);
    }
    await HistoryModel.bumpVersion(userId, connection);
  },
};
