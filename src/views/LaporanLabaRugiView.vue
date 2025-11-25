<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useLaporan } from '../composables/useLaporan'
import { formatCurrency, formatDate } from '../utils/formatters'
import { exportLaporanLabaRugi } from '../utils/excelExport'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Calendar from 'primevue/calendar'
import Card from 'primevue/card'
import Chart from 'primevue/chart'
import ProgressBar from 'primevue/progressbar'
import AppHeader from '../components/layout/AppHeader.vue'
import AppSidebar from '../components/layout/AppSidebar.vue'

const toast = useToast()
const { loading, getLaporanLabaRugi } = useLaporan()

// State
const sidebarVisible = ref(false)
const startDate = ref(null)
const endDate = ref(null)
const reportData = ref([])
const showResult = ref(false)
const chartData = ref(null)
const chartOptions = ref(null)

// Computed
const totalPendapatan = computed(() => {
  return reportData.value.reduce((sum, item) => sum + (item.total_pendapatan || 0), 0)
})

const totalHPP = computed(() => {
  return reportData.value.reduce((sum, item) => sum + (item.total_hpp || 0), 0)
})

const labaKotor = computed(() => {
  return totalPendapatan.value - totalHPP.value
})

const totalBiayaOperasional = computed(() => {
  return reportData.value.reduce((sum, item) => sum + (item.total_biaya_operasional || 0), 0)
})

const labaBersih = computed(() => {
  return labaKotor.value - totalBiayaOperasional.value
})

const marginPercentage = computed(() => {
  if (totalPendapatan.value === 0) return 0
  return ((labaBersih.value / totalPendapatan.value) * 100).toFixed(2)
})

const marginSeverity = computed(() => {
  const margin = parseFloat(marginPercentage.value)
  if (margin >= 30) return 'success'
  if (margin >= 15) return 'warning'
  return 'danger'
})

const canExport = computed(() => {
  return showResult.value && reportData.value.length > 0
})

// Methods
function toggleSidebar() {
  sidebarVisible.value = !sidebarVisible.value
}

async function handleProses() {
  if (!startDate.value || !endDate.value) {
    toast.add({
      severity: 'warn',
      summary: 'Peringatan',
      detail: 'Harap lengkapi tanggal awal dan akhir',
      life: 3000
    })
    return
  }

  try {
    const data = await getLaporanLabaRugi(
      formatDate(startDate.value, 'yyyy-MM-dd'),
      formatDate(endDate.value, 'yyyy-MM-dd')
    )
    
    reportData.value = data
    showResult.value = true
    
    // Generate chart data
    generateChartData(data)

    if (data.length === 0) {
      toast.add({
        severity: 'info',
        summary: 'Info',
        detail: 'Tidak ada data pada periode yang dipilih',
        life: 3000
      })
    }
  } catch (error) {
    console.error('Error:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Gagal memuat laporan: ' + error.message,
      life: 3000
    })
  }
}

function generateChartData(data) {
  const labels = data.map(item => item.periode)
  const pendapatanData = data.map(item => item.total_pendapatan)
  const hppData = data.map(item => item.total_hpp)
  const labaBersihData = data.map(item => item.laba_bersih)

  chartData.value = {
    labels: labels,
    datasets: [
      {
        label: 'Pendapatan',
        data: pendapatanData,
        backgroundColor: '#10b981',
        borderColor: '#10b981',
        borderWidth: 1
      },
      {
        label: 'HPP',
        data: hppData,
        backgroundColor: '#f97316',
        borderColor: '#f97316',
        borderWidth: 1
      },
      {
        label: 'Laba Bersih',
        data: labaBersihData,
        backgroundColor: '#1b0065',
        borderColor: '#1b0065',
        borderWidth: 1
      }
    ]
  }

  chartOptions.value = {
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
            return context.dataset.label + ': ' + formatCurrency(context.parsed.y)
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

function handleExport() {
  if (!canExport.value) return

  try {
    const summary = {
      totalPendapatan: totalPendapatan.value,
      totalHPP: totalHPP.value,
      labaKotor: labaKotor.value,
      biayaOperasional: totalBiayaOperasional.value,
      labaBersih: labaBersih.value,
      marginPercentage: marginPercentage.value
    }

    exportLaporanLabaRugi(
      reportData.value,
      {
        start: formatDate(startDate.value, 'yyyy-MM-dd'),
        end: formatDate(endDate.value, 'yyyy-MM-dd')
      },
      summary
    )

    toast.add({
      severity: 'success',
      summary: 'Berhasil',
      detail: 'Laporan berhasil diexport ke Excel',
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Gagal export laporan',
      life: 3000
    })
  }
}

// Lifecycle
onMounted(() => {
  // Set default dates (last 3 months)
  const today = new Date()
  endDate.value = today
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(today.getMonth() - 3)
  startDate.value = threeMonthsAgo
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <AppHeader @toggle-sidebar="toggleSidebar" />
    <AppSidebar v-model:visible="sidebarVisible" />
    <div class="flex container-dsk">
      <main class="flex-1 cont-md">
        <div class="page-header pt-8">
          <h1 class="text-3xl font-bold text-gray-800">Laporan Laba Rugi</h1>          
        </div>

        <!-- Filter Card -->
        <Card class="mb-6">
          <template #content>
            <div class="card-lap gap-2">
              <!-- Tanggal Awal -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Tanggal Awal *</label>
                <Calendar
                  v-model="startDate"
                  dateFormat="dd/mm/yy"
                  class="w-full"
                  placeholder="Pilih tanggal awal"
                />
              </div>

              <!-- Tanggal Akhir -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Tanggal Akhir *</label>
                <Calendar
                  v-model="endDate"
                  dateFormat="dd/mm/yy"
                  :minDate="startDate"
                  class="w-full"
                  placeholder="Pilih tanggal akhir"
                />
              </div>

              <!-- Buttons -->
              <div class="flex items-end gap-3">
                <Button
                  label="Proses"
                  icon="pi pi-search"
                  @click="handleProses"
                  :loading="loading"
                  class="flex-1"
                />
                <Button
                  label="Export to Excel"
                  icon="pi pi-file-excel"
                  severity="success"
                  @click="handleExport"
                  :disabled="!canExport"
                />
              </div>
            </div>
          </template>
        </Card>

        <!-- Result Section -->
        <div v-if="showResult">
          <!-- Summary Cards Row 1 -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card class="bg-gradient-to-br from-green-500 to-green-700">
              <template #content>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600">Total Pendapatan</p>
                    <p class="text-3xl font-bold text-lime-600">{{ formatCurrency(totalPendapatan) }}</p>
                  </div>
                  <i class="pi pi-money-bill text-5xl text-lime-600"></i>
                </div>
              </template>
            </Card>

            <Card>
              <template #content>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600">Total HPP</p>
                    <p class="text-2xl font-bold text-orange-600">{{ formatCurrency(totalHPP) }}</p>
                  </div>
                  <i class="pi pi-shopping-cart text-4xl text-orange-500"></i>
                </div>
              </template>
            </Card>

            <Card>
              <template #content>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600">Laba Kotor</p>
                    <p class="text-2xl font-bold text-blue-600">{{ formatCurrency(labaKotor) }}</p>
                  </div>
                  <i class="pi pi-chart-line text-4xl text-blue-500"></i>
                </div>
              </template>
            </Card>
          </div>

          <!-- Summary Cards Row 2 -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <template #content>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600">Biaya Operasional</p>
                    <p class="text-2xl font-bold text-red-600">{{ formatCurrency(totalBiayaOperasional) }}</p>
                  </div>
                  <i class="pi pi-wallet text-4xl text-red-500"></i>
                </div>
              </template>
            </Card>

            <Card class="bg-gradient-to-br from-purple-500 to-purple-700">
              <template #content>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600">Laba Bersih</p>
                    <p class="text-3xl font-bold text-emerald-600">{{ formatCurrency(labaBersih) }}</p>
                  </div>
                  <i class="pi pi-dollar text-5xl text-emerald-600"></i>
                </div>
              </template>
            </Card>

            <Card>
              <template #content>
                <div>
                  <div class="flex items-center justify-between mb-3">
                    <p class="text-sm text-gray-600">Margin Keuntungan</p>
                    <i class="pi pi-percentage text-3xl text-purple-500"></i>
                  </div>
                  <p class="text-3xl font-bold mb-2" :class="{
                    'text-green-600': parseFloat(marginPercentage) >= 30,
                    'text-yellow-600': parseFloat(marginPercentage) >= 15 && parseFloat(marginPercentage) < 30,
                    'text-red-600': parseFloat(marginPercentage) < 15
                  }">
                    {{ marginPercentage }}%
                  </p>
                  <ProgressBar :value="parseFloat(marginPercentage)" :severity="marginSeverity" />
                </div>
              </template>
            </Card>
          </div>

          <!-- Chart -->
          <Card class="mb-6" v-if="chartData">
            <template #title>
              <div class="flex items-center gap-2">
                <i class="pi pi-chart-bar text-purple-600"></i>
                <span>Grafik Laba Rugi Bulanan</span>
              </div>
            </template>
            <template #content>
              <div style="height: 400px">
                <Chart type="bar" :data="chartData" :options="chartOptions" />
              </div>
            </template>
          </Card>

          <!-- DataTable -->
          <div class="bg-white rounded-lg shadow-sm">
            <DataTable
              :value="reportData"
              paginator
              :rows="10"
              :rowsPerPageOptions="[10, 20, 50]"
              responsiveLayout="scroll"
              stripedRows
              :emptyMessage="'Tidak ada data'"
              scrollable
              tableStyle="min-width: 375px"
              class="table-mdm"
            >
              <Column field="no" header="No" style="width: 70px">
                <template #body="slotProps">
                  {{ slotProps.index + 1 }}
                </template>
              </Column>
              
              <Column field="periode" header="Periode" />
              
              <Column field="total_pendapatan" header="Pendapatan">
                <template #body="slotProps">
                  <span class="text-green-600 font-semibold">
                    {{ formatCurrency(slotProps.data.total_pendapatan) }}
                  </span>
                </template>
              </Column>
              
              <Column field="total_hpp" header="HPP">
                <template #body="slotProps">
                  {{ formatCurrency(slotProps.data.total_hpp) }}
                </template>
              </Column>
              
              <Column field="laba_kotor" header="Laba Kotor">
                <template #body="slotProps">
                  <span class="font-semibold text-blue-600">
                    {{ formatCurrency(slotProps.data.laba_kotor) }}
                  </span>
                </template>
              </Column>
              
              <Column field="total_biaya_operasional" header="Biaya Ops">
                <template #body="slotProps">
                  {{ formatCurrency(slotProps.data.total_biaya_operasional) }}
                </template>
              </Column>
              
              <Column field="laba_bersih" header="Laba Bersih">
                <template #body="slotProps">
                  <span class="font-bold" :class="{
                    'text-green-600': slotProps.data.laba_bersih > 0,
                    'text-red-600': slotProps.data.laba_bersih < 0
                  }">
                    {{ formatCurrency(slotProps.data.laba_bersih) }}
                  </span>
                </template>
              </Column>
              
              <Column field="margin_percentage" header="Margin %">
                <template #body="slotProps">
                  <span class="font-semibold" :class="{
                    'text-green-600': slotProps.data.margin_percentage >= 30,
                    'text-yellow-600': slotProps.data.margin_percentage >= 15 && slotProps.data.margin_percentage < 30,
                    'text-red-600': slotProps.data.margin_percentage < 15
                  }">
                    {{ slotProps.data.margin_percentage }}%
                  </span>
                </template>
              </Column>

              <template #footer>
                <div class="flex justify-between font-bold">
                  <span>TOTAL:</span>
                  <div class="flex gap-8">
                    <span class="text-green-600">{{ formatCurrency(totalPendapatan) }}</span>
                    <span>{{ formatCurrency(totalHPP) }}</span>
                    <span class="text-blue-600">{{ formatCurrency(labaKotor) }}</span>
                    <span>{{ formatCurrency(totalBiayaOperasional) }}</span>
                    <span class="text-purple-600">{{ formatCurrency(labaBersih) }}</span>
                    <span>{{ marginPercentage }}%</span>
                  </div>
                </div>
              </template>
            </DataTable>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.ml-64 {
  margin-left: 16rem;
}
</style>