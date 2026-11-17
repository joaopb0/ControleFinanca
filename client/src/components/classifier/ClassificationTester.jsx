import React, { useState } from 'react';
import { testMatch } from '../../services/api';

/**
 * ClassificationTester Component
 * Ferramenta interativa para testar a correspondência de palavras-chave e regras em tempo real:
 * - Permite digitar descrições arbitrárias de lançamentos.
 * - Exibe a categoria atribuída, regra correspondente, palavra-chave encontrada e indicação clara de fallback.
 */
export function ClassificationTester({ categoryColors = {} }) {
  const [description, setDescription] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleTest = async (e) => {
    if (e) e.preventDefault();
    if (!description.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await testMatch(description.trim());
      if (response?.data) {
        setResult(response.data);
      } else {
        throw new Error('Resposta do servidor em formato inesperado.');
      }
    } catch (err) {
      setError(err.message || 'Não foi possível testar a classificação. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const isFallback = result && !result.ruleId;
  const catColor = result ? categoryColors[result.category] || '#94a3b8' : null;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 font-bold" aria-hidden="true">
          ⚡
        </div>
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold text-slate-900">
            Simulador de Classificação
          </h2>
          <p className="text-xs text-slate-500">
            Digite a descrição de uma despesa ou receita para validar qual regra será disparada.
          </p>
        </div>
      </div>

      <form onSubmit={handleTest} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="test-description-input" className="sr-only">
            Descrição da transação a ser testada
          </label>
          <input
            id="test-description-input"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Supermercado Pão de Açúcar, Uber viagem, Aluguel Setembro..."
            required
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !description.trim()}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm shadow-blue-900/20 hover:bg-blue-800 disabled:opacity-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {isLoading ? (
            <div
              className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              aria-hidden="true"
            />
          ) : (
            <span>Testar</span>
          )}
        </button>
      </form>

      {/* Área de Resultado do Teste */}
      <div role="status" aria-live="polite">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            {error}
          </div>
        )}

        {result && (
          <div
            className={`mt-1 flex flex-col gap-3 rounded-xl border p-4 transition-all ${
              isFallback
                ? 'border-amber-200 bg-amber-50/60 text-amber-950'
                : 'border-emerald-200 bg-emerald-50/50 text-emerald-950'
            }`}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: catColor }}
                  aria-hidden="true"
                />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Categoria Atribuída:
                </span>
                <span className="font-display text-sm sm:text-base font-bold text-slate-900">
                  {result.category}
                </span>
              </div>

              <div>
                {isFallback ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100/80 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    <span>⚠</span>
                    <span>Fallback Padrão ('Outros')</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100/80 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    <span>✓</span>
                    <span>Regra Correspondente</span>
                  </span>
                )}
              </div>
            </div>

            <div className="border-t border-slate-200/60 pt-2 text-xs text-slate-700">
              {isFallback ? (
                <p>
                  Nenhuma regra ativa correspondeu aos termos de{' '}
                  <code className="rounded bg-white/80 px-1 py-0.5 font-mono font-semibold text-slate-900">
                    "{result.description}"
                  </code>
                  . O classificador aplicou a regra de contingência segura com a categoria{' '}
                  <strong>'Outros'</strong>.
                </p>
              ) : (
                <p>
                  Disparada pela regra <strong>"{result.matchedRuleName || 'Regra de Correspondência'}"</strong> através da palavra-chave{' '}
                  <span className="rounded-md bg-white/90 border border-emerald-200 px-1.5 py-0.5 font-mono font-bold text-emerald-900">
                    "{result.matchedKeyword}"
                  </span>
                  .
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClassificationTester;
