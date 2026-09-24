import React from 'react';

/**
 * Utilitário de formatação de moeda brasileira (BRL)
 */
function formatBRL(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Math.abs(num));
}

/**
 * ReportSummaryCards Component
 * Cartões de KPIs consolidados (Receitas, Despesas, Saldo Líquido e Transações).
 * Conforme WCAG 2.1 AA e Diretriz 11, nunca depende apenas de cor:
 * utiliza sinais matemáticos explícitos (+ / -) e rótulos semânticos descritivos.
 */
export function ReportSummaryCards({ totals = {}, isLoading = false }) {
  const income = totals.income || 0;
  const expenses = totals.expenses || 0;
  const largestExpenseCategory = totals.largestExpenseCategory || 'Outros';
  const largestExpenseAmount = totals.largestExpenseAmount || totals.largestExpense || 0;
  const netBalance = totals.netBalance !== undefined ? totals.netBalance : income - expenses;
  const count = totals.transactionCount || 0;

  const isPositiveNet = netBalance >= 0;

  if (isLoading) {
    return (
      <section
        aria-label="Carregando resumo financeiro"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex h-32 animate-pulse flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
          >
            <div className="h-4 w-24 rounded bg-slate-200" />
            <div className="h-8 w-36 rounded bg-slate-200" />
            <div className="h-3 w-20 rounded bg-slate-100" />
          </div>
        ))}
      </section>
    );
  }

  return (
    <section
      aria-label="Resumo dos indicadores financeiros consolidados"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {/* 1. Total de receitas */}
      <article className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total de receitas
          </span>
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs"
            aria-hidden="true"
          >
            ↑
          </div>
        </div>

        <div className="my-3">
          <div className="flex items-baseline gap-1 font-mono text-xl sm:text-2xl font-bold tracking-tight text-emerald-700">
            <span aria-hidden="true" className="font-bold text-lg text-emerald-800">
              +
            </span>
            <span>{formatBRL(income)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-700" aria-hidden="true" />
          <span>Entradas computadas</span>
        </div>
      </article>

      {/* 2. Total de despesas */}
      <article className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total de despesas
          </span>
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-700 font-bold text-xs"
            aria-hidden="true"
          >
            ↓
          </div>
        </div>

        <div className="my-3">
          <div className="flex items-baseline gap-1 font-mono text-xl sm:text-2xl font-bold tracking-tight text-red-700">
            <span aria-hidden="true" className="font-bold text-lg text-red-800">
              -
            </span>
            <span>{formatBRL(expenses)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-red-800">
          <span className="h-1.5 w-1.5 rounded-full bg-red-700" aria-hidden="true" />
          <span>Saídas computadas</span>
        </div>
      </article>

      {/* 3. Maior gasto */}
      <article className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Maior gasto
          </span>
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-700 font-bold text-xs"
            aria-hidden="true"
          >
            ★
          </div>
        </div>

        <div className="my-3">
          <div className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-violet-700">
            {largestExpenseCategory}
          </div>
          <div className="mt-1 text-sm font-medium text-slate-600">
            {formatBRL(largestExpenseAmount)}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-800">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-700" aria-hidden="true" />
          <span>Máxima despesa somada</span>
        </div>
      </article>

      {/* 4. Sobra */}
      <article
        className={`flex flex-col justify-between rounded-2xl border p-5 shadow-xs transition-shadow hover:shadow-md ${
          isPositiveNet
            ? 'border-emerald-200 bg-emerald-50/30'
            : 'border-red-200 bg-red-50/30'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Sobra
          </span>
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg font-bold text-xs ${
              isPositiveNet
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-red-100 text-red-800'
            }`}
            aria-hidden="true"
          >
            {isPositiveNet ? '✓' : '⚠'}
          </div>
        </div>

        <div className="my-3">
          <div
            className={`flex items-baseline gap-1 font-mono text-xl sm:text-2xl font-bold tracking-tight ${
              isPositiveNet ? 'text-emerald-800' : 'text-red-800'
            }`}
          >
            <span aria-hidden="true" className="font-bold text-lg">
              {isPositiveNet ? '+' : '-'}
            </span>
            <span>{formatBRL(netBalance)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-semibold">
          <span
            className={`inline-block rounded-md px-1.5 py-0.5 ${
              isPositiveNet
                ? 'bg-emerald-100 text-emerald-900 font-bold'
                : 'bg-red-100 text-red-900 font-bold'
            }`}
          >
            {isPositiveNet ? 'Positivo no período' : 'Negativo no período'}
          </span>
        </div>
      </article>
    </section>
  );
}

export default ReportSummaryCards;
