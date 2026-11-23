import { useId, useMemo, useState } from 'react';
import { groupCategoryPreferences } from '../../services/classificationSettings';

const PAGE_SIZE = 10;

function PreferenceCategoryGroup({ group, color, searching, disabled, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(searching);
  const [page, setPage] = useState(1);
  const panelId = useId();
  const pageCount = Math.ceil(group.items.length / PAGE_SIZE);
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <button type="button" aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-3 bg-slate-50/70 px-4 py-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color || '#94a3b8' }} aria-hidden="true" />
        <span className="min-w-0 flex-1 break-words font-semibold text-slate-800">{group.name}</span>
        <span className="text-xs text-slate-500">{searching ? `${group.items.length} de ${group.total}` : group.total} {group.total === 1 ? 'descrição' : 'descrições'}</span>
        <span className="text-slate-400" aria-hidden="true">{expanded ? '−' : '+'}</span>
      </button>
      <div id={panelId} hidden={!expanded}>
        {expanded && <>
          <ul className="divide-y divide-slate-100" aria-label={`Descrições de ${group.name}`}>
            {group.items.slice(start, start + PAGE_SIZE).map((preference) => <li key={preference.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 flex-1 break-words text-sm text-slate-700">{preference.description}</p>
              <div className="flex shrink-0 gap-2">
                <button type="button" disabled={disabled} onClick={() => onEdit(preference)} aria-label={`Editar padrão ${preference.description}`}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Editar</button>
                <button type="button" disabled={disabled} onClick={() => onDelete(preference)} aria-label={`Excluir padrão ${preference.description}`}
                  className="rounded-lg border border-red-100 bg-red-50/50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50">Excluir</button>
              </div>
            </li>)}
          </ul>
          {pageCount > 1 && <nav aria-label={`Páginas de ${group.name}`} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            <span aria-live="polite">{start + 1}–{Math.min(start + PAGE_SIZE, group.items.length)} de {group.items.length} · Página {currentPage} de {pageCount}</span>
            <div className="flex gap-2">
              <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">Anterior</button>
              <button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">Próxima</button>
            </div>
          </nav>}
        </>}
      </div>
    </div>
  );
}

export function PreferenceGroups({ preferences, categoryColors, isLoading, isSaving, loadError, onRetry, onEdit, onDelete }) {
  const [search, setSearch] = useState('');
  const searchId = useId();
  const groups = useMemo(() => groupCategoryPreferences(preferences, search), [preferences, search]);
  const searching = Boolean(search.trim());
  return (
    <section aria-label="Padrões pessoais por categoria" className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
      <div>
        <h2 className="font-display text-lg font-bold text-slate-900 sm:text-xl">Padrões pessoais por categoria</h2>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">Abra uma categoria para gerenciar suas descrições exatas. Esses padrões têm preferência sobre as palavras-chave.</p>
      </div>
      <div>
        <label htmlFor={searchId} className="sr-only">Buscar em todas as descrições e categorias</label>
        <input id={searchId} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar em todas as descrições e categorias..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
      </div>
      {isLoading ? <p role="status" className="py-5 text-center text-sm text-slate-500">Carregando padrões pessoais...</p>
        : loadError ? <div role="alert" className="text-sm text-red-700"><p>{loadError}</p><button type="button" onClick={onRetry} className="mt-3 rounded-lg border border-slate-200 px-4 py-2 text-blue-900">Tentar novamente</button></div>
          : !groups.length ? <p className="py-5 text-center text-sm text-slate-500">{searching ? 'Nenhuma descrição ou categoria encontrada.' : 'Nenhum padrão pessoal salvo. Ao classificar um lançamento, marque “Salvar como padrão” para reutilizar sua escolha.'}</p>
            : <>
              <p className="text-xs text-slate-500" aria-live="polite">{searching ? `${groups.reduce((total, group) => total + group.items.length, 0)} de ` : ''}{preferences.length} descrições · {groups.length} categorias</p>
              {groups.map((group) => <PreferenceCategoryGroup key={`${group.id}:${search}`} group={group} color={categoryColors[group.name]} searching={searching}
                disabled={isSaving} onEdit={onEdit} onDelete={onDelete} />)}
            </>}
    </section>
  );
}
