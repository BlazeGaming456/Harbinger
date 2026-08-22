'use client';
import axios from 'axios';

const client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

let accessToken = null;
export const setAccessToken = (token) => { accessToken = token; };

client.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retried) {
      err.config._retried = true;
      const { data } = await client.post('/auth/refresh');
      setAccessToken(data.accessToken);
      err.config.headers.Authorization = `Bearer ${data.accessToken}`;
      return client(err.config);
    }
    return Promise.reject(err);
  }
);

export default client;