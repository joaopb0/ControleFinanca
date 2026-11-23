import { useState } from 'react';
import { Modal } from '../common/Modal';
import { formatMonth } from '../../services/historySummary';

export function DeleteHistoryModal({ month, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const remove = async () => {
    if (busy) return;
    setBusy(true);
    try { await onConfirm(month); onClose(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <Modal title={month ? `Excluir ${formatMonth(month)}?` : 'Excluir todo o histórico?'} onClose={onClose} isBusy={busy} className="max-w-sm">
    <p className="text-sm text-slate-600">{month ? 'Os totais deste mês serão removidos de todas as contribuições da sua conta.' : 'Todos os resumos mensais da sua conta serão removidos.'} As categorias e o extrato aberto serão preservados.</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    <div className="mt-5 flex justify-end gap-2">
      <button type="button" data-autofocus onClick={onClose} disabled={busy} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Cancelar</button>
      <button type="button" onClick={remove} disabled={busy} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Excluindo…' : 'Confirmar exclusão'}</button>
    </div>
  </Modal>;
}
