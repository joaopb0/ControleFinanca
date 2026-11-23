import { useState } from 'react';
import { Modal } from '../common/Modal';

export function CreateCategoryModal({ category = null, existingNames, onConfirm, onClose }) {
  const [name, setName] = useState(category?.name || '');
  const [color, setColor] = useState(category?.color || '#2563eb');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const duplicate = existingNames.some((item) => normalize(item) === normalize(name) && normalize(item) !== normalize(category?.name || ''));
  const valid = name.trim().length >= 2 && name.trim().length <= 100 && !duplicate;

  const submit = async (event) => {
    event.preventDefault();
    if (!valid || isSaving) return;
    setIsSaving(true);
    setError('');
    try { await onConfirm(name.trim(), color); onClose(); }
    catch (err) { setError(err.message || 'Não foi possível salvar a categoria.'); }
    finally { setIsSaving(false); }
  };

  return (
    <Modal title={category ? 'Editar categoria' : 'Nova categoria'} onClose={onClose} isBusy={isSaving} className="max-w-sm">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-sm text-slate-500">As alterações são salvas somente na sua conta.</p>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <label className="text-sm font-medium text-slate-700">Nome
          <input data-autofocus value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required disabled={isSaving}
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Ex.: Educação" />
        </label>
        {duplicate && <p role="alert" className="text-xs text-red-700">Já existe uma categoria com esse nome.</p>}
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">Cor
          <input type="color" value={color} onChange={(event) => setColor(event.target.value)} disabled={isSaving} className="h-9 w-12 cursor-pointer rounded border-0" />
        </label>
        {category?.isFallback && <p className="text-xs text-slate-500">Esta categoria recebe lançamentos sem correspondência e não pode ser excluída.</p>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} disabled={isSaving} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100">Cancelar</button>
          <button type="submit" disabled={!valid || isSaving} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{isSaving ? 'Salvando…' : 'Salvar categoria'}</button>
        </div>
      </form>
    </Modal>
  );
}
