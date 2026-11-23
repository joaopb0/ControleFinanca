export function TransactionDetails({ transaction }) {
  const value = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(transaction.value) || 0);
  return (
    <dl className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
      <div className="col-span-2">
        <dt className="text-xs text-slate-500">Descrição</dt>
        <dd className="mt-1 break-words font-semibold text-slate-900">{transaction.description}</dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500">Data</dt>
        <dd className="mt-1 font-mono text-slate-700">{transaction.date}</dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500">Valor</dt>
        <dd className={`mt-1 font-mono font-semibold ${transaction.value >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{value}</dd>
      </div>
    </dl>
  );
}
