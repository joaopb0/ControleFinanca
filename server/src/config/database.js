import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let pool = null;
let isConnected = false;

const dbConfigKeys = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_PORT'];
const retryableErrorCodes = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN',
  'PROTOCOL_CONNECTION_LOST', 'ER_BAD_DB_ERROR', 'ER_CON_COUNT_ERROR',
  'ER_SERVER_SHUTDOWN',
]);

function getConnectionConfig() {
  const hasDbConfig = dbConfigKeys.some((key) => process.env[key] !== undefined);
  const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

  if (!hasDbConfig && databaseUrl) {
    return { uri: databaseUrl };
  }

  if (process.env.NODE_ENV === 'production') {
    const missingKeys = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']
      .filter((key) => !process.env[key]);

    if (missingKeys.length > 0) {
      throw new Error(`Configuração MySQL incompleta: ${missingKeys.join(', ')}`);
    }
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'meu_banco_fullstack',
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

/**
 * Cria ou recupera a Pool de conexões MySQL
 */
export function getDbPool() {
  if (pool) return pool;

  pool = mysql.createPool(getConnectionConfig());
  return pool;
}

/**
 * Inicializa a conexão com o MySQL e cria as tabelas necessárias
 */
export async function initDatabase({ maxAttempts = 1, retryDelayMs = 2000 } = {}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let connection;

    try {
      connection = await getDbPool().getConnection();

      // Cria a tabela de usuários se não existir
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          role VARCHAR(100) DEFAULT 'Desenvolvedor',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Cria a tabela de regras de classificação se não existir
      await connection.query(`
        CREATE TABLE IF NOT EXISTS classification_rules (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL,
          keywords JSON NOT NULL,
          priority INT DEFAULT 0,
          active BOOLEAN DEFAULT TRUE,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_rules_priority_active (active, priority DESC)
        )
      `);

      isConnected = true;
      console.log('✅ Conexão com o banco de dados MySQL estabelecida com sucesso!');
      console.log('📦 Tabelas `users` e `classification_rules` verificadas/criadas no MySQL.');
      return true;
    } catch (error) {
      isConnected = false;
      const errorCode = error && typeof error === 'object' && typeof error.code === 'string'
        ? error.code
        : 'CONFIG_ERROR';
      console.warn(`⚠️ MySQL indisponível (tentativa ${attempt}/${maxAttempts}, código ${errorCode}).`);

      if (attempt === maxAttempts || !retryableErrorCodes.has(errorCode)) {
        return false;
      }
    } finally {
      connection?.release();
    }

    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }

  return false;
}

export async function isDatabaseAvailable() {
  try {
    await getDbPool().query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export function isDbConnected() {
  return isConnected;
}
