import * as XLSX from 'xlsx'
import { formatCurrency, formatDate } from './formatters'

/**
 * Export data to Excel file
 */
export function exportToExcel(data, filename, sheetName = 'Sheet1') {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)
  
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`)
}

/**
 * Export Laporan Suplier to Excel
 */
export function exportLaporanSuplier(data, suplierName, dateRange) {
  const formattedData = data.map((row, index) => ({
    'No': index + 1,
    'Tanggal': formatDate(row.tanggal_transaksi, 'dd/MM/yyyy'),
    'Produk': row.produk?.nama_produk || '-',
    'Nama Suplier': row.suplier?.nama_suplier || '-',
    'Waktu Beli': row.waktu_beli,
    'Quantity': `${row.quantity} ${row.produk?.satuan || ''}`,
    'Harga Beli': row.harga_beli,
    'Total': row.total,
    'Keterangan': row.keterangan || ''
  }))
  
  const filename = `Laporan_Suplier_${suplierName.replace(/\s+/g, '_')}_${dateRange.start}_${dateRange.end}`
  exportToExcel(formattedData, filename, 'Laporan Suplier')
}

/**
 * Export Laporan Pembeli to Excel
 */
export function exportLaporanPembeli(data, pembeliName, dateRange) {
  const formattedData = data.map((row, index) => ({
    'No': index + 1,
    'Tanggal': formatDate(row.tanggal_transaksi, 'dd/MM/yyyy'),
    'Produk': row.produk?.nama_produk || '-',
    'Nama Pembeli': row.pembeli?.nama_pembeli || '-',
    'Quantity': `${row.quantity} ${row.produk?.satuan || ''}`,
    'Harga Jual': row.harga_jual,
    'Total': row.total,
    'Keterangan': row.keterangan || ''
  }))
  
  const filename = `Laporan_Pembeli_${pembeliName.replace(/\s+/g, '_')}_${dateRange.start}_${dateRange.end}`
  exportToExcel(formattedData, filename, 'Laporan Pembeli')
}

/**
 * Export Laporan Penjualan to Excel
 */
export function exportLaporanPenjualan(data, produkName, dateRange) {
  const formattedData = data.map((row, index) => ({
    'No': index + 1,
    'Tanggal': formatDate(row.tanggal_transaksi, 'dd/MM/yyyy'),
    'Produk': row.produk?.nama_produk || '-',
    'Nama Pembeli': row.pembeli?.nama_pembeli || row.suplier?.nama_suplier || '-',
    'Quantity': `${row.quantity} ${row.produk?.satuan || ''}`,
    'Harga Jual': row.harga_jual,
    'Total': row.total,
    'Keterangan': row.keterangan || ''
  }))
  
  const filename = `Laporan_Penjualan_${produkName.replace(/\s+/g, '_')}_${dateRange.start}_${dateRange.end}`
  exportToExcel(formattedData, filename, 'Laporan Penjualan')
}

/**
 * Export Laporan Pembelian to Excel
 */
export function exportLaporanPembelian(data, produkName, dateRange) {
  const formattedData = data.map((row, index) => ({
    'No': index + 1,
    'Tanggal': formatDate(row.tanggal_transaksi, 'dd/MM/yyyy'),
    'Produk': row.produk?.nama_produk || '-',
    'Nama Suplier': row.suplier?.nama_suplier || '-',
    'Waktu Beli': row.waktu_beli,
    'Quantity': `${row.quantity} ${row.produk?.satuan || ''}`,
    'Harga Beli': row.harga_beli,
    'Total': row.total,
    'Keterangan': row.keterangan || ''
  }))
  
  const filename = `Laporan_Pembelian_${produkName.replace(/\s+/g, '_')}_${dateRange.start}_${dateRange.end}`
  exportToExcel(formattedData, filename, 'Laporan Pembelian')
}

/**
 * Export Laporan Kas to Excel
 */
export function exportLaporanKas(data, dateRange, summary, detailRows = []) {
  // Summary rows
  const summaryData = [
    { 'LAPORAN KAS': '', '': '', '': '', '': '', '': '' },
    { 'LAPORAN KAS': 'Periode', '': `${formatDate(dateRange.start, 'dd/MM/yyyy')} - ${formatDate(dateRange.end, 'dd/MM/yyyy')}` },
    { 'LAPORAN KAS': '', '': '', '': '', '': '', '': '' },
    { 'LAPORAN KAS': 'Saldo Awal Periode', '': formatCurrency(summary.saldoAwal) },
    { 'LAPORAN KAS': 'Total Penerimaan', '': formatCurrency(summary.totalPenerimaan) },
    { 'LAPORAN KAS': 'Total Pengeluaran', '': formatCurrency(summary.totalPengeluaran) },
    { 'LAPORAN KAS': 'Saldo Akhir Periode', '': formatCurrency(summary.saldoAkhir) },
    { 'LAPORAN KAS': '', '': '', '': '', '': '', '': '' },
    { 'LAPORAN KAS': 'DETAIL TRANSAKSI HARIAN', '': '', '': '', '': '', '': '' }
  ]
  
  // Detail data
  const detailData = data.map((row, index) => ({
    'No': index + 1,
    'Tanggal': formatDate(row.tanggal, 'dd/MM/yyyy'),
    'Saldo Awal': row.saldo_awal,
    'Penerimaan': row.total_penerimaan,
    'Pengeluaran': row.total_pengeluaran,
    'Saldo Akhir': row.saldo_akhir
  }))
  
  // Create workbook with 2 sheets
  const wb = XLSX.utils.book_new()
  
  // Summary sheet
  const wsSummary = XLSX.utils.json_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')
  
  // Detail sheet
  const wsDetail = XLSX.utils.json_to_sheet(detailData)
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail')

  // Rincian transaksi sheet (drill-down: darimana penerimaan & pengeluaran)
  if (detailRows.length > 0) {
    const rincianData = detailRows.map((row, index) => ({
      'No': index + 1,
      'Tanggal': formatDate(row.tanggal, 'dd/MM/yyyy'),
      'Arus': row.arus,
      'Jenis': row.jenis,
      'Keterangan': row.deskripsi,
      'Dari/Ke': row.partner,
      'Penerimaan': row.arus === 'Penerimaan' ? row.nominal : 0,
      'Pengeluaran': row.arus === 'Pengeluaran' ? row.nominal : 0
    }))
    const wsRincian = XLSX.utils.json_to_sheet(rincianData)
    XLSX.utils.book_append_sheet(wb, wsRincian, 'Rincian Transaksi')
  }

  const filename = `Laporan_Kas_${dateRange.start}_${dateRange.end}`
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

/**
 * Export Laporan Laba Rugi to Excel
 */
export function exportLaporanLabaRugi(data, dateRange, summary) {
  // Summary rows
  const summaryData = [
    { 'LAPORAN LABA RUGI': '', '': '', '': '' },
    { 'LAPORAN LABA RUGI': 'Periode', '': `${formatDate(dateRange.start, 'dd/MM/yyyy')} - ${formatDate(dateRange.end, 'dd/MM/yyyy')}` },
    { 'LAPORAN LABA RUGI': '', '': '', '': '' },
    { 'LAPORAN LABA RUGI': 'Total Pendapatan', '': formatCurrency(summary.totalPendapatan) },
    { 'LAPORAN LABA RUGI': 'Total HPP', '': formatCurrency(summary.totalHPP) },
    { 'LAPORAN LABA RUGI': 'Laba Kotor', '': formatCurrency(summary.labaKotor) },
    { 'LAPORAN LABA RUGI': 'Biaya Operasional', '': formatCurrency(summary.biayaOperasional) },
    { 'LAPORAN LABA RUGI': 'Laba Bersih', '': formatCurrency(summary.labaBersih) },
    { 'LAPORAN LABA RUGI': 'Margin %', '': `${summary.marginPercentage}%` },
    { 'LAPORAN LABA RUGI': '', '': '', '': '' },
    { 'LAPORAN LABA RUGI': 'DETAIL BULANAN', '': '', '': '' }
  ]
  
  // Monthly detail data
  const detailData = data.map((row, index) => ({
    'No': index + 1,
    'Periode': row.periode,
    'Pendapatan': row.total_pendapatan,
    'HPP': row.total_hpp,
    'Laba Kotor': row.laba_kotor,
    'Biaya Operasional': row.total_biaya_operasional,
    'Laba Bersih': row.laba_bersih,
    'Margin %': `${row.margin_percentage}%`
  }))
  
  // Create workbook with 2 sheets
  const wb = XLSX.utils.book_new()
  
  // Summary sheet
  const wsSummary = XLSX.utils.json_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')
  
  // Detail sheet
  const wsDetail = XLSX.utils.json_to_sheet(detailData)
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail Bulanan')
  
  const filename = `Laporan_Laba_Rugi_${dateRange.start}_${dateRange.end}`
  XLSX.writeFile(wb, `${filename}.xlsx`)
}