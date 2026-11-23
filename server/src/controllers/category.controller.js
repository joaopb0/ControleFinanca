import { categoryService } from '../services/category.service.js';

const handle = (operation, status = 200) => async (req, res, next) => {
  try { res.status(status).json({ success: true, data: await operation(req) }); }
  catch (error) { next(error); }
};

export const categoryController = {
  listPreferences: handle((req) => categoryService.listPreferences(req.user.id)),
  updatePreference: handle((req) => categoryService.updatePreference(req.user.id, req.params.id, req.body)),
  removePreference: handle((req) => categoryService.removePreference(req.user.id, req.params.id)),
  list: handle((req) => categoryService.list(req.user.id)),
  create: handle((req) => categoryService.create(req.user.id, req.body), 201),
  update: handle((req) => categoryService.update(req.user.id, req.params.id, req.body)),
  remove: handle((req) => categoryService.remove(req.user.id, req.params.id)),
  savePreference: handle((req) => categoryService.savePreference(req.user.id, req.body)),
  getPreference: handle((req) => categoryService.getPreference(req.user.id, req.body)),
};
