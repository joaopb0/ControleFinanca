import { MerchantAvatar } from './MerchantIdentity';
import { getMerchantDisplay } from '../../services/merchantPresentation';

export function TransactionDetails({ transaction }) {
  const value = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(transaction.value) || 0);
  const display = getMerchantDisplay(transaction);

  return (
    <dl className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
      {display.hasMerchant && (
        <div className="col-span-2">
          <dt className="text-xs text-slate-500">Estabelecimento</dt>
          <dd className="mt-1.5 flex items-center gap-3">
            <MerchantAvatar display={display} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900">{display.primaryLabel}</p>
              {(display.domain || display.industry) && (
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                  {display.domain && <span className="font-mono">{display.domain}</span>}
                  {display.domain && display.industry && <span aria-hidden="true">·</span>}
                  {display.industry && <span>{display.industry}</span>}
                </p>
              )}
            </div>
          </dd>
        </div>
      )}
      <div className="col-span-2">
        <dt className="text-xs text-slate-500">{display.hasMerchant ? 'Descrição original' : 'Descrição'}</dt>
        <dd className={`mt-1 break-words ${display.hasMerchant ? 'font-mono text-xs text-slate-700' : 'font-semibold text-slate-900'}`}>
          {transaction.description}
        </dd>
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
