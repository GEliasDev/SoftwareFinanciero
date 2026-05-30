import api from './api';

export const CreditCardService = {
  // ── Tarjetas ──────────────────────────────────────────────
  getAll: async () => {
    const response = await api.get('/credit-cards');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/credit-cards/${id}`);
    return response.data;
  },
  getMonthlySummary: async (id) => {
    const response = await api.get(`/credit-cards/${id}/summary`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/credit-cards', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.patch(`/credit-cards/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/credit-cards/${id}`);
    return response.data;
  },

  // ── Compras ───────────────────────────────────────────────
  createPurchase: async (creditCardId, data) => {
    const response = await api.post(`/credit-cards/${creditCardId}/purchases`, data);
    return response.data;
  },
  getPurchases: async (creditCardId) => {
    const response = await api.get(`/credit-cards/${creditCardId}/purchases`);
    return response.data;
  },
  getPurchaseById: async (creditCardId, purchaseId) => {
    const response = await api.get(`/credit-cards/${creditCardId}/purchases/${purchaseId}`);
    return response.data;
  },
  registerPurchasePayment: async (creditCardId, purchaseId) => {
    const response = await api.patch(`/credit-cards/${creditCardId}/purchases/${purchaseId}/pay`);
    return response.data;
  },
  updatePurchase: async (creditCardId, purchaseId, data) => {
    const response = await api.patch(`/credit-cards/${creditCardId}/purchases/${purchaseId}`, data);
    return response.data;
  },
  deletePurchase: async (creditCardId, purchaseId) => {
    const response = await api.delete(`/credit-cards/${creditCardId}/purchases/${purchaseId}`);
    return response.data;
  },

  // ── Nuevos endpoints ──────────────────────────────────────
  getOverview: async () => {
    const response = await api.get('/credit-cards/overview');
    return response.data;
  },
  undoPay: async (creditCardId, purchaseId) => {
    const response = await api.patch(`/credit-cards/${creditCardId}/purchases/${purchaseId}/undo-pay`);
    return response.data;
  },
  registerAbono: async (creditCardId, purchaseId, montoAbono) => {
    const response = await api.patch(`/credit-cards/${creditCardId}/purchases/${purchaseId}/abono`, { montoAbono });
    return response.data;
  },
  getUpcomingPayments: async (id) => {
    const response = await api.get(`/credit-cards/${id}/upcoming-payments`);
    return response.data;
  },
  getPurchaseStats: async (id) => {
    const response = await api.get(`/credit-cards/${id}/purchase-stats`);
    return response.data;
  },
};
