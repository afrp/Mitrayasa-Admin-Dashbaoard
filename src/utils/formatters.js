/**
 * Format number to Indonesian Rupiah currency
 * @param {number} value - The numeric value to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value) {
  if (value === null || value === undefined) return 'Rp 0'
  
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

/**
 * Format date to various formats
 * @param {Date|string} date - Date to format
 * @param {string} format - Format pattern (default: 'dd/MM/yyyy')
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'dd/MM/yyyy') {
  if (!date) return ''
  
  const d = new Date(date)
  
  if (isNaN(d.getTime())) return ''
  
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  
  // Common format patterns
  const formats = {
    'dd/MM/yyyy': `${day}/${month}/${year}`,
    'yyyy-MM-dd': `${year}-${month}-${day}`,
    'dd-MM-yyyy': `${day}-${month}-${year}`,
    'MM/dd/yyyy': `${month}/${day}/${year}`,
    'dd MMM yyyy': `${day} ${getMonthName(d.getMonth())} ${year}`,
    'dd MMMM yyyy': `${day} ${getMonthNameFull(d.getMonth())} ${year}`
  }
  
  return formats[format] || formats['dd/MM/yyyy']
}

/**
 * Get short month name in Indonesian
 * @param {number} monthIndex - Month index (0-11)
 * @returns {string} Short month name
 */
function getMonthName(monthIndex) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']
  return months[monthIndex]
}

/**
 * Get full month name in Indonesian
 * @param {number} monthIndex - Month index (0-11)
 * @returns {string} Full month name
 */
function getMonthNameFull(monthIndex) {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]
  return months[monthIndex]
}

/**
 * Format number with thousand separators
 * @param {number} value - Number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(value) {
  if (value === null || value === undefined) return '0'
  return new Intl.NumberFormat('id-ID').format(value)
}

/**
 * Parse Indonesian formatted number back to number
 * @param {string} formattedNumber - Formatted number string
 * @returns {number} Parsed number
 */
export function parseFormattedNumber(formattedNumber) {
  if (!formattedNumber) return 0
  return parseFloat(formattedNumber.replace(/\./g, '').replace(',', '.'))
}

/**
 * Format date to relative time (e.g., "2 hari yang lalu")
 * @param {Date|string} date - Date to format
 * @returns {string} Relative time string
 */
export function formatRelativeTime(date) {
  if (!date) return ''
  
  const d = new Date(date)
  const now = new Date()
  const diffMs = now - d
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  
  if (diffSec < 60) return 'Baru saja'
  if (diffMin < 60) return `${diffMin} menit yang lalu`
  if (diffHour < 24) return `${diffHour} jam yang lalu`
  if (diffDay < 7) return `${diffDay} hari yang lalu`
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} minggu yang lalu`
  if (diffDay < 365) return `${Math.floor(diffDay / 30)} bulan yang lalu`
  return `${Math.floor(diffDay / 365)} tahun yang lalu`
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength = 50) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Format percentage
 * @param {number} value - Value to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage
 */
export function formatPercentage(value, decimals = 2) {
  if (value === null || value === undefined) return '0%'
  return value.toFixed(decimals) + '%'
}