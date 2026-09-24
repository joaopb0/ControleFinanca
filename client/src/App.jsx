import { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { NavigationHeader } from './components/navigation/NavigationHeader';
import { ImportScreen } from './pages/Import/ImportScreen';
import { ClassifierScreen } from './pages/Classifier/ClassifierScreen';
import { ReportsScreen } from './pages/Reports/ReportsScreen';
import { CATEGORIES, CATEGORY_COLORS } from './data/mockData';
import './styles/global.css';

export function App() {
  const [activeTab, setActiveTab] = useState('import');
  const [transactions, setTransactions] = useState([]);

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        {/* Barra superior de navegação com abas acessíveis */}
        <NavigationHeader
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          transactionCount={transactions.length}
        />

        {/* Conteúdo dinâmico das telas baseado na aba ativa */}
        <main
          id={`tabpanel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          className="flex-1 flex flex-col"
        >
          {activeTab === 'import' && (
            <ImportScreen
              transactions={transactions}
              onTransactionsChange={setTransactions}
              onGenerateDashboard={() => setActiveTab('reports')}
            />
          )}

          {activeTab === 'classifier' && (
            <ClassifierScreen
              transactions={transactions}
              categories={CATEGORIES}
              categoryColors={CATEGORY_COLORS}
              onApplyClassifiedTransactions={setTransactions}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsScreen
              transactions={transactions}
              categoryColors={CATEGORY_COLORS}
              onNavigateToImport={() => setActiveTab('import')}
            />
          )}
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
