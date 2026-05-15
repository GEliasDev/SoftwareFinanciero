import api from './api';

export const SubscriptionService = {
  getAll: async () => {
    const response = await api.get('/subscriptions');
    return response.data;
  },
  getSummary: async () => {
    const response = await api.get('/subscriptions/summary');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/subscriptions/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/subscriptions', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.patch(`/subscriptions/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/subscriptions/${id}`);
    return response.data;
  }
};
