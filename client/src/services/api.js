/**
 * Camada de Serviço de API (Client HTTP)
 * Centraliza as requisições HTTP para o Back-end.
 */

const API_BASE_URL = (import.meta.env?.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

// Apenas o token CSRF fica em memória. A credencial de sessão é um cookie HttpOnly.
let csrfToken = null;
let csrfPromise = null;
let sessionPromise = null;
let sessionVersion = 0;
const unauthorizedListeners = new Set();

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function onUnauthorized(listener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export function clearSessionState() {
  csrfToken = null;
  csrfPromise = null;
  sessionPromise = null;
  sessionVersion += 1;
}

function expireSession() {
  clearSessionState();
  unauthorizedListeners.forEach((listener) => listener());
}

async function readJson(response) {
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;
  try {
    return await response.json();
  } catch {
    throw new ApiError('A API retornou uma resposta inválida.', response.status);
  }
}

async function ensureCsrfToken() {
  if (csrfToken) return csrfToken;
  if (!csrfPromise) {
    const version = sessionVersion;
    csrfPromise = request('/auth/csrf').then((result) => {
      if (version !== sessionVersion) {
        throw new ApiError('A sessão mudou. Tente novamente.', 401);
      }
      if (!result?.data?.csrfToken) {
        throw new ApiError('Não foi possível preparar uma conexão segura.', 502);
      }
      csrfToken = result.data.csrfToken;
      return csrfToken;
    }).finally(() => {
      if (version === sessionVersion) csrfPromise = null;
    });
  }
  return csrfPromise;
}

async function fetchResponse(endpoint, options = {}) {
  const version = sessionVersion;
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers);
  if (typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers.set('X-CSRF-Token', await ensureCsrfToken());
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      method,
      headers,
      credentials: 'include',
      cache: 'no-store',
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.', 0);
    }
    throw error;
  }

  // Respostas de uma conta anterior nunca devem repovoar a interface ou baixar arquivos.
  if (version !== sessionVersion) {
    throw new ApiError('A sessão mudou. Tente novamente.', 401);
  }
  if (!response.ok) {
    if (response.status === 401 && !['/auth/login', '/auth/register', '/auth/csrf'].includes(endpoint)) {
      expireSession();
    }
    const data = await readJson(response);
    throw new ApiError(
      data?.error?.message || data?.message || data?.erro || `A API retornou HTTP ${response.status}. Tente novamente.`,
      response.status,
      data?.error?.code,
    );
  }
  return response;
}

export async function uploadCsv(file) {
  const formData = new FormData();
  formData.append('file', file);

  return request('/upload-csv', {
    method: 'POST',
    body: formData,
  });
}

/**
 * Função utilitária genérica para requisições fetch com tratamento de erro
 */
async function request(endpoint, options = {}) {
  const version = sessionVersion;
  const response = await fetchResponse(endpoint, options);
  const data = await readJson(response);
  if (version !== sessionVersion) throw new ApiError('A sessão mudou. Tente novamente.', 401);
  if (response.status !== 204 && !data) {
    throw new ApiError('A API retornou uma resposta inválida. Verifique a configuração do backend.', response.status);
  }
  return data;
}

/**
 * Função utilitária para download de arquivos binários ou texto (Blob) como PDF ou CSV
 */
export async function downloadBlob(endpoint, options = {}, filename = 'download') {
  const version = sessionVersion;
  const response = await fetchResponse(endpoint, options);
  const blob = await response.blob();
  if (version !== sessionVersion) throw new ApiError('A sessão mudou. Tente novamente.', 401);
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  try {
    link.click();
    return true;
  } finally {
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(link);
  }
}

function acceptSession(result) {
  if (!result?.data?.user || !result.data.csrfToken) {
    throw new ApiError('A API retornou uma sessão inválida.', 502);
  }
  clearSessionState();
  csrfToken = result.data.csrfToken;
  return result.data.user;
}

export function getCurrentUser() {
  // React StrictMode pode montar o contexto duas vezes durante o desenvolvimento.
  if (!sessionPromise) {
    const promise = request('/auth/me').then(acceptSession).finally(() => {
      if (sessionPromise === promise) sessionPromise = null;
    });
    sessionPromise = promise;
  }
  return sessionPromise;
}
export const login = async (credentials) => acceptSession(await request('/auth/login', {
  method: 'POST',
  body: JSON.stringify(credentials),
}));
export const register = async (credentials) => acceptSession(await request('/auth/register', {
  method: 'POST',
  body: JSON.stringify(credentials),
}));
export async function logout() {
  await request('/auth/logout', { method: 'POST' });
  clearSessionState();
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
