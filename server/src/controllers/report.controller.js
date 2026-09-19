import { reportService } from '../services/report.service.js';
import { exportService } from '../services/export.service.js';

const MAX_TRANSACTIONS = 10000;

function validateTransactionsInput(body) {
  if (!body || typeof body !== 'object') {
    return 'Corpo da requisição inválido.';
  }
  if (!Array.isArray(body.transactions)) {
    return 'O campo "transactions" é obrigatório e deve ser um array.';
  }
  if (body.transactions.length > MAX_TRANSACTIONS) {
    return `O limite máximo por relatório é de ${MAX_TRANSACTIONS} transações.`;
  }
  return null;
}

export const reportController = {
  /**
   * POST /api/reports/summary
   * Gera o resumo financeiro consolidado (totais e subtotais por categoria)
   */
  getSummary: async (req, res, next) => {
    try {
      const errorMsg = validateTransactionsInput(req.body);
      if (errorMsg) {
        return res.status(400).json({
          success: false,
          error: { message: errorMsg },
        });
      }

      const { transactions, startDate, endDate, customColors } = req.body;
      const summary = reportService.generateSummary(transactions, {
        startDate,
        endDate,
        customColors,
      });

      return res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({
          success: false,
          error: { message: error.message },
        });
      }
      next(error);
    }
  },

  /**
   * POST /api/reports/export/csv
   * Exporta os dados consolidados e lançamentos no formato CSV (UTF-8 BOM e ';')
   */
  exportCSV: async (req, res, next) => {
    try {
      const errorMsg = validateTransactionsInput(req.body);
      if (errorMsg) {
        return res.status(400).json({
          success: false,
          error: { message: errorMsg },
        });
      }

      const { transactions, startDate, endDate, customColors } = req.body;
      const summary = reportService.generateSummary(transactions, {
        startDate,
        endDate,
        customColors,
      });

      const csvData = exportService.generateCSV(summary, transactions);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="relatorio_financeiro.csv"');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

      return res.status(200).send(csvData);
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({
          success: false,
          error: { message: error.message },
        });
      }
      next(error);
    }
  },

  /**
   * POST /api/reports/export/pdf
   * Gera e envia o documento binário PDF
   */
  exportPDF: async (req, res, next) => {
    try {
      const errorMsg = validateTransactionsInput(req.body);
      if (errorMsg) {
        return res.status(400).json({
          success: false,
          error: { message: errorMsg },
        });
      }

      const { transactions, startDate, endDate, customColors } = req.body;
      const summary = reportService.generateSummary(transactions, {
        startDate,
        endDate,
        customColors,
      });

      const pdfBuffer = await exportService.generatePDF(summary, transactions);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="relatorio_financeiro.pdf"');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

      return res.status(200).end(pdfBuffer);
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({
          success: false,
          error: { message: error.message },
        });
      }
      next(error);
    }
  },
};

export default reportController;
