import React, { useState } from 'react';
import { useClassificationSettings } from '../../hooks/useClassificationSettings';
import { PreferenceModal } from '../../components/classifier/PreferenceModal';
import { PreferenceGroups } from '../../components/classifier/PreferenceGroups';
import { DeletePreferenceModal } from '../../components/classifier/DeletePreferenceModal';
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
  categoryRecords = [],
  onRulesChange,
  onApplyClassifiedTransactions,
}) {
  const settings = useClassificationSettings({ categoryRecords, onRulesChange });
  const { rules, isLoading, isSaving } = settings;
  const [notification, setNotification] = useState(null);

  // Estado do Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [deletingPreference, setDeletingPreference] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };



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
    try {
      await settings.save(ruleData);
      showNotification('Configuração salva com sucesso!');
      setModalOpen(false);
    } catch (error) {
      showNotification(error.message || 'Não foi possível salvar a regra.', 'error');
      throw error;
    }
  };

  // Excluir regra
  const handleDeleteRule = async (id) => {
    try {
      await settings.remove(id);
      showNotification('Regra excluída com sucesso.');
    } catch (err) {
      showNotification(err.message || 'Erro ao excluir regra.', 'error');
    }
  };

  // Restaurar regras padrão
  const handleResetRules = async () => {
    try {
      await settings.reset();
      showNotification('Regras restauradas para os valores padrão!');
    } catch (err) {
      showNotification(err.message || 'Erro ao restaurar regras.', 'error');
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
              Gerencie suas descrições exatas e palavras-chave para classificar os próximos extratos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-900">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" aria-hidden="true" />
              <span>{settings.loadError ? 'Carregamento indisponível' : `${rules.filter((r) => r.active !== false).length} Regras Ativas`}</span>
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
            key={settings.revision}
            categoryColors={categoryColors}
          />

          {/* Seção 2: Tabela de Regras CRUD */}
          <PreferenceGroups preferences={rules.filter((rule) => rule.type === 'exact')} categoryColors={categoryColors}
            isLoading={isLoading} isSaving={isSaving} loadError={settings.loadError} onRetry={settings.reload}
            onEdit={handleOpenEdit} onDelete={setDeletingPreference} />
          <RulesTable
            rules={rules.filter((rule) => rule.type === 'keywords')}
            categoryColors={categoryColors}
            onAddRule={handleOpenCreate}
            onEditRule={handleOpenEdit}
            onDeleteRule={handleDeleteRule}
            onResetRules={handleResetRules}
            isLoading={isLoading}
            isSaving={isSaving}
            loadError={settings.loadError}
            onRetry={settings.reload}
          />

          {/* Seção 3: Pré-visualização e Revisão de Transações em Lote */}
          <ClassifiedPreviewTable
            transactions={transactions}
            categoryColors={categoryColors}
            onApplyClassified={onApplyClassifiedTransactions}
          />
        </div>

        {/* Modal de Criação / Edição */}
        {deletingPreference && <DeletePreferenceModal preference={deletingPreference} onClose={() => setDeletingPreference(null)}
          onConfirm={async (id) => { await settings.remove(id); showNotification('Padrão pessoal excluído com sucesso.'); }} />}
        {modalOpen && editingRule?.type === 'exact' && (
          <PreferenceModal key={editingRule.id} preference={editingRule} categories={categoryRecords}
            onSave={handleSaveRule} onClose={() => setModalOpen(false)} isSaving={isSaving} />
        )}
        {modalOpen && editingRule?.type !== 'exact' && (
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
