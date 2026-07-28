<template>
  <div class="login-container">
    <div class="login-card">
      <h1 class="logo">CourierDTS</h1>
      <p class="subtitle">Sisteme Giriş Yapın</p>
      
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username">Kullanıcı Adı / Kurye ID</label>
          <input 
            type="text" 
            id="username" 
            v-model="username" 
            placeholder="örn: SIM_COURIER_776"
            required
          />
        </div>
        
        <div class="form-group">
          <label for="password">Şifre</label>
          <input 
            type="password" 
            id="password" 
            v-model="password" 
            placeholder="******"
            required
          />
        </div>

        <div class="role-selector">
          <label class="radio-label">
            <input type="radio" value="courier" v-model="role" /> Kurye
          </label>
          <label class="radio-label">
            <input type="radio" value="admin" v-model="role" /> Yönetici
          </label>
        </div>

        <button type="submit" class="primary-btn" :disabled="isLoading">
          {{ isLoading ? 'Giriş Yapılıyor...' : 'Giriş Yap' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script>
// Mocking Capacitor Device API for now
// import { Device } from '@capacitor/device';

import api from '../api/index';

export default {
  name: 'LoginView',
  data() {
    return {
      username: '',
      password: '',
      role: 'courier', // varsayılan
      isLoading: false
    }
  },
  methods: {
    async handleLogin() {
      this.isLoading = true;
      
      try {
        if (this.role === 'admin') {
          // Gerçek Admin Login API Çağrısı
          const response = await api.post('/admin/login', {
            username: this.username,
            password: this.password
          });
          
          localStorage.setItem('jwt_token', response.data.token);
          localStorage.setItem('user_role', 'admin');
          localStorage.setItem('admin_id', response.data.adminId || response.data.id);
          this.$router.push('/admin');
        } else {
          // Gerçek Kurye Login API Çağrısı
          const response = await api.post('/courier/login', {
            username: this.username,
            password: this.password
          });
          
          localStorage.setItem('jwt_token', response.data.token);
          localStorage.setItem('user_role', 'courier');
          localStorage.setItem('courier_id', response.data.courierId || response.data.id);
          this.$router.push('/courier');
        }
      } catch (error) {
        if (error.response && error.response.status === 401) {
          alert('Kullanıcı adı veya şifre hatalı!');
        } else {
          console.error('Giriş hatası', error);
          alert('Sunucuya bağlanılamadı. Lütfen tekrar deneyin.');
        }
      } finally {
        this.isLoading = false;
      }
    }
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #121212; /* Dark Mode base */
  color: #ffffff;
}

.login-card {
  background: rgba(30, 30, 30, 0.7); /* Hafif Glassmorphism */
  backdrop-filter: blur(10px);
  padding: 40px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.logo {
  font-size: 28px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 5px;
  color: #4CAF50;
}

.subtitle {
  text-align: center;
  color: #aaaaaa;
  margin-bottom: 30px;
  font-size: 14px;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #dddddd;
}

input[type="text"],
input[type="password"] {
  width: 100%;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #333;
  background: #222;
  color: #fff;
  font-size: 16px;
  box-sizing: border-box;
}

input:focus {
  outline: none;
  border-color: #4CAF50;
}

.role-selector {
  display: flex;
  justify-content: space-around;
  margin-bottom: 25px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.primary-btn {
  width: 100%;
  padding: 14px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
}

.primary-btn:hover {
  background-color: #45a049;
}

.primary-btn:disabled {
  background-color: #2e5c30;
  cursor: not-allowed;
}
</style>
