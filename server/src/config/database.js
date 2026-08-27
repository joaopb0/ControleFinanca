import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let pool = null;
let isConnected = false;

/**
 * Cria ou recupera a Pool de conexões MySQL
 */
export function getDbPool() {
  if (pool) return pool;

  const connectionConfig = process.env.DATABASE_URL || process.env.MYSQL_URL
    ? { uri: process.env.DATABASE_URL || process.env.MYSQL_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'meu_banco_fullstack',
        port: Number(process.env.DB_PORT) || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      };

  pool = mysql.createPool(connectionConfig);
  return pool;
}

/**
 * Inicializa a conexão com o MySQL e cria as tabelas necessárias
 */
export async function initDatabase() {
  try {
    const db = getDbPool();
    const connection = await db.getConnection();
    isConnected = true;
    console.log('✅ Conexão com o banco de dados MySQL estabelecida com sucesso!');

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
    console.log('📦 Tabela `users` verificada/criada no MySQL.');

    connection.release();
    return true;
  } catch (error) {
    isConnected = false;
    console.warn('⚠️ Não foi possível conectar ao servidor MySQL local/remoto.');
    console.warn(`Motivo: ${error.message}`);
    console.warn('💡 Dica: Configure a variável DATABASE_URL no arquivo .env para conectar ao seu MySQL.');
    return false;
  }
}

export function isDbConnected() {
  return isConnected;
}
