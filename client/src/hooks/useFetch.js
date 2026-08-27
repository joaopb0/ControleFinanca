import { useState, useEffect, useCallback } from 'react';

/**
 * Custom Hook para gerenciar requisições assíncronas com estados de loading, error e data.
 * @param {Function} fetchFunction - Função assíncrona que retorna os dados (ex: api.getUsers)
 * @param {boolean} [autoFetch=true] - Se deve disparar a requisição automaticamente ao montar
 */
export function useFetch(fetchFunction, autoFetch = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFunction(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message || 'Ocorreu um erro inesperado');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchFunction]);

  useEffect(() => {
    if (autoFetch) {
      execute();
    }
  }, [execute, autoFetch]);

  return { data, loading, error, refetch: execute };
}
