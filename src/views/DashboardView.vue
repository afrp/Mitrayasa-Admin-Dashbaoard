<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '../composables/useSupabase'
import { formatCurrency, formatDate } from '../utils/formatters'
import AppHeader from '../components/layout/AppHeader.vue'
import AppSidebar from '../components/layout/AppSidebar.vue'
import Card from 'primevue/card'
import Dropdown from 'primevue/dropdown'
import Calendar from 'primevue/calendar'
import Chart from 'primevue/chart'

const sidebarVisible = ref(false)
const loading = ref(false)

const filterOptions = ref([
  { label: 'Hari Ini', value: 'today' },
  { label: 'Minggu Ini', value: 'week' },
  { label: 'Bulan Ini', value: 'month' },
  { label: 'Custom', value: 'custom' }
])

const selectedFilter = ref('month')
const dateRange = ref(null)

// Summary data
const summaryData = ref({
  totalStok: 0,
  kasTerkini: 0,
  totalPenjualan: 0,
  totalPembelian: 0,
  totalHutang: 0,
  totalPiutang: 0
})

// Chart data
const penjualanChartData = ref(null)
const penjualanChartOptions = ref(null)
const pembelianChartData = ref(null)
const pembelianChartOptions = ref(null)

// Computed
const summaryCards = computed(() => [
  {
    title: 'Total Stok Produk',
    value: summaryData.value.totalStok,
    icon: 'pi-box',
    color: '#1b0065'
  },
  {
    title: 'Kas Terkini',
    value: summaryData.value.kasTerkini,
    icon: 'pi-wallet',
    color: '#1b0065',
    isCurrency: true
  },
  {
    title: 'Total Penjualan',
    value: summaryData.value.totalPenjualan,
    icon: 'pi-shopping-cart',
    color: '#1b0065',
    isCurrency: true
  },
  {
    title: 'Total Pembelian',
    value: summaryData.value.totalPembelian,
    icon: 'pi-shopping-bag',
    color: '#1b0065',
    isCurrency: true
  },
  {
    title: 'Total Hutang',
    value: summaryData.value.totalHutang,
    icon: 'pi-exclamation-circle',
    color: '#dc2626',
    isCurrency: true
  },
  {
    title: 'Total Piutang',
    value: summaryData.value.totalPiutang,
    icon: 'pi-hourglass',
    color: '#f59e0b',
    isCurrency: true
  }
])

// Methods
const toggleSidebar = () => {
  sidebarVisible.value = !sidebarVisible.value
}

const formatValue = (value, isCurrency) => {
  return isCurrency ? formatCurrency(value) : value
}

function getDateRange() {
  const today = new Date()
  let startDate, endDate

  switch (selectedFilter.value) {
    case 'today':
      startDate = endDate = formatDate(today, 'yyyy-MM-dd')
      break
    case 'week':
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      startDate = formatDate(weekStart, 'yyyy-MM-dd')
      endDate = formatDate(today, 'yyyy-MM-dd')
      break
    case 'month':
      startDate = formatDate(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd')
      endDate = formatDate(today, 'yyyy-MM-dd')
      break
    case 'custom':
      if (dateRange.value && dateRange.value.length === 2) {
        startDate = formatDate(dateRange.value[0], 'yyyy-MM-dd')
        endDate = formatDate(dateRange.value[1], 'yyyy-MM-dd')
      } else {
        // Fallback ke bulan ini jika custom range belum lengkap
        startDate = formatDate(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd')
        endDate = formatDate(today, 'yyyy-MM-dd')
      }
      break
    default:
      startDate = formatDate(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd')
      endDate = formatDate(today, 'yyyy-MM-dd')
  }

  return { startDate, endDate }
}

async function loadDashboardData() {
  loading.value = true
  try {
    const { startDate, endDate } = getDateRange()

    // 1. Total Stok Produk
    const { data: produkData } = await supabase
      .from('produk')
      .select('stok')
      .eq('is_active', true)

    summaryData.value.totalStok = produkData?.length || 0

    // 2. Total Penjualan
    const { data: penjualanData } = await supabase
      .from('penjualan')
      .select('total, tanggal_transaksi')
      .gte('tanggal_transaksi', startDate)
      .lte('tanggal_transaksi', endDate)

    summaryData.value.totalPenjualan = penjualanData?.reduce((sum, item) => sum + item.total, 0) || 0

    // 3. Total Pembelian
    const { data: pembelianData } = await supabase
      .from('pembelian')
      .select('total, tanggal_transaksi')
      .gte('tanggal_transaksi', startDate)
      .lte('tanggal_transaksi', endDate)

    summaryData.value.totalPembelian = pembelianData?.reduce((sum, item) => sum + item.total, 0) || 0

    // 4. Kas Terkini (Penjualan - Pembelian - Pengeluaran Kas)
    const { data: pengeluaranData } = await supabase
      .from('pengeluaran_kas')
      .select('harga_total')
      .lte('tanggal_transaksi', endDate)

    const totalPengeluaran = pengeluaranData?.reduce((sum, item) => sum + item.harga_total, 0) || 0

    // Total penjualan ALL TIME
    const { data: allPenjualanData } = await supabase
      .from('penjualan')
      .select('total')
      .lte('tanggal_transaksi', endDate)

    const totalAllPenjualan = allPenjualanData?.reduce((sum, item) => sum + item.total, 0) || 0

    // Total pembelian ALL TIME
    const { data: allPembelianData } = await supabase
      .from('pembelian')
      .select('total')
      .lte('tanggal_transaksi', endDate)

    const totalAllPembelian = allPembelianData?.reduce((sum, item) => sum + item.total, 0) || 0

    summaryData.value.kasTerkini = totalAllPenjualan - totalAllPembelian - totalPengeluaran

    // 5. Total Hutang (Belum Lunas dari pembelian)
    const { data: hutangData } = await supabase
      .from('pembelian')
      .select('sisa_hutang')
      .eq('status_pembayaran', 'Belum Lunas')

    summaryData.value.totalHutang = hutangData?.reduce((sum, item) => sum + (item.sisa_hutang || 0), 0) || 0

    // 6. Total Piutang (Belum Lunas dari penjualan)
    const { data: piutangData } = await supabase
      .from('penjualan')
      .select('sisa_piutang')
      .eq('status_pembayaran', 'Belum Lunas')

    summaryData.value.totalPiutang = piutangData?.reduce((sum, item) => sum + (item.sisa_piutang || 0), 0) || 0

    // Generate charts
    generatePenjualanChart(penjualanData || [])
    generatePembelianChart(pembelianData || [])

  } catch (error) {
    console.error('Error loading dashboard data:', error)
  } finally {
    loading.value = false
  }
}

function generatePenjualanChart(data) {
  // Group by date
  const groupedData = data.reduce((acc, item) => {
    const date = formatDate(item.tanggal_transaksi, 'dd/MM')
    if (!acc[date]) {
      acc[date] = 0
    }
    acc[date] += item.total
    return acc
  }, {})

  const labels = Object.keys(groupedData).sort()
  const values = labels.map(label => groupedData[label])

  penjualanChartData.value = {
    labels: labels,
    datasets: [
      {
        label: 'Penjualan',
        data: values,
        fill: false,
        borderColor: '#10b981',
        backgroundColor: '#10b981',
        tension: 0.4
      }
    ]
  }

  penjualanChartOptions.value = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return 'Penjualan: ' + formatCurrency(context.parsed.y)
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return formatCurrency(value)
          }
        }
      }
    }
  }
}

function generatePembelianChart(data) {
  // Group by date
  const groupedData = data.reduce((acc, item) => {
    const date = formatDate(item.tanggal_transaksi, 'dd/MM')
    if (!acc[date]) {
      acc[date] = 0
    }
    acc[date] += item.total
    return acc
  }, {})

  const labels = Object.keys(groupedData).sort()
  const values = labels.map(label => groupedData[label])

  pembelianChartData.value = {
    labels: labels,
    datasets: [
      {
        label: 'Pembelian',
        data: values,
        fill: false,
        borderColor: '#f97316',
        backgroundColor: '#f97316',
        tension: 0.4
      }
    ]
  }

  pembelianChartOptions.value = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return 'Pembelian: ' + formatCurrency(context.parsed.y)
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return formatCurrency(value)
          }
        }
      }
    }
  }
}

// Watch filter changes
watch([selectedFilter, dateRange], () => {
  // Only reload if custom filter has valid date range
  if (selectedFilter.value === 'custom') {
    if (dateRange.value && dateRange.value.length === 2) {
      loadDashboardData()
    }
  } else {
    loadDashboardData()
  }
})

// Lifecycle
onMounted(() => {
  loadDashboardData()
})
</script>

<template>
  <div class="page-layout">
    <AppHeader @toggle-sidebar="toggleSidebar" />
    <AppSidebar v-model:visible="sidebarVisible" />
    
    <main class="dashboard-main">
      <div class="dashboard-container">
        <div class="page-header">
          <h1>Dashboard</h1>
          <div class="filter-section">
            <Dropdown
              v-model="selectedFilter"
              :options="filterOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Pilih periode"
              class="filter-dropdown"
            />
            <Calendar
              v-if="selectedFilter === 'custom'"
              v-model="dateRange"
              selectionMode="range"
              :showIcon="true"
              placeholder="Pilih tanggal"
              dateFormat="dd/mm/yy"
              class="date-range-picker"
            />
          </div>
        </div>

        <!-- Summary Cards -->
        <div class="summary-grid">
          <Card
            v-for="(card, index) in summaryCards"
            :key="index"
            class="summary-card"
          >
            <template #content>
              <div class="card-content">
                <div class="card-icon" :style="{ color: card.color }">
                  <i :class="`pi ${card.icon}`"></i>
                </div>
                <div class="card-details">
                  <p class="card-title">{{ card.title }}</p>
                  <h2 class="card-value">{{ formatValue(card.value, card.isCurrency) }}</h2>
                </div>
              </div>
            </template>
          </Card>
        </div>

        <!-- Charts Section -->
        <div class="charts-section">
          <Card class="chart-card">
            <template #title>
              <div class="chart-header">
                <i class="pi pi-chart-line text-green-600"></i>
                <span>Grafik Penjualan</span>
              </div>
            </template>
            <template #content>
              <div v-if="loading" class="chart-loading">
                <i class="pi pi-spin pi-spinner text-4xl text-purple-600"></i>
                <p>Memuat data...</p>
              </div>
              <div v-else-if="penjualanChartData" class="chart-container">
                <Chart type="line" :data="penjualanChartData" :options="penjualanChartOptions" />
              </div>
              <div v-else class="chart-empty">
                <i class="pi pi-chart-line text-4xl text-gray-400"></i>
                <p>Tidak ada data penjualan</p>
              </div>
            </template>
          </Card>

          <Card class="chart-card">
            <template #title>
              <div class="chart-header">
                <i class="pi pi-chart-line text-orange-600"></i>
                <span>Grafik Pembelian</span>
              </div>
            </template>
            <template #content>
              <div v-if="loading" class="chart-loading">
                <i class="pi pi-spin pi-spinner text-4xl text-purple-600"></i>
                <p>Memuat data...</p>
              </div>
              <div v-else-if="pembelianChartData" class="chart-container">
                <Chart type="line" :data="pembelianChartData" :options="pembelianChartOptions" />
              </div>
              <div v-else class="chart-empty">
                <i class="pi pi-chart-line text-4xl text-gray-400"></i>
                <p>Tidak ada data pembelian</p>
              </div>
            </template>
          </Card>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>

.dashboard-main {
  margin-top: 60px;
  padding: 2rem;
}

.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
}

.filter-dropdown {
  min-width: 200px;
}

.date-range-picker {
  min-width: 250px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.summary-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8f5ff 100%);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.summary-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(27, 0, 101, 0.2);
}

.card-content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.card-icon {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(27, 0, 101, 0.1);
  border-radius: 12px;
  flex-shrink: 0;
}

.card-icon i {
  font-size: 2rem;
}

.card-details {
  flex: 1;
}

.card-title {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  color: #666;
  font-weight: 500;
}

.card-value {
  margin: 0;
  font-size: 1.75rem;
  color: #1b0065;
  font-weight: 700;
}

/* Charts Section */
.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.chart-card {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.chart-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1b0065;
}

.chart-container {
  height: 300px;
}

.chart-loading, .chart-empty {
  height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: #666;
}

@media (max-width: 768px) {
  .dashboard-main {
    padding: 1rem;
  }

  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .dashboard-header h1 {
    font-size: 1.5rem;
  }

  .filter-section {
    width: 100%;
    flex-direction: column;
  }

  .filter-dropdown,
  .date-range-picker {
    width: 100%;
  }

  .summary-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .card-value {
    font-size: 1.5rem;
  }

  .charts-section {
    grid-template-columns: 1fr;
  }

  .chart-container {
    height: 170px;
    width: 81vw;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .charts-section {
    grid-template-columns: 1fr;
  }
  .chart-container {
    height: 250px;
    width: 88vw;
  }
}
</style>