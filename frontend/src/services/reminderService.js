import api from './api';

export const ReminderService = {
  getAll: async () => {
    const response = await api.get('/reminders');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/reminders/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/reminders', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.patch(`/reminders/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/reminders/${id}`);
    return response.data;
  },
  savePushSubscription: async (subscription) => {
    const response = await api.post('/reminders/push-subscription', subscription);
    return response.data;
  }
};
