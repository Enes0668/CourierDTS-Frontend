import axios from 'axios';
import router from '@/router';

// VUE_APP_API_URL değişkeni .env dosyasından okunur
const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000 // 10 saniye zaman aşımı
});

// İstek (Request) yakalayıcı: Token varsa her isteğe ekle
api.interceptors.request.use(config => {
  const token = localStorage.getItem('jwt_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Cevap (Response) yakalayıcı: 401 alınırsa login'e at
api.interceptors.response.use(response => {
  return response;
}, error => {
  if (error.response && error.response.status === 401) {
    console.warn("[AXIOS] 401 Unauthorized - Oturum süresi doldu veya token geçersiz.");
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_role');
    router.push({ name: 'login' });
  }
  return Promise.reject(error);
});

export default api;
