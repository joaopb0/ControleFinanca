import { useEffect, useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { AuthScreen } from './pages/Auth/AuthScreen';
import { NavigationHeader } from './components/navigation/NavigationHeader';
import { ImportScreen } from './pages/Import/ImportScreen';
import { ClassifierScreen } from './pages/Classifier/ClassifierScreen';
import { HistoryScreen } from './pages/History/HistoryScreen';
import { SaveMonthlyHistoryModal } from './components/history/SaveMonthlyHistoryModal';
import { useCategories } from './hooks/useCategories';
import { useHistory } from './hooks/useHistory';
import './styles/global.css';

function PrivateApplication() {
  const [activeTab, setActiveTab] = useState('import');
  const catalog = useCategories();
  const { transactions, changeTransactions: setTransactions } = catalog;
  const [batchId, setBatchId] = useState(() => crypto.randomUUID());
  const [historyGeneration, setHistoryGeneration] = useState(0);
  const history = useHistory({ transactions, batchId, onGenerated: () => {
    setTransactions([]);
    setBatchId(crypto.randomUUID());
    setHistoryGeneration((value) => value + 1);
    setActiveTab('history');
  } });
  const handleImport = (rows) => {
    setBatchId(crypto.randomUUID());
    setTransactions(rows);
  };

  useEffect(() => {
    window.history.replaceState(null, '', '/');
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab, historyGeneration]);

  return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        <div className="sticky top-0 z-40">
          <NavigationHeader activeTab={activeTab} onSelectTab={setActiveTab} transactionCount={transactions.length} />
        </div>
        {catalog.error && <div role="alert" className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{catalog.error}</div>}
        {history.error && <div role="alert" className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{history.error}</div>}
        {catalog.isLoading && <p role="status" className="p-6 text-sm text-slate-500">Carregando suas categorias…</p>}
        {!catalog.isLoading && !catalog.categories.length && <button type="button" onClick={catalog.retry} className="m-4 rounded-lg border border-blue-200 p-3 text-blue-900">Tentar carregar categorias novamente</button>}

        {/* Conteúdo dinâmico das telas baseado na aba ativa */}
        <main
          id={`tabpanel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          className="flex-1 flex flex-col"
        >
          {!catalog.isLoading && catalog.categories.length > 0 && activeTab === 'import' && (
            <ImportScreen
              transactions={transactions}
              onTransactionsChange={handleImport}
              categories={catalog.categories}
              colors={catalog.colors}
              onSaveCategory={catalog.save}
              onDeleteCategory={catalog.remove}
              onChooseCategory={catalog.choose}
              onDeleteTransaction={catalog.removeTransaction}
              isSaving={catalog.isSaving || history.isPreparing}
              onGenerateDashboard={history.prepare}
            />
          )}

          {!catalog.isLoading && catalog.categories.length > 0 && activeTab === 'classifier' && (
            <ClassifierScreen
              transactions={transactions}
              categories={catalog.names}
              categoryRecords={catalog.categories}
              onRulesChange={catalog.rulesChanged}
              categoryColors={catalog.colors}
              onApplyClassifiedTransactions={setTransactions}
            />
          )}

          {activeTab === 'history' && <HistoryScreen key={historyGeneration} onNavigateToImport={() => setActiveTab('import')} />}
        </main>
        {history.confirmation && <SaveMonthlyHistoryModal key={history.confirmation.requestId} preview={history.confirmation.preview} onConfirm={history.confirm} onClose={history.close} />}
      </div>
  );
}

function AuthGate() {
  const { user, status, sessionError, sessionGeneration, retrySession } = useAuth();
  if (status === 'loading') {
    return (
      <main className="auth-shell auth-session-screen" role="status" aria-live="polite">
        <span className="auth-brand-mark" aria-hidden="true">↗</span>
        <h1 className="font-display text-xl font-bold">ControleFinanca</h1>
        <span className="auth-spinner" aria-hidden="true" />
        <p>Verificando sua sessão…</p>
      </main>
    );
  }
  if (status === 'error') {
    return (
      <main className="auth-shell auth-session-screen">
        <h1 className="font-display text-xl font-bold">Não foi possível conectar</h1>
        <p role="alert">{sessionError}</p>
        <button className="auth-submit" type="button" onClick={retrySession}>Tentar novamente</button>
      </main>
    );
  }
  return user ? <PrivateApplication key={`${user.id}:${sessionGeneration}`} /> : <AuthScreen />;
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
