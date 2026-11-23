import { useState } from 'react';
import { Modal } from '../common/Modal';

export function DeletePreferenceModal({ preference, onConfirm, onClose }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const remove = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setError('');
    try { await onConfirm(preference.id); onClose(); }
    catch (err) { setError(err.message || 'Não foi possível excluir o padrão.'); }
    finally { setIsDeleting(false); }
  };
  return (
    <Modal title="Excluir padrão pessoal?" onClose={onClose} isBusy={isDeleting}>
      <p className="max-h-40 overflow-y-auto break-words rounded-xl bg-slate-50 p-4 text-sm text-slate-900">{preference.description}</p>
      <p className="mt-4 text-sm text-slate-600">Essa descrição voltará a seguir as regras por palavras-chave ou “Outros”. Exceções manuais do extrato aberto e valores já salvos no histórico serão preservados.</p>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button type="button" data-autofocus onClick={onClose} disabled={isDeleting} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancelar</button>
        <button type="button" onClick={remove} disabled={isDeleting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isDeleting ? 'Excluindo…' : 'Excluir padrão'}</button>
      </div>
    </Modal>
  );
}
