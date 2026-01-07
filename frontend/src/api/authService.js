import api from './axios';

// Login User [controller: authController]
export const loginUser = async (credentials) => {
  const { data } = await api.post('/auth/login', credentials);
  return data;
};

// Get Current User Info [controller: authController]
export const getMe = async () => {
  const { data } = await api.get('/auth/me');
  return data;
};

// Register User [controller: authController]
export const registerUser = async (userInfo) => {
  const { data } = await api.post('/auth/register', userInfo);
  return data;
}