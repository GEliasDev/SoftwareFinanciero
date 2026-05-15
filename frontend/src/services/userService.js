import api from './api';

export const UserService = {
  getAll: async () => {
    const response = await api.get('/users');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  create: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },
  update: async (id, userData) => {
    const response = await api.patch(`/users/${id}`, userData);
    return response.data;
  },
  changePassword: async (id, passwords) => {
    const response = await api.patch(`/users/${id}/password`, passwords);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  }
};
