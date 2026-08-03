import axios from 'axios';
import router from '@/router';

/**
 * Merkezi API Yapılandırma Dosyası
 * 
 * Bu dosya, backend'e (C# API) atılacak tüm HTTP istekleri için ortak bir Axios örneği (instance) oluşturur.
 * - Çevresel değişkenlerden (process.env) VUE_APP_API_URL adresini alır.
 * - Her isteğin başlığına (Header) Authorization: Bearer {token} bilgisini otomatik ekler.
 * - Backend'den 401 (Unauthorized) hatası dönerse, oturumun süresinin dolduğunu varsayıp kullanıcıyı login'e atar.
 */
// Backend doğrudan Enes'in Swagger/API sunucusuna yönlendirildi
const API_BASE_URL = process.env.VUE_APP_API_URL || 'https://courierdts-backend2.onrender.com/api';

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
