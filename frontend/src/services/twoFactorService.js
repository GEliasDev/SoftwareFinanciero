import api from './api';

export const TwoFactorService = {
  setup: async () => (await api.post('/users/2fa/setup')).data,
  confirm: async (code) => (await api.post('/users/2fa/confirm', { code })).data,
  disable: async (password) => (await api.post('/users/2fa/disable', { password })).data,
};
