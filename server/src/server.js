import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.routes.js';
import { requestLogger } from './middlewares/logger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { initDatabase } from './config/database.js';

// Carrega variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Middlewares essenciais
app.use(cors({
  origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(requestLogger);

// Registro de Rotas
app.use('/api', apiRoutes);

// Rota raiz informativa
app.get('/', (req, res) => {
  res.json({
    name: 'Full Stack API REST (MySQL)',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      users: '/api/users',
    },
  });
});

// Middleware Global de Tratamento de Erros
app.use(errorHandler);

// Inicia o servidor e conecta ao MySQL
app.listen(PORT, async () => {
  console.log(`🚀 Servidor Back-end rodando na porta ${PORT}`);
  console.log(`🔗 API disponível em: http://localhost:${PORT}/api`);
  console.log(`🩺 Health Check: http://localhost:${PORT}/api/health`);
  
  // Inicializa a conexão com o MySQL
  await initDatabase();
});
