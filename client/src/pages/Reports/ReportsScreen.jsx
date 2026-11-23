import { useEffect, useState } from 'react';
import { fetchHistoryReport, deleteHistory } from '../../services/api';
import { getCurrentMonth } from '../../services/reportPeriod';
import { ReportSummaryCards } from '../../components/reports/ReportSummaryCards';
import { CategoryBreakdownTable } from '../../components/reports/CategoryBreakdownTable';
import { PeriodFilter } from '../../components/reports/PeriodFilter';
import { ExportControls } from '../../components/reports/ExportControls';
import { DeleteHistoryModal } from '../../components/history/DeleteHistoryModal';

/** O dashboard e a aba Histórico compartilham a mesma tela e os dados persistidos. */
export function ReportsScreen({ initialMonth, onNavigateToImport }) {
  const [startDate, setStartDate] = useState(() => initialMonth || getCurrentMonth());
  const [endDate, setEndDate] = useState(() => initialMonth || getCurrentMonth());
  const [report, setReport] = useState(null);
  const [reload, setReload] = useState(0);
  const [deletion, setDeletion] = useState(null);
  const invalidPeriod = Boolean(startDate && endDate && startDate > endDate);
  const currentReport = report?.startDate === startDate && report.endDate === endDate && report.reload === reload ? report : null;
  const summaryData = currentReport?.data;
  const isLoading = !invalidPeriod && !currentReport;
  const totals = summaryData?.totals || { income: 0, expenses: 0, netBalance: 0, monthCount: 0, transactionCount: null };
  const hasData = totals.monthCount > 0;

  useEffect(() => {
    let active = true;
    if (startDate && endDate && startDate > endDate) return;
    fetchHistoryReport({ from: startDate, to: endDate })
      .then((response) => {
        if (active) setReport({ startDate, endDate, reload, data: response.data });
      })
      .catch((error) => {
        if (active) setReport({ startDate, endDate, reload, error: error.message || 'Não foi possível carregar o relatório.' });
      });
    return () => { active = false; };
  }, [startDate, endDate, reload]);

  const remove = async (month) => {
    await deleteHistory(month);
    setReload((value) => value + 1);
  };

  return (
    <div className="flex-1 bg-slate-50 py-6 sm:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Relatório Financeiro</h1>
            <p className="text-xs sm:text-sm text-slate-500">Visão analítica consolidada de receitas, despesas e distribuição por categorias.</p>
          </div>
          <div className="flex items-center gap-2">
            {hasData && <span className="rounded-full bg-slate-200/70 px-3 py-1 text-xs font-semibold text-slate-700">{totals.monthCount} {totals.monthCount === 1 ? 'mês' : 'meses'} no período</span>}
            <details className="relative">
              <summary className="cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100">Gerenciar histórico</summary>
              <div className="absolute right-0 z-10 mt-1 min-w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                {startDate && startDate === endDate && hasData && <button type="button" onClick={() => setDeletion({ month: startDate })} className="w-full rounded-lg px-3 py-2 text-left text-xs text-red-700 hover:bg-red-50">Excluir mês selecionado</button>}
                <button type="button" onClick={() => setDeletion({ month: undefined })} className="w-full rounded-lg px-3 py-2 text-left text-xs text-red-700 hover:bg-red-50">Excluir todo o histórico</button>
              </div>
            </details>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <PeriodFilter precision="month" startDate={startDate} endDate={endDate}
            onChangePeriod={({ startDate: start, endDate: end }) => { setStartDate(start); setEndDate(end); }}
            onReset={() => { setStartDate(''); setEndDate(''); }} />
          {(invalidPeriod || currentReport?.error) && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {invalidPeriod ? 'O mês inicial deve ser anterior ao mês final.' : currentReport.error}
            {currentReport?.error && <button type="button" onClick={() => setReload((value) => value + 1)} className="ml-3 underline">Tentar novamente</button>}
          </div>}
          {!isLoading && !invalidPeriod && !currentReport?.error && !hasData && <div role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            Nenhum resumo salvo neste período. Selecione outro período ou importe um extrato.
            {onNavigateToImport && <button type="button" onClick={onNavigateToImport} className="ml-2 font-semibold text-blue-900 hover:underline">Ir para Importação de Extrato ↗</button>}
          </div>}
          <ReportSummaryCards totals={totals} isLoading={isLoading} />
          <ExportControls historyFilters={{ from: startDate, to: endDate }} hasData={!isLoading && !invalidPeriod && !currentReport?.error && hasData} />
          <CategoryBreakdownTable breakdown={summaryData?.categoryBreakdown || []} isLoading={isLoading} />
        </div>
      </div>
      {deletion && <DeleteHistoryModal month={deletion.month} onConfirm={remove} onClose={() => setDeletion(null)} />}
    </div>
  );
}

export default ReportsScreen;
