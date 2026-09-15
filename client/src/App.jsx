import { ThemeProvider } from './contexts/ThemeContext';
import { ImportScreen } from './pages/Import/ImportScreen';
import './styles/global.css';

export function App() {
  return (
    <ThemeProvider>
      <ImportScreen />
    </ThemeProvider>
  );
}

export default App;
