/**
 * Funções utilitárias puras para formatação de dados no Front-end.
 */

/**
 * Formata um valor numérico para a moeda brasileira (BRL).
 * @param {number} value
 * @returns {string}
 */
export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata uma data para o padrão pt-BR (DD/MM/AAAA HH:mm).
 * @param {string | Date} date
 * @returns {string}
 */
export function formatDate(date) {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}
