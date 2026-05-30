import api from './api';

export const BankCreditService = {
  getAll: async () => {
    const response = await api.get('/bank-credits');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/bank-credits/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/bank-credits', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.patch(`/bank-credits/${id}`, data);
    return response.data;
  },
  // El backend solo usa req.params.id, no recibe body
  registerPayment: async (id) => {
    const response = await api.patch(`/bank-credits/${id}/pay`);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/bank-credits/${id}`);
    return response.data;
  },
};
