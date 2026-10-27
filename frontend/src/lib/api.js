import axios from 'axios';

// Direct backend port & URL configuration (no .env required)
export const BACKEND_PORT = 8000;
export const BACKEND_BASE_URL = `http://127.0.0.1:${BACKEND_PORT}`;
export const API_BASE_URL = `${BACKEND_BASE_URL}/api`;

// Axios instance configured with direct backend API URL
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor: attach Bearer token if present in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('wind_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 unauthorized & error extraction
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/signup' && currentPath !== '/') {
        localStorage.removeItem('wind_auth_token');
        localStorage.removeItem('wind_auth_user');
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

// ============================================================
// ALL API SERVICES CONSOLIDATED IN THIS SINGLE FILE (api.js)
// ============================================================

export const authService = {
  async signup(name, email, password) {
    const res = await api.post('/auth/signup', { name, email, password });
    return res.data;
  },
  async login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  async getMe() {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

export const dashboardService = {
  async getSummary() {
    const res = await api.get('/dashboard/summary');
    return res.data;
  },
};

export const datasetService = {
  async upload(file, onUploadProgress) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/datasets/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return res.data;
  },
  async getAll() {
    const res = await api.get('/datasets');
    return res.data;
  },
  async getById(id) {
    const res = await api.get(`/datasets/${id}`);
    return res.data;
  },
  async getSummary(id) {
    const res = await api.get(`/datasets/${id}/summary`);
    return res.data;
  },
  async getQuality(id) {
    const res = await api.get(`/datasets/${id}/quality`);
    return res.data;
  },
  async getCompatibility(id) {
    const res = await api.get(`/datasets/${id}/compatibility`);
    return res.data;
  },
};

export const inferenceService = {
  async runSingle(payload) {
    const res = await api.post('/inference/single', payload);
    return res.data;
  },
  async startBatch(datasetId, farm) {
    const res = await api.post('/inference/batch', {
      dataset_id: datasetId,
      farm: farm || undefined,
    });
    return res.data;
  },
  async getStatus(analysisId) {
    const res = await api.get(`/inference/${analysisId}/status`);
    return res.data;
  },
  async getResults(analysisId) {
    const res = await api.get(`/inference/${analysisId}/results`);
    return res.data;
  },
};

export const turbineService = {
  async getAll() {
    const res = await api.get('/turbines');
    return res.data;
  },
  async getById(id) {
    const res = await api.get(`/turbines/${id}`);
    return res.data;
  },
  async getHistory(id, limit = 100) {
    const res = await api.get(`/turbines/${id}/history`, {
      params: { limit },
    });
    return res.data;
  },
};

export const alertService = {
  async getAlerts(params = {}) {
    const res = await api.get('/alerts', { params });
    return res.data;
  },
  async getById(id) {
    const res = await api.get(`/alerts/${id}`);
    return res.data;
  },
  async acknowledge(id) {
    const res = await api.post(`/alerts/${id}/acknowledge`);
    return res.data;
  },
};

export const explainabilityService = {
  async getGlobal(farm = 'A') {
    const res = await api.get('/explainability/global', {
      params: { farm },
    });
    return res.data;
  },
  async getLocal(assetId, farm = 'A') {
    const res = await api.get(`/explainability/${assetId}`, {
      params: { farm },
    });
    return res.data;
  },
};

export const weatherService = {
  async getCurrentWeather(latitude = 54.5, longitude = 9.5) {
    const res = await api.get('/weather/current', {
      params: { latitude, longitude },
    });
    return res.data;
  },
  async checkBackendHealth() {
    try {
      const res = await axios.get(`${BACKEND_BASE_URL}/health`, { timeout: 3000 });
      return res.data && res.data.status === 'ok';
    } catch {
      return false;
    }
  },
};

// Aliases for unified access directly on api object
api.auth = authService;
api.dashboard = dashboardService;
api.datasets = datasetService;
api.inference = inferenceService;
api.turbines = turbineService;
api.alerts = alertService;
api.explainability = explainabilityService;
api.weather = weatherService;

export default api;
