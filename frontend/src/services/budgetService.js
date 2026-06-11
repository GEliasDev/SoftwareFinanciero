import api from './api';

export const BudgetService = {
  getMonth:           async (mes) => (await api.get(`/budget?mes=${mes}`)).data,
  getAvailableMonths: async ()    => (await api.get('/budget/months')).data,
  upsertCategory:     async (data)  => (await api.post('/budget/categories', data)).data,
  deleteCategory:     async (id)    => (await api.delete(`/budget/categories/${id}`)).data,
  addExpense:         async (data)  => (await api.post('/budget/expenses', data)).data,
  deleteExpense:      async (id)    => (await api.delete(`/budget/expenses/${id}`)).data,
};
