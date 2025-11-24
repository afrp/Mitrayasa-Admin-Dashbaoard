import { ref } from 'vue'
import { supabase } from './useSupabase'

export function useSupliers() {
  const supliers = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function getAllSupliers() {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('supliers')
        .select('*')
        .eq('is_active', true)
        .order('nama_suplier', { ascending: true })

      if (fetchError) throw fetchError
      supliers.value = data || []
      return data || []
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    supliers,
    loading,
    error,
    getAllSupliers
  }
}