/**
 * Middleware central de tratamento de erros do Express.
 * Captura qualquer erro não tratado e formata uma resposta JSON consistente.
 */
export function errorHandler(err, req, res, next) {
  console.error('❌ Erro capturado:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}
