import { UserModel } from '../models/user.model.js';

/**
 * Controller de Usuários
 * Trata as requisições HTTP, valida entradas e invoca o modelo de dados.
 */
export const userController = {
  getAll: async (req, res, next) => {
    try {
      const user = await UserModel.findById(req.user.id);
      const users = user ? [user] : [];
      res.status(200).json({
        success: true,
        count: users.length,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  },

  getById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = id === req.user.id ? await UserModel.findById(req.user.id) : null;

      if (!user) {
        return res.status(404).json({
          success: false,
          message: `Usuário com ID ${id} não foi encontrado.`,
        });
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },

  create: (req, res) => {
    res.set('Allow', 'GET');
    return res.status(405).json({
      success: false,
      error: { message: 'Cadastre contas pelo endpoint /api/auth/register.' },
    });
  },

  delete: async (req, res, next) => {
    try {
      const { id } = req.params;
      const deleted = id === req.user.id ? await UserModel.delete(req.user.id) : false;

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: `Usuário com ID ${id} não encontrado para exclusão.`,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Usuário excluído com sucesso.',
      });
    } catch (error) {
      next(error);
    }
  },
};
