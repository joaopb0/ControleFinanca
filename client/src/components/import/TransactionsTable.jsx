function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Math.abs(value));
}

export function TransactionsTable({
  transactions,
  categories,
  colors,
  openId,
  onToggle,
  onUpdate,
  onCreateCategory,
}) {
  return (
    <div className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              {['Data', 'Descrição', 'Valor', 'Categoria'].map((heading) => (
                <th
                  key={heading}
                  className="border-b border-slate-200 px-5 py-3 font-semibold"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction, index) => (
              <tr
                key={transaction.id}
                className={index % 2 ? 'bg-slate-50/50' : 'bg-white'}
              >
                <td className="whitespace-nowrap px-5 py-3.5 font-mono text-sm text-slate-500">
                  {transaction.date}
                </td>
                <td className="max-w-xs px-5 py-3.5 text-sm text-slate-800">
                  <span className="block truncate">{transaction.description}</span>
                </td>
                <td
                  className={`whitespace-nowrap px-5 py-3.5 font-mono text-sm font-semibold ${transaction.value >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                >
                  {transaction.value >= 0 ? '+' : '-'}
                  {formatBRL(transaction.value)}
                </td>
                <td className="relative px-5 py-3.5">
                  <button
                    onClick={() => onToggle(transaction.id)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold ${transaction.category === 'Outros' && transaction.value < 0 ? 'border-amber-200' : 'border-slate-200'} bg-slate-50 text-slate-800`}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: colors[transaction.category] || '#94a3b8' }}
                    />
                    {transaction.category}
                    <span className="text-slate-400">⌄</span>
                  </button>

                  {openId === transaction.id && (
                    <div className="absolute left-5 top-full z-20 mt-1 max-h-72 min-w-48 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                      {categories.map((category) => (
                        <button
                          key={category}
                          onClick={() => onUpdate(transaction.id, category)}
                          className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm ${category === transaction.category ? 'bg-blue-50 text-blue-600' : 'text-slate-800 hover:bg-slate-50'}`}
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: colors[category] || '#94a3b8' }}
                          />
                          {category}
                          {category === transaction.category && (
                            <span className="ml-auto">✓</span>
                          )}
                        </button>
                      ))}
                      <button
                        onClick={() => onCreateCategory(transaction)}
                        className="flex w-full items-center gap-2.5 border-t border-slate-100 px-4 py-2.5 text-left text-sm font-semibold text-blue-600 hover:bg-blue-50"
                      >
                        ＋ Nova categoria
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
