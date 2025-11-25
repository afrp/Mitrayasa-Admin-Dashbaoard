import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency, formatDate } from './formatters'

export async function generateInvoicePDF(invoiceData) {
  const doc = new jsPDF()
  
  // Colors
  const primaryColor = [27, 0, 101] // #1b0065
  const textColor = [0, 0, 0]
  const lightGray = [245, 245, 245]
  
  // Header with company info
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, 210, 45, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('KOPERASI SUSU MITRAYASA', 105, 20, { align: 'center' })
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('Dairy Natural', 105, 28, { align: 'center' })
  
  doc.setFontSize(9)
  doc.text('Jl. Peternakan No. 123, Malang, Jawa Timur', 105, 35, { align: 'center' })
  doc.text('Telp: (0341) 123456 | Email: info@mitrayasa.com', 105, 40, { align: 'center' })
  
  // Invoice title
  doc.setTextColor(...textColor)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', 20, 60)
  
  // Invoice details (left side)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('No Invoice:', 20, 70)
  doc.text('Tanggal:', 20, 76)
  doc.text('Jatuh Tempo:', 20, 82)
  
  doc.setFont('helvetica', 'normal')
  doc.text(invoiceData.no_invoice || '-', 50, 70)
  doc.text(formatDate(invoiceData.tanggal_dibuat, 'dd/MM/yyyy'), 50, 76)
  doc.text(formatDate(invoiceData.jatuh_tempo, 'dd/MM/yyyy'), 50, 82)
  
  // Bill to (right side)
  doc.setFont('helvetica', 'bold')
  doc.text('Kepada Yth:', 120, 70)
  doc.setFont('helvetica', 'normal')
  doc.text(invoiceData.pembeli?.nama_pembeli || '-', 120, 76)
  
  // Wrap alamat if too long
  const alamat = invoiceData.pembeli?.alamat || '-'
  const alamatLines = doc.splitTextToSize(alamat, 70)
  doc.text(alamatLines, 120, 82)
  
  // Calculate table start position
  const tableStartY = 100
  
  // Prepare table data
  const hargaSatuan = invoiceData.quantity > 0 
    ? invoiceData.harga_total / invoiceData.quantity 
    : 0
  
  const tableData = [
    [
      '1',
      invoiceData.produk?.nama_produk || '-',
      `${invoiceData.quantity} ${invoiceData.satuan}`,
      formatCurrency(hargaSatuan),
      formatCurrency(invoiceData.harga_total)
    ]
  ]
  
  // Draw table using autoTable
  autoTable(doc, {
    startY: tableStartY,
    head: [['No', 'Produk', 'Qty', 'Harga Satuan', 'Subtotal']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 10
    },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 70 },
      2: { cellWidth: 30 },
      3: { cellWidth: 35 },
      4: { cellWidth: 35, halign: 'right' }
    },
    margin: { left: 20, right: 20 }
  })
  
  // Get final Y position after table
  const finalY = doc.lastAutoTable.finalY + 10
  const summaryX = 120
  
  // Summary box
  doc.setFillColor(...lightGray)
  doc.rect(summaryX, finalY, 70, 35, 'F')
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...textColor)
  
  // Subtotal
  doc.text('Subtotal:', summaryX + 5, finalY + 8)
  doc.text(formatCurrency(invoiceData.harga_total), summaryX + 65, finalY + 8, { align: 'right' })
  
  // Pajak
  doc.text('Pajak:', summaryX + 5, finalY + 16)
  doc.text(formatCurrency(invoiceData.pajak || 0), summaryX + 65, finalY + 16, { align: 'right' })
  
  // Line separator
  doc.setDrawColor(...primaryColor)
  doc.setLineWidth(0.5)
  doc.line(summaryX + 5, finalY + 20, summaryX + 65, finalY + 20)
  
  // Grand Total
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('TOTAL:', summaryX + 5, finalY + 28)
  doc.text(formatCurrency(invoiceData.grand_total), summaryX + 65, finalY + 28, { align: 'right' })
  
  // Keterangan if exists
  if (invoiceData.keterangan) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('Keterangan:', 20, finalY + 50)
    const keteranganLines = doc.splitTextToSize(invoiceData.keterangan, 170)
    doc.text(keteranganLines, 20, finalY + 56)
  }
  
  // Footer
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(9)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(128, 128, 128)
  doc.text('Terima kasih atas kepercayaan Anda', 105, pageHeight - 30, { align: 'center' })
  doc.text('Pembayaran harap ditransfer ke: Bank BCA 1234567890 a.n. Koperasi Susu Mitrayasa', 105, pageHeight - 24, { align: 'center' })
  
  doc.setDrawColor(...primaryColor)
  doc.setLineWidth(0.5)
  doc.line(20, pageHeight - 18, 190, pageHeight - 18)
  
  doc.setFontSize(8)
  const now = new Date()
  const timestamp = formatDate(now, 'dd/MM/yyyy') + ' ' + now.toLocaleTimeString('id-ID')
  doc.text(`Dokumen ini digenerate otomatis pada ${timestamp}`, 105, pageHeight - 12, { align: 'center' })
  
  // Open in new tab
  window.open(doc.output('bloburl'), '_blank')
}