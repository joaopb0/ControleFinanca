import React, { useState } from 'react';
import { classifyTransactions } from '../../services/api';

/**
 * Utilitário de formatação de moeda brasileira (BRL)
 */
function formatCurrency(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Math.abs(num));
}

/**
 * ClassifiedPreviewTable Component
 * Tabela para visualização e revisão de transações classificadas:
 * - Executa a classificação em lote contra a API autenticada.
 * - Exibe contadores de estatísticas (total, classificadas e contingência/fallback).
 * - Usa indicadores não dependentes apenas de cores para valores positivos/negativos (+ / -).
 */
export function ClassifiedPreviewTable({
  transactions = [],
  categoryColors = {},
  onApplyClassified,
}) {
  const [classifiedData, setClassifiedData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [error, setError] = useState(null);

  const handleClassifyBatch = async () => {
    if (!transactions || transactions.length === 0) return;

    setIsClassifying(true);
    setError(null);
    setClassifiedData([]);
    setSummary(null);

    try {
      const response = await classifyTransactions({ transactions });
      if (response?.data) {
        setClassifiedData(response.data);
        setSummary(response.summary || {
          total: response.data.length,
          classified: response.data.filter((t) => t.category !== 'Outros').length,
          fallbackCount: response.data.filter((t) => t.category === 'Outros').length,
        });
      } else {
        throw new Error('Resposta de classificação em formato inválido.');
      }
    } catch (err) {
      setError(err.message || 'Não foi possível classificar as transações. Tente novamente.');
    } finally {
      setIsClassifying(false);
    }
  };

  const hasData = classifiedData.length > 0;
  const listToDisplay = hasData ? classifiedData : transactions;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold text-slate-900">
            Pré-visualização de Lote de Transações
          </h2>
          <p className="text-xs text-slate-500">
            {transactions.length > 0
              ? `${transactions.length} transações prontas para validação com as regras atuais.`
              : 'Nenhuma transação carregada para pré-visualização.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasData && onApplyClassified && (
            <button
              type="button"
              onClick={() => onApplyClassified(classifiedData)}
              className="rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              Aplicar Categorias ao Extrato
            </button>
          )}

          <button
            type="button"
            onClick={handleClassifyBatch}
            disabled={isClassifying || transactions.length === 0}
            className="flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-blue-900/20 hover:bg-blue-800 disabled:opacity-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {isClassifying ? (
              <>
                <div
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"
                  aria-hidden="true"
                />
                <span>Classificando...</span>
              </>
            ) : (
              <>
                <span aria-hidden="true">⚙</span>
                <span>{hasData ? 'Reclassificar Lote' : 'Classificar Transações'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          {error}
        </div>
      )}

      {/* Cartões de Estatística da Classificação */}
      {summary && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Total Processado
            </span>
            <p className="mt-0.5 font-display text-lg font-bold text-slate-900">
              {summary.total} itens
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
              Classificadas por Regra
            </span>
            <p className="mt-0.5 font-display text-lg font-bold text-emerald-900">
              {summary.classified} ({summary.total > 0 ? Math.round((summary.classified / summary.total) * 100) : 0}%)
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
              Contingência Fallback ('Outros')
            </span>
            <p className="mt-0.5 font-display text-lg font-bold text-amber-900">
              {summary.fallbackCount} ({summary.total > 0 ? Math.round((summary.fallbackCount / summary.total) * 100) : 0}%)
            </p>
          </div>
        </div>
      )}

      {/* Tabela de Transações */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs sm:text-sm text-slate-700" aria-label="Tabela de revisão de transações classificadas">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-2.5">
                Data
              </th>
              <th scope="col" className="px-4 py-2.5">
                Descrição
              </th>
              <th scope="col" className="px-4 py-2.5 text-right">
                Valor
              </th>
              <th scope="col" className="px-4 py-2.5">
                Categoria Atribuída
              </th>
              <th scope="col" className="px-4 py-2.5">
                Regra / Correspondência
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {listToDisplay.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-400">
                  Nenhuma transação disponível no extrato.
                </td>
              </tr>
            ) : (
              listToDisplay.map((tx, idx) => {
                const isIncome = Number(tx.value) > 0;
                const catColor = categoryColors[tx.category] || '#94a3b8';
                const isFallback = tx.category === 'Outros' || tx.isFallback;

                return (
                  <tr key={tx.id || idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-slate-600 whitespace-nowrap">
                      {tx.date}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">
                      {tx.description}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-0.5 ${
                          isIncome ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        <span aria-hidden="true" className="font-bold">
                          {isIncome ? '+ ' : '- '}
                        </span>
                        <span>{formatCurrency(tx.value)}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: catColor }}
                          aria-hidden="true"
                        />
                        <span>{tx.category || 'Não definida'}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {isFallback ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                          <span>⚠</span>
                          <span>Fallback ('Outros')</span>
                        </span>
                      ) : tx.matchedKeyword || tx.ruleName ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                          <span>✓</span>
                          <span>{tx.ruleName || tx.matchedKeyword || 'Regra Ativa'}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          Aguardando classificação
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ClassifiedPreviewTable;
