<script setup>
import { RouterView } from 'vue-router'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
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
