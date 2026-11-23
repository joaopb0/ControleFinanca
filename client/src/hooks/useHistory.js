import { useEffect, useRef, useState } from 'react';
import { previewHistory, saveHistory } from '../services/api';
import { buildHistoryEntries } from '../services/historySummary';

export function useHistory({ transactions, batchId, onGenerated }) {
  const [confirmation, setConfirmation] = useState(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(false);
  const preparing = useRef(false);
  const saving = useRef(false);
  const version = useRef(0);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; version.current += 1; }; }, []);
  useEffect(() => { version.current += 1; }, [transactions, batchId]);

  const prepare = async () => {
    if (preparing.current) return;
    preparing.current = true;
    setIsPreparing(true);
    setError('');
    const sourceVersion = version.current;
    try {
      const payload = { batchId, entries: buildHistoryEntries(transactions) };
      const response = await previewHistory(payload);
      if (mounted.current && sourceVersion === version.current) setConfirmation({ payload, preview: response.data, transactions, requestId: crypto.randomUUID() });
    } catch (err) { if (mounted.current) setError(err.message || 'Não foi possível preparar o histórico.'); }
    finally { preparing.current = false; if (mounted.current) setIsPreparing(false); }
  };

  const confirm = async (acknowledged) => {
    if (saving.current) return;
    if (!confirmation || confirmation.transactions !== transactions || confirmation.payload.batchId !== batchId) throw new Error('O extrato mudou. Gere o relatório novamente para revisar os valores.');
    saving.current = true;
    try {
      if (confirmation.preview.mode !== 'unchanged') {
        await saveHistory({ ...confirmation.payload, requestId: confirmation.requestId,
          expectedRevision: confirmation.preview.revision, expectedHistoryVersion: confirmation.preview.historyVersion,
          confirmOverlap: confirmation.preview.requiresOverlapConfirmation ? acknowledged : false });
      }
      if (mounted.current) { setConfirmation(null); onGenerated(); }
    } catch (err) {
      if (err.status === 409 && mounted.current) {
        const response = await previewHistory(confirmation.payload);
        if (mounted.current) setConfirmation({ ...confirmation, preview: { ...response.data, notice: 'O histórico mudou. Revise os valores atualizados antes de confirmar.' }, requestId: crypto.randomUUID() });
      }
      throw err;
    } finally { saving.current = false; }
  };

  const current = confirmation?.transactions === transactions && confirmation.payload.batchId === batchId ? confirmation : null;
  return { confirmation: current, isPreparing, error, prepare, confirm, close: () => { if (!saving.current) setConfirmation(null); } };
}
