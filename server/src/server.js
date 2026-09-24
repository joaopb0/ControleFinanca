import express from 'express';
import cors from 'cors';
import fs from 'fs';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.routes.js';
import { requestLogger } from './middlewares/logger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { initDatabase, isDatabaseAvailable } from './config/database.js';

// Carrega variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://frontend-client-f4fn.onrender.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);
fs.mkdirSync('uploads', { recursive: true });

// Middlewares essenciais
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origem não autorizada pelo CORS.'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(requestLogger);

// Em produção, nenhuma rota de dados usa o fallback em memória se o MySQL cair.
if (isProduction) {
  app.use('/api', async (req, res, next) => {
    if (req.path === '/health') return next();

    if (!await isDatabaseAvailable()) {
      return res.status(503).json({
        success: false,
        error: { message: 'Banco de dados indisponível.' },
      });
    }

    return next();
  });
}

// Registro de Rotas
app.use('/api', apiRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: { message: `Rota da API não encontrada: ${req.method} ${req.originalUrl}` },
  });
});

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

function listen() {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor Back-end rodando na porta ${PORT}`);
    console.log(`🔗 API disponível em: http://localhost:${PORT}/api`);
    console.log(`🩺 Health Check: http://localhost:${PORT}/api/health`);
  });
}

if (isProduction) {
  // O MySQL inicia no mesmo contêiner e pode demorar a inicializar no plano gratuito.
  const connected = await initDatabase({ maxAttempts: 90, retryDelayMs: 2000 });
  if (connected) {
    listen();
  } else {
    console.error('Não foi possível iniciar a API: MySQL indisponível.');
    process.exitCode = 1;
  }
} else {
  listen();
  await initDatabase();
}
