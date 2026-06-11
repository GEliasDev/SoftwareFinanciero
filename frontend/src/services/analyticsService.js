import api from './api';

export const AnalyticsService = {
  getSummary: async () => {
    const response = await api.get('/analytics/summary');
    return response.data;
  },
  getMonthlyTrend: async (months = 6) => {
    const response = await api.get(`/analytics/monthly-trend?months=${months}`);
    return response.data;
  },
  getDistribution: async () => {
    const response = await api.get('/analytics/distribution');
    return response.data;
  },
  getRecommendations: async () => {
    const response = await api.get('/analytics/recommendations');
    return response.data;
  },
  getDebtFreedom: async () => {
    const response = await api.get('/analytics/debt-freedom');
    return response.data;
  },
};
