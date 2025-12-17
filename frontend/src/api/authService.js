import api from './axios';

export const loginUser = async (credentials) => {
  const { data } = await api.post('/auth/login', credentials);
  return data;
};

export const getMe = async () => {
  const { data } = await api.get('/auth/me');
  return data;
};

export const registerUser = async (userInfo) => {
  const { data } = await api.post('/auth/register', userInfo);
  return data;
}