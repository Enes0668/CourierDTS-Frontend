import { reactive } from 'vue';

export const toastState = reactive({
  messages: []
});

let idCounter = 0;

export const toast = {
  add(message, type = 'info', duration = 3000) {
    const id = idCounter++;
    toastState.messages.push({ id, message, type });
    setTimeout(() => {
      this.remove(id);
    }, duration);
  },
  success(message, duration) { this.add(message, 'success', duration); },
  error(message, duration) { this.add(message, 'error', duration); },
  info(message, duration) { this.add(message, 'info', duration); },
  remove(id) {
    const index = toastState.messages.findIndex(m => m.id === id);
    if (index !== -1) toastState.messages.splice(index, 1);
  }
};
