import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

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

// Return full endpoint string for simple href downloading
export const getPdfDownloadUrl = (jobAppId) => {
    return `${api.defaults.baseURL}/cv/${jobAppId}/pdf`;
};

export const getHtmlPreviewUrl = (jobAppId) => {
    return `${api.defaults.baseURL}/cv/${jobAppId}/html`;
};

export default api;
