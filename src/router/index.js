import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import CourierDashboard from '../views/CourierDashboard.vue'
import AdminDashboard from '../views/AdminDashboard.vue'

import SimulationPanel from '../views/SimulationPanel.vue'

const routes = [
  {
    path: '/',
    name: 'login',
    component: LoginView
  },
  {
    path: '/courier',
    name: 'courier',
    component: CourierDashboard,
    meta: { requiresAuth: true, role: 'courier' }
  },
  {
    path: '/admin',
    name: 'admin',
    component: AdminDashboard,
    meta: { requiresAuth: true, role: 'admin' }
  },
  {
    path: '/simulation',
    name: 'simulation',
    component: SimulationPanel
    // Şimdilik test aracı olduğu için auth/role koruması eklemedik
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

// Basit yetki koruması (Route Guard)
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('jwt_token')
  const role = localStorage.getItem('user_role')

  if (to.meta.requiresAuth && !token) {
    next({ name: 'login' })
  } else if (to.meta.role && to.meta.role !== role && token) {
    // Yanlış role sahipse kendi sayfasına gönder
    next({ name: role })
  } else {
    next()
  }
})

export default router
