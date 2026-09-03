'use client';
import axios from 'axios';

const client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

let accessToken = null;
let refreshPromise = null;

export const setAccessToken = (token) => { accessToken = token; };
export const getAccessToken = () => accessToken;

export async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = client.post('/auth/refresh')
    .then(({ data }) => {
      setAccessToken(data.accessToken);
      return data.accessToken;
    })
    .catch((err) => {
      if (err.response?.status !== 401) {
        console.error('Refresh token failed:', err);
      }
      setAccessToken(null);
      throw err;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

client.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const isRefreshCall = err.config?.url?.endsWith('/auth/refresh');
    if (err.response?.status === 401 && !err.config._retried && !isRefreshCall) {
      err.config._retried = true;
      try {
        const token = await refreshAccessToken();
        err.config.headers.Authorization = `Bearer ${token}`;
        return client(err.config);
      } catch {
        setAccessToken(null);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('auth:unauthorized'));
        }
      }
    }
    return Promise.reject(err);
  }
);

export default client;
