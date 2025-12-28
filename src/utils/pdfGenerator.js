import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency, formatDate } from './formatters'

export async function generateInvoicePDF(invoiceData) {
  const doc = new jsPDF()
  
  // Colors
  const primaryColor = [27, 0, 101] // #1b0065
  const headerBlue = [1, 105, 180] // #0169B4
  const textColor = [51, 51, 51]
  const lightGray = [245, 245, 245]
  const whiteColor = [255, 255, 255]
  
  // Image paths
  const logoPath = new URL('../assets/Mitrayasa-logo.png', import.meta.url).href
  const headerBgPath = new URL('../assets/bg-header-pdf.png', import.meta.url).href // Background header
  
  // ============== HEADER WITH BACKGROUND IMAGE ==============
  
  // Add header background image (full width, scaled height)
  // Image dimensions: adjust height based on your image aspect ratio
  try {
    doc.addImage(headerBgPath, 'PNG', -1, -1, 210, 40)
  } catch (error) {
    console.warn('Header background image not found:', error)
    // Fallback: draw simple blue rectangle
    doc.setFillColor(...headerBlue)
    doc.rect(0, 0, 100, 40, 'F')
  }
  const rightCenterX = 155
  // Add company logo on top of background
  try {   
    
    // Add logo image
    doc.addImage(logoPath, 'PNG', 120, 8, 73.62, 18.9)
  } catch (error) {
    console.warn('Logo image not found:', error)
  }
  
  // INVOICE title on right side
  
  doc.setFontSize(38)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...whiteColor)
  doc.text('INVOICE', 45, 24, { align: 'center' })
  
  // Invoice number below INVOICE title
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...textColor)
  doc.text(`Invoice No: ${invoiceData.no_invoice || 'INV/0000/00/000'}`, rightCenterX - 20, 35, { align: 'center' })
  
  // Date below invoice number
  doc.text(`Date: ${formatDate(invoiceData.tanggal_dibuat, 'dd-MM-yyyy')}`, rightCenterX + 20, 35, { align: 'center' })
  
  // ============== END HEADER ==============
  
  // Invoice details (left side)
  doc.setTextColor(...textColor)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('No Invoice:', 20, 55)
  doc.text('Tanggal:', 20, 61)
  doc.text('Jatuh Tempo:', 20, 67)
  
  doc.setFont('helvetica', 'normal')
  doc.text(invoiceData.no_invoice || '-', 55, 55)
  doc.text(formatDate(invoiceData.tanggal_dibuat, 'dd/MM/yyyy'), 55, 61)
  doc.text(formatDate(invoiceData.jatuh_tempo, 'dd/MM/yyyy'), 55, 67)
  
  // Bill to (right side)
  doc.setFont('helvetica', 'bold')
  doc.text('Kepada Yth:', 120, 55)
  doc.setFont('helvetica', 'normal')
  doc.text(invoiceData.pembeli?.nama_pembeli || '-', 120, 61)
  
  // Wrap alamat if too long
  const alamat = invoiceData.pembeli?.alamat || '-'
  const alamatLines = doc.splitTextToSize(alamat, 70)
  doc.text(alamatLines, 120, 67)
  
  // Calculate table start position
  const tableStartY = 85
  
  // Prepare table data
  const hargaSatuan = invoiceData.quantity > 0 
    ? invoiceData.harga_total 
    : 0
  
  const tableData = [
    [
      '1',
      invoiceData.produk?.nama_produk || '-',
      `${invoiceData.quantity} ${invoiceData.satuan}`,
      formatCurrency(hargaSatuan),
      formatCurrency(invoiceData.harga_total * invoiceData.quantity)
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
  doc.text(formatCurrency(invoiceData.harga_total * invoiceData.quantity), summaryX + 65, finalY + 8, { align: 'right' })
  
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

  // Signature image
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Hormat kami,', 20, finalY + 50)

  const signPath = new URL('../assets/stamp-and-sign.png', import.meta.url).href
  try {
    doc.addImage(signPath, 'PNG', 2, finalY + 38, 65, 35)
  } catch (error) {
    console.warn('Signature image not found:', error)
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Pembayaran bisa ditransfer ke Bank BSI 7280830806 a.n. Fariz Amroeni', 20, finalY + 70)
  
  // Keterangan if exists
  if (invoiceData.keterangan) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('Keterangan:', 20, finalY + 90)
    const keteranganLines = doc.splitTextToSize(invoiceData.keterangan, 170)
    doc.text(keteranganLines, 20, finalY + 96)
  }
  
  // Footer
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(9)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(128, 128, 128)
  doc.text('Terima kasih atas kepercayaan Anda', 105, pageHeight - 30, { align: 'center' })
  doc.text('Jl. Pagerageung No. 28 Kab. Tasikmalaya - Jabar 46158, Telp: 0813 8538 9191 | Email: mitrayasadairy@gmail.com', 105, pageHeight - 24, { align: 'center' })
  
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