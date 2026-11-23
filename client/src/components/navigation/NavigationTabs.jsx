const tabs = [
  {
    id: 'import',
    label: 'Extrato & Importação',
    description: 'Importar arquivo CSV e revisar transações',
  },
  {
    id: 'classifier',
    label: 'Classificador de Regras',
    description: 'Gerenciar regras e testar classificação de categorias',
  },
  {
    id: 'history',
    label: 'Histórico',
    description: 'Consultar receitas e despesas salvas por mês e categoria',
  },
];

export function NavigationTabs({ activeTab, onSelectTab, transactionCount = 0 }) {
  return (
        <nav role="tablist" aria-label="Navegação principal da aplicação"
          className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} role="tab" id={`tab-${tab.id}`} type="button"
                aria-selected={isActive} aria-controls={`tabpanel-${tab.id}`} title={tab.description}
                onClick={() => onSelectTab(tab.id)}
                className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:text-sm ${
                  isActive ? 'border-slate-200 bg-slate-50 text-blue-900'
                    : 'border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}>
                <span>{tab.label}</span>
                {tab.id === 'import' && transactionCount > 0 && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500"
                    aria-label={`${transactionCount} transações carregadas`}>{transactionCount}</span>
                )}
              </button>
            );
          })}
        </nav>
  );
}
