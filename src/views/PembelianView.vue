<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { usePembelian } from '../composables/usePembelian'
import { useProduk } from '../composables/useProduk'
import { useSupliers } from '../composables/useSupliers'
import { formatCurrency, formatDate } from '../utils/formatters'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import RadioButton from 'primevue/radiobutton'
import Calendar from 'primevue/calendar'
import AppHeader from '../components/layout/AppHeader.vue'
import AppSidebar from '../components/layout/AppSidebar.vue'
import InputIcon from 'primevue/inputicon'
import IconField from 'primevue/iconfield'
import PermissionGuard from '../components/PermissionGuard.vue'
import { usePembayaran } from '../composables/usePembayaran'
import PaymentDialog from '../components/PaymentDialog.vue'
import Tag from 'primevue/tag' 

const toast = useToast()
const confirm = useConfirm()

const { pembelian, loading, getAllPembelian, createPembelian, updatePembelian, deletePembelian } = usePembelian()
const { products, getAllProduk, getProdukByKategori } = useProduk()
const { supliers, getAllSupliers } = useSupliers()

// State
const sidebarVisible = ref(false)
const showDialog = ref(false)
const isEditMode = ref(false)
const searchQuery = ref('')
const timeFilter = ref('month')
const customStartDate = ref(null)
const customEndDate = ref(null)
const showCustomDateRange = ref(false)
const showPaymentDialog = ref(false)
const selectedTransactionForPayment = ref({
  id: null,
  total: 0,
  jumlah_dibayar: 0,
  sisa_hutang: 0,
  tanggal_jatuh_tempo: null
})
const statusFilter = ref('all') 

const statusFilterOptions = [
  { label: 'Semua Status', value: 'all' },
  { label: 'Lunas', value: 'Lunas' },
  { label: 'Belum Lunas', value: 'Belum Lunas' }
]

// Form data
const formData = ref({
  id: null,
  tanggal_transaksi: new Date(),
  produk_id: null,
  suplier_id: null,
  waktu_beli: 'Pagi',
  quantity: 0,
  harga_beli: 0,
  keterangan: '',
  status_pembayaran: 'Belum Lunas',
  jumlah_dibayar: 0,
  tanggal_jatuh_tempo: null,
  keterangan_pembayaran: ''
})

// Time filter options
const timeFilterOptions = [
  { label: 'Hari Ini', value: 'today' },
  { label: 'Minggu Ini', value: 'week' },
  { label: 'Bulan Ini', value: 'month' },
  { label: 'Custom', value: 'custom' }
]

// Computed
const filteredPembelian = computed(() => {
  return pembelian.value
})

const totalPembelian = computed(() => {
  return pembelian.value.reduce((sum, item) => sum + item.total, 0)
})

const computedTotal = computed(() => {
  return formData.value.quantity * formData.value.harga_beli
})

// Methods
function toggleSidebar() {
  sidebarVisible.value = !sidebarVisible.value
}


function getDateRange() {
  const today = new Date()
  let startDate, endDate

  switch (timeFilter.value) {
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
      if (customStartDate.value && customEndDate.value) {
        startDate = formatDate(customStartDate.value, 'yyyy-MM-dd')
        endDate = formatDate(customEndDate.value, 'yyyy-MM-dd')
      }
      break
  }

  return { startDate, endDate }
}

async function loadData() {
  try {
    const { startDate, endDate } = getDateRange()
    await getAllPembelian({
      startDate,
      endDate,
      search: searchQuery.value,
      status_pembayaran: statusFilter.value !== 'all' ? statusFilter.value : undefined
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Gagal memuat data pembelian',
      life: 3000
    })
  }
}

async function loadMasterData() {
  try {
    // await Promise.all([
    //   getProdukByKategori('Susu'),
    //   getAllSupliers()      
    // ])
    products.value = await getProdukByKategori('Susu')
    await getAllSupliers()    
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Gagal memuat data master',
      life: 3000
    })
  }
}

function openPaymentDialog(data) {
  selectedTransactionForPayment.value = data
  showPaymentDialog.value = true
}

async function handlePaymentSuccess() {
  await loadData()
}

function isOverdue(jatuhTempo, status) {
  if (status === 'Lunas' || !jatuhTempo) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(jatuhTempo)
  dueDate.setHours(0, 0, 0, 0)
  return dueDate < today
}

function openNewDialog() {
  isEditMode.value = false
  formData.value = {
    id: null,
    tanggal_transaksi: new Date(),
    produk_id: null,
    suplier_id: null,
    waktu_beli: 'Pagi',
    quantity: 0,
    harga_beli: 0,
    keterangan: '',
    status_pembayaran: 'Belum Lunas',
    jumlah_dibayar: 0,
    tanggal_jatuh_tempo: null,
    keterangan_pembayaran: ''
  }
  showDialog.value = true
}

function openEditDialog(data) {
  isEditMode.value = true
  formData.value = {
    id: data.id,
    tanggal_transaksi: new Date(data.tanggal_transaksi),
    produk_id: data.produk_id,
    suplier_id: data.suplier_id,
    waktu_beli: data.waktu_beli,
    quantity: data.quantity,
    harga_beli: data.harga_beli,
    keterangan: data.keterangan || '',
    status_pembayaran: data.status_pembayaran,
    jumlah_dibayar: data.jumlah_dibayar,
    tanggal_jatuh_tempo: data.tanggal_jatuh_tempo ? new Date(data.tanggal_jatuh_tempo) : null,
    keterangan_pembayaran: data.keterangan_pembayaran || ''
  }
  showDialog.value = true
}

async function handleSave() {
  try {
    if (!formData.value.produk_id || !formData.value.suplier_id) {
      toast.add({
        severity: 'warn',
        summary: 'Peringatan',
        detail: 'Harap lengkapi semua field yang wajib diisi',
        life: 3000
      })
      return
    }

    if (formData.value.quantity <= 0 || formData.value.harga_beli <= 0) {
      toast.add({
        severity: 'warn',
        summary: 'Peringatan',
        detail: 'Quantity dan Harga Beli harus lebih dari 0',
        life: 3000
      })
      return
    }

    // Validate payment
    const total = formData.value.quantity * formData.value.harga_beli
    if (formData.value.jumlah_dibayar > total) {
      toast.add({
        severity: 'warn',
        summary: 'Peringatan',
        detail: 'Jumlah dibayar tidak boleh lebih dari total',
        life: 3000
      })
      return
    }

    if (formData.value.status_pembayaran === 'Belum Lunas' && !formData.value.tanggal_jatuh_tempo) {
      toast.add({
        severity: 'warn',
        summary: 'Peringatan',
        detail: 'Tanggal jatuh tempo wajib diisi untuk status Belum Lunas',
        life: 3000
      })
      return
    }

    const payload = {
      tanggal_transaksi: formatDate(formData.value.tanggal_transaksi, 'yyyy-MM-dd'),
      produk_id: formData.value.produk_id,
      suplier_id: formData.value.suplier_id,
      waktu_beli: formData.value.waktu_beli,
      quantity: formData.value.quantity,
      harga_beli: formData.value.harga_beli,
      keterangan: formData.value.keterangan,
      // Payment fields
      status_pembayaran: formData.value.status_pembayaran,
      jumlah_dibayar: formData.value.jumlah_dibayar,
      tanggal_jatuh_tempo: formData.value.tanggal_jatuh_tempo ? 
        formatDate(formData.value.tanggal_jatuh_tempo, 'yyyy-MM-dd') : null,
      keterangan_pembayaran: formData.value.keterangan_pembayaran
    }

    if (isEditMode.value) {
      await updatePembelian(formData.value.id, payload)
      toast.add({
        severity: 'success',
        summary: 'Berhasil',
        detail: 'Data pembelian berhasil diupdate',
        life: 3000
      })
    } else {
      await createPembelian(payload)
      toast.add({
        severity: 'success',
        summary: 'Berhasil',
        detail: 'Data pembelian berhasil ditambahkan',
        life: 3000
      })
    }

    showDialog.value = false
    await loadData()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Gagal menyimpan data',
      life: 3000
    })
  }
}

function confirmDelete(data) {
  confirm.require({
    message: `Apakah Anda yakin ingin menghapus transaksi ini?`,
    header: 'Konfirmasi Hapus',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Ya',
    rejectLabel: 'Tidak',
    accept: async () => {
      try {
        await deletePembelian(data.id)
        toast.add({
          severity: 'success',
          summary: 'Berhasil',
          detail: 'Data pembelian berhasil dihapus',
          life: 3000
        })
        await loadData()
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Gagal menghapus data',
          life: 3000
        })
      }
    }
  })
}

function onTimeFilterChange() {
  if (timeFilter.value === 'custom') {
    showCustomDateRange.value = true
  } else {
    showCustomDateRange.value = false
    loadData()
  }
}

function onCustomDateRangeChange() {
  if (customStartDate.value && customEndDate.value) {
    loadData()
    showCustomDateRange.value = false
  }
}

function onProdukChange(produkId) {
  const selectedProduct = products.value.find(p => p.id === produkId)
  if (selectedProduct) {
    formData.value.harga_beli = selectedProduct.harga_beli_default
  }
}

watch([() => formData.value.quantity, () => formData.value.harga_beli, () => formData.value.status_pembayaran], 
  ([quantity, harga, status]) => {
    const total = quantity * harga
    if (status === 'Lunas') {
      formData.value.jumlah_dibayar = total
    }
  }
)

// Lifecycle
onMounted(async () => {
  await loadMasterData()
  await loadData()
})
</script>

<template>
  <PermissionGuard permission="laporan-pembelian" class="page-layout">
    <AppHeader @toggle-sidebar="toggleSidebar" />
    <AppSidebar v-model:visible="sidebarVisible" />
    
    <div class="flex container-dsk">
      <main class="flex-1 cont-md">
        <div class="page-header pt-8">
          <h1>Pembelian</h1>
          <div class="filter-section">                      
                <!-- Search -->
                <div class="md:col-span-2">                  
                  <IconField>
                    <InputIcon class="pi pi-search" />
                    <InputText
                      v-model="searchQuery"
                      placeholder="Cari nama suplier atau produk..."
                      class="w-full"
                      @input="loadData"
                    />
                  </IconField>
                </div>

                <div>
                  <Dropdown
                    v-model="statusFilter"
                    :options="statusFilterOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Status Pembayaran"
                    class="w-full"
                    @change="loadData"
                  />
                </div>

                <!-- Time Filter -->
                <div class="relative">
                  <Dropdown
                    v-model="timeFilter"
                    :options="timeFilterOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Pilih periode"
                    class="w-full"
                    @change="onTimeFilterChange"
                  />
                  <Dialog v-model:visible="showCustomDateRange" modal header="Custom Date" class="flex flex-col" :style="{ width: '25rem' }">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Tanggal Awal</label>
                        <Calendar
                          v-model="customStartDate"
                          dateFormat="dd/mm/yy"
                          class="w-full"
                          @date-select="onCustomDateRangeChange"
                        />
                      </div>
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Tanggal Akhir</label>
                        <Calendar
                          v-model="customEndDate"
                          dateFormat="dd/mm/yy"
                          class="w-full"
                          :minDate="customStartDate"
                          @date-select="onCustomDateRangeChange"
                        />
                      </div>
                  </Dialog>
                </div>

                <!-- New Button -->
                <div>
                  <Button
                    label="New Transaksi"
                    icon="pi pi-plus"
                    class="w-full"
                    @click="openNewDialog"
                  />
                </div>
          </div>
        </div>        

        <!-- DataTable -->
        <div class="bg-white rounded-lg shadow-sm">
          <DataTable
            :value="filteredPembelian"
            :loading="loading"
            paginator
            :rows="10"
            :rowsPerPageOptions="[10, 20, 50]"
            responsiveLayout="scroll"
            stripedRows
            :emptyMessage="'Tidak ada data pembelian'"
            scrollable
            tableStyle="min-width: 375px"
            class="table-mdm"
          >
            <Column field="no" header="No" sortable>
              <template #body="slotProps">
                {{ slotProps.index + 1 }}
              </template>
            </Column>
            
            <Column field="tanggal_transaksi" header="Tanggal">
              <template #body="slotProps">
                {{ formatDate(slotProps.data.tanggal_transaksi, 'dd/MM/yyyy') }}
              </template>
            </Column>
            
            <Column field="produk.nama_produk" header="Produk" sortable/>
            
            <Column field="suplier.nama_suplier" header="Nama Suplier" sortable/>
            
            <Column field="waktu_beli" header="Waktu Beli" />
            
            <Column field="quantity" header="Quantity">
              <template #body="slotProps">
                {{ slotProps.data.quantity }} {{ slotProps.data.produk?.satuan }}
              </template>
            </Column>
            
            <Column field="harga_beli" header="Harga Beli">
              <template #body="slotProps">
                {{ formatCurrency(slotProps.data.harga_beli) }}
              </template>
            </Column>
            
            <Column field="total" header="Total">
              <template #body="slotProps">
                {{ formatCurrency(slotProps.data.total) }}
              </template>
            </Column>

            <Column field="status_pembayaran" header="Status">
              <template #body="slotProps">
                <div class="flex flex-col gap-1">
                  <Tag 
                    :value="slotProps.data.status_pembayaran"
                    :severity="slotProps.data.status_pembayaran === 'Lunas' ? 'success' : 'warning'"
                  />
                  <Tag 
                    v-if="isOverdue(slotProps.data.tanggal_jatuh_tempo, slotProps.data.status_pembayaran)"
                    value="OVERDUE"
                    severity="danger"
                    class="text-xs"
                  />
                </div>
              </template>
            </Column>

            <Column field="sisa_hutang" header="Sisa Hutang">
              <template #body="slotProps">
                <span 
                  v-if="slotProps.data.status_pembayaran === 'Belum Lunas'"
                  class="font-bold text-red-600"
                >
                  {{ formatCurrency(slotProps.data.sisa_hutang) }}
                </span>
                <span v-else class="text-gray-400">-</span>
              </template>
            </Column>
            
            <Column field="keterangan" header="Keterangan" />
            
            <Column header="Aksi">
              <template #body="slotProps">
                <div class="flex gap-2">
                  <Button
                    v-if="slotProps.data.status_pembayaran === 'Belum Lunas'"
                    icon="pi pi-money-bill"
                    class="p-button-success p-button-sm"
                    v-tooltip.top="'Bayar Hutang'"
                    @click="openPaymentDialog(slotProps.data)"
                  />
                  <Button
                    icon="pi pi-pencil"
                    class="p-button-warning p-button-sm"
                    @click="openEditDialog(slotProps.data)"
                  />
                  <Button
                    icon="pi pi-trash"
                    class="p-button-danger p-button-sm"
                    @click="confirmDelete(slotProps.data)"
                  />
                </div>
              </template>
            </Column>

            <template #footer>
              <div class="text-right font-bold">
                Total: {{ formatCurrency(totalPembelian) }}
              </div>
            </template>
          </DataTable>
        </div>
      </main>
    </div>

    <!-- Dialog Form -->
    <Dialog
      v-model:visible="showDialog"
      :header="isEditMode ? 'Edit Pembelian' : 'Pembelian Baru'"
      :modal="true"
      :style="{ width: '500px' }"
    >
      <div class="flex flex-col gap-4">
        <!-- Tanggal Transaksi -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Tanggal Transaksi *</label>
          <Calendar
            v-model="formData.tanggal_transaksi"
            dateFormat="dd/mm/yy"
            class="w-full"
          />
        </div>

        <!-- Produk -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Produk *</label>
          <Dropdown
            v-model="formData.produk_id"
            :options="products"
            optionLabel="nama_produk"
            optionValue="id"
            placeholder="Pilih produk"
            class="w-full"
            @change="onProdukChange(formData.produk_id)"
          />
        </div>

        <!-- Suplier -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Suplier *</label>
          <Dropdown
            v-model="formData.suplier_id"
            :options="supliers"
            optionLabel="nama_suplier"
            optionValue="id"
            placeholder="Pilih suplier"
            class="w-full"
          />
        </div>

        <!-- Harga Beli -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Harga Beli *</label>
          <InputNumber
            v-model="formData.harga_beli"
            mode="currency"
            currency="IDR"
            locale="id-ID"
            :minFractionDigits="0"
            :maxFractionDigits="0"
            class="w-full"
          />
        </div>

        <!-- Waktu Beli -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Waktu Beli *</label>
          <div class="flex gap-4">
            <div class="flex items-center">
              <RadioButton
                v-model="formData.waktu_beli"
                inputId="pagi"
                value="Pagi"
              />
              <label for="pagi" class="ml-2">Pagi</label>
            </div>
            <div class="flex items-center">
              <RadioButton
                v-model="formData.waktu_beli"
                inputId="sore"
                value="Sore"
              />
              <label for="sore" class="ml-2">Sore</label>
            </div>
          </div>
        </div>

        <!-- Quantity -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Quantity (Liter) *</label>
          <InputNumber
            v-model="formData.quantity"
            :min="0"
            :minFractionDigits="2"
            :maxFractionDigits="2"
            class="w-full"
          />
        </div>

        <!-- Total (Read-only) -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Total</label>
          <InputText
            :value="formatCurrency(computedTotal)"
            disabled
            class="w-full"
          />
        </div>

        <!-- ADD Payment Section -->
        <div class="p-4 bg-blue-50 rounded-lg">
          <h4 class="font-semibold mb-3 text-blue-900">Informasi Pembayaran</h4>
          
          <!-- Status Pembayaran -->
          <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-2">Status Pembayaran</label>
            <div class="flex gap-4">
              <div class="flex items-center">
                <RadioButton
                  v-model="formData.status_pembayaran"
                  inputId="lunas"
                  value="Lunas"
                />
                <label for="lunas" class="ml-2">Lunas</label>
              </div>
              <div class="flex items-center">
                <RadioButton
                  v-model="formData.status_pembayaran"
                  inputId="belum_lunas"
                  value="Belum Lunas"
                />
                <label for="belum_lunas" class="ml-2">Belum Lunas (Hutang)</label>
              </div>
            </div>
          </div>

          <!-- Jumlah Dibayar (DP) -->
          <div class="mb-3" v-if="formData.status_pembayaran === 'Belum Lunas'">
            <label class="block text-sm font-medium text-gray-700 mb-2">Jumlah Dibayar (DP)</label>
            <InputNumber
              v-model="formData.jumlah_dibayar"
              mode="currency"
              currency="IDR"
              locale="id-ID"
              :minFractionDigits="0"
              :maxFractionDigits="0"
              class="w-full"
              :max="computedTotal"
            />
            <small class="text-gray-500">
              Sisa Hutang: {{ formatCurrency(computedTotal - (formData.jumlah_dibayar || 0)) }}
            </small>
          </div>

          <!-- Tanggal Jatuh Tempo -->
          <div class="mb-3" v-if="formData.status_pembayaran === 'Belum Lunas'">
            <label class="block text-sm font-medium text-gray-700 mb-2">Tanggal Jatuh Tempo *</label>
            <Calendar
              v-model="formData.tanggal_jatuh_tempo"
              dateFormat="dd/mm/yy"
              :minDate="new Date()"
              class="w-full"
            />
          </div>

          <!-- Keterangan Pembayaran -->
          <div v-if="formData.status_pembayaran === 'Belum Lunas'">
            <label class="block text-sm font-medium text-gray-700 mb-2">Keterangan Pembayaran</label>
            <Textarea
              v-model="formData.keterangan_pembayaran"
              rows="2"
              class="w-full"
              placeholder="Catatan pembayaran..."
            />
          </div>
        </div>

        <!-- Keterangan Transaksi -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Keterangan Transaksi</label>
          <Textarea
            v-model="formData.keterangan"
            rows="3"
            class="w-full"
          />
        </div>
      </div>

      <template #footer>
        <Button
          label="Batal"
          icon="pi pi-times"
          class="p-button-text"
          @click="showDialog = false"
        />
        <Button
          label="Simpan"
          icon="pi pi-check"
          :loading="loading"
          @click="handleSave"
        />
      </template>
    </Dialog>

    <PaymentDialog
      v-model:visible="showPaymentDialog"
      :transaction-data="selectedTransactionForPayment"
      transaction-type="pembelian"
      @payment-success="handlePaymentSuccess"
    />
  </PermissionGuard>
</template>

<style scoped>
.ml-64 {
  margin-left: 16rem;
}
</style>