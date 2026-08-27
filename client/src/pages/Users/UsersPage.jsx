import { useState } from 'react';
import { api } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { formatDate } from '../../utils/formatters';
import { Card } from '../../components/common/Card/Card';
import { Button } from '../../components/common/Button/Button';
import './UsersPage.css';

export function UsersPage() {
  const { data: usersData, loading, error, refetch } = useFetch(api.getUsers);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Desenvolvedor');
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setSubmitting(true);
    setActionMessage(null);
    try {
      await api.createUser({ name, email, role });
      setName('');
      setEmail('');
      setActionMessage({ type: 'success', text: 'Usuário cadastrado com sucesso!' });
      refetch();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Erro ao criar usuário' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente excluir este usuário?')) return;
    try {
      await api.deleteUser(id);
      setActionMessage({ type: 'success', text: 'Usuário removido!' });
      refetch();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Erro ao deletar usuário' });
    }
  };

  const users = usersData?.data || [];

  return (
    <div className="users-page">
      <div className="page-header">
        <h2>Gerenciamento de Usuários</h2>
        <p className="text-muted">Integração real entre o Front-end React e o Back-end Express</p>
      </div>

      {actionMessage && (
        <div className={`alert alert-${actionMessage.type}`}>
          {actionMessage.text}
        </div>
      )}

      <div className="users-grid">
        {/* Formulário de Criação */}
        <Card title="Novo Usuário" subtitle="Envia POST para o back-end">
          <form onSubmit={handleSubmit} className="user-form">
            <div className="form-group">
              <label htmlFor="name">Nome Completo</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Carlos Silva"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: carlos@email.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="role">Cargo / Função</label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="Desenvolvedor Frontend">Desenvolvedor Frontend</option>
                <option value="Desenvolvedor Backend">Desenvolvedor Backend</option>
                <option value="Full Stack Engineer">Full Stack Engineer</option>
                <option value="UI/UX Designer">UI/UX Designer</option>
              </select>
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              disabled={submitting}
            >
              {submitting ? 'Salvando...' : 'Adicionar Usuário'}
            </Button>
          </form>
        </Card>

        {/* Lista de Usuários vindos da API */}
        <Card 
          title={`Lista de Usuários (${users.length})`} 
          subtitle="Dados recebidos via GET /api/users"
          footer={
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              🔄 Atualizar Lista
            </Button>
          }
        >
          {loading && <p className="loading-text">Carregando dados da API...</p>}

          {error && (
            <div className="api-error-card">
              <p>⚠️ <strong>Não foi possível conectar ao Back-end.</strong></p>
              <p className="error-detail">{error}</p>
              <p className="tip-text">Certifique-se de que o servidor back-end está rodando em <code>http://localhost:3000</code>.</p>
            </div>
          )}

          {!loading && !error && users.length === 0 && (
            <p className="empty-text">Nenhum usuário cadastrado ainda.</p>
          )}

          {!loading && !error && users.length > 0 && (
            <ul className="users-list">
              {users.map((user) => (
                <li key={user.id} className="user-item">
                  <div className="user-info">
                    <span className="user-name">{user.name}</span>
                    <span className="user-email">{user.email}</span>
                    <span className="user-badge">{user.role}</span>
                    <span className="user-date">Criado em: {formatDate(user.createdAt)}</span>
                  </div>
                  <Button 
                    variant="danger" 
                    size="sm" 
                    onClick={() => handleDelete(user.id)}
                  >
                    Excluir
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
