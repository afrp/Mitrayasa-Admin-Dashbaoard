import { ref } from 'vue'
import { supabase } from './useSupabase'

export function usePenjualan() {
  const penjualan = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function getAllPenjualan(filters = {}) {
    loading.value = true
    error.value = null
    try {
      let query = supabase
        .from('penjualan')
        .select(`
          *,
          produk:produk_id(*),
          pembeli:pembeli_id(*),
          suplier:suplier_id(*)
        `)
        .order('tanggal_transaksi', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters.startDate) {
        query = query.gte('tanggal_transaksi', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('tanggal_transaksi', filters.endDate)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      let result = data || []

      // Client-side search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        result = result.filter(item => 
          item.produk?.nama_produk.toLowerCase().includes(searchLower) ||
          item.pembeli?.nama_pembeli.toLowerCase().includes(searchLower) ||
          item.suplier?.nama_suplier.toLowerCase().includes(searchLower)
        )
      }

      penjualan.value = result
      return result
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createPenjualan(formData) {
    loading.value = true
    error.value = null
    try {
      const { data, error: insertError } = await supabase
        .from('penjualan')
        .insert({
          tanggal_transaksi: formData.tanggal_transaksi,
          produk_id: formData.produk_id,
          pembeli_id: formData.pembeli_id || null,
          suplier_id: formData.suplier_id || null,
          quantity: formData.quantity,
          harga_jual: formData.harga_jual,
          keterangan: formData.keterangan || null,
          no_transaksi: '' // Will be auto-generated
        })
        .select()
        .single()

      if (insertError) throw insertError
      return data
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updatePenjualan(id, formData) {
    loading.value = true
    error.value = null
    try {
      const { error: updateError } = await supabase
        .from('penjualan')
        .update({
          tanggal_transaksi: formData.tanggal_transaksi,
          produk_id: formData.produk_id,
          pembeli_id: formData.pembeli_id || null,
          suplier_id: formData.suplier_id || null,
          quantity: formData.quantity,
          harga_jual: formData.harga_jual,
          keterangan: formData.keterangan || null
        })
        .eq('id', id)

      if (updateError) throw updateError
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deletePenjualan(id) {
    loading.value = true
    error.value = null
    try {
      const { error: deleteError } = await supabase
        .from('penjualan')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    penjualan,
    loading,
    error,
    getAllPenjualan,
    createPenjualan,
    updatePenjualan,
    deletePenjualan
  }
}