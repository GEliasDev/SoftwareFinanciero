import { PersonalDebtService } from './personalDebt.service.js';

export const PersonalDebtController = {
    getAll:  async (req, res, next) => { try { res.json(await PersonalDebtService.getAll(req.user.id)); } catch (e) { next(e); } },
    getById: async (req, res, next) => { try { res.json(await PersonalDebtService.getById(req.params.id, req.user.id)); } catch (e) { next(e); } },
    create:  async (req, res, next) => { try { res.status(201).json(await PersonalDebtService.create({ ...req.body, userId: req.user.id })); } catch (e) { next(e); } },
    update:  async (req, res, next) => { try { res.json(await PersonalDebtService.update(req.params.id, req.body, req.user.id)); } catch (e) { next(e); } },
    delete:  async (req, res, next) => { try { await PersonalDebtService.delete(req.params.id, req.user.id); res.status(204).send(); } catch (e) { next(e); } },
    registerAbono: async (req, res, next) => {
        try {
            const debt = await PersonalDebtService.registerAbono(req.params.id, req.body, req.user.id);
            res.json({ message: 'Abono registrado', saldoPendiente: debt.saldoPendiente, cuotasPagadas: debt.cuotasPagadas, status: debt.status });
        } catch (e) { next(e); }
    },
};
