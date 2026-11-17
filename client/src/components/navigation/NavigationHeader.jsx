import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

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

  const tabs = [
    {
      id: 'import',
      label: 'Extrato & Importação',
      icon: '📥',
      description: 'Importar arquivo CSV e revisar transações',
    },
    {
      id: 'classifier',
      label: 'Classificador de Regras',
      icon: '🏷️',
      description: 'Gerenciar regras e testar classificação de categorias',
    },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white text-black">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-2.5 lg:flex-row lg:items-center lg:justify-between sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
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

        {/* Tab Navigation */}
        <nav
          role="tablist"
          aria-label="Navegação principal da aplicação"
          className="flex items-center gap-1 rounded-xl bg-slate-900/90 p-1 border border-slate-800 overflow-x-auto"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`tab-${tab.id}`}
                type="button"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                title={tab.description}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <span aria-hidden="true">{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.id === 'import' && transactionCount > 0 && (
                  <span
                    className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      isActive
                        ? 'bg-blue-800 text-blue-100'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                    aria-label={`${transactionCount} transações carregadas`}
                  >
                    {transactionCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="flex min-w-0 items-center justify-between gap-3 sm:justify-end">
          <div className="min-w-0 text-right">
            <p className="truncate text-sm font-semibold text-slate-900" title={user.name}>{user.name}</p>
            <p className="max-w-48 truncate text-xs text-slate-500" title={user.email}>{user.email}</p>
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
