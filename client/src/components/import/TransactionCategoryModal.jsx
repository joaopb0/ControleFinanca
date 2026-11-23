import { useEffect, useId, useState } from 'react';
import { Modal } from '../common/Modal';
import { TransactionDetails } from './TransactionDetails';
import { CreateCategoryModal } from './CreateCategoryModal';
import { getCategoryPreference } from '../../services/api';

export function TransactionCategoryModal({ transaction, categories, onCreateCategory, onConfirm, onClose }) {
  const categoryInputId = useId();
  const [categoryId, setCategoryId] = useState(transaction.categoryId);
  const [remember, setRemember] = useState(true);
  const [preference, setPreference] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [preferenceError, setPreferenceError] = useState('');
  const [lookupVersion, setLookupVersion] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  useEffect(() => {
    let active = true;
    getCategoryPreference(transaction.description)
      .then((response) => { if (active) setPreference(response.data); })
      .catch((err) => { if (active) setPreferenceError(err.message || 'Não foi possível consultar o padrão salvo.'); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [transaction.description, lookupVersion]);

  const selectedCategory = categories.find((category) => category.id === categoryId);
  const submit = async (event) => {
    event.preventDefault();
    if (isSaving || !selectedCategory || (remember && (isLoading || preferenceError))) return;
    setIsSaving(true);
    setError('');
    try { await onConfirm(transaction.id, categoryId, remember); onClose(); }
    catch (err) { setError(err.message || 'Não foi possível salvar a classificação.'); }
    finally { setIsSaving(false); }
  };

  // Alterna o formulário mantendo a seleção e a opção de padrão deste lançamento.
  // Apenas um diálogo fica montado por vez, preservando o controle de foco.
  if (isCreatingCategory) {
    return <CreateCategoryModal existingNames={categories.map((category) => category.name)}
      onConfirm={async (name, color) => {
        const category = await onCreateCategory({ name, color });
        if (!category?.id) throw new Error('Não foi possível confirmar a criação da categoria.');
        setCategoryId(category.id);
      }}
      onClose={() => setIsCreatingCategory(false)} />;
  }

  return (
    <Modal title="Classificar lançamento" onClose={onClose} isBusy={isSaving}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <TransactionDetails transaction={transaction} />
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={categoryInputId} className="text-sm font-semibold text-slate-700">Categoria</label>
          <button type="button" onClick={() => { setError(''); setIsCreatingCategory(true); }} disabled={isSaving}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50">
            ＋ Nova categoria
          </button>
        </div>
        <select id={categoryInputId} data-autofocus value={categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={isSaving}
          className="-mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <div className="rounded-xl border border-slate-200 p-3 text-sm">
          {isLoading ? <p role="status" className="text-slate-500">Consultando padrão salvo…</p>
            : preferenceError ? <div role="alert" className="text-red-700">
              <p>{preferenceError}</p>
              <button type="button" disabled={isSaving} onClick={() => { setIsLoading(true); setPreferenceError(''); setLookupVersion((version) => version + 1); }} className="mt-1 underline">Tentar consultar novamente</button>
            </div>
              : <p className="text-slate-600">{preference ? <>Padrão atual para esta descrição: <strong>{preference.category}</strong>.</> : 'Nenhum padrão pessoal salvo para esta descrição.'}</p>}
          <label className="mt-3 flex items-start gap-2 text-slate-700">
            <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} disabled={isSaving} className="mt-0.5 h-4 w-4 shrink-0 accent-blue-900" />
            Salvar como padrão para esta descrição nas próximas importações
          </label>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            {remember ? `O padrão será ${selectedCategory?.name || 'a categoria selecionada'}. ${preference ? 'Ele substituirá o padrão salvo.' : ''} Os outros registros deste extrato não serão alterados.`
              : 'Somente este lançamento será alterado. O padrão salvo e os outros registros permanecerão como estão.'}
          </p>
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} disabled={isSaving} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancelar</button>
          <button type="submit" disabled={isSaving || !selectedCategory || (remember && (isLoading || Boolean(preferenceError)))} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isSaving ? 'Salvando…' : 'Salvar classificação'}</button>
        </div>
      </form>
    </Modal>
  );
}
