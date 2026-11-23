import { useState } from 'react';
import { Modal } from '../common/Modal';

export function PreferenceModal({ preference, categories, onSave, onClose, isSaving }) {
  const [categoryId, setCategoryId] = useState(preference.categoryId);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    if (isSaving) return;
    setError('');
    try { await onSave({ ...preference, categoryId }); }
    catch (err) { setError(err.message || 'Não foi possível salvar o padrão pessoal.'); }
  };
  return (
    <Modal title="Editar padrão pessoal" onClose={onClose} isBusy={isSaving}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-500">A categoria será usada nas próximas importações quando a descrição completa corresponder, ignorando acentos e maiúsculas/minúsculas. Exceções manuais do extrato aberto serão preservadas.</p>
        <p className="max-h-40 overflow-y-auto break-words rounded-xl bg-slate-50 p-4 text-sm text-slate-900">{preference.description}</p>
        <label htmlFor="preference-category" className="block text-sm font-medium text-slate-700">Categoria</label>
        <select id="preference-category" data-autofocus value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required disabled={isSaving}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} disabled={isSaving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancelar</button>
          <button type="submit" disabled={isSaving} className="rounded-xl bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isSaving ? 'Salvando…' : 'Salvar padrão'}</button>
        </div>
      </form>
    </Modal>
  );
}
