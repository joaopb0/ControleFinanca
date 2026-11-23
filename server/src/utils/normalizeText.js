/** Normalização compartilhada por classificação e persistência de preferências. */
export function normalizeText(text) {
  if (typeof text !== 'string') return '';
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
