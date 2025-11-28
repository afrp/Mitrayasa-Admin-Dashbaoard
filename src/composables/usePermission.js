// composables/usePermission.js
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'primevue/usetoast'
import { supabase } from './useSupabase'

export function usePermission(requiredPermission) {
  const router = useRouter()
  const authStore = useAuthStore()
  const toast = useToast()
  
  const hasAccess = ref(false)
  const loading = ref(true)

  async function checkAccess() {
    try {
      const userId = authStore.user?.id
      if (!userId) {
        router.push('/login')
        return
      }

      // Get admin data
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('is_master')
        .eq('id', userId)
        .single()

      if (adminError) throw adminError

      // Master admin has all access
      if (adminData.is_master) {
        hasAccess.value = true
        loading.value = false
        return
      }

      // Check specific permission
      const { data: permData, error: permError } = await supabase
        .from('admin_permissions')
        .select('can_access')
        .eq('admin_id', userId)
        .eq('menu_name', requiredPermission)
        .eq('can_access', true)
        .maybeSingle()

      if (permError) throw permError

      if (permData) {
        hasAccess.value = true
      } else {
        // No access, redirect
        toast.add({
          severity: 'warn',
          summary: 'Akses Ditolak',
          detail: 'Anda tidak memiliki akses ke halaman ini',
          life: 3000
        })
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error checking permission:', error)
      router.push('/dashboard')
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    checkAccess()
  })

  return {
    hasAccess,
    loading
  }
}