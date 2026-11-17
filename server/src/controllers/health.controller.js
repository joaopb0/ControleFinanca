import { isDatabaseAvailable } from '../config/database.js';

/**
 * Controller de Health Check da API com status do MySQL
 */
export const healthController = {
  check: async (req, res) => {
    const connected = await isDatabaseAvailable();

    res.status(connected ? 200 : 503).json({
      status: connected ? 'success' : 'error',
      message: connected ? 'API está online e operacional 🚀' : 'Banco de dados indisponível.',
      database: connected
        ? 'MySQL Conectado 🟢'
        : 'MySQL indisponível 🔴',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  },
};
