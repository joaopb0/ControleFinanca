import React, { useState, useEffect } from 'react';
import { fetchReportSummary } from '../../services/api';
import { ReportSummaryCards } from '../../components/reports/ReportSummaryCards';
import { CategoryBreakdownTable } from '../../components/reports/CategoryBreakdownTable';
import { PeriodFilter } from '../../components/reports/PeriodFilter';
import { ExportControls } from '../../components/reports/ExportControls';

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
  const [report, setReport] = useState(null);
  const hasTransactions = transactions && transactions.length > 0;
  const currentReport = report?.transactions === transactions && report.startDate === startDate
    && report.endDate === endDate && report.categoryColors === categoryColors ? report : null;
  const summaryData = currentReport?.data;
  const isLoading = hasTransactions && !currentReport;

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
          setReport({ transactions, startDate, endDate, categoryColors, data: res.data });
        } else {
          throw new Error('Resposta sem dados');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setReport({ transactions, startDate, endDate, categoryColors, error: err.message || 'Não foi possível gerar o relatório.' });
      });

    return () => {
      isMounted = false;
    };
  }, [transactions, startDate, endDate, categoryColors]);

  // Derivação de totais e detalhamento
  const totals = summaryData?.totals || {
    income: 0,
    expenses: 0,
    netBalance: 0,
    transactionCount: 0,
  };

  const categoryBreakdown = summaryData?.categoryBreakdown || [];

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
            {currentReport?.error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{currentReport.error}</p>}
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
