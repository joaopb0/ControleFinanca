import React, { useState, useEffect } from 'react';
import { fetchRules, createRule, updateRule, deleteRule, resetRules } from '../../services/api';
import { RulesTable } from '../../components/classifier/RulesTable';
import { RuleModal } from '../../components/classifier/RuleModal';
import { ClassificationTester } from '../../components/classifier/ClassificationTester';
import { ClassifiedPreviewTable } from '../../components/classifier/ClassifiedPreviewTable';

/**
 * ClassifierScreen Component
 * Tela principal do Classificador de Categorias de Pagamento (Escopo João).
 * Coordena o CRUD de regras, simulador de correspondência e pré-visualização de lote.
 */
export function ClassifierScreen({
  transactions = [],
  categories = ['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Contas', 'Saúde', 'Receita', 'Outros'],
  categoryColors = {},
  onApplyClassifiedTransactions,
}) {
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Estado do Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };



  useEffect(() => {
    let isMounted = true;
    fetchRules()
      .then((response) => {
        if (!isMounted) return;
        if (Array.isArray(response?.data)) {
          setRules(response.data);
        } else {
          throw new Error('A API retornou regras em formato inválido.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setNotification({ message: err.message || 'Não foi possível carregar suas regras.', type: 'error' });
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Abertura do modal para criação
  const handleOpenCreate = () => {
    setEditingRule(null);
    setModalOpen(true);
  };

  // Abertura do modal para edição
  const handleOpenEdit = (rule) => {
    setEditingRule(rule);
    setModalOpen(true);
  };

  // Salvar (criar ou atualizar)
  const handleSaveRule = async (ruleData) => {
    setIsSaving(true);
    try {
      if (ruleData.id) {
        const response = await updateRule(ruleData.id, ruleData);
        if (!response?.data) throw new Error('A API não confirmou a atualização da regra.');
        setRules((prev) =>
          prev.map((r) => (r.id === ruleData.id ? response.data : r)),
        );
        showNotification('Regra atualizada com sucesso!');
      } else {
        const response = await createRule(ruleData);
        if (!response?.data) throw new Error('A API não confirmou a criação da regra.');
        setRules((prev) => [response.data, ...prev]);
        showNotification('Regra criada com sucesso!');
      }
      setModalOpen(false);
    } catch (error) {
      showNotification(error.message || 'Não foi possível salvar a regra.', 'error');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  // Excluir regra
  const handleDeleteRule = async (id) => {
    try {
      await deleteRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      showNotification('Regra excluída com sucesso.');
    } catch (err) {
      showNotification(err.message || 'Erro ao excluir regra.', 'error');
    }
  };

  // Restaurar regras padrão
  const handleResetRules = async () => {
    setIsLoading(true);
    try {
      const response = await resetRules();
      if (!Array.isArray(response?.data)) throw new Error('A API não confirmou a restauração das regras.');
      setRules(response.data);
      showNotification('Regras restauradas para os valores padrão!');
    } catch (err) {
      showNotification(err.message || 'Erro ao restaurar regras.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 py-6 sm:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho da Página */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Classificador de Categorias
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Configure regras baseadas em palavras-chave para mapear automaticamente cada lançamento financeiro.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-900">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" aria-hidden="true" />
              <span>{rules.filter((r) => r.active !== false).length} Regras Ativas</span>
            </span>
          </div>
        </div>

        {/* Notificação / Toast Acessível */}
        {notification && (
          <div
            role="status"
            aria-live="polite"
            className={`mb-5 flex items-center justify-between rounded-xl border p-4 text-xs sm:text-sm font-medium shadow-xs transition-all ${
              notification.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-900'
                : 'border-emerald-200 bg-emerald-50 text-emerald-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="font-bold">
                {notification.type === 'error' ? '⚠' : '✓'}
              </span>
              <span>{notification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-xs font-bold opacity-70 hover:opacity-100 focus-visible:outline-none"
              aria-label="Fechar notificação"
            >
              ✕
            </button>
          </div>
        )}

        {/* Layout em Grade: Simulador + Tabela de Regras + Pré-visualização */}
        <div className="flex flex-col gap-6">
          {/* Seção 1: Simulador de Correspondência em Tempo Real */}
          <ClassificationTester
            categoryColors={categoryColors}
          />

          {/* Seção 2: Tabela de Regras CRUD */}
          <RulesTable
            rules={rules}
            categoryColors={categoryColors}
            onAddRule={handleOpenCreate}
            onEditRule={handleOpenEdit}
            onDeleteRule={handleDeleteRule}
            onResetRules={handleResetRules}
            isLoading={isLoading}
          />

          {/* Seção 3: Pré-visualização e Revisão de Transações em Lote */}
          <ClassifiedPreviewTable
            transactions={transactions}
            categoryColors={categoryColors}
            onApplyClassified={onApplyClassifiedTransactions}
          />
        </div>

        {/* Modal de Criação / Edição */}
        {modalOpen && (
          <RuleModal
            key={editingRule?.id || 'new'}
            isOpen={modalOpen}
            rule={editingRule}
            categories={categories}
            onSave={handleSaveRule}
            onClose={() => setModalOpen(false)}
            isSaving={isSaving}
          />
        )}
      </div>
    </div>
  );
}

export default ClassifierScreen;
