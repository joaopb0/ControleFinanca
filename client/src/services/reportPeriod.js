/** O calendário da aplicação segue o fuso do usuário deste projeto. */
export function getCurrentMonth(today = new Date()) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(today);
  return `${parts.find((part) => part.type === 'year').value}-${parts.find((part) => part.type === 'month').value}`;
}

export function getMonthlyPeriod(shortcut, today = new Date()) {
  if (shortcut === 'all') return { startDate: '', endDate: '' };
  const current = getCurrentMonth(today);
  if (shortcut === 'current_month') return { startDate: current, endDate: current };
  const first = new Date(Date.UTC(Number(current.slice(0, 4)), Number(current.slice(5)) - 3, 1));
  return { startDate: `${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, '0')}`, endDate: current };
}
