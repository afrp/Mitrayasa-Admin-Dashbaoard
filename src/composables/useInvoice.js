import { ref } from 'vue'
import { supabase } from './useSupabase'

export function useInvoice() {
  const invoices = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function getAllInvoice(filters = {}) {
    loading.value = true
    error.value = null
    try {
      let query = supabase
        .from('invoice')
        .select(`
          *,
          produk:produk_id(*),
          pembeli:pembeli_id(*)
        `)
        .order('tanggal_dibuat', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters.startDate) {
        query = query.gte('tanggal_dibuat', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('tanggal_dibuat', filters.endDate)
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
          item.no_invoice.toLowerCase().includes(searchLower)
        )
      }

      invoices.value = result
      return result
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createInvoice(formData) {
  loading.value = true
  error.value = null
  try {
    // Prepare data tanpa no_invoice (biar trigger yang handle)
    const dataToInsert = {
      tanggal_dibuat: formData.tanggal_dibuat,
      produk_id: formData.produk_id,
      quantity: parseFloat(formData.quantity), // Pastikan number
      satuan: formData.satuan,
      harga_total: parseFloat(formData.harga_total), // Pastikan number
      pajak: parseFloat(formData.pajak || 0), // Pastikan number
      jatuh_tempo: formData.jatuh_tempo,
      pembeli_id: formData.pembeli_id,
      keterangan: formData.keterangan || null      
    }

    const { data, error: insertError } = await supabase
      .from('invoice')
      .insert(dataToInsert)
      .select(`
        *,
        produk:produk_id(*),
        pembeli:pembeli_id(*)
      `)
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      throw insertError
    }
    
    return data
  } catch (e) {
    console.error('Error in createInvoice:', e)
    error.value = e.message
    throw e
  } finally {
    loading.value = false
  }
}

  async function deleteInvoice(id) {
    loading.value = true
    error.value = null
    try {
      const { error: deleteError } = await supabase
        .from('invoice')
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
    invoices,
    loading,
    error,
    getAllInvoice,
    createInvoice,
    deleteInvoice
  }
}