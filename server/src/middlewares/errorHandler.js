/**
 * Middleware central de tratamento de erros do Express.
 * Captura qualquer erro não tratado e formata uma resposta JSON consistente.
 */
export function errorHandler(err, req, res, next) {
  const databaseUnavailable = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST', 'POOL_CLOSED', 'ER_CON_COUNT_ERROR'].includes(err.code);
  const suppliedStatus = err.statusCode || err.status;
  const statusCode = databaseUnavailable ? 503
    : err.code === 'LIMIT_FILE_SIZE' ? 413
      : err.name === 'MulterError' ? 400
        : Number.isInteger(suppliedStatus) && suppliedStatus >= 400 && suppliedStatus < 600 ? suppliedStatus : 500;
  const message = statusCode === 503 ? 'Banco de dados indisponível.'
    : statusCode >= 500 ? 'Erro interno do servidor.'
      : err.name === 'MulterError' ? 'Upload inválido. Envie um CSV de até 5 MB.'
        : err.type === 'entity.parse.failed' ? 'JSON inválido.' : err.message;
  // Erros MySQL incluem SQL e parâmetros (senhas/hashes): nunca imprimir o objeto.
  if (statusCode >= 500) console.error(`Falha na API: ${err.code || err.name || 'INTERNAL_ERROR'}`);

  res.status(statusCode).json({
    success: false,
    error: {
      message,
    },
  });
}
