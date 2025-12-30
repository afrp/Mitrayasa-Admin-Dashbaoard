<script setup>
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import { useAuthStore } from './stores/auth'

const authStore = useAuthStore()

onMounted(async () => {
  await authStore.initialize()
})
</script>

<template>
  <div id="app">
    <Toast position="top-right" />
    <ConfirmDialog />
    <RouterView />
  </div>
</template>

<style>
* {
  box-sizing: border-box;
}

#app {
  min-height: 100vh;
}

body {
  margin: 0;
  padding: 0;
}
</style>
