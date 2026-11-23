export function UploadPanel({
  isDragOver,
  fileInputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
  onUpload,
  isUploading,
  selectedFiles = [],
}) {
  return (
    <section>
      <h2 className="section-label">Carregar extrato</h2>
      <div
        className={`flex min-h-52 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-blue-400'}`}
        onClick={() => { if (!isUploading) fileInputRef.current?.click(); }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          multiple
          disabled={isUploading}
          aria-label="Selecionar extratos CSV"
          className="hidden"
          onChange={onFileChange}
        />
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600">
          ↑
        </div>
        <p className="text-sm font-semibold text-slate-900">
          Carregue seus extratos bancários
        </p>
        <p className="text-xs text-slate-400">
          Arraste os arquivos CSV ou clique para selecionar vários
        </p>
        {selectedFiles.length > 0 && (
          <div className="w-full min-w-0 text-xs text-emerald-700" aria-live="polite">
            <p className="font-medium">{selectedFiles.length} arquivo(s) selecionado(s)</p>
            <ul className="mt-2 max-h-32 overflow-y-auto text-left">
              {selectedFiles.map((file, index) => <li key={`${file.name}-${index}`} className="break-all py-1">{file.name}</li>)}
            </ul>
          </div>
        )}
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
          CSV · até 5 MB por arquivo
        </span>
      </div>

      <button
        type="button"
        onClick={onUpload}
        disabled={!selectedFiles.length || isUploading}
        className="mt-4 w-full rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isUploading ? 'Processando...' : selectedFiles.length > 1 ? 'Processar extratos' : 'Processar extrato'}
      </button>
    </section>
  );
}
