import api from './api';

export const CardInboxService = {
  list:    async (status = 'pendiente') => (await api.get('/card-inbox', { params: { status } })).data,
  sync:    async ()                     => (await api.post('/card-inbox/sync')).data,
  approve: async (id, ajustes = {})     => (await api.post(`/card-inbox/${id}/approve`, ajustes)).data,
  discard: async (id)                   => (await api.post(`/card-inbox/${id}/discard`)).data,
};
