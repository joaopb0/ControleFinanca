import { getDbPool, isDbConnected } from '../config/database.js';

// Armazenamento em memória de contingência caso o MySQL esteja desligado
let memoryUsers = [
  {
    id: '1',
    name: 'Ana Souza',
    email: 'ana.souza@empresa.com',
    role: 'Full Stack Engineer',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: '2',
    name: 'Lucas Ferreira',
    email: 'lucas.f@empresa.com',
    role: 'Desenvolvedor Frontend',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const UserModel = {
  findAll: async () => {
    if (!isDbConnected()) {
      return memoryUsers;
    }

    const pool = getDbPool();
    const [rows] = await pool.query('SELECT * FROM users ORDER BY createdAt DESC');
    return rows;
  },

  findById: async (id) => {
    if (!isDbConnected()) {
      return memoryUsers.find((u) => u.id === id) || null;
    }

    const pool = getDbPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0] || null;
  },

  create: async ({ name, email, role }) => {
    const id = String(Date.now());
    const userRole = role || 'Desenvolvedor';
    const createdAt = new Date().toISOString();

    if (!isDbConnected()) {
      const newUser = { id, name, email, role: userRole, createdAt };
      memoryUsers.unshift(newUser);
      return newUser;
    }

    const pool = getDbPool();
    await pool.query(
      'INSERT INTO users (id, name, email, role, createdAt) VALUES (?, ?, ?, ?, NOW())',
      [id, name, email, userRole]
    );

    return { id, name, email, role: userRole, createdAt };
  },

  delete: async (id) => {
    if (!isDbConnected()) {
      const index = memoryUsers.findIndex((u) => u.id === id);
      if (index === -1) return false;
      memoryUsers.splice(index, 1);
      return true;
    }

    const pool = getDbPool();
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },
};
