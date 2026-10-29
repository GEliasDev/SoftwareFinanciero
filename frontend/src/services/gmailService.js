import api from './api';

export const GmailService = {
  getStatus:  async () => (await api.get('/gmail/status')).data,
  getAuthUrl: async () => (await api.get('/gmail/auth-url')).data.url,
  disconnect: async () => (await api.delete('/gmail')).data,
};
