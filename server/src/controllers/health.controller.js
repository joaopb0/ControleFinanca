import { isDbConnected } from '../config/database.js';

/**
 * Controller de Health Check da API com status do MySQL
 */
export const healthController = {
  check: (req, res) => {
    res.status(200).json({
      status: 'success',
      message: 'API está online e operacional 🚀',
      database: isDbConnected() ? 'MySQL Conectado 🟢' : 'Modo Contingência (Sem conexão com MySQL) 🟡',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  },
};
