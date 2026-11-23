import { historyService } from '../services/history.service.js';
import { exportService } from '../services/export.service.js';

const handle = (operation) => async (req, res, next) => {
  try { res.json({ success: true, data: await operation(req) }); }
  catch (error) { next(error); }
};
export const historyController = {
  list: handle((req) => historyService.list(req.user.id, req.query)),
  report: handle((req) => historyService.report(req.user.id, req.query)),
  preview: handle((req) => historyService.preview(req.user.id, req.body)),
  save: handle((req) => historyService.save(req.user.id, req.body)),
  removeMonth: handle((req) => historyService.remove(req.user.id, req.params.month)),
  removeAll: handle((req) => historyService.remove(req.user.id)),
  async exportCSV(req, res, next) {
    try {
      const csv = await historyService.exportCSV(req.user.id, req.query);
      res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="historico.csv"' }).send(csv);
    } catch (error) { next(error); }
  },
  async exportReportCSV(req, res, next) {
    try {
      const summary = await historyService.report(req.user.id, req.query);
      res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="relatorio_historico.csv"' }).send(exportService.generateCSV(summary, []));
    } catch (error) { next(error); }
  },
  async exportReportPDF(req, res, next) {
    try {
      const summary = await historyService.report(req.user.id, req.query);
      const pdf = await exportService.generatePDF(summary, []);
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="relatorio_historico.pdf"' }).send(pdf);
    } catch (error) { next(error); }
  },
};
