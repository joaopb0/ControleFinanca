/**
 * Camada de Serviço de API (Client HTTP)
 * Centraliza as requisições HTTP para o Back-end.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export async function uploadCsv(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/upload-csv`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    const message = data?.error?.message || data?.message || data?.erro;
    throw new Error(message || `Erro HTTP: ${response.status}`);
  }

  return data;
}

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

/**
 * Função utilitária para download de arquivos binários ou texto (Blob) como PDF ou CSV
 */
export async function downloadBlob(endpoint, options = {}, filename = 'download') {
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

    if (!response.ok) {
      let errorMessage = `Erro na exportação (HTTP ${response.status})`;
      try {
        const errorJson = await response.json();
        if (errorJson?.error?.message) {
          errorMessage = errorJson.error.message;
        } else if (errorJson?.message) {
          errorMessage = errorJson.message;
        }
      } catch {
        // Resposta não é JSON legível
      }
      throw new Error(errorMessage);
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(link);

    return true;
  } catch (error) {
    console.error(`Erro no download de ${endpoint}:`, error);
    throw error;
  }
}

// Funções de Regras de Classificação
export const fetchRules = (params = {}) => {
  const query = new URLSearchParams();
  if (params.active !== undefined) query.set('active', String(params.active));
  if (params.category) query.set('category', params.category);
  const qs = query.toString();
  return request(`/classification-rules${qs ? `?${qs}` : ''}`);
};

export const createRule = (ruleData) =>
  request('/classification-rules', {
    method: 'POST',
    body: JSON.stringify(ruleData),
  });

export const updateRule = (id, ruleData) =>
  request(`/classification-rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(ruleData),
  });

export const deleteRule = (id) =>
  request(`/classification-rules/${id}`, {
    method: 'DELETE',
  });

export const resetRules = () =>
  request('/classification-rules/reset', {
    method: 'POST',
  });

// Funções do Classificador
export const classifyTransactions = (payload) =>
  request('/classifier/classify', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const testMatch = (description) =>
  request('/classifier/test', {
    method: 'POST',
    body: JSON.stringify({ description }),
  });

// Funções de Relatórios Financeiros
export const fetchReportSummary = (payload) =>
  request('/reports/summary', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const downloadReportCSV = (payload, filename = 'relatorio_financeiro.csv') =>
  downloadBlob(
    '/reports/export/csv',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    filename,
  );

export const downloadReportPDF = (payload, filename = 'relatorio_financeiro.pdf') =>
  downloadBlob(
    '/reports/export/pdf',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    filename,
  );

export const api = {
  // Verificação de saúde da API
  healthCheck: () => request('/health'),

  // Recursos de Usuários
  getUsers: () => request('/users'),
  getUserById: (id) => request(`/users/${id}`),
  createUser: (userData) =>
    request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
  deleteUser: (id) =>
    request(`/users/${id}`, {
      method: 'DELETE',
    }),

  // Regras de Classificação
  fetchRules,
  createRule,
  updateRule,
  deleteRule,
  resetRules,

  // Classificador
  classifyTransactions,
  testMatch,

  // Relatórios e Exportação
  fetchReportSummary,
  downloadReportCSV,
  downloadReportPDF,
  uploadCsv,
  downloadBlob,
};
