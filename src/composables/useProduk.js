import { ref } from 'vue'
import { supabase } from './useSupabase'

export function useProduk() {
  const products = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function getAllProduk() {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('produk')
        .select('*')
        .eq('is_active', true)
        .order('nama_produk', { ascending: true })

      if (fetchError) throw fetchError
      products.value = data || []
      return data || []
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getProdukByKategori(kategori) {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('produk')
        .select('*')
        .eq('kategori', kategori)
        .eq('is_active', true)
        .order('nama_produk', { ascending: true })

      if (fetchError) throw fetchError
      return data || []
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getProdukById(id) {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('produk')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      return data
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    products,
    loading,
    error,
    getAllProduk,
    getProdukByKategori,
    getProdukById
  }
}