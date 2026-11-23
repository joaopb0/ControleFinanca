import React from 'react';
import { getMonthlyPeriod } from '../../services/reportPeriod';

/**
 * PeriodFilter Component
 * Barra de filtragem por período de datas com atalhos predefinidos:
 * - Permite selecionar data inicial e data final (inputs acessíveis tipo date).
 * - Fornece atalhos de um clique: "Todo o período", "Mês atual", "Últimos 30 dias".
 * - Suporta redefinição rápida com botão "Limpar".
 */
export function PeriodFilter({
  startDate = '',
  endDate = '',
  onChangePeriod,
  onReset,
  precision = 'day',
}) {
  const monthly = precision === 'month';
  const handleShortcut = (type) => {
    if (monthly) {
      onChangePeriod(getMonthlyPeriod(type));
      return;
    }
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const toIso = (d) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (type === 'all') {
      onChangePeriod({ startDate: '', endDate: '' });
    } else if (type === 'current_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      onChangePeriod({
        startDate: toIso(firstDay),
        endDate: toIso(lastDay),
      });
    } else if (type === 'last_30_days') {
      const past = new Date();
      past.setDate(today.getDate() - 30);
      onChangePeriod({
        startDate: toIso(past),
        endDate: toIso(today),
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900">
            Filtro de Período
          </h2>
          <p className="text-xs text-slate-500">
            {monthly ? 'Selecione meses completos para recalcular o histórico, os totais e as exportações.' : 'Filtre os lançamentos por intervalo de datas para recalcular os relatórios e exportações.'}
          </p>
        </div>

        {/* Botões de Atalho Rápido */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Atalhos de período">
          <button
            type="button"
            onClick={() => handleShortcut('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              !startDate && !endDate
                ? 'bg-blue-900 text-white shadow-xs'
                : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Todo o período
          </button>

          <button
            type="button"
            onClick={() => handleShortcut('current_month')}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
          >
            Mês atual
          </button>

          <button
            type="button"
            onClick={() => handleShortcut(monthly ? 'last_three_months' : 'last_30_days')}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
          >
            {monthly ? 'Últimos 3 meses' : 'Últimos 30 dias'}
          </button>

          {(startDate || endDate) && (
            <button
              type="button"
              onClick={onReset}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-colors"
              title="Limpar filtro de data"
            >
              ✕ Limpar
            </button>
          )}
        </div>
      </div>

      {/* Inputs de Data Inicial e Final */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-lg">
        <div>
          <label htmlFor="period-start-date" className="block text-xs font-semibold text-slate-700">
            {monthly ? 'Mês Inicial' : 'Data Inicial'}
          </label>
          <input
            id="period-start-date"
            type={monthly ? 'month' : 'date'}
            value={startDate}
            onChange={(e) =>
              onChangePeriod({ startDate: e.target.value, endDate })
            }
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs sm:text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label htmlFor="period-end-date" className="block text-xs font-semibold text-slate-700">
            {monthly ? 'Mês Final' : 'Data Final'}
          </label>
          <input
            id="period-end-date"
            type={monthly ? 'month' : 'date'}
            value={endDate}
            onChange={(e) =>
              onChangePeriod({ startDate, endDate: e.target.value })
            }
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs sm:text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>
    </div>
  );
}

export default PeriodFilter;
