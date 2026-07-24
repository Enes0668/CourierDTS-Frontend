<template>
  <div class="toast-container">
    <transition-group name="toast-anim" tag="div">
      <div 
        v-for="msg in messages" 
        :key="msg.id" 
        :class="['toast-msg', `toast-${msg.type}`]"
      >
        <span v-if="msg.type === 'success'">✅</span>
        <span v-if="msg.type === 'error'">❌</span>
        <span v-if="msg.type === 'info'">ℹ️</span>
        {{ msg.message }}
      </div>
    </transition-group>
  </div>
</template>

<script>
import { toastState } from '../services/toast';

export default {
  name: 'ToastContainer',
  computed: {
    messages() {
      return toastState.messages;
    }
  }
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 99999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 90%;
  max-width: 400px;
  align-items: center;
}
.toast-msg {
  width: 100%;
  padding: 14px 20px;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  font-size: 14px;
  box-shadow: 0 8px 16px rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
}
.toast-success { background-color: #4CAF50; }
.toast-error { background-color: #F44336; }
.toast-info { background-color: #2196F3; }

.toast-anim-enter-active, .toast-anim-leave-active {
  transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
.toast-anim-enter-from {
  opacity: 0;
  transform: translateY(50px);
}
.toast-anim-leave-to {
  opacity: 0;
  transform: translateY(50px);
}
</style>
