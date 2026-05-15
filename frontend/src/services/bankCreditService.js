import api from './api';

export const BankCreditService = {
  getAll: async () => {
    const response = await api.get('/bankCredits');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/bankCredits/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/bankCredits', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.patch(`/bankCredits/${id}`, data);
    return response.data;
  },
  registerPayment: async (id, paymentData) => {
    const response = await api.patch(`/bankCredits/${id}/pay`, paymentData);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/bankCredits/${id}`);
    return response.data;
  }
};
