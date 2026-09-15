export function UploadPanel({
  isDragOver,
  fileInputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
}) {
  return (
    <section>
      <h2 className="section-label">Carregar extrato</h2>
      <div
        className={`flex min-h-52 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-blue-400'}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={onFileChange}
        />
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600">
          ↑
        </div>
        <p className="text-sm font-semibold text-slate-900">
          Carregue o CSV do seu extrato bancário
        </p>
        <p className="text-xs text-slate-400">
          Arraste e solte ou clique para selecionar
        </p>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
          .CSV format
        </span>
      </div>
    </section>
  );
}