import api from './api';

export const SavingsGoalService = {
  getAll:         async ()          => (await api.get('/savings')).data,
  getById:        async (id)        => (await api.get(`/savings/${id}`)).data,
  create:         async (data)      => (await api.post('/savings', data)).data,
  update:         async (id, data)  => (await api.patch(`/savings/${id}`, data)).data,
  delete:         async (id)        => (await api.delete(`/savings/${id}`)).data,
  registerAporte: async (id, monto) => (await api.post(`/savings/${id}/aporte`, { monto })).data,
};
