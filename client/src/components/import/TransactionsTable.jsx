import { MerchantIdentity } from './MerchantIdentity';

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Math.abs(value));
}

export function TransactionsTable({
  transactions,
  colors,
  onEdit,
  onDelete,
  disabled = false,
}) {
  return (
    <div className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[740px] text-left" aria-label="Lançamentos do extrato">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              {['Data', 'Descrição', 'Valor', 'Categoria', 'Ações'].map((heading) => (
                <th
                  key={heading}
                  scope="col"
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
                  <MerchantIdentity transaction={transaction} />
                </td>
                <td
                  className={`whitespace-nowrap px-5 py-3.5 font-mono text-sm font-semibold ${transaction.value >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                >
                  {transaction.value >= 0 ? '+' : '-'}
                  {formatBRL(transaction.value)}
                </td>
                <td className="relative px-5 py-3.5">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onEdit(transaction)}
                    aria-label={`Classificar lançamento ${index + 1}: ${transaction.description}`}
                    aria-haspopup="dialog"
                    className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${transaction.isFallback && transaction.value < 0 ? 'border-amber-200' : 'border-slate-200'} bg-slate-50 text-slate-800`}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: colors[transaction.category] || '#94a3b8' }}
                    />
                    {transaction.category}
                    <span className="text-slate-400" aria-hidden="true">✎</span>
                  </button>

                  {transaction.manualOverride && <span className="mt-1 block text-[11px] text-slate-500">Escolha individual</span>}
                </td>
                <td className="px-5 py-3.5">
                  <button type="button" onClick={() => onDelete(transaction)} disabled={disabled}
                    aria-label={`Excluir lançamento ${index + 1}: ${transaction.description}`} aria-haspopup="dialog"
                    className="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 32 32" fill="none">
                      <path d="M14 6H18C18 5.46957 17.7893 4.96086 17.4142 4.58579C17.0391 4.21071 16.5304 4 16 4C15.4696 4 14.9609 4.21071 14.5858 4.58579C14.2107 4.96086 14 5.46957 14 6ZM12 6C12 4.93913 12.4214 3.92172 13.1716 3.17157C13.9217 2.42143 14.9391 2 16 2C17.0609 2 18.0783 2.42143 18.8284 3.17157C19.5786 3.92172 20 4.93913 20 6H28C28.2652 6 28.5196 6.10536 28.7071 6.29289C28.8946 6.48043 29 6.73478 29 7C29 7.26522 28.8946 7.51957 28.7071 7.70711C28.5196 7.89464 28.2652 8 28 8H26.872L24.462 25.676C24.2985 26.8739 23.7066 27.9719 22.7958 28.7669C21.885 29.5619 20.717 30 19.508 30H12.492C11.283 30 10.115 29.5619 9.2042 28.7669C8.29338 27.9719 7.70145 26.8739 7.538 25.676L5.128 8H4C3.73478 8 3.48043 7.89464 3.29289 7.70711C3.10536 7.51957 3 7.26522 3 7C3 6.73478 3.10536 6.48043 3.29289 6.29289C3.48043 6.10536 3.73478 6 4 6H12ZM14 13C14 12.7348 13.8946 12.4804 13.7071 12.2929C13.5196 12.1054 13.2652 12 13 12C12.7348 12 12.4804 12.1054 12.2929 12.2929C12.1054 12.4804 12 12.7348 12 13V23C12 23.2652 12.1054 23.5196 12.2929 23.7071C12.4804 23.8946 12.7348 24 13 24C13.2652 24 13.5196 23.8946 13.7071 23.7071C13.8946 23.5196 14 23.2652 14 23V13ZM19 12C18.7348 12 18.4804 12.1054 18.2929 12.2929C18.1054 12.4804 18 12.7348 18 13V23C18 23.2652 18.1054 23.5196 18.2929 23.7071C18.4804 23.8946 18.7348 24 19 24C19.2652 24 19.5196 23.8946 19.7071 23.7071C19.8946 23.5196 20 23.2652 20 23V13C20 12.7348 19.8946 12.4804 19.7071 12.2929C19.5196 12.1054 19.2652 12 19 12Z" fill="currentColor" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
