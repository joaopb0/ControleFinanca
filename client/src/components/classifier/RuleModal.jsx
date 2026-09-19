import React, { useState, useEffect, useRef } from 'react';

/**
 * RuleModal Component
 * Modal acessível (WCAG 2.1 AA) para criação e edição de regras de classificação:
 * - Suporta navegação por teclado, captura de Escape e fechamento seguro.
 * - Validação em tempo real e prevenção de submissão duplicada.
 */
export function RuleModal({
  isOpen,
  rule = null,
  categories = [],
  onSave,
  onClose,
  isSaving = false,
}) {
  const isEditing = Boolean(rule && rule.id);

  const [name, setName] = useState(() => rule?.name || '');
  const [category, setCategory] = useState(
    () => rule?.category || categories[0] || 'Alimentação',
  );
  const [keywords, setKeywords] = useState(() => {
    if (!rule) return '';
    return Array.isArray(rule.keywords)
      ? rule.keywords.join(', ')
      : rule.keywords || '';
  });
  const [priority, setPriority] = useState(
    () => (rule?.priority !== undefined ? rule.priority : 0),
  );
  const [active, setActive] = useState(() => rule?.active !== false);
  const [error, setError] = useState(null);

  const initialInputRef = useRef(null);

  // Foco inicial acessível no primeiro campo ao abrir
  useEffect(() => {
    if (isOpen) {
      initialInputRef.current?.focus();
    }
  }, [isOpen]);

  // Captura tecla Escape para fechar modal
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen && !isSaving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanCategory = category.trim();
    const cleanKeywords = keywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (cleanName.length < 2) {
      setError('O nome da regra deve ter pelo menos 2 caracteres.');
      return;
    }

    if (!cleanCategory) {
      setError('Selecione uma categoria alvo.');
      return;
    }

    if (cleanKeywords.length === 0) {
      setError('Informe ao menos uma palavra-chave para correspondência.');
      return;
    }

    const payload = {
      name: cleanName,
      category: cleanCategory,
      keywords: cleanKeywords,
      priority: Number(priority) || 0,
      active: Boolean(active),
    };

    if (isEditing) {
      payload.id = rule.id;
    }

    try {
      await onSave(payload);
    } catch (err) {
      setError(err.message || 'Ocorreu um erro ao salvar a regra.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs transition-opacity"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rule-modal-title"
        className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all"
      >
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-900 font-bold" aria-hidden="true">
              {isEditing ? '✎' : '+'}
            </div>
            <h2 id="rule-modal-title" className="font-display text-lg font-bold text-slate-900">
              {isEditing ? 'Editar Regra de Classificação' : 'Nova Regra de Classificação'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Fechar diálogo"
          >
            ✕
          </button>
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div
            role="alert"
            className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800"
          >
            <span aria-hidden="true" className="font-bold">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          {/* Nome da Regra */}
          <div>
            <label htmlFor="rule-name" className="block text-xs font-semibold text-slate-700">
              Nome da Regra <span className="text-red-500">*</span>
            </label>
            <input
              ref={initialInputRef}
              id="rule-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Supermercados & Mercearias"
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Um rótulo claro para identificar a finalidade desta regra.
            </p>
          </div>

          {/* Categoria Alvo */}
          <div>
            <label htmlFor="rule-category" className="block text-xs font-semibold text-slate-700">
              Categoria Alvo <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 flex gap-2">
              <select
                id="rule-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                {!categories.includes(category) && category && (
                  <option value={category}>{category}</option>
                )}
              </select>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Categoria que será atribuída às transações que corresponderem a esta regra.
            </p>
          </div>

          {/* Palavras-chave */}
          <div>
            <label htmlFor="rule-keywords" className="block text-xs font-semibold text-slate-700">
              Palavras-chave (separadas por vírgula) <span className="text-red-500">*</span>
            </label>
            <input
              id="rule-keywords"
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Ex: pão de açúcar, carrefour, mercado, feira"
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              A correspondência ignora acentos, pontuação e maiúsculas/minúsculas.
            </p>
          </div>

          {/* Grid de Prioridade e Status */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="rule-priority" className="block text-xs font-semibold text-slate-700">
                Prioridade (maior = avaliada primeiro)
              </label>
              <input
                id="rule-priority"
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                min="0"
                max="1000"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  id="rule-active"
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-900 focus:ring-blue-500"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Regra ativa
                </span>
              </label>
            </div>
          </div>

          {/* Rodapé com Botões */}
          <div className="mt-3 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-blue-900 px-5 py-2 text-xs font-bold text-white shadow-sm shadow-blue-900/20 hover:bg-blue-800 disabled:opacity-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {isSaving && (
                <div
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"
                  aria-hidden="true"
                />
              )}
              <span>{isEditing ? 'Salvar Alterações' : 'Criar Regra'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RuleModal;
