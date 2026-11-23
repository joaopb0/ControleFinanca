import React, { useState } from 'react';
import { downloadReportCSV, downloadReportPDF, downloadHistoryReportCSV, downloadHistoryReportPDF } from '../../services/api';

/**
 * ExportControls Component
 * Seção com gatilhos acessíveis para exportação de relatórios em CSV e PDF:
 * - Previne cliques duplicados durante a geração do arquivo.
 * - Fornece feedback de carregamento com spinners e mensagens aria-live.
 * - Integração direta com a API de download de arquivos binários/texto.
 */
export function ExportControls({
  transactions = [],
  startDate = '',
  endDate = '',
  customColors = {},
  historyFilters = null,
  hasData,
}) {
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const hasTransactions = hasData ?? (transactions && transactions.length > 0);
  const isExporting = isExportingCSV || isExportingPDF;

  const handleExportCSV = async () => {
    if (!hasTransactions || isExporting) return;

    setIsExportingCSV(true);
    setFeedback(null);

    const payload = {
      transactions,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      customColors,
    };

    try {
      if (historyFilters) await downloadHistoryReportCSV(historyFilters);
      else await downloadReportCSV(payload, 'relatorio_financeiro.csv');
      setFeedback({
        type: 'success',
        message: 'Relatório CSV gerado e baixado com sucesso!',
      });
    } catch (err) {
      console.error('Falha ao exportar CSV:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Falha ao gerar relatório CSV. Tente novamente.',
      });
    } finally {
      setIsExportingCSV(false);
    }
  };

  const handleExportPDF = async () => {
    if (!hasTransactions || isExporting) return;

    setIsExportingPDF(true);
    setFeedback(null);

    const payload = {
      transactions,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      customColors,
    };

    try {
      if (historyFilters) await downloadHistoryReportPDF(historyFilters);
      else await downloadReportPDF(payload, 'relatorio_financeiro.pdf');
      setFeedback({
        type: 'success',
        message: 'Relatório PDF gerado e baixado com sucesso!',
      });
    } catch (err) {
      console.error('Falha ao exportar PDF:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Falha ao gerar relatório PDF. Tente novamente.',
      });
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold text-slate-900">
            Exportar Relatório Financeiro
          </h2>
          <p className="text-xs text-slate-500">
            Gere arquivos oficiais consolidados para auditoria, contabilidade ou arquivamento.
          </p>
        </div>

        {/* Gatilhos de Download */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Botão CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={!hasTransactions || isExporting}
            className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs sm:text-sm font-bold text-emerald-800 shadow-xs hover:bg-emerald-100 disabled:opacity-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            aria-label="Exportar relatório no formato CSV"
          >
            {isExportingCSV ? (
              <div
                className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-800 border-t-transparent"
                aria-hidden="true"
              />
            ) : (
              <span aria-hidden="true">📄</span>
            )}
            <span>{isExportingCSV ? 'Gerando CSV...' : 'Exportar CSV'}</span>
          </button>

          {/* Botão PDF */}
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={!hasTransactions || isExporting}
            className="flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm shadow-blue-900/20 hover:bg-blue-800 disabled:opacity-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Exportar relatório formatado em PDF"
          >
            {isExportingPDF ? (
              <div
                className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                aria-hidden="true"
              />
            ) : (
              <span aria-hidden="true">📑</span>
            )}
            <span>{isExportingPDF ? 'Gerando PDF...' : 'Exportar PDF'}</span>
          </button>
        </div>
      </div>

      {/* Alerta de Feedback Acessível */}
      <div role="status" aria-live="polite">
        {feedback && (
          <div
            className={`flex items-center justify-between rounded-xl border p-3 text-xs font-medium ${
              feedback.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="font-bold">
                {feedback.type === 'error' ? '⚠' : '✓'}
              </span>
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="font-bold opacity-60 hover:opacity-100 focus-visible:outline-none"
              aria-label="Fechar mensagem de status"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExportControls;
