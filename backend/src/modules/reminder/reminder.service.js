import { Reminder } from './reminder.model.js';
import { reminderCreateSchema, reminderUpdateSchema } from './reminder.schema.js';
import {
    calcularProximaFechaPago,
    calcularFechaRecordatorio,
    debeEnviarse,
} from './utils/reminderCalculation.js';
import { BankCredit } from '../bankCredit/bankCredit.model.js';
import { CreditCard } from '../creditCard/creditCard.model.js';
import { Subscription } from '../suscription/subscription.model.js';
import { AppError } from '../../middlewares/appError.js';
import { Op } from 'sequelize';

// Mapa para obtener el día de pago según el tipo de deuda
const getDiaPago = {
    bank_credit: (debt) => debt.diaPago,
    credit_card: (debt) => debt.fechaPago,
    subscription: (debt) => debt.diaCobro,
};

// Mapa para obtener el modelo según el tipo de deuda
const debtModels = {
    bank_credit: BankCredit,
    credit_card: CreditCard,
    subscription: Subscription,
};

export const ReminderService = {
    createReminder: async (data) => {
        const parsed = reminderCreateSchema.parse(data);

        // Verificar que la deuda existe y pertenece al usuario
        const Model = debtModels[parsed.debtType];
        const debt = await Model.findOne({
            where: { id: parsed.debtId, userId: data.userId },
        });
        if (!debt) throw new AppError('La deuda referenciada no existe o no te pertenece', 404);

        // Verificar que no existe ya un recordatorio para esta deuda
        const existing = await Reminder.findOne({
            where: { debtId: parsed.debtId, debtType: parsed.debtType, userId: data.userId },
        });
        if (existing) throw new AppError('Ya existe un recordatorio para esta deuda', 400);

        const diaPago = getDiaPago[parsed.debtType](debt);
        const proximaFechaPago = calcularProximaFechaPago(diaPago);
        const fechaRecordatorio = calcularFechaRecordatorio(
            proximaFechaPago,
            parsed.diasAnticipacion
        );

        return Reminder.create({
            ...parsed,
            userId: data.userId,
            proximaFechaPago,
            fechaRecordatorio,
        });
    },

    getAllReminders: async (userId) => {
        return Reminder.findAll({ where: { userId } });
    },

    getReminderById: async (id, userId, isAdmin) => {
        const reminder = await Reminder.findByPk(id);
        if (!reminder) throw new AppError('Recordatorio no encontrado', 404);
        if (!isAdmin && reminder.userId !== userId) {
            throw new AppError('Acceso no autorizado al recordatorio', 403);
        }
        return reminder;
    },

    updateReminder: async (id, data, userId, isAdmin) => {
        const reminder = await Reminder.findByPk(id);
        if (!reminder) throw new AppError('Recordatorio no encontrado', 404);
        if (!isAdmin && reminder.userId !== userId) {
            throw new AppError('Acceso no autorizado al recordatorio', 403);
        }
        const parsed = reminderUpdateSchema.parse(data);

        // Si cambian los días de anticipación, recalcular fechas
        if (parsed.diasAnticipacion) {
            const fechaRecordatorio = calcularFechaRecordatorio(
                reminder.proximaFechaPago,
                parsed.diasAnticipacion
            );
            parsed.fechaRecordatorio = fechaRecordatorio;
        }

        return reminder.update(parsed);
    },

    deleteReminder: async (id, userId, isAdmin) => {
        const reminder = await Reminder.findByPk(id);
        if (!reminder) throw new AppError('Recordatorio no encontrado', 404);
        if (!isAdmin && reminder.userId !== userId) {
            throw new AppError('Acceso no autorizado al recordatorio', 403);
        }
        return reminder.destroy();
    },

    // Guardar o actualizar la suscripción Web Push del usuario
    savePushSubscription: async (userId, pushSubscription) => {
        const reminders = await Reminder.findAll({ where: { userId } });
        if (!reminders.length) throw new AppError('No tienes recordatorios activos', 404);

        // Guardar la suscripción en todos los recordatorios del usuario
        await Reminder.update(
            { pushSubscription: JSON.stringify(pushSubscription) },
            { where: { userId } }
        );

        return { message: 'Suscripción push guardada correctamente' };
    },

    // Usado por el cron job — busca recordatorios que deben enviarse hoy
    getPendingReminders: async () => {
        const hoy = new Date().toISOString().split('T')[0];
        return Reminder.findAll({
            where: {
                fechaRecordatorio: hoy,
                enviado: false,
                status: 'activo',
            },
        });
    },

    // Marcar recordatorio como enviado y recalcular para el próximo mes
    markAsSentAndReschedule: async (id) => {
        const reminder = await Reminder.findByPk(id);
        if (!reminder) throw new AppError('Recordatorio no encontrado', 404);

        // Calcular próximo ciclo
        const Model = debtModels[reminder.debtType];
        const debt = await Model.findByPk(reminder.debtId);
        if (!debt) throw new AppError('La deuda referenciada no existe', 404);

        const diaPago = getDiaPago[reminder.debtType](debt);

        // Avanzar un mes desde la próxima fecha de pago actual
        const proximaFecha = new Date(reminder.proximaFechaPago);
        proximaFecha.setMonth(proximaFecha.getMonth() + 1);
        proximaFecha.setDate(diaPago);
        const nuevaProximaFechaPago = proximaFecha.toISOString().split('T')[0];
        const nuevaFechaRecordatorio = calcularFechaRecordatorio(
            nuevaProximaFechaPago,
            reminder.diasAnticipacion
        );

        return reminder.update({
            enviado: false,
            proximaFechaPago: nuevaProximaFechaPago,
            fechaRecordatorio: nuevaFechaRecordatorio,
        });
    },
};