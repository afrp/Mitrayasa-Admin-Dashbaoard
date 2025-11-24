import { ref } from 'vue'
import { supabase } from './useSupabase'

export function useLaporan() {
  const loading = ref(false)
  const error = ref(null)

  /**
   * Get laporan suplier (pembelian by suplier)
   */
  async function getLaporanSuplier(startDate, endDate, suplierId) {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('pembelian')
        .select(`
          *,
          produk:produk_id(*),
          suplier:suplier_id(*)
        `)
        .eq('suplier_id', suplierId)
        .gte('tanggal_transaksi', startDate)
        .lte('tanggal_transaksi', endDate)
        .order('tanggal_transaksi', { ascending: false })

      if (fetchError) throw fetchError
      return data || []
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Get laporan pembeli (penjualan by pembeli)
   */
  async function getLaporanPembeli(startDate, endDate, pembeliId) {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('penjualan')
        .select(`
          *,
          produk:produk_id(*),
          pembeli:pembeli_id(*)
        `)
        .eq('pembeli_id', pembeliId)
        .gte('tanggal_transaksi', startDate)
        .lte('tanggal_transaksi', endDate)
        .order('tanggal_transaksi', { ascending: false })

      if (fetchError) throw fetchError
      return data || []
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Get laporan penjualan (by produk)
   */
  async function getLaporanPenjualan(startDate, endDate, produkId) {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('penjualan')
        .select(`
          *,
          produk:produk_id(*),
          pembeli:pembeli_id(*),
          suplier:suplier_id(*)
        `)
        .eq('produk_id', produkId)
        .gte('tanggal_transaksi', startDate)
        .lte('tanggal_transaksi', endDate)
        .order('tanggal_transaksi', { ascending: false })

      if (fetchError) throw fetchError
      return data || []
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Get laporan pembelian (by produk)
   */
  async function getLaporanPembelian(startDate, endDate, produkId) {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('pembelian')
        .select(`
          *,
          produk:produk_id(*),
          suplier:suplier_id(*)
        `)
        .eq('produk_id', produkId)
        .gte('tanggal_transaksi', startDate)
        .lte('tanggal_transaksi', endDate)
        .order('tanggal_transaksi', { ascending: false })

      if (fetchError) throw fetchError
      return data || []
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Get laporan kas (using RPC function)
   */
  async function getLaporanKas(startDate, endDate) {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .rpc('get_laporan_kas', {
          start_date: startDate,
          end_date: endDate
        })

      if (fetchError) throw fetchError
      return data || []
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Get laporan laba rugi (using RPC function)
   */
  async function getLaporanLabaRugi(startDate, endDate) {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .rpc('get_laporan_laba_rugi', {
          start_date: startDate,
          end_date: endDate
        })

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
    getLaporanSuplier,
    getLaporanPembeli,
    getLaporanPenjualan,
    getLaporanPembelian,
    getLaporanKas,
    getLaporanLabaRugi
  }
}