import React, { useState, useEffect } from 'react';
import { fetchRules, createRule, updateRule, deleteRule, resetRules } from '../../services/api';
import { RulesTable } from '../../components/classifier/RulesTable';
import { RuleModal } from '../../components/classifier/RuleModal';
import { ClassificationTester } from '../../components/classifier/ClassificationTester';
import { ClassifiedPreviewTable } from '../../components/classifier/ClassifiedPreviewTable';

// Regras base padrão caso a API esteja temporariamente offline
const DEFAULT_FALLBACK_RULES = [
  { id: 'rule-1', name: 'Alimentação & Supermercado', category: 'Alimentação', keywords: ['supermercado', 'mercado', 'restaurante', 'ifood', 'padaria', 'lanche'], priority: 10, active: true },
  { id: 'rule-2', name: 'Moradia & Aluguel', category: 'Moradia', keywords: ['aluguel', 'condominio', 'imobiliaria', 'iptu', 'reforma'], priority: 9, active: true },
  { id: 'rule-3', name: 'Transporte & Aplicativos', category: 'Transporte', keywords: ['uber', '99app', 'posto', 'gasolina', 'combustivel', 'estacionamento', 'metro'], priority: 8, active: true },
  { id: 'rule-4', name: 'Lazer & Entretenimento', category: 'Lazer', keywords: ['netflix', 'spotify', 'cinema', 'ingresso', 'jogos', 'steam', 'bar'], priority: 7, active: true },
  { id: 'rule-5', name: 'Contas & Serviços Públicos', category: 'Contas', keywords: ['luz', 'energia', 'agua', 'sabesp', 'enel', 'internet', 'claro', 'vivo', 'tim'], priority: 6, active: true },
  { id: 'rule-6', name: 'Saúde & Farmácia', category: 'Saúde', keywords: ['farmacia', 'drogaria', 'hospital', 'consulta', 'laboratorio', 'medico', 'dentista'], priority: 5, active: true },
  { id: 'rule-7', name: 'Receitas & Rendimentos', category: 'Receita', keywords: ['salario', 'ted recebida', 'pix recebido', 'rendimento', 'pro-labore', 'dividendos'], priority: 10, active: true },
  { id: 'rule-8', name: 'Educação & Cursos', category: 'Outros', keywords: ['faculdade', 'escola', 'curso', 'livraria', 'udemy'], priority: 4, active: true },
];

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
        if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
          setRules(response.data);
        } else {
          setRules(DEFAULT_FALLBACK_RULES);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('API de regras inacessível, utilizando conjunto padrão local:', err.message);
        setRules(DEFAULT_FALLBACK_RULES);
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
        // Atualização
        try {
          await updateRule(ruleData.id, ruleData);
        } catch {
          // Contingência se offline
        }
        setRules((prev) =>
          prev.map((r) => (r.id === ruleData.id ? { ...r, ...ruleData } : r)),
        );
        showNotification('Regra atualizada com sucesso!');
      } else {
        // Criação
        let newRule = null;
        try {
          const res = await createRule(ruleData);
          newRule = res?.data;
        } catch {
          // Contingência se offline
        }
        if (!newRule) {
          newRule = {
            ...ruleData,
            id: `rule-local-${Date.now()}`,
          };
        }
        setRules((prev) => [newRule, ...prev]);
        showNotification('Regra criada com sucesso!');
      }
      setModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Excluir regra
  const handleDeleteRule = async (id) => {
    try {
      try {
        await deleteRule(id);
      } catch {
        // Contingência se offline
      }
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
      try {
        const res = await resetRules();
        if (res?.data) {
          setRules(res.data);
          showNotification('Regras restauradas para os valores padrão!');
          return;
        }
      } catch {
        // Fallback local
      }
      setRules(DEFAULT_FALLBACK_RULES);
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
            rules={rules}
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
            rules={rules}
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
