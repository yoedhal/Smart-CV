import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Attach token from localStorage on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('smartcv_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-redirect to login on 401/403
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('smartcv_token');
      localStorage.removeItem('smartcv_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const getMasterProfile = async () => {
  const response = await api.get('/master-profile');
  return response.data;
};

export const updateMasterProfile = async (data) => {
  const response = await api.put('/master-profile', data);
  return response.data;
};

export const addExperience = async (data) => {
  const response = await api.post('/master-profile/experience', data);
  return response.data;
};

export const deleteExperience = async (id) => {
  const response = await api.delete(`/master-profile/experience/${id}`);
  return response.data;
};

export const addEducation = async (data) => {
  const response = await api.post('/master-profile/education', data);
  return response.data;
};

export const deleteEducation = async (id) => {
  const response = await api.delete(`/master-profile/education/${id}`);
  return response.data;
};

export const addSkill = async (data) => {
  const response = await api.post('/master-profile/skill', data);
  return response.data;
};

export const deleteSkill = async (id) => {
  const response = await api.delete(`/master-profile/skill/${id}`);
  return response.data;
};

export const generateCV = async (data) => {
  const response = await api.post('/generate-cv', data);
  return response.data;
};

export const getApplications = async () => {
  const response = await api.get('/applications');
  return response.data;
};

export const getPdfDownloadUrl = (jobAppId) => {
  const token = localStorage.getItem('smartcv_token');
  return `${api.defaults.baseURL}/cv/${jobAppId}/pdf?token=${token}`;
};

export const getHtmlPreviewUrl = (jobAppId) => {
  const token = localStorage.getItem('smartcv_token');
  return `${api.defaults.baseURL}/cv/${jobAppId}/html?token=${token}`;
};

export default api;
