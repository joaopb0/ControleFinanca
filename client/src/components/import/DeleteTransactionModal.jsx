import { useState } from 'react';
import { Modal } from '../common/Modal';
import { TransactionDetails } from './TransactionDetails';

export function DeleteTransactionModal({ transaction, onConfirm, onClose }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const remove = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setError('');
    try { await onConfirm(transaction.id); onClose(); }
    catch (err) { setError(err.message || 'Não foi possível excluir o lançamento.'); }
    finally { setIsDeleting(false); }
  };
  return (
    <Modal title="Excluir lançamento?" onClose={onClose} isBusy={isDeleting}>
      <TransactionDetails transaction={transaction} />
      <p className="mt-4 text-sm leading-relaxed text-slate-600">Somente este registro será removido do extrato aberto e dos relatórios. Suas categorias e padrões salvos serão preservados. Ao importar o arquivo novamente, o registro reaparecerá.</p>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button type="button" data-autofocus onClick={onClose} disabled={isDeleting} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancelar</button>
        <button type="button" onClick={remove} disabled={isDeleting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isDeleting ? 'Excluindo…' : 'Excluir lançamento'}</button>
      </div>
    </Modal>
  );
}
