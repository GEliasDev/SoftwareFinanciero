import api from './api';

export const IncomeService = {
  getAll:  async ()         => (await api.get('/income')).data,
  getById: async (id)       => (await api.get(`/income/${id}`)).data,
  create:  async (data)     => (await api.post('/income', data)).data,
  update:  async (id, data) => (await api.patch(`/income/${id}`, data)).data,
  delete:  async (id)       => (await api.delete(`/income/${id}`)).data,
};
