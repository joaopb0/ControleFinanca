import { getDbPool } from '../config/database.js';

// Projeção explícita: nenhum consumidor público recebe passwordHash.
export const UserModel = {
  findById: async (id) => {
    const [rows] = await getDbPool().execute('SELECT id, name, email, role, createdAt FROM users WHERE id = ?', [id]);
    return rows[0] || null;
  },
  delete: async (id) => {
    const [result] = await getDbPool().execute('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },
};
