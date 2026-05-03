import { ref } from 'vue'
import { supabase } from './useSupabase'

export function usePengeluaranKas() {
  const pengeluaran = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function getAllPengeluaranKas(filters = {}) {
    loading.value = true
    error.value = null
    try {
      let query = supabase
        .from('pengeluaran_kas')
        .select('*')
        .order('tanggal_transaksi', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters.startDate) {
        query = query.gte('tanggal_transaksi', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('tanggal_transaksi', filters.endDate)
      }
      if (filters.category && filters.category !== 'All') {
        query = query.eq('tipe', filters.category)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      let result = data || []

      // Client-side search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        result = result.filter(item => 
          item.nama_produk.toLowerCase().includes(searchLower)
        )
      }

      pengeluaran.value = result
      return result
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getPengeluaranKasLazy(filters = {}, { page = 0, rows = 10, sortField, sortOrder }) {
    loading.value = true
    error.value = null
    try {
      const from = page * rows
      const to = from + rows - 1

      let query = supabase
        .from('pengeluaran_kas')
        .select('*', { count: 'exact' })

      // Sorting
      if (sortField) {
        query = query.order(sortField, { ascending: sortOrder === 1 })
      } else {
        query = query.order('tanggal_transaksi', { ascending: false })
          .order('created_at', { ascending: false })
      }

      // Filters
      if (filters.startDate) {
        query = query.gte('tanggal_transaksi', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('tanggal_transaksi', filters.endDate)
      }
      if (filters.category && filters.category !== 'All') {
        query = query.eq('tipe', filters.category)
      }

      const { data, count, error: fetchError } = await query.range(from, to)

      if (fetchError) throw fetchError

      let resultData = data || []
      if (filters.search) {
        const s = filters.search.toLowerCase()
        resultData = resultData.filter(item =>
          item.nama_produk.toLowerCase().includes(s) ||
          item.tipe.toLowerCase().includes(s) ||
          item.keterangan?.toLowerCase().includes(s) ||
          item.no_transaksi?.toLowerCase().includes(s)
        )
      }

      return {
        data: resultData,
        totalRecords: count || 0
      }
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createPengeluaranKas(formData) {
    loading.value = true
    error.value = null
    try {
      const { data, error: insertError } = await supabase
        .from('pengeluaran_kas')
        .insert({
          tanggal_transaksi: formData.tanggal_transaksi,
          tipe: formData.tipe,
          nama_produk: formData.nama_produk,
          harga_total: formData.harga_total,
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

  async function updatePengeluaranKas(id, formData) {
    loading.value = true
    error.value = null
    try {
      const { error: updateError } = await supabase
        .from('pengeluaran_kas')
        .update({
          tanggal_transaksi: formData.tanggal_transaksi,
          tipe: formData.tipe,
          nama_produk: formData.nama_produk,
          harga_total: formData.harga_total,
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

  async function deletePengeluaranKas(id) {
    loading.value = true
    error.value = null
    try {
      const { error: deleteError } = await supabase
        .from('pengeluaran_kas')
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
    pengeluaran,
    loading,
    error,
    getAllPengeluaranKas,
    getPengeluaranKasLazy,
    createPengeluaranKas,
    updatePengeluaranKas,
    deletePengeluaranKas
  }
}