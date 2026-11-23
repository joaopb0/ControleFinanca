import { useRef, useState } from 'react';
import { CategoryList } from '../../components/import/CategoryList';
import { CreateCategoryModal } from '../../components/import/CreateCategoryModal';
import { DeleteCategoryModal } from '../../components/import/DeleteCategoryModal';
import { TransactionCategoryModal } from '../../components/import/TransactionCategoryModal';
import { DeleteTransactionModal } from '../../components/import/DeleteTransactionModal';
import { TransactionsTable } from '../../components/import/TransactionsTable';
import { UploadPanel } from '../../components/import/UploadPanel';
import { importStatements } from '../../services/statementImport';

export function ImportScreen({ transactions = [], onTransactionsChange, onGenerateDashboard, categories, colors,
  onSaveCategory, onDeleteCategory, onChooseCategory, onDeleteTransaction, isSaving = false }) {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [modal, setModal] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const fileLoaded = transactions.length > 0;
  const busy = isUploading || isSaving;
  const fallback = categories.find((category) => category.isFallback);

  const handleUpload = async () => {
    if (!files.length || busy) return;
    setIsUploading(true);
    setError('');
    try {
      onTransactionsChange(await importStatements(files, fallback));
    } catch (err) { setError(err.message || 'Erro ao processar o CSV.'); }
    finally { setIsUploading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-[calc(100vh-65px)] flex-col lg:flex-row">
        <aside className="w-full shrink-0 border-b border-slate-200 bg-white lg:w-80 lg:border-b-0 lg:border-r">
          <div className="flex flex-col gap-6 p-5 sm:p-6">
            <UploadPanel isDragOver={isDragOver} fileInputRef={fileInputRef}
              onDragOver={(event) => { event.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(event) => { event.preventDefault(); setIsDragOver(false); if (!busy) { setFiles(Array.from(event.dataTransfer?.files ?? [])); setError(''); } }}
              onFileChange={(event) => { if (!busy) { setFiles(Array.from(event.target.files ?? [])); setError(''); } }}
              onUpload={handleUpload} isUploading={busy} selectedFiles={files} />
            <div className="rounded-2xl bg-blue-900 p-4 text-xs leading-relaxed text-blue-50">
              <p className="mb-2 font-bold uppercase tracking-widest text-blue-200">Suas preferências</p>
              <p>O extrato é enviado para processamento. Ao gerar o relatório, você poderá salvar no histórico apenas os totais por mês e categoria.</p>
            </div>
            <CategoryList categories={categories} transactions={transactions} fileLoaded={fileLoaded} disabled={busy}
              onCreate={() => setModal({ type: 'edit', category: null })}
              onEdit={(category) => setModal({ type: 'edit', category })}
              onDelete={(category) => setModal({ type: 'delete', category })} />
          </div>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col">
          {error && <p role="alert" className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
          {!fileLoaded ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-4xl text-blue-600">▤</div>
              <h1 className="font-display text-xl font-bold text-slate-900">Sem dados ainda</h1>
              <p className="text-sm text-slate-400">Importe um ou mais arquivos CSV para ver suas transações aqui</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-5 sm:px-8">
                <h1 className="font-display text-xl font-bold text-slate-900">Revisar transações</h1>
                <p className="text-sm text-slate-500">{transactions.length} registros · verifique as categorias antes de prosseguir</p>
                <p className="text-xs text-slate-500">Clique na categoria para classificar um lançamento e decidir se deseja salvar um padrão para futuras importações.</p>
              </div>
              <div className="flex-1 overflow-auto p-5 sm:p-8">
                <TransactionsTable transactions={transactions} colors={colors} disabled={busy}
                  onEdit={(transaction) => setModal({ type: 'classify-transaction', transaction })}
                  onDelete={(transaction) => setModal({ type: 'delete-transaction', transaction })} />
              </div>
              <footer className="sticky bottom-0 z-10 flex shrink-0 justify-end border-t border-slate-200 bg-white px-5 py-4 sm:px-8">
                <button type="button" onClick={onGenerateDashboard} disabled={busy} className="rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-900/20 hover:bg-blue-800 disabled:opacity-50">Gerar relatório ↗</button>
              </footer>
            </>
          )}
        </main>
      </div>
      {modal?.type === 'edit' && <CreateCategoryModal category={modal.category} existingNames={categories.map((category) => category.name)}
        onConfirm={(name, color) => onSaveCategory(modal.category, { name, color })} onClose={() => setModal(null)} />}
      {modal?.type === 'delete' && <DeleteCategoryModal category={modal.category} fallbackName={fallback.name} onConfirm={onDeleteCategory} onClose={() => setModal(null)} />}
      {modal?.type === 'classify-transaction' && <TransactionCategoryModal key={modal.transaction.id} transaction={modal.transaction} categories={categories}
        onCreateCategory={(fields) => onSaveCategory(null, fields)} onConfirm={onChooseCategory} onClose={() => setModal(null)} />}
      {modal?.type === 'delete-transaction' && <DeleteTransactionModal transaction={modal.transaction} onConfirm={onDeleteTransaction} onClose={() => setModal(null)} />}
    </div>
  );
}
