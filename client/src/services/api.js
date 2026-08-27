/**
 * Camada de Serviço de API (Client HTTP)
 * Centraliza as requisições HTTP para o Back-end.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Função utilitária genérica para requisições fetch com tratamento de erro
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Erro HTTP: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`Erro na requisição para ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  // Verificação de saúde da API
  healthCheck: () => request('/health'),

  // Recursos de Usuários
  getUsers: () => request('/users'),
  getUserById: (id) => request(`/users/${id}`),
  createUser: (userData) => request('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
  deleteUser: (id) => request(`/users/${id}`, {
    method: 'DELETE',
  }),
};
