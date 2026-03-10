import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
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

export const parseCvText = async (cvText) => {
  const response = await api.post('/master-profile/parse-cv', { cv_text: cvText });
  return response.data;
};

export const generateCV = async (data) => {
  const response = await api.post('/generate-cv', data);
  return response.data;
};

export const getApplications = async ({ page = 1, limit = 20, search = '' } = {}) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set('search', search);
  const response = await api.get(`/applications?${params}`);
  return response.data;
};

// Issue a short-lived (10 min) preview token for iframe/download use
// This avoids exposing the long-lived JWT in browser history or server logs
export const getPreviewToken = async (jobAppId) => {
  const response = await api.post(`/cv/${jobAppId}/preview-token`);
  return response.data.token;
};

export const getPdfDownloadUrl = (jobAppId, previewToken) => {
  if (previewToken) {
    return `${api.defaults.baseURL}/cv/${jobAppId}/pdf?token=${previewToken}`;
  }
  // Legacy fallback using long-lived JWT
  const token = localStorage.getItem('smartcv_token');
  return `${api.defaults.baseURL}/cv/${jobAppId}/pdf?token=${token}`;
};

export const getHtmlPreviewUrl = (jobAppId, previewToken) => {
  if (previewToken) {
    return `${api.defaults.baseURL}/cv/${jobAppId}/html?token=${previewToken}`;
  }
  // Legacy fallback using long-lived JWT
  const token = localStorage.getItem('smartcv_token');
  return `${api.defaults.baseURL}/cv/${jobAppId}/html?token=${token}`;
};

export default api;
