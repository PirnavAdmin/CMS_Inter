import api from './axios';

export const getAuditLogs = (params) => {
  return api.get('/api/v1/settings/audit-logs', { params });
};
