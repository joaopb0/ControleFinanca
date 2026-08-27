import { UserModel } from '../models/user.model.js';

/**
 * Controller de Usuários
 * Trata as requisições HTTP, valida entradas e invoca o modelo de dados.
 */
export const userController = {
  getAll: async (req, res, next) => {
    try {
      const users = await UserModel.findAll();
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
      const user = await UserModel.findById(id);

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

  create: async (req, res, next) => {
    try {
      const { name, email, role } = req.body;

      if (!name || !email) {
        return res.status(400).json({
          success: false,
          message: 'Nome e E-mail são obrigatórios.',
        });
      }

      const newUser = await UserModel.create({ name, email, role });
      res.status(201).json({
        success: true,
        message: 'Usuário cadastrado com sucesso!',
        data: newUser,
      });
    } catch (error) {
      next(error);
    }
  },

  delete: async (req, res, next) => {
    try {
      const { id } = req.params;
      const deleted = await UserModel.delete(id);

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
