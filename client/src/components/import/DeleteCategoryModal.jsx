import { useState } from 'react';
import { Modal } from '../common/Modal';

export function DeleteCategoryModal({ category, fallbackName, onConfirm, onClose }) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const remove = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try { await onConfirm(category.id); onClose(); }
    catch (err) { setError(err.message || 'Não foi possível excluir a categoria.'); }
    finally { setIsSaving(false); }
  };
  return (
    <Modal title={`Excluir ${category.name}?`} onClose={onClose} isBusy={isSaving} className="max-w-sm">
      <p className="text-sm text-slate-600">A categoria será arquivada, preservando os valores já salvos no histórico. Suas regras e preferências serão removidas. Os lançamentos do extrato aberto passarão para {fallbackName}.</p>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={isSaving} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Cancelar</button>
        <button type="button" onClick={remove} disabled={isSaving} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isSaving ? 'Excluindo…' : 'Excluir categoria'}</button>
      </div>
    </Modal>
  );
}
