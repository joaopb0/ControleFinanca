import React from 'react';

/**
 * Formata valores numéricos para moeda BRL
 */
function formatBRL(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Math.abs(num));
}

/**
 * CategoryBreakdownTable Component
 * Exibe o detalhamento dos subtotais e percentuais por categoria em formato tabular semântico.
 * Inclui barras proporcionais de participação e identificação não-ambígua de receitas e despesas.
 */
export function CategoryBreakdownTable({ breakdown = [], isLoading = false }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
      <div>
        <h2 className="font-display text-base sm:text-lg font-bold text-slate-900">
          Detalhamento por Categoria
        </h2>
        <p className="text-xs text-slate-500">
          Subtotais consolidados e distribuição percentual de cada categoria no período selecionado.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table
          className="w-full text-left text-xs sm:text-sm text-slate-700"
          aria-label="Detalhamento financeiro por categoria"
        >
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3">
                Categoria
              </th>
              <th scope="col" className="px-4 py-3">
                Tipo
              </th>
              <th scope="col" className="px-4 py-3 text-center">
                Lançamentos
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Subtotal
              </th>
              <th scope="col" className="px-4 py-3 min-w-[160px]">
                Participação
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2" role="status" aria-live="polite">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    <span>Calculando subtotais...</span>
                  </div>
                </td>
              </tr>
            ) : breakdown.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-400">
                  Nenhum valor encontrado para o período selecionado.
                </td>
              </tr>
            ) : (
              breakdown.map((item, index) => {
                const isIncome = item.type === 'income';
                const percentage = Math.min(100, Math.max(0, Number(item.percentage) || 0));
                const color = item.color || (isIncome ? '#10b981' : '#f97316');

                return (
                  <tr key={item.categoryKey || `${item.category}-${item.type}-${index}`} className="hover:bg-slate-50/70 transition-colors">
                    {/* Categoria */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <span
                          className="h-3 w-3 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: color }}
                          aria-hidden="true"
                        />
                        <span>{item.category}</span>
                        {item.archived && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-normal text-slate-500">Arquivada</span>}
                      </div>
                    </td>

                    {/* Tipo (Receita / Despesa) */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          isIncome
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-orange-50 text-orange-700 border border-orange-200'
                        }`}
                      >
                        <span aria-hidden="true">{isIncome ? '↑' : '↓'}</span>
                        <span>{isIncome ? 'Receita' : 'Despesa'}</span>
                      </span>
                    </td>

                    {/* Lançamentos */}
                    <td className="px-4 py-3 text-center font-mono text-slate-600" title={item.count === null ? 'Quantidade de lançamentos indisponível no histórico mensal.' : undefined}>
                      {item.count ?? '—'}
                    </td>

                    {/* Subtotal */}
                    <td className="px-4 py-3 text-right font-mono font-bold whitespace-nowrap">
                      <span className={isIncome ? 'text-emerald-700' : 'text-slate-900'}>
                        {isIncome ? '+ ' : '- '}
                        {formatBRL(item.amount)}
                      </span>
                    </td>

                    {/* Barra de Participação */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"
                          role="progressbar"
                          aria-valuenow={percentage}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${item.category}: ${percentage}% do total`}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                        <span className="w-12 text-right font-mono text-xs font-semibold text-slate-600">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
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

export default CategoryBreakdownTable;
