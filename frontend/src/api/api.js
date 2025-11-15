import axios from "axios";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
});

let authToken = null;

api.setAuthToken = (token) => {
  authToken = token || null;
};

api.clearAuthToken = () => {
  authToken = null;
};

api.interceptors.request.use(
  async (config) => {
    if (!config.headers) {
      config.headers = {};
    }

    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      api.clearAuthToken();
    }
    return Promise.reject(error);
  }
);

export default api;
