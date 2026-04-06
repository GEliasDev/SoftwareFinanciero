import { ReminderService } from './reminder.service.js';

export const ReminderController = {
    createReminder: async (req, res, next) => {
        try {
            const reminder = await ReminderService.createReminder({
                ...req.body,
                userId: req.user.id,
            });
            res.status(201).json(reminder);
        } catch (error) {
            next(error);
        }
    },

    getAllReminders: async (req, res, next) => {
        try {
            const reminders = await ReminderService.getAllReminders(req.user.id);
            res.json(reminders);
        } catch (error) {
            next(error);
        }
    },

    getReminderById: async (req, res, next) => {
        try {
            const reminder = await ReminderService.getReminderById(req.params.id);
            res.json(reminder);
        } catch (error) {
            next(error);
        }
    },

    updateReminder: async (req, res, next) => {
        try {
            const reminder = await ReminderService.updateReminder(req.params.id, req.body);
            res.json(reminder);
        } catch (error) {
            next(error);
        }
    },

    deleteReminder: async (req, res, next) => {
        try {
            await ReminderService.deleteReminder(req.params.id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    },

    savePushSubscription: async (req, res, next) => {
        try {
            const result = await ReminderService.savePushSubscription(
                req.user.id,
                req.body.pushSubscription
            );
            res.json(result);
        } catch (error) {
            next(error);
        }
    },
};