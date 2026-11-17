import { useEffect, useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { AuthScreen } from './pages/Auth/AuthScreen';
import { NavigationHeader } from './components/navigation/NavigationHeader';
import { ImportScreen } from './pages/Import/ImportScreen';
import { ClassifierScreen } from './pages/Classifier/ClassifierScreen';
import { ReportsScreen } from './pages/Reports/ReportsScreen';
import { CATEGORIES, CATEGORY_COLORS } from './data/mockData';
import './styles/global.css';

function PrivateApplication() {
  const [activeTab, setActiveTab] = useState('import');
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    window.history.replaceState(null, '', '/');
  }, []);

  return (
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
