<!-- components/PermissionGuard.vue -->
<script setup>
import { usePermission } from '../composables/usePermission'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'

const props = defineProps({
  permission: {
    type: String,
    required: true
  }
})

const { hasAccess, loading } = usePermission(props.permission)
const router = useRouter()

function goToDashboard() {
  router.push('/dashboard')
}
</script>

<template>
  <!-- Loading State -->
  <div v-if="loading" class="flex items-center justify-center min-h-screen min-w-screen">
    <i class="pi pi-spin pi-spinner text-4xl text-gray-400"></i>
  </div>

  <!-- Content (only if has access) -->
  <div v-else-if="hasAccess">
    <slot />
  </div>
  <div v-else class="min-h-screen min-w-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
      <div class="mb-6">
        <i class="pi pi-lock text-6xl text-red-500"></i>
      </div>
      
      <h1 class="text-2xl font-bold text-gray-800 mb-2">
        Akses Ditolak
      </h1>
      
      <p class="text-gray-600 mb-6">
        Anda tidak memiliki izin untuk mengakses halaman ini.
        Silakan hubungi administrator untuk mendapatkan akses.
      </p>
      
      <Button
        label="Kembali ke Dashboard"
        icon="pi pi-home"
        class="w-full"
        @click="goToDashboard"
      />
    </div>
  </div>
</template>