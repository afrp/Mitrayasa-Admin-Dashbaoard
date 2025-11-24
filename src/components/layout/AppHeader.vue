<script setup>
import { defineEmits } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'

defineEmits(['toggle-sidebar'])

const authStore = useAuthStore()
const router = useRouter()

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <Button
        icon="pi pi-bars"
        @click="$emit('toggle-sidebar')"
        text
        class="hamburger-btn"
      />
      <span class="logo-text">Mitrajaya - Dairy Natural</span>
    </div>
    <div class="header-right">
      <span class="user-name">{{ authStore.userName }}</span>
      <Button
        icon="pi pi-sign-out"
        @click="handleLogout"
        text
        class="logout-btn"
        label="Logout"
      />
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  background-color: #1b0065;
  color: white;
  padding: 0 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.hamburger-btn {
  color: white;
}

.hamburger-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.logo-text {
  font-size: 1.25rem;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-name {
  font-size: 0.95rem;
}

.logout-btn {
  color: white;
}

.logout-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

@media (max-width: 768px) {
  .logo-text {
    font-size: 1rem;
  }
  
  .user-name {
    display: none;
  }
}
</style>
