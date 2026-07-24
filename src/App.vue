<template>
  <router-view />
  <ToastContainer />
</template>

<script>
import ToastContainer from './components/ToastContainer.vue';

export default {
  name: 'App',
  components: {
    ToastContainer
  }
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');

/* Global CSS (Lightweight Premium) */
body {
  margin: 0;
  padding: 0;
  font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #121212;
  color: #e0e0e0;
  -webkit-font-smoothing: antialiased;
}

* {
  box-sizing: border-box;
}

/* Scrollbar styling for dark mode */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: #1e1e1e;
}
::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #888;
}
</style>