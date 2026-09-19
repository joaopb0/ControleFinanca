import React, { useState, useMemo } from 'react';

/**
 * RulesTable Component
 * Tabela acessível (WCAG 2.1 AA) para gerenciamento de regras de classificação:
 * - Exibe lista de regras com prioridade, nome, categoria alvo, palavras-chave e status.
 * - Suporta busca textual e filtro por categoria.
 * - Fornece gatilhos de criação, edição, exclusão e restauração padrão.
 */
export function RulesTable({
  rules = [],
  categoryColors = {},
  onAddRule,
  onEditRule,
  onDeleteRule,
  onResetRules,
  isLoading = false,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Categorias únicas presentes nas regras para o filtro
  const categoriesList = useMemo(() => {
    const set = new Set();
    rules.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set).sort();
  }, [rules]);

  // Regras filtradas
  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      const matchSearch =
        !searchTerm ||
        rule.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rule.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rule.keywords?.some((k) => k.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCategory =
        selectedCategory === 'ALL' || rule.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [rules, searchTerm, selectedCategory]);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
      {/* Header com título e ações */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 sm:text-xl">
            Regras de Classificação
          </h2>
          <p className="text-xs text-slate-500 sm:text-sm">
            Configure palavras-chave que determinam a categoria automática de cada lançamento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onResetRules}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            title="Restaurar conjunto de 8 regras padrão"
          >
            <span>↻</span>
            <span>Restaurar Padrão</span>
          </button>

          <button
            type="button"
            onClick={onAddRule}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-xl bg-blue-900 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-blue-900/20 hover:bg-blue-800 disabled:opacity-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span aria-hidden="true">+</span>
            <span>Nova Regra</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <label htmlFor="search-rules-input" className="sr-only">
            Buscar regras por nome, palavra-chave ou categoria
          </label>
          <input
            id="search-rules-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, palavra-chave ou categoria..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              aria-label="Limpar busca"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 focus-visible:outline-none"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="category-filter-select" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            Categoria:
          </label>
          <select
            id="category-filter-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs sm:text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">Todas as categorias</option>
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela de Regras */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs sm:text-sm text-slate-700" aria-label="Tabela de regras de classificação">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3 text-center w-16">
                Prioridade
              </th>
              <th scope="col" className="px-4 py-3">
                Nome da Regra
              </th>
              <th scope="col" className="px-4 py-3">
                Categoria Alvo
              </th>
              <th scope="col" className="px-4 py-3">
                Palavras-chave
              </th>
              <th scope="col" className="px-4 py-3 text-center">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2" role="status" aria-live="polite">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    <span>Carregando regras...</span>
                  </div>
                </td>
              </tr>
            ) : filteredRules.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="text-2xl" aria-hidden="true">🔍</span>
                    <p className="font-semibold text-slate-700">Nenhuma regra encontrada</p>
                    <p className="text-xs text-slate-400">
                      {searchTerm || selectedCategory !== 'ALL'
                        ? 'Tente ajustar os filtros ou termos da busca.'
                        : 'Cadastre sua primeira regra ou clique em "Restaurar Padrão".'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRules.map((rule) => {
                const catColor = categoryColors[rule.category] || '#94a3b8';
                const isConfirmingDelete = deleteConfirmId === rule.id;

                return (
                  <tr key={rule.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 text-center font-mono font-semibold text-slate-600">
                      <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                        {rule.priority ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {rule.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-800">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: catColor }}
                          aria-hidden="true"
                        />
                        <span>{rule.category}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {Array.isArray(rule.keywords) && rule.keywords.length > 0 ? (
                          rule.keywords.map((kw, idx) => (
                            <span
                              key={idx}
                              className="rounded-md bg-blue-50 border border-blue-100 px-2 py-0.5 text-[11px] font-mono text-blue-800"
                            >
                              {kw}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs italic text-slate-400">Nenhuma</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          rule.active !== false
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        <span aria-hidden="true">{rule.active !== false ? '●' : '○'}</span>
                        <span>{rule.active !== false ? 'Ativa' : 'Inativa'}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteRule(rule.id);
                                setDeleteConfirmId(null);
                              }}
                              className="rounded-md bg-red-600 px-2 py-1 text-xs font-bold text-white shadow-xs hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                              aria-label={`Confirmar exclusão da regra ${rule.name}`}
                            >
                              Confirmar
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 focus-visible:outline-none"
                              aria-label="Cancelar exclusão"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => onEditRule(rule)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
                              aria-label={`Editar regra ${rule.name}`}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(rule.id)}
                              className="rounded-lg border border-red-100 bg-red-50/50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-colors"
                              aria-label={`Excluir regra ${rule.name}`}
                            >
                              Excluir
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Rodapé da tabela com contagem */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
        <span>
          Mostrando <strong>{filteredRules.length}</strong> de <strong>{rules.length}</strong> regras cadastradas
        </span>
        <span className="text-[11px] text-slate-400">
          * Regras com maior prioridade são avaliadas primeiro
        </span>
      </div>
    </div>
  );
}

export default RulesTable;
