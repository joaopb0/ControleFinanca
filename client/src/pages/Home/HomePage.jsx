import { Card } from '../../components/common/Card/Card';
import { Button } from '../../components/common/Button/Button';
import './HomePage.css';

export function HomePage({ onNavigate }) {
  return (
    <div className="home-page">
      <section className="hero-section">
        <h1 className="hero-title">Arquitetura de Projeto Full-Stack</h1>
        <p className="hero-subtitle">
          Estrutura profissional separando claramente o <strong>Front-end (React + Vite)</strong> e o <strong>Back-end (Node.js + Express)</strong>.
        </p>
        <div className="hero-buttons">
          <Button variant="primary" size="lg" onClick={() => onNavigate('users')}>
            Ver Integração com a API
          </Button>
        </div>
      </section>

      <section className="architecture-grid">
        <Card 
          title="📂 client/ (Front-end)"
          subtitle="React 19 + Vite"
        >
          <ul className="folder-list">
            <li><strong>assets/</strong>: Mídias, logos e ícones estáticos</li>
            <li><strong>components/</strong>: Componentes reutilizáveis (Botões, Cards, Modais)</li>
            <li><strong>contexts/</strong>: Estados globais com Context API</li>
            <li><strong>hooks/</strong>: Custom Hooks encapsulando lógica de estado</li>
            <li><strong>pages/</strong>: Telas principais da aplicação</li>
            <li><strong>services/</strong>: Comunicação HTTP com a API</li>
            <li><strong>styles/</strong>: CSS global e variáveis de tema</li>
            <li><strong>utils/</strong>: Funções puras de formatação e cálculo</li>
          </ul>
        </Card>

        <Card 
          title="⚙️ server/ (Back-end)"
          subtitle="Node.js + Express API REST"
        >
          <ul className="folder-list">
            <li><strong>controllers/</strong>: Lógica de controle e regras de negócio</li>
            <li><strong>routes/</strong>: Mapeamento de rotas e endpoints REST</li>
            <li><strong>models/</strong>: Estrutura de dados ou banco de dados</li>
            <li><strong>middlewares/</strong>: Tratamento de erros, logs e validações</li>
            <li><strong>server.js</strong>: Ponto de entrada do servidor HTTP</li>
            <li><strong>.env</strong>: Variáveis de ambiente secretas (portas, chaves)</li>
          </ul>
        </Card>
      </section>
    </div>
  );
}
