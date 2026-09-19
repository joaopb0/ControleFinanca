import React, { useState, useEffect } from 'react';
import { fetchReportSummary } from '../../services/api';
import { ReportSummaryCards } from '../../components/reports/ReportSummaryCards';
import { CategoryBreakdownTable } from '../../components/reports/CategoryBreakdownTable';
import { PeriodFilter } from '../../components/reports/PeriodFilter';
import { ExportControls } from '../../components/reports/ExportControls';

/**
 * Utilitários matemáticos e de data locais para contingência caso a API esteja offline
 */
function localNormalizeDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

function calculateLocalSummary(transactions = [], startDate = '', endDate = '', categoryColors = {}) {
  const normStart = startDate ? localNormalizeDate(startDate) : null;
  const normEnd = endDate ? localNormalizeDate(endDate) : null;

  const filtered = transactions.filter((t) => {
    if (!t) return false;
    const d = localNormalizeDate(t.date);
    if (!d) return true;
    if (normStart && d < normStart) return false;
    if (normEnd && d > normEnd) return false;
    return true;
  });

  let totalIncome = 0;
  let totalExpenses = 0;
  const categoryMap = new Map();

  for (const tx of filtered) {
    const val = Number(tx.value) || 0;
    const category = (tx.category && typeof tx.category === 'string' && tx.category.trim())
      ? tx.category.trim()
      : 'Outros';

    if (val > 0) totalIncome += val;
    if (val < 0) totalExpenses += Math.abs(val);

    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        category,
        rawSum: 0,
        count: 0,
        positiveSum: 0,
        negativeSum: 0,
      });
    }
    const catData = categoryMap.get(category);
    catData.rawSum += val;
    catData.count += 1;
    if (val > 0) catData.positiveSum += val;
    if (val < 0) catData.negativeSum += Math.abs(val);
  }

  const categoryBreakdown = [];
  for (const [cat, data] of categoryMap.entries()) {
    const isIncome = data.rawSum > 0 || (data.rawSum === 0 && data.positiveSum > 0);
    const type = isIncome ? 'income' : 'expense';
    const amount = Math.abs(data.rawSum);
    let percentage = 0;
    if (type === 'income' && totalIncome > 0) {
      percentage = (amount / totalIncome) * 100;
    } else if (type === 'expense' && totalExpenses > 0) {
      percentage = (amount / totalExpenses) * 100;
    }

    categoryBreakdown.push({
      category: cat,
      type,
      amount: Math.round(amount * 100) / 100,
      percentage: Math.round(percentage * 10) / 10,
      count: data.count,
      color: categoryColors[cat] || '#94a3b8',
    });
  }

  categoryBreakdown.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'expense' ? -1 : 1;
    return b.amount - a.amount;
  });

  return {
    totals: {
      income: Math.round(totalIncome * 100) / 100,
      expenses: Math.round(totalExpenses * 100) / 100,
      netBalance: Math.round((totalIncome - totalExpenses) * 100) / 100,
      transactionCount: filtered.length,
    },
    categoryBreakdown,
  };
}

/**
 * ReportsScreen Component
 * Tela principal do Gerador de Relatórios Financeiros (Escopo João).
 * Apresenta o painel de resumo consolidado, filtros por período e gatilhos de exportação (PDF e CSV).
 */
export function ReportsScreen({
  transactions = [],
  categoryColors = {},
  onNavigateToImport,
}) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summaryData, setSummaryData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Efeito assíncrono para recalcular resumo ao alterar transações ou datas
  useEffect(() => {
    let isMounted = true;
    if (!transactions || transactions.length === 0) {
      return;
    }

    const payload = {
      transactions,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      customColors: categoryColors,
    };

    fetchReportSummary(payload)
      .then((res) => {
        if (!isMounted) return;
        if (res?.data) {
          setSummaryData(res.data);
        } else {
          throw new Error('Resposta sem dados');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('API de resumo indisponível, calculando localmente:', err.message);
        const local = calculateLocalSummary(transactions, startDate, endDate, categoryColors);
        setSummaryData(local);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [transactions, startDate, endDate, categoryColors]);

  const hasTransactions = transactions && transactions.length > 0;

  // Derivação de totais e detalhamento
  const totals = summaryData?.totals || (hasTransactions ? calculateLocalSummary(transactions, startDate, endDate, categoryColors).totals : {
    income: 0,
    expenses: 0,
    netBalance: 0,
    transactionCount: 0,
  });

  const categoryBreakdown = summaryData?.categoryBreakdown || (hasTransactions ? calculateLocalSummary(transactions, startDate, endDate, categoryColors).categoryBreakdown : []);

  return (
    <div className="flex-1 bg-slate-50 py-6 sm:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho da Página */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Relatório Financeiro
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Visão analítica consolidada de receitas, despesas e distribuição por categorias.
            </p>
          </div>

          {hasTransactions && (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-200/70 px-3 py-1 text-xs font-semibold text-slate-700">
                {totals.transactionCount} registros calculados
              </span>
            </div>
          )}
        </div>

        {!hasTransactions ? (
          /* Estado Vazio Acessível */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xs">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl text-blue-900 mb-3" aria-hidden="true">
              📊
            </div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Sem dados financeiros disponíveis
            </h2>
            <p className="mt-1 max-w-md text-xs sm:text-sm text-slate-500">
              Nenhuma transação foi carregada ainda no extrato. Faça upload de um arquivo CSV ou carregue os dados de demonstração na tela de importação.
            </p>
            {onNavigateToImport && (
              <button
                type="button"
                onClick={onNavigateToImport}
                className="mt-5 rounded-xl bg-blue-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-900/20 hover:bg-blue-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Ir para Importação de Extrato ↗
              </button>
            )}
          </div>
        ) : (
          /* Conteúdo com Dados */
          <div className="flex flex-col gap-6">
            {/* 1. Filtro de Período */}
            <PeriodFilter
              startDate={startDate}
              endDate={endDate}
              onChangePeriod={({ startDate: s, endDate: e }) => {
                setStartDate(s);
                setEndDate(e);
              }}
              onReset={() => {
                setStartDate('');
                setEndDate('');
              }}
            />

            {/* 2. Cartões de Resumo KPI */}
            <ReportSummaryCards totals={totals} isLoading={isLoading} />

            {/* 3. Controles de Exportação (CSV e PDF) */}
            <ExportControls
              transactions={transactions}
              startDate={startDate}
              endDate={endDate}
              customColors={categoryColors}
            />

            {/* 4. Tabela de Detalhamento por Categoria */}
            <CategoryBreakdownTable
              breakdown={categoryBreakdown}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default ReportsScreen;
