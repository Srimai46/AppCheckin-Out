// api/auditService.js
import axios from 'axios';

export const fetchAuditLogs = async (params) => {
  // params: { page, limit, action, modelName, start, end }
  const response = await axios.get('/api/audit-logs', { params });
  return response.data;
};