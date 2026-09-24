import { isDatabaseAvailable } from '../config/database.js';

/**
 * Controller de Health Check da API com status do MySQL
 */
export const healthController = {
  check: async (req, res) => {
    const connected = await isDatabaseAvailable();
    const productionUnavailable = process.env.NODE_ENV === 'production' && !connected;

    res.status(productionUnavailable ? 503 : 200).json({
      status: productionUnavailable ? 'error' : 'success',
      message: productionUnavailable ? 'Banco de dados indisponível.' : 'API está online e operacional 🚀',
      database: connected
        ? 'MySQL Conectado 🟢'
        : productionUnavailable ? 'MySQL indisponível 🔴' : 'Modo Contingência (Sem conexão com MySQL) 🟡',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  },
};
