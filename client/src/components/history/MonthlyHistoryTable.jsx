import { formatCents, formatMonth } from '../../services/historySummary';

export function MonthlyHistoryTable({ months, onDelete }) {
  return <div className="flex flex-col gap-5">{months.map((month) => (
    <section key={month.month} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div><h2 className="font-display text-lg font-bold capitalize text-slate-900">{formatMonth(month.month)}</h2>
          <p className="text-xs text-slate-500">Saldo do mês: <span className="font-mono">{formatCents(month.balanceCents)}</span></p></div>
        <button type="button" onClick={() => onDelete(month.month)} className="rounded-lg px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">Excluir mês</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px] text-left text-sm" aria-label={`Histórico de ${formatMonth(month.month)}`}>
          <thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Categoria', 'Receitas', 'Despesas', 'Saldo'].map((name) => <th key={name} scope="col" className="px-5 py-3">{name}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{month.categories.map((category) => <tr key={category.categoryId}>
            <th scope="row" className="px-5 py-3 font-medium text-slate-800"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: category.color }} />{category.categoryName}
              {category.archived && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-normal text-slate-500">Arquivada</span>}</th>
            <td className="px-5 py-3 font-mono text-emerald-700">{formatCents(category.incomeCents)}</td>
            <td className="px-5 py-3 font-mono text-red-700">{formatCents(category.expenseCents)}</td>
            <td className="px-5 py-3 font-mono text-slate-700">{formatCents(category.balanceCents)}</td>
          </tr>)}</tbody>
          <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold"><tr><th scope="row" className="px-5 py-3">Total</th>
            <td className="px-5 py-3 font-mono text-emerald-700">{formatCents(month.incomeCents)}</td>
            <td className="px-5 py-3 font-mono text-red-700">{formatCents(month.expenseCents)}</td>
            <td className="px-5 py-3 font-mono">{formatCents(month.balanceCents)}</td>
          </tr></tfoot>
        </table>
      </div>
    </section>
  ))}</div>;
}
