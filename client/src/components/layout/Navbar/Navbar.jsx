import { useTheme } from '../../../contexts/ThemeContext';
import { Button } from '../../common/Button/Button';
import './Navbar.css';

export function Navbar({ currentTab, onSelectTab }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        <div className="navbar-brand">
          <span className="brand-icon">⚡</span>
          <span className="brand-title">FullStack App</span>
        </div>

        <nav className="navbar-nav">
          <button 
            className={`nav-link ${currentTab === 'home' ? 'active' : ''}`}
            onClick={() => onSelectTab('home')}
          >
            Início
          </button>
          <button 
            className={`nav-link ${currentTab === 'users' ? 'active' : ''}`}
            onClick={() => onSelectTab('users')}
          >
            Usuários (API)
          </button>
        </nav>

        <div className="navbar-actions">
          <Button variant="secondary" size="sm" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️ Claro' : '🌙 Escuro'}
          </Button>
        </div>
      </div>
    </header>
  );
}
