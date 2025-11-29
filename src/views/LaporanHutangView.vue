
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { usePembayaran } from '../composables/usePembayaran'
import { formatCurrency, formatDate } from '../utils/formatters'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Calendar from 'primevue/calendar'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import AppHeader from '../components/layout/AppHeader.vue'
import AppSidebar from '../components/layout/AppSidebar.vue'
import PaymentDialog from '../components/PaymentDialog.vue'
import PermissionGuard from '../components/PermissionGuard.vue'

const toast = useToast()
const { loading, getLaporanHutang, getLaporanPiutang } = usePembayaran()

// State
const sidebarVisible = ref(false)
const startDate = ref(null)
const endDate = ref(null)
const hutangData = ref([])
const piutangData = ref([])
const activeTab = ref(0)
const showResult = ref(false)
const showPaymentDialog = ref(false)
const selectedTransactionForPayment = ref({
  id: null,
  total: 0,
  jumlah_dibayar: 0,
  sisa_hutang: 0,
  sisa_piutang: 0,
  tanggal_jatuh_tempo: null
})
const selectedTransactionType = ref('pembelian')

// Computed
const totalHutang = computed(() => {
  return hutangData.value.reduce((sum, item) => sum + (item.sisa_hutang || 0), 0)
})

const totalOverdueHutang = computed(() => {
  return hutangData.value.filter(item => isOverdue(item.tanggal_jatuh_tempo)).length
})

const totalPiutang = computed(() => {
  return piutangData.value.reduce((sum, item) => sum + (item.sisa_piutang || 0), 0)
})

const totalOverduePiutang = computed(() => {
  return piutangData.value.filter(item => isOverdue(item.tanggal_jatuh_tempo)).length
})

// Methods
function toggleSidebar() {
  sidebarVisible.value = !sidebarVisible.value
}

function isOverdue(jatuhTempo) {
  if (!jatuhTempo) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(jatuhTempo)
  dueDate.setHours(0, 0, 0, 0)
  return dueDate < today
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
    const filters = {
      startDate: formatDate(startDate.value, 'yyyy-MM-dd'),
      endDate: formatDate(endDate.value, 'yyyy-MM-dd')
    }
    
    const [dataHutang, dataPiutang] = await Promise.all([
      getLaporanHutang(filters),
      getLaporanPiutang(filters)
    ])
    
    hutangData.value = dataHutang
    piutangData.value = dataPiutang
    showResult.value = true

    if (dataHutang.length === 0 && dataPiutang.length === 0) {
      toast.add({
        severity: 'success',
        summary: 'Info',
        detail: 'Tidak ada hutang dan piutang pada periode yang dipilih',
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

function openPaymentDialog(data, type) {
  selectedTransactionForPayment.value = data
  selectedTransactionType.value = type
  showPaymentDialog.value = true
}

async function handlePaymentSuccess() {
  await handleProses()
}

// Lifecycle
onMounted(() => {
  const today = new Date()
  endDate.value = today
  const monthAgo = new Date()
  monthAgo.setMonth(today.getMonth() - 1)
  startDate.value = monthAgo
})
</script>

<template>
  <PermissionGuard permission="laporan-hutang" class="min-h-screen bg-gray-50">
    <AppHeader @toggle-sidebar="toggleSidebar" />
    <AppSidebar v-model:visible="sidebarVisible" />
    
    <div class="flex container-dsk">
      <main class="flex-1 cont-md">
        <div class="page-header pt-8">
          <h1>Laporan Hutang & Piutang</h1>
        </div>

        <!-- Filter Card -->
        <Card class="mb-6">
          <template #content>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Tanggal Awal *</label>
                <Calendar
                  v-model="startDate"
                  dateFormat="dd/mm/yy"
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Tanggal Akhir *</label>
                <Calendar
                  v-model="endDate"
                  dateFormat="dd/mm/yy"
                  :minDate="startDate"
                  class="w-full"
                />
              </div>
              <div class="flex items-end">
                <Button
                  label="Proses"
                  icon="pi pi-search"
                  @click="handleProses"
                  :loading="loading"
                  class="w-full"
                />
              </div>
            </div>
          </template>
        </Card>

        <!-- Tabs -->
        <TabView v-if="showResult" v-model:activeIndex="activeTab">
          <!-- Tab Hutang -->
          <TabPanel header="Laporan Hutang">
            <!-- Summary Hutang -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <template #content>
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm text-gray-600">Total Transaksi Hutang</p>
                      <p class="text-3xl font-bold">{{ hutangData.length }}</p>
                    </div>
                    <i class="pi pi-shopping-bag text-4xl text-blue-500"></i>
                  </div>
                </template>
              </Card>

              <Card>
                <template #content>
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm text-gray-600">Total Sisa Hutang</p>
                      <p class="text-3xl font-bold text-red-600">{{ formatCurrency(totalHutang) }}</p>
                    </div>
                    <i class="pi pi-exclamation-triangle text-4xl text-red-500"></i>
                  </div>
                </template>
              </Card>

              <Card>
                <template #content>
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm text-gray-600">Transaksi Overdue</p>
                      <p class="text-3xl font-bold text-orange-600">{{ totalOverdueHutang }}</p>
                    </div>
                    <i class="pi pi-clock text-4xl text-orange-500"></i>
                  </div>
                </template>
              </Card>
            </div>

            <!-- DataTable Hutang -->
            <div class="bg-white rounded-lg shadow-sm">
              <DataTable
                :value="hutangData"
                :loading="loading"
                paginator
                :rows="10"
                responsiveLayout="scroll"
                stripedRows
                :emptyMessage="'Tidak ada hutang pada periode yang dipilih'"
              >
                <Column field="no" header="No">
                  <template #body="slotProps">
                    {{ slotProps.index + 1 }}
                  </template>
                </Column>

                <Column field="no_transaksi" header="No Transaksi" />

                <Column field="tanggal_transaksi" header="Tanggal">
                  <template #body="slotProps">
                    {{ formatDate(slotProps.data.tanggal_transaksi, 'dd/MM/yyyy') }}
                  </template>
                </Column>

                <Column field="suplier.nama_suplier" header="Suplier" />

                <Column field="produk.nama_produk" header="Produk" />

                <Column field="total" header="Total">
                  <template #body="slotProps">
                    {{ formatCurrency(slotProps.data.total) }}
                  </template>
                </Column>

                <Column field="jumlah_dibayar" header="Sudah Dibayar">
                  <template #body="slotProps">
                    <span class="text-green-600">
                      {{ formatCurrency(slotProps.data.jumlah_dibayar) }}
                    </span>
                  </template>
                </Column>

                <Column field="sisa_hutang" header="Sisa Hutang">
                  <template #body="slotProps">
                    <span class="font-bold text-red-600">
                      {{ formatCurrency(slotProps.data.sisa_hutang) }}
                    </span>
                  </template>
                </Column>

                <Column field="tanggal_jatuh_tempo" header="Jatuh Tempo">
                  <template #body="slotProps">
                    <div class="flex flex-col gap-1">
                      <span :class="{ 'text-red-600 font-semibold': isOverdue(slotProps.data.tanggal_jatuh_tempo) }">
                        {{ formatDate(slotProps.data.tanggal_jatuh_tempo, 'dd/MM/yyyy') }}
                      </span>
                      <Tag 
                        v-if="isOverdue(slotProps.data.tanggal_jatuh_tempo)"
                        value="OVERDUE"
                        severity="danger"
                        class="text-xs"
                      />
                    </div>
                  </template>
                </Column>

                <Column header="Aksi">
                  <template #body="slotProps">
                    <Button
                      icon="pi pi-money-bill"
                      class="p-button-success p-button-sm"
                      label="Bayar"
                      @click="openPaymentDialog(slotProps.data, 'pembelian')"
                    />
                  </template>
                </Column>

                <template #footer>
                  <div class="text-right font-bold text-red-600">
                    Total Sisa Hutang: {{ formatCurrency(totalHutang) }}
                  </div>
                </template>
              </DataTable>
            </div>
          </TabPanel>

          <!-- Tab Piutang -->
          <TabPanel header="Laporan Piutang">
            <!-- Summary Piutang -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <template #content>
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm text-gray-600">Total Transaksi Piutang</p>
                      <p class="text-3xl font-bold">{{ piutangData.length }}</p>
                    </div>
                    <i class="pi pi-shopping-cart text-4xl text-blue-500"></i>
                  </div>
                </template>
              </Card>

              <Card>
                <template #content>
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm text-gray-600">Total Sisa Piutang</p>
                      <p class="text-3xl font-bold text-orange-600">{{ formatCurrency(totalPiutang) }}</p>
                    </div>
                    <i class="pi pi-hourglass text-4xl text-orange-500"></i>
                  </div>
                </template>
              </Card>

              <Card>
                <template #content>
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm text-gray-600">Transaksi Overdue</p>
                      <p class="text-3xl font-bold text-red-600">{{ totalOverduePiutang }}</p>
                    </div>
                    <i class="pi pi-exclamation-circle text-4xl text-red-500"></i>
                  </div>
                </template>
              </Card>
            </div>

            <!-- DataTable Piutang -->
            <div class="bg-white rounded-lg shadow-sm">
              <DataTable
                :value="piutangData"
                :loading="loading"
                paginator
                :rows="10"
                responsiveLayout="scroll"
                stripedRows
                :emptyMessage="'Tidak ada piutang pada periode yang dipilih'"
              >
                <Column field="no" header="No">
                  <template #body="slotProps">
                    {{ slotProps.index + 1 }}
                  </template>
                </Column>

                <Column field="no_transaksi" header="No Transaksi" />

                <Column field="tanggal_transaksi" header="Tanggal">
                  <template #body="slotProps">
                    {{ formatDate(slotProps.data.tanggal_transaksi, 'dd/MM/yyyy') }}
                  </template>
                </Column>

                <Column field="pembeli.nama_pembeli" header="Pembeli">
                  <template #body="slotProps">
                    {{ slotProps.data.pembeli?.nama_pembeli || slotProps.data.suplier?.nama_suplier || '-' }}
                  </template>
                </Column>

                <Column field="produk.nama_produk" header="Produk" />

                <Column field="total" header="Total">
                  <template #body="slotProps">
                    {{ formatCurrency(slotProps.data.total) }}
                  </template>
                </Column>

                <Column field="jumlah_dibayar" header="Sudah Dibayar">
                  <template #body="slotProps">
                    <span class="text-green-600">
                      {{ formatCurrency(slotProps.data.jumlah_dibayar) }}
                    </span>
                  </template>
                </Column>

                <Column field="sisa_piutang" header="Sisa Piutang">
                  <template #body="slotProps">
                    <span class="font-bold text-orange-600">
                      {{ formatCurrency(slotProps.data.sisa_piutang) }}
                    </span>
                  </template>
                </Column>

                <Column field="tanggal_jatuh_tempo" header="Jatuh Tempo">
                  <template #body="slotProps">
                    <div class="flex flex-col gap-1">
                      <span :class="{ 'text-red-600 font-semibold': isOverdue(slotProps.data.tanggal_jatuh_tempo) }">
                        {{ formatDate(slotProps.data.tanggal_jatuh_tempo, 'dd/MM/yyyy') }}
                      </span>
                      <Tag 
                        v-if="isOverdue(slotProps.data.tanggal_jatuh_tempo)"
                        value="OVERDUE"
                        severity="danger"
                        class="text-xs"
                      />
                    </div>
                  </template>
                </Column>

                <Column header="Aksi">
                  <template #body="slotProps">
                    <Button
                      icon="pi pi-money-bill"
                      class="p-button-success p-button-sm"
                      label="Bayar"
                      @click="openPaymentDialog(slotProps.data, 'penjualan')"
                    />
                  </template>
                </Column>

                <template #footer>
                  <div class="text-right font-bold text-orange-600">
                    Total Sisa Piutang: {{ formatCurrency(totalPiutang) }}
                  </div>
                </template>
              </DataTable>
            </div>
          </TabPanel>
        </TabView>
      </main>
    </div>

    <!-- Payment Dialog -->
    <PaymentDialog
      v-model:visible="showPaymentDialog"
      :transaction-data="selectedTransactionForPayment"
      :transaction-type="selectedTransactionType"
      @payment-success="handlePaymentSuccess"
    />
  </PermissionGuard>
</template>