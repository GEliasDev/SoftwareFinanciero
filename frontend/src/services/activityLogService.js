import api from './api';

export const ActivityLogService = {
  getRecent: async (limit = 30) => {
    const res = await api.get(`/activity-log?limit=${limit}`);
    return res.data;
  },
};
