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
   * Get rincian transaksi kas pada satu tanggal (drill-down Laporan Kas).
   *
   * Mengikuti basis perhitungan RPC `get_laporan_kas` (AKRUAL, by tanggal_transaksi):
   *   penerimaan  = penjualan.total
   *   pengeluaran = pembelian.total + pengeluaran_kas.harga_total
   * Sehingga SUM(detail) per tanggal dijamin sama dengan total_penerimaan /
   * total_pengeluaran yang ditampilkan di baris laporan.
   *
   * @param {string} date - tanggal (yyyy-MM-dd), nilai `tanggal` dari baris laporan
   * @returns {Promise<{penerimaan: Array, pengeluaran: Array}>}
   */
  async function getKasDetailByDate(date) {
    loading.value = true
    error.value = null
    try {
      const [penjualanRes, pembelianRes, pengeluaranRes] = await Promise.all([
        supabase
          .from('penjualan')
          .select(`
            id, quantity, harga_jual, total,
            produk:produk_id(nama_produk, satuan),
            pembeli:pembeli_id(nama_pembeli),
            suplier:suplier_id(nama_suplier)
          `)
          .eq('tanggal_transaksi', date)
          .order('created_at', { ascending: true }),
        supabase
          .from('pembelian')
          .select(`
            id, quantity, harga_beli, total,
            produk:produk_id(nama_produk, satuan),
            suplier:suplier_id(nama_suplier)
          `)
          .eq('tanggal_transaksi', date)
          .order('created_at', { ascending: true }),
        supabase
          .from('pengeluaran_kas')
          .select('id, tipe, nama_produk, harga_total, keterangan')
          .eq('tanggal_transaksi', date)
          .order('created_at', { ascending: true })
      ])

      if (penjualanRes.error) throw penjualanRes.error
      if (pembelianRes.error) throw pembelianRes.error
      if (pengeluaranRes.error) throw pengeluaranRes.error

      const penerimaan = (penjualanRes.data || []).map((row) => ({
        jenis: 'Penjualan',
        deskripsi: `${row.produk?.nama_produk || '-'} (${row.quantity} ${row.produk?.satuan || ''})`.trim(),
        partner: row.pembeli?.nama_pembeli || row.suplier?.nama_suplier || '-',
        nominal: row.total || 0
      }))

      const pengeluaran = [
        ...(pembelianRes.data || []).map((row) => ({
          jenis: 'Pembelian',
          deskripsi: `${row.produk?.nama_produk || '-'} (${row.quantity} ${row.produk?.satuan || ''})`.trim(),
          partner: row.suplier?.nama_suplier || '-',
          nominal: row.total || 0
        })),
        ...(pengeluaranRes.data || []).map((row) => ({
          jenis: 'Pengeluaran Kas',
          deskripsi: row.nama_produk || '-',
          partner: row.tipe || '-',
          nominal: row.harga_total || 0
        }))
      ]

      return { penerimaan, pengeluaran }
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
    getKasDetailByDate,
    getLaporanLabaRugi
  }
}