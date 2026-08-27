import { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { Navbar } from './components/layout/Navbar/Navbar';
import { Footer } from './components/layout/Footer/Footer';
import { HomePage } from './pages/Home/HomePage';
import { UsersPage } from './pages/Users/UsersPage';
import './styles/global.css';

export function App() {
  const [currentTab, setCurrentTab] = useState('home');

  return (
    <ThemeProvider>
      <Navbar currentTab={currentTab} onSelectTab={setCurrentTab} />
      
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 1.5rem', width: '100%', flex: 1 }}>
        {currentTab === 'home' && <HomePage onNavigate={setCurrentTab} />}
        {currentTab === 'users' && <UsersPage />}
      </main>

      <Footer />
    </ThemeProvider>
  );
}

export default App;
