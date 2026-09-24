import { csvImportService } from '../services/csvImport.service.js';

export const csvImportController = {
  uploadCsv: async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { message: 'Nenhum arquivo CSV foi enviado.' },
        });
      }

      const dados = await csvImportService.parseCsvFile(req.file.path);

      try {
        if (req.file?.path) {
          await import('node:fs/promises').then(({ rm }) => rm(req.file.path, { force: true }));
        }
      } catch {
        // ignora falha ao remover arquivo temporário
      }

      return res.status(200).json({
        success: true,
        mensagem: 'CSV lido com sucesso!',
        dados,
      });
    } catch (error) {
      next(error);
    }
  },
};

export default csvImportController;
