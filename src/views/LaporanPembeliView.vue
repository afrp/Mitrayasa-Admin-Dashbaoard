<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useLaporan } from '../composables/useLaporan'
import { usePembeli } from '../composables/usePembeli'
import { formatCurrency, formatDate } from '../utils/formatters'
import { exportLaporanPembeli } from '../utils/excelExport'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Calendar from 'primevue/calendar'
import Dropdown from 'primevue/dropdown'
import Card from 'primevue/card'
import AppHeader from '../components/layout/AppHeader.vue'
import AppSidebar from '../components/layout/AppSidebar.vue'

const toast = useToast()
const { loading, getLaporanPembeli } = useLaporan()
const { pembeli, getAllPembeli } = usePembeli()

// State
const sidebarVisible = ref(false)
const startDate = ref(null)
const endDate = ref(null)
const selectedPembeliId = ref(null)
const reportData = ref([])
const showResult = ref(false)

// Computed
const totalTransaksi = computed(() => reportData.value.length)

const totalQuantity = computed(() => {
  return reportData.value.reduce((sum, item) => sum + item.quantity, 0)
})

const totalPenjualan = computed(() => {
  return reportData.value.reduce((sum, item) => sum + item.total, 0)
})

const selectedPembeliName = computed(() => {
  const pembeliData = pembeli.value.find(p => p.id === selectedPembeliId.value)
  return pembeliData?.nama_pembeli || ''
})

const canExport = computed(() => {
  return showResult.value && reportData.value.length > 0
})

// Methods
function toggleSidebar() {
  sidebarVisible.value = !sidebarVisible.value
}

async function handleProses() {
  if (!startDate.value || !endDate.value || !selectedPembeliId.value) {
    toast.add({
      severity: 'warn',
      summary: 'Peringatan',
      detail: 'Harap lengkapi semua filter',
      life: 3000
    })
    return
  }

  try {
    const data = await getLaporanPembeli(
      formatDate(startDate.value, 'yyyy-MM-dd'),
      formatDate(endDate.value, 'yyyy-MM-dd'),
      selectedPembeliId.value
    )
    
    reportData.value = data
    showResult.value = true

    if (data.length === 0) {
      toast.add({
        severity: 'info',
        summary: 'Info',
        detail: 'Tidak ada transaksi pada periode yang dipilih',
        life: 3000
      })
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Gagal memuat laporan',
      life: 3000
    })
  }
}

function handleExport() {
  if (!canExport.value) return

  try {
    exportLaporanPembeli(
      reportData.value,
      selectedPembeliName.value,
      {
        start: formatDate(startDate.value, 'yyyy-MM-dd'),
        end: formatDate(endDate.value, 'yyyy-MM-dd')
      }
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
onMounted(async () => {
  await getAllPembeli()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <AppHeader @toggle-sidebar="toggleSidebar" />
    
    <div class="flex container-dsk">
      <AppSidebar v-model:visible="sidebarVisible" />
      
      <main class="flex-1 p-6" :class="{ 'ml-64': sidebarVisible }">
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-gray-800">Laporan Transaksi Pembeli</h1>
          <p class="text-gray-600">Laporan penjualan per pembeli berdasarkan periode</p>
        </div>

        <!-- Filter Card -->
        <Card class="mb-6">
          <template #content>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <!-- Pembeli -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-2">Pembeli *</label>
                <Dropdown
                  v-model="selectedPembeliId"
                  :options="pembeli"
                  optionLabel="nama_pembeli"
                  optionValue="id"
                  placeholder="Pilih pembeli"
                  class="w-full"
                  filter
                />
              </div>

              <!-- Buttons -->
              <div class="md:col-span-2 flex gap-3">
                <Button
                  label="Proses"
                  icon="pi pi-search"
                  @click="handleProses"
                  :loading="loading"
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
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <template #content>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600">Total Transaksi</p>
                    <p class="text-2xl font-bold text-gray-800">{{ totalTransaksi }}</p>
                  </div>
                  <i class="pi pi-shopping-bag text-4xl text-blue-500"></i>
                </div>
              </template>
            </Card>

            <Card>
              <template #content>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600">Total Quantity</p>
                    <p class="text-2xl font-bold text-gray-800">{{ totalQuantity.toFixed(2) }}</p>
                  </div>
                  <i class="pi pi-chart-line text-4xl text-green-500"></i>
                </div>
              </template>
            </Card>

            <Card>
              <template #content>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600">Total Penjualan</p>
                    <p class="text-2xl font-bold text-gray-800">{{ formatCurrency(totalPenjualan) }}</p>
                  </div>
                  <i class="pi pi-money-bill text-4xl text-purple-500"></i>
                </div>
              </template>
            </Card>
          </div>

          <!-- DataTable -->
          <div class="bg-white rounded-lg shadow-sm">
            <DataTable
              :value="reportData"
              paginator
              :rows="10"
              :rowsPerPageOptions="[10, 20, 50]"
              responsiveLayout="scroll"
              stripedRows
              :emptyMessage="'Tidak ada data transaksi'"
            >
              <Column field="no" header="No" style="width: 70px">
                <template #body="slotProps">
                  {{ slotProps.index + 1 }}
                </template>
              </Column>
              
              <Column field="tanggal_transaksi" header="Tanggal">
                <template #body="slotProps">
                  {{ formatDate(slotProps.data.tanggal_transaksi, 'dd/MM/yyyy') }}
                </template>
              </Column>
              
              <Column field="produk.nama_produk" header="Produk" />
              
              <Column field="pembeli.nama_pembeli" header="Nama Pembeli" />
              
              <Column field="quantity" header="Quantity">
                <template #body="slotProps">
                  {{ slotProps.data.quantity }} {{ slotProps.data.produk?.satuan }}
                </template>
              </Column>
              
              <Column field="harga_jual" header="Harga Jual">
                <template #body="slotProps">
                  {{ formatCurrency(slotProps.data.harga_jual) }}
                </template>
              </Column>
              
              <Column field="total" header="Total">
                <template #body="slotProps">
                  {{ formatCurrency(slotProps.data.total) }}
                </template>
              </Column>
              
              <Column field="keterangan" header="Keterangan" />

                            <template #footer>
                <div class="text-right font-bold">
                  Grand Total: {{ formatCurrency(totalPenjualan) }}
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