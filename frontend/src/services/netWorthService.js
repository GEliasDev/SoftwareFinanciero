import api from './api';

export const NetWorthService = {
  getHistory: async () => {
    const response = await api.get('/net-worth');
    return response.data;
  },
};
