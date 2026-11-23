import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { NavigationTabs } from './NavigationTabs';

export function NavigationHeader({ activeTab, onSelectTab, transactionCount = 0 }) {
  const { user, signOut } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError('');
    try {
      await signOut();
    } catch {
      setLogoutError('Não foi possível encerrar a sessão. Tente novamente.');
      setLoggingOut(false);
    }
  }

  return (
    <header className="border-b border-slate-200 bg-white text-black">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 sm:px-6 lg:flex lg:justify-between lg:gap-6 lg:px-8">
        {/* Brand / Logo */}
        <div className="order-1 flex min-w-0 shrink-0 items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-900 text-white font-bold shadow-sm shadow-blue-500/30"
            aria-hidden="true"
          >
            ↗
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-base sm:text-lg font-bold tracking-tight text-black">
                ControleFinanca
              </span>
              <span className="rounded-md bg-blue-950/80 border border-blue-800/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-300">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Gestão Financeira & Relatórios
            </p>
          </div>
        </div>
        <div className="order-3 col-span-2 min-w-0 lg:order-2 lg:flex-1">
          <NavigationTabs activeTab={activeTab} onSelectTab={onSelectTab} transactionCount={transactionCount} />
        </div>
        <div className="order-2 flex min-w-0 shrink-0 items-center justify-end gap-3 lg:order-3">
          <div className="hidden min-w-0 text-right sm:block">
            <p className="max-w-36 truncate text-sm font-semibold text-slate-900" title={user.name}>{user.name}</p>
            <p className="max-w-36 truncate text-xs text-slate-500" title={user.email}>{user.email}</p>
          </div>
          <button type="button" onClick={handleLogout} disabled={loggingOut} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-60">
            {loggingOut ? 'Saindo…' : 'Sair'}
          </button>
        </div>
      </div>
      {logoutError && <p role="alert" className="mx-auto max-w-7xl px-4 pb-2 text-sm text-red-700">{logoutError}</p>}
    </header>
  );
}

export default NavigationHeader;
