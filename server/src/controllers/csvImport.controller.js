import { csvImportService } from '../services/csvImport.service.js';
import { loadClassificationContext } from '../services/classificationContext.service.js';
import { rm } from 'node:fs/promises';

export const csvImportController = {
  uploadCsv: async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { message: 'Nenhum arquivo CSV foi enviado.' },
        });
      }

      const context = await loadClassificationContext(req.user.id);
      const dados = await csvImportService.parseCsvFile(req.file.path, context.rules, context);

      return res.status(200).json({
        success: true,
        mensagem: 'CSV lido com sucesso!',
        dados,
      });
    } catch (error) {
      next(error);
    } finally {
      if (req.file?.path) {
        try { await rm(req.file.path, { force: true }); }
        catch (error) { console.error(`Falha ao remover upload temporário: ${error.code || 'IO_ERROR'}`); }
      }
    }
  },
};

export default csvImportController;
