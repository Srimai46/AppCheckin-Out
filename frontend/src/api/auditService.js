// api/auditService.js
import axios from 'axios';

// 1. กำหนด Base URL (ให้รองรับทั้ง localhost และ IP จริง)
const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");

export const fetchAuditLogs = async (params) => {
  // params: { page, limit, action, modelName, start, end }
  const token = localStorage.getItem('token'); 

  const response = await axios.get(`${API_BASE}/api/activity-view/history`, { 
    params,
    headers: {
      'Authorization': `Bearer ${token}` 
    }
  });

  // Backend ส่งมาเป็น { success: true, data: [...], pagination: {...} }
  // axios จะห่อ response ไว้อีกชั้น ดังนั้นต้อง return response.data
  return response.data; 
};