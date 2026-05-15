import api from './api';

export const CreditCardService = {
  getAll: async () => {
    const response = await api.get('/creditCards');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/creditCards/${id}`);
    return response.data;
  },
  getSummary: async (id) => {
    const response = await api.get(`/creditCards/${id}/summary`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/creditCards', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.patch(`/creditCards/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/creditCards/${id}`);
    return response.data;
  },

  // Purchases
  createPurchase: async (creditCardId, data) => {
    const response = await api.post(`/creditCards/${creditCardId}/purchases`, data);
    return response.data;
  },
  getPurchases: async (creditCardId) => {
    const response = await api.get(`/creditCards/${creditCardId}/purchases`);
    return response.data;
  },
  registerPayment: async (creditCardId, purchaseId, paymentData) => {
    const response = await api.patch(`/creditCards/${creditCardId}/purchases/${purchaseId}/pay`, paymentData);
    return response.data;
  },
  deletePurchase: async (creditCardId, purchaseId) => {
    const response = await api.delete(`/creditCards/${creditCardId}/purchases/${purchaseId}`);
    return response.data;
  }
};
