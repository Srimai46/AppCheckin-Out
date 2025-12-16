import api from './axios';

export const checkIn = async () => {
  const { data } = await api.post('/attendance/check-in');
  return data;
};

export const checkOut = async () => {
  const { data } = await api.post('/attendance/check-out');
  return data;
};

export const getMyHistory = async () => {
  const { data } = await api.get('/attendance/history');
  return data;
};