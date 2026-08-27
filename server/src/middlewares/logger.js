/**
 * Middleware para log de requisições no console do terminal.
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });

  next();
}
