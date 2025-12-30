import { ref } from 'vue'
import { supabase } from './useSupabase'

export function usePembeli() {
  const pembeli = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function getAllPembeli() {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('pembeli')
        .select('*')
        .eq('is_active', true)
        .order('nama_pembeli', { ascending: true })

      if (fetchError) throw fetchError
      pembeli.value = data || []
      return data || []
    } catch (e) {
      error.value = e.message
      console.error('Error loading pembeli:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getPembeliByTipe(tipe) {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('pembeli')
        .select('*')
        .eq('tipe', tipe)
        .eq('is_active', true)
        .order('nama_pembeli', { ascending: true })

      if (fetchError) throw fetchError
      
      // console.log('Pembeli B2B loaded:', data) // Debug log
      
      pembeli.value = data || []
      return data || []
    } catch (e) {
      error.value = e.message
      console.error('Error loading pembeli by tipe:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    pembeli,
    loading,
    error,
    getAllPembeli,
    getPembeliByTipe
  }
}