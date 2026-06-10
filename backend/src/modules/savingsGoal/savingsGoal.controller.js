import { SavingsGoalService } from './savingsGoal.service.js';

export const SavingsGoalController = {
    getAll:  async (req, res, next) => { try { res.json(await SavingsGoalService.getAll(req.user.id)); } catch (e) { next(e); } },
    getById: async (req, res, next) => { try { res.json(await SavingsGoalService.getById(req.params.id, req.user.id)); } catch (e) { next(e); } },
    create:  async (req, res, next) => { try { res.status(201).json(await SavingsGoalService.create({ ...req.body, userId: req.user.id })); } catch (e) { next(e); } },
    update:  async (req, res, next) => { try { res.json(await SavingsGoalService.update(req.params.id, req.body, req.user.id)); } catch (e) { next(e); } },
    delete:  async (req, res, next) => { try { await SavingsGoalService.delete(req.params.id, req.user.id); res.status(204).send(); } catch (e) { next(e); } },
    registerAporte: async (req, res, next) => {
        try {
            const goal = await SavingsGoalService.registerAporte(req.params.id, req.body, req.user.id);
            res.json({ message: 'Aporte registrado', montoAcumulado: goal.montoAcumulado, status: goal.status });
        } catch (e) { next(e); }
    },
};
