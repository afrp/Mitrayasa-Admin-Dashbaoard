<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useLaporan } from '../composables/useLaporan'
import { formatCurrency, formatDate } from '../utils/formatters'
import { exportLaporanKas } from '../utils/excelExport'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Calendar from 'primevue/calendar'
import Card from 'primevue/card'
import Chart from 'primevue/chart'
import AppHeader from '../components/layout/AppHeader.vue'
import AppSidebar from '../components/layout/AppSidebar.vue'
import PermissionGuard from '../components/PermissionGuard.vue'

const toast = useToast()
const { loading, getLaporanKas, getKasDetailByDate } = useLaporan()

// State
const sidebarVisible = ref(false)
const startDate = ref(null)
const endDate = ref(null)
const reportData = ref([])
const showResult = ref(false)
const chartData = ref(null)
const chartOptions = ref(null)

// Row expansion (drill-down rincian per tanggal)
const expandedRows = ref({})
const detailMap = ref({})        // { [tanggal]: { penerimaan: [], pengeluaran: [] } }
const detailLoading = ref({})    // { [tanggal]: boolean }

// Computed
const saldoAwal = computed(() => {
  if (reportData.value.length === 0) return 0
  return reportData.value[0].saldo_awal || 0
})

const totalPenerimaan = computed(() => {
  return reportData.value.reduce((sum, item) => sum + (item.total_penerimaan || 0), 0)
})

const totalPengeluaran = computed(() => {
  return reportData.value.reduce((sum, item) => sum + (item.total_pengeluaran || 0), 0)
})

const saldoAkhir = computed(() => {
  if (reportData.value.length === 0) return 0
  return reportData.value[reportData.value.length - 1].saldo_akhir || 0
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
    const data = await getLaporanKas(
      formatDate(startDate.value, 'yyyy-MM-dd'),
      formatDate(endDate.value, 'yyyy-MM-dd')
    )
    
    reportData.value = data
    showResult.value = true

    // Reset drill-down cache untuk hasil baru
    expandedRows.value = {}
    detailMap.value = {}
    detailLoading.value = {}

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

async function onRowExpand(event) {
  const tanggal = event.data.tanggal
  // Sudah ada di cache → tidak perlu fetch ulang
  if (detailMap.value[tanggal]) return

  detailLoading.value[tanggal] = true
  try {
    detailMap.value[tanggal] = await getKasDetailByDate(
      formatDate(tanggal, 'yyyy-MM-dd')
    )
  } catch (error) {
    console.error('Error loading detail:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Gagal memuat rincian transaksi: ' + error.message,
      life: 3000
    })
  } finally {
    detailLoading.value[tanggal] = false
  }
}

function detailSubtotal(items) {
  if (!items) return 0
  return items.reduce((sum, item) => sum + (item.nominal || 0), 0)
}

function generateChartData(data) {
  const labels = data.map(item => formatDate(item.tanggal, 'dd/MM'))
  const saldoData = data.map(item => item.saldo_akhir)

  chartData.value = {
    labels: labels,
    datasets: [
      {
        label: 'Saldo Akhir',
        data: saldoData,
        fill: false,
        borderColor: '#1b0065',
        backgroundColor: '#1b0065',
        tension: 0.4
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
            return 'Saldo: ' + formatCurrency(context.parsed.y)
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

async function handleExport() {
  if (!canExport.value) return

  try {
    const summary = {
      saldoAwal: saldoAwal.value,
      totalPenerimaan: totalPenerimaan.value,
      totalPengeluaran: totalPengeluaran.value,
      saldoAkhir: saldoAkhir.value
    }

    // Kumpulkan rincian transaksi semua tanggal (pakai cache, fetch sisanya)
    const detailRows = []
    for (const row of reportData.value) {
      const tanggal = row.tanggal
      if (!detailMap.value[tanggal]) {
        detailMap.value[tanggal] = await getKasDetailByDate(
          formatDate(tanggal, 'yyyy-MM-dd')
        )
      }
      const detail = detailMap.value[tanggal]
      detail.penerimaan.forEach((item) =>
        detailRows.push({ tanggal, arus: 'Penerimaan', ...item })
      )
      detail.pengeluaran.forEach((item) =>
        detailRows.push({ tanggal, arus: 'Pengeluaran', ...item })
      )
    }

    exportLaporanKas(
      reportData.value,
      {
        start: formatDate(startDate.value, 'yyyy-MM-dd'),
        end: formatDate(endDate.value, 'yyyy-MM-dd')
      },
      summary,
      detailRows
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
  // Set default dates (last 30 days)
  const today = new Date()
  endDate.value = today
  const monthAgo = new Date()
  monthAgo.setDate(today.getDate() - 30)
  startDate.value = monthAgo
})
</script>

<template>
  <PermissionGuard permission="laporan-kas" class="min-h-screen bg-gray-50">
    <AppHeader @toggle-sidebar="toggleSidebar" />
    <AppSidebar v-model:visible="sidebarVisible" />
    <div class="flex container-dsk">
      <main class="flex-1 cont-md" >
        <div class="page-header pt-8">
          <h1>Laporan Kas</h1>          
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
          <!-- Summary Cards -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <template #content>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600">Saldo Awal Periode</p>
                    <p class="text-2xl font-bold text-gray-800">{{ formatCurrency(saldoAwal) }}</p>
                  </div>
                  <i class="pi pi-wallet text-4xl text-gray-500"></i>
                </div>
              </template>
            </Card>

            <Card>
              <template #content>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600">Total Penerimaan</p>
                    <p class="text-2xl font-bold text-green-600">{{ formatCurrency(totalPenerimaan) }}</p>
                  </div>
                  <i class="pi pi-arrow-down text-4xl text-green-500"></i>
                </div>
              </template>
            </Card>

            <Card>
              <template #content>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600">Total Pengeluaran</p>
                    <p class="text-2xl font-bold text-red-600">{{ formatCurrency(totalPengeluaran) }}</p>
                  </div>
                  <i class="pi pi-arrow-up text-4xl text-red-500"></i>
                </div>
              </template>
            </Card>

            <Card class="bg-gradient-to-br from-purple-500 to-purple-700">
              <template #content>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600">Saldo Akhir Periode</p>
                    <p class="text-3xl font-bold text-orange-600">{{ formatCurrency(saldoAkhir) }}</p>
                  </div>
                  <i class="pi pi-money-bill text-4xl text-orange-600"></i>
                </div>
              </template>
            </Card>
          </div>

          <!-- Chart -->
          <Card class="mb-6" v-if="chartData">
            <template #title>
              <div class="flex items-center gap-2">
                <i class="pi pi-chart-line text-purple-600"></i>
                <span>Grafik Perkembangan Saldo</span>
              </div>
            </template>
            <template #content>
              <div style="height: 300px">
                <Chart type="line" :data="chartData" :options="chartOptions" />
              </div>
            </template>
          </Card>

          <!-- DataTable -->
          <div class="bg-white rounded-lg shadow-sm">
            <DataTable
              :value="reportData"
              v-model:expandedRows="expandedRows"
              dataKey="tanggal"
              @row-expand="onRowExpand"
              paginator
              :rows="10"
              :rowsPerPageOptions="[10, 20, 50]"
              responsiveLayout="scroll"
              stripedRows
              :emptyMessage="'Tidak ada data kas'"
              scrollable
              tableStyle="min-width: 375px"
              class="table-mdm"
            >
              <Column expander style="width: 3rem" />

              <Column field="no" header="No" style="width: 70px">
                <template #body="slotProps">
                  {{ slotProps.index + 1 }}
                </template>
              </Column>
              
              <Column field="tanggal" header="Tanggal">
                <template #body="slotProps">
                  {{ formatDate(slotProps.data.tanggal, 'dd/MM/yyyy') }}
                </template>
              </Column>
              
              <Column field="saldo_awal" header="Saldo Awal">
                <template #body="slotProps">
                  {{ formatCurrency(slotProps.data.saldo_awal) }}
                </template>
              </Column>
              
              <Column field="total_penerimaan" header="Penerimaan">
                <template #body="slotProps">
                  <span class="text-green-600 font-semibold">
                    {{ formatCurrency(slotProps.data.total_penerimaan) }}
                  </span>
                </template>
              </Column>
              
              <Column field="total_pengeluaran" header="Pengeluaran">
                <template #body="slotProps">
                  <span class="text-red-600 font-semibold">
                    {{ formatCurrency(slotProps.data.total_pengeluaran) }}
                  </span>
                </template>
              </Column>
              
              <Column field="saldo_akhir" header="Saldo Akhir">
                <template #body="slotProps">
                  <span class="font-bold">
                    {{ formatCurrency(slotProps.data.saldo_akhir) }}
                  </span>
                </template>
              </Column>

              <template #expansion="slotProps">
                <div class="p-4 bg-gray-50">
                  <div v-if="detailLoading[slotProps.data.tanggal]" class="flex items-center gap-2 text-gray-500 py-4">
                    <i class="pi pi-spin pi-spinner"></i>
                    <span>Memuat rincian...</span>
                  </div>

                  <div v-else class="flex flex-col gap-6">
                    <!-- Rincian Penerimaan -->
                    <div>
                      <h4 class="flex items-center gap-2 font-semibold text-green-700 mb-2">
                        <i class="pi pi-arrow-down"></i>
                        Rincian Penerimaan
                      </h4>
                      <DataTable
                        :value="detailMap[slotProps.data.tanggal]?.penerimaan"
                        :emptyMessage="'Tidak ada penerimaan'"
                        responsiveLayout="scroll"
                        class="text-sm"
                      >
                        <Column field="jenis" header="Jenis" style="width: 130px" />
                        <Column field="deskripsi" header="Keterangan" />
                        <Column field="partner" header="Dari" />
                        <Column field="nominal" header="Nominal" style="width: 160px">
                          <template #body="d">
                            <span class="text-green-600 font-medium">{{ formatCurrency(d.data.nominal) }}</span>
                          </template>
                        </Column>
                        <template #footer>
                          <div class="flex justify-end gap-4 font-semibold text-green-700">
                            <span>Total Penerimaan</span>
                            <span>{{ formatCurrency(detailSubtotal(detailMap[slotProps.data.tanggal]?.penerimaan)) }}</span>
                          </div>
                        </template>
                      </DataTable>
                    </div>

                    <!-- Rincian Pengeluaran -->
                    <div>
                      <h4 class="flex items-center gap-2 font-semibold text-red-700 mb-2">
                        <i class="pi pi-arrow-up"></i>
                        Rincian Pengeluaran
                      </h4>
                      <DataTable
                        :value="detailMap[slotProps.data.tanggal]?.pengeluaran"
                        :emptyMessage="'Tidak ada pengeluaran'"
                        responsiveLayout="scroll"
                        class="text-sm"
                      >
                        <Column field="jenis" header="Jenis" style="width: 150px" />
                        <Column field="deskripsi" header="Keterangan" />
                        <Column field="partner" header="Ke / Tipe" />
                        <Column field="nominal" header="Nominal" style="width: 160px">
                          <template #body="d">
                            <span class="text-red-600 font-medium">{{ formatCurrency(d.data.nominal) }}</span>
                          </template>
                        </Column>
                        <template #footer>
                          <div class="flex justify-end gap-4 font-semibold text-red-700">
                            <span>Total Pengeluaran</span>
                            <span>{{ formatCurrency(detailSubtotal(detailMap[slotProps.data.tanggal]?.pengeluaran)) }}</span>
                          </div>
                        </template>
                      </DataTable>
                    </div>
                  </div>
                </div>
              </template>
            </DataTable>
          </div>
        </div>
      </main>
    </div>
  </PermissionGuard>
</template>

<style scoped>
.ml-64 {
  margin-left: 16rem;
}
</style>