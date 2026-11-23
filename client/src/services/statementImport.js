import { uploadCsv } from './api.js';

export async function importStatements(files, fallback, upload = uploadCsv) {
  if (!files.length) throw new Error('Selecione pelo menos um extrato CSV.');
  for (const file of files) {
    if (!/\.csv$/i.test(file.name)) throw new Error(`${file.name}: selecione apenas arquivos CSV.`);
    if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name}: o limite é de 5 MB por arquivo.`);
  }

  const batchId = crypto.randomUUID();
  const transactions = [];
  // O endpoint mantém seus limites por arquivo; a revisão só muda após todo o lote concluir.
  for (const [fileIndex, file] of files.entries()) {
    try {
      const response = await upload(file);
      if (!Array.isArray(response?.dados)) throw new Error('A API retornou um extrato inválido.');
      transactions.push(...response.dados.map((row, index) => ({
        ...row,
        id: `csv-${batchId}-${fileIndex}-${index}`,
        date: row.date ?? row.Data ?? row.data ?? '',
        description: row.description ?? row.Descricao ?? row.descricao ?? row['Descrição'] ?? '',
        value: Number(row.value ?? row.Valor ?? row.valor ?? 0),
        category: row.category ?? fallback.name,
        categoryId: row.categoryId ?? fallback.id,
      })));
    } catch (error) {
      throw new Error(`${file.name}: ${error.message || 'Erro ao processar o CSV.'}`, { cause: error });
    }
  }
  return transactions;
}
