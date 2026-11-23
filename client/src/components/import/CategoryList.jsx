export function CategoryList({ categories, transactions, fileLoaded, onCreate, onEdit, onDelete, disabled = false }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="section-label !mb-0">Suas categorias</h2>
        <button type="button" onClick={onCreate} disabled={disabled} className="rounded-lg px-2 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50">＋ Nova</button>
      </div>
      <div className="flex flex-col gap-1.5">
        {categories.map((category) => (
          <div key={category.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-800">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: category.color }} />
            <span className="min-w-0 flex-1 break-words">{category.name}</span>
            {fileLoaded && <span className="font-mono text-xs text-slate-400">{transactions.filter((transaction) => transaction.categoryId === category.id).length}</span>}
            <button type="button" onClick={() => onEdit(category)} disabled={disabled} aria-label={`Editar categoria ${category.name}`} className="rounded p-1 text-slate-500 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40">✎</button>
            <button type="button" onClick={() => onDelete(category)} disabled={disabled || category.isFallback} aria-label={`Excluir categoria ${category.name}`} title={category.isFallback ? 'A categoria de fallback não pode ser excluída' : 'Excluir categoria'} className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-25">×</button>
          </div>
        ))}
      </div>
    </section>
  );
}
