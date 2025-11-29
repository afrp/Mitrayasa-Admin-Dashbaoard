// composables/usePembayaran.js
import { ref } from 'vue'
import { supabase } from './useSupabase'

export function usePembayaran() {
  const loading = ref(false)
  const error = ref(null)

  // ==========================================
  // PEMBAYARAN PEMBELIAN (HUTANG)
  // ==========================================

  async function getPembayaranPembelian(pembelianId) {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('pembayaran_pembelian')
        .select('*')
        .eq('pembelian_id', pembelianId)
        .order('tanggal_bayar', { ascending: false })

      if (fetchError) throw fetchError
      return data || []
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createPembayaranPembelian(pembayaranData) {
    loading.value = true
    error.value = null
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data, error: insertError } = await supabase
        .from('pembayaran_pembelian')
        .insert({
          pembelian_id: pembayaranData.pembelian_id,
          tanggal_bayar: pembayaranData.tanggal_bayar,
          jumlah_bayar: parseFloat(pembayaranData.jumlah_bayar),
          metode_pembayaran: pembayaranData.metode_pembayaran,
          keterangan: pembayaranData.keterangan || null,
          created_by: user?.id
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

  async function deletePembayaranPembelian(id) {
    loading.value = true
    error.value = null
    try {
      const { error: deleteError } = await supabase
        .from('pembayaran_pembelian')
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

  // ==========================================
  // PEMBAYARAN PENJUALAN (PIUTANG)
  // ==========================================

  async function getPembayaranPenjualan(penjualanId) {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('pembayaran_penjualan')
        .select('*')
        .eq('penjualan_id', penjualanId)
        .order('tanggal_bayar', { ascending: false })

      if (fetchError) throw fetchError
      return data || []
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createPembayaranPenjualan(pembayaranData) {
    loading.value = true
    error.value = null
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data, error: insertError } = await supabase
        .from('pembayaran_penjualan')
        .insert({
          penjualan_id: pembayaranData.penjualan_id,
          tanggal_bayar: pembayaranData.tanggal_bayar,
          jumlah_bayar: parseFloat(pembayaranData.jumlah_bayar),
          metode_pembayaran: pembayaranData.metode_pembayaran,
          keterangan: pembayaranData.keterangan || null,
          created_by: user?.id
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

  async function deletePembayaranPenjualan(id) {
    loading.value = true
    error.value = null
    try {
      const { error: deleteError } = await supabase
        .from('pembayaran_penjualan')
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

  // ==========================================
  // LAPORAN HUTANG & PIUTANG
  // ==========================================

  async function getLaporanHutang(filters = {}) {
    loading.value = true
    error.value = null
    try {
      let query = supabase
        .from('pembelian')
        .select(`
          *,
          produk:produk_id(*),
          suplier:suplier_id(*)
        `)
        .eq('status_pembayaran', 'Belum Lunas')
        .order('tanggal_jatuh_tempo', { ascending: true })

      if (filters.startDate) {
        query = query.gte('tanggal_transaksi', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('tanggal_transaksi', filters.endDate)
      }

      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError
      return data || []
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getLaporanPiutang(filters = {}) {
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
        .eq('status_pembayaran', 'Belum Lunas')
        .order('tanggal_jatuh_tempo', { ascending: true })

      if (filters.startDate) {
        query = query.gte('tanggal_transaksi', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('tanggal_transaksi', filters.endDate)
      }

      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError
      return data || []
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    // Pembayaran pembelian
    getPembayaranPembelian,
    createPembayaranPembelian,
    deletePembayaranPembelian,
    // Pembayaran penjualan
    getPembayaranPenjualan,
    createPembayaranPenjualan,
    deletePembayaranPenjualan,
    // Laporan
    getLaporanHutang,
    getLaporanPiutang
  }
}