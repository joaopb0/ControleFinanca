import { useState } from 'react';
import { Modal } from '../common/Modal';
import { formatCents, formatMonth } from '../../services/historySummary';

export function SaveMonthlyHistoryModal({ preview, onConfirm, onClose }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const unchanged = preview.mode === 'unchanged';
  const submit = async (event) => {
    event.preventDefault();
    if (isSaving || (preview.requiresOverlapConfirmation && !acknowledged)) return;
    setIsSaving(true);
    setError('');
    try { await onConfirm(acknowledged); }
    catch (err) { setError(err.message || 'Não foi possível salvar. Tente novamente.'); }
    finally { setIsSaving(false); }
  };
  return (
    <Modal title={unchanged ? 'Resumo já salvo' : 'Salvar histórico e gerar relatório'} onClose={onClose} isBusy={isSaving} className="max-w-4xl">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-slate-600">{unchanged ? 'Este extrato já está registrado. Abrir o relatório novamente não somará seus valores outra vez.'
          : preview.mode === 'update' ? 'Você alterou um extrato já registrado. Somente a contribuição dele será substituída; os outros extratos serão preservados.'
            : 'Os valores deste extrato serão somados ao seu histórico, separados por mês e categoria.'}</p>
        <p className="text-xs text-slate-500">Serão armazenados apenas os totais de receitas e despesas por categoria e mês, sem descrições ou movimentações individuais no histórico.</p>
        {preview.notice && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">{preview.notice}</p>}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[680px] text-left text-xs" aria-label="Prévia do histórico mensal">
            <thead className="bg-slate-50 text-slate-500"><tr>
              <th scope="col" className="p-3">Mês</th>
              <th scope="col" className="p-3">Histórico atual</th>
              <th scope="col" className="p-3">Este extrato</th>
              <th scope="col" className="p-3">Resultado</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">{preview.months.map((item) => (
              <tr key={item.month}>
                <th scope="row" className="p-3 font-semibold capitalize text-slate-800">{formatMonth(item.month)}</th>
                {['current', 'incoming', 'projected'].map((key) => <td key={key} className="space-y-1 p-3 font-mono">
                  <p className="text-emerald-700">Receitas: {formatCents(item[key].incomeCents)}</p>
                  <p className="text-red-700">Despesas: {formatCents(item[key].expenseCents)}</p>
                </td>)}
              </tr>
            ))}</tbody>
          </table>
        </div>
        {preview.requiresOverlapConfirmation && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="mb-3">Já existem outros extratos nos meses indicados. Arquivos diferentes podem conter movimentações repetidas.</p>
          <label className="flex items-start gap-2"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} disabled={isSaving} className="mt-0.5 h-4 w-4 shrink-0 accent-blue-900" />
            Confirmei que os valores adicionais deste extrato ainda não foram contabilizados nesses meses.
          </label>
        </div>}
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} disabled={isSaving} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancelar</button>
          <button type="submit" disabled={isSaving || (preview.requiresOverlapConfirmation && !acknowledged)} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isSaving ? 'Salvando…' : unchanged ? 'Abrir relatório' : 'Salvar e gerar relatório'}</button>
        </div>
      </form>
    </Modal>
  );
}
