import { useRef, useState } from 'react';
import { CATEGORIES, CATEGORY_COLORS } from '../../data/mockData';
import { CategoryList } from '../../components/import/CategoryList';
import { CreateCategoryModal } from '../../components/import/CreateCategoryModal';
import { ImportHeader } from '../../components/import/ImportHeader';
import { TransactionsTable } from '../../components/import/TransactionsTable';
import { UploadPanel } from '../../components/import/UploadPanel';

export function ImportScreen() {
  const [transactions, setTransactions] = useState([]);
  const [arquivo, setArquivo] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [customCategories, setCustomCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  const categories = [
    ...CATEGORIES,
    ...customCategories.map((category) => category.name),
  ];
  const colors = {
    ...CATEGORY_COLORS,
    ...Object.fromEntries(
      customCategories.map((category) => [category.name, category.color]),
    ),
  };
  const fileLoaded = transactions.length > 0;

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setArquivo(selectedFile);
  };

  const handleUpload = async () => {
    if (!arquivo) {
      alert('Selecione um arquivo CSV primeiro!');
      return;
    }

    const formData = new FormData();
    formData.append('file', arquivo);

    setIsUploading(true);

    try {
      const response = await fetch('http://localhost:3000/api/upload-csv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.erro || data?.error || 'Erro ao processar o CSV');
      }

      const rows = Array.isArray(data?.dados) ? data.dados : [];
      const normalizedTransactions = rows.map((row, index) => ({
        id: row.id ?? `csv-${Date.now()}-${index}`,
        date: row.date ?? row.Data ?? row.data ?? '',
        description: row.description ?? row.Descricao ?? row.descricao ?? row['Descrição'] ?? '',
        value: Number(row.value ?? row.Valor ?? row.valor ?? 0),
        category: row.category ?? 'Outros',
      }));

      setTransactions(normalizedTransactions);
      setOpenId(null);
    } catch (error) {
      console.error('Erro ao enviar o arquivo:', error);
      alert(error.message || 'Erro ao processar o CSV');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragOver(false);

    const droppedFile = event.dataTransfer?.files?.[0] ?? null;
    if (!droppedFile) return;

    setArquivo(droppedFile);
  };

  const updateCategory = (id, category) => {
    setTransactions((current) =>
      current.map((item) => (item.id === id ? { ...item, category } : item)),
    );
    setOpenId(null);
  };

  const createCategory = (name, color) => {
    setCustomCategories((current) => [...current, { name, color }]);
    setModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <ImportHeader />

      <div className="flex min-h-[calc(100vh-65px)] flex-col lg:flex-row">
        <aside className="w-full shrink-0 border-b border-slate-200 bg-white lg:w-80 lg:border-b-0 lg:border-r">
          <div className="flex flex-col gap-6 p-5 sm:p-6">
            <UploadPanel
              isDragOver={isDragOver}
              fileInputRef={fileInputRef}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onFileChange={handleFileChange}
              onUpload={handleUpload}
              isUploading={isUploading}
              selectedFileName={arquivo?.name ?? ''}
            />

            <div className="rounded-2xl bg-blue-900 p-4 text-white">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-200">
                Você sabia?
              </p>
              <p className="text-xs leading-relaxed text-blue-50">
                Seu extrato é processado <strong>apenas no navegador</strong>.
                Zero upload de dados financeiros.
              </p>
              <p className="mt-3 text-xs font-semibold text-emerald-300">
                ● 100% privado
              </p>
            </div>

            <CategoryList
              categories={categories}
              colors={colors}
              transactions={transactions}
              fileLoaded={fileLoaded}
            />
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          {!fileLoaded ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-4xl text-blue-600">
                ▤
              </div>
              <h1 className="font-display text-xl font-bold text-slate-900">
                Sem dados ainda
              </h1>
              <p className="text-sm text-slate-400">
                Faça upload de um CSV para ver suas transações aqui
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <div>
                  <h1 className="font-display text-xl font-bold text-slate-900">
                    Revisar transações
                  </h1>
                  <p className="text-sm text-slate-500">
                    {transactions.length} registros · verifique as categorias antes de prosseguir
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-5 pb-28 sm:p-8">
                <TransactionsTable
                  transactions={transactions}
                  categories={categories}
                  colors={colors}
                  openId={openId}
                  onToggle={(id) => setOpenId(openId === id ? null : id)}
                  onUpdate={updateCategory}
                  onCreateCategory={() => {
                    setOpenId(null);
                    setModalOpen(true);
                  }}
                />
              </div>

              <footer className="fixed bottom-0 right-0 z-10 flex w-full items-center justify-end gap-4 border-t border-slate-200 bg-white px-5 py-4 sm:px-8 lg:left-80 lg:w-auto">
                <button className="rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-900/20 hover:bg-blue-800">
                  Gerar dashboard ↗
                </button>
              </footer>
            </>
          )}
        </main>
      </div>

      {modalOpen && (
        <CreateCategoryModal
          existingNames={categories}
          onConfirm={createCategory}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
