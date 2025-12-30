import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuth } from '../composables/useAuth'
import { supabase } from '../composables/useSupabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const isAuthenticated = ref(false)
  const loading = ref(false)
  const initialized = ref(false)

  const { login: authLogin, logout: authLogout, getCurrentUser } = useAuth()

  const isLoggedIn = computed(() => isAuthenticated.value && user.value !== null)
  
  const userName = computed(() => {
    if (!user.value) return ''
    return user.value.email || 'User'
  })

  const login = async (email, password) => {
    loading.value = true
    try {
      const { data, error } = await authLogin(email, password)
      if (error) throw error
      
      user.value = data.user
      isAuthenticated.value = true
      return { success: true, error: null }
    } catch (error) {
      return { success: false, error: error.message }
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    loading.value = true
    try {
      const { error } = await authLogout()
      if (error) throw error
      
      user.value = null
      isAuthenticated.value = false
      return { success: true, error: null }
    } catch (error) {
      return { success: false, error: error.message }
    } finally {
      loading.value = false
    }
  }

  const initialize = async () => {
    loading.value = true
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        user.value = session.user
        isAuthenticated.value = true
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error)
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  return {
    user,
    isAuthenticated,
    loading,
    initialized,
    isLoggedIn,
    userName,
    login,
    logout,
    initialize,
  }
})
