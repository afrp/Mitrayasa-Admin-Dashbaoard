import { ref } from 'vue'
import { supabase } from './useSupabase'

export function useInvoice() {
  const invoices = ref([])
  const loading = ref(false)
  const error = ref(null)

  const SELECT_WITH_RELATIONS = `
    *,
    pembeli:pembeli_id(*),
    invoice_items(
      *,
      produk:produk_id(*)
    )
  `

  async function getAllInvoice(filters = {}) {
    loading.value = true
    error.value = null
    try {
      let query = supabase
        .from('invoice')
        .select(SELECT_WITH_RELATIONS)
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
        result = result.filter(item => {
          const matchInvoice = item.no_invoice?.toLowerCase().includes(searchLower)
          const matchPembeli = item.pembeli?.nama_pembeli?.toLowerCase().includes(searchLower)
          const matchProduk = item.invoice_items?.some(it =>
            it.produk?.nama_produk?.toLowerCase().includes(searchLower)
          )
          return matchInvoice || matchPembeli || matchProduk
        })
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
    let createdInvoiceId = null

    try {
      // Insert header
      const headerPayload = {
        tanggal_dibuat: formData.tanggal_dibuat,
        pajak: parseFloat(formData.pajak || 0),
        jatuh_tempo: formData.jatuh_tempo,
        pembeli_id: formData.pembeli_id,
        keterangan: formData.keterangan || null
      }

      const { data: headerData, error: headerError } = await supabase
        .from('invoice')
        .insert(headerPayload)
        .select('id')
        .single()

      if (headerError) throw headerError
      createdInvoiceId = headerData.id

      // Insert items
      const itemsPayload = formData.items.map(item => ({
        invoice_id: createdInvoiceId,
        produk_id: item.produk_id,
        quantity: parseFloat(item.quantity),
        satuan: item.satuan,
        harga_satuan: parseFloat(item.harga_satuan)
      }))

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsPayload)

      if (itemsError) throw itemsError

      // Re-fetch dengan relasi lengkap (subtotal_items & grand_total sudah di-update via trigger)
      const { data: fullInvoice, error: refetchError } = await supabase
        .from('invoice')
        .select(SELECT_WITH_RELATIONS)
        .eq('id', createdInvoiceId)
        .single()

      if (refetchError) throw refetchError

      return fullInvoice
    } catch (e) {
      // Manual rollback: hapus header jika items insert gagal
      // ON DELETE CASCADE akan auto-bersihkan items partial yg sudah masuk
      if (createdInvoiceId) {
        await supabase.from('invoice').delete().eq('id', createdInvoiceId)
      }
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
      // ON DELETE CASCADE akan otomatis hapus invoice_items terkait
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
