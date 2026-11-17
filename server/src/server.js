import { createApp } from './app.js';
import { initDatabase, closeDatabase } from './config/database.js';

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;
// Valida segredos antes de abrir conexões ou executar migrations.
const app = createApp();

// Nenhuma porta de dados abre antes de verificar schema e conexão reais.
const connected = await initDatabase(isProduction ? { maxAttempts: 90, retryDelayMs: 2000 } : {});
if (connected) {
  app.listen(PORT, () => console.log(`Servidor Back-end rodando na porta ${PORT}`));
} else {
  console.error('Não foi possível iniciar a API: MySQL indisponível.');
  await closeDatabase();
  process.exitCode = 1;
}
