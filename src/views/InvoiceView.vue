<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useInvoice } from '../composables/useInvoice'
import { useProduk } from '../composables/useProduk'
import { usePembeli } from '../composables/usePembeli'
import { formatCurrency, formatDate } from '../utils/formatters'
import { generateInvoicePDF } from '../utils/pdfGenerator'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Calendar from 'primevue/calendar'
import Tag from 'primevue/tag'
import AppHeader from '../components/layout/AppHeader.vue'
import AppSidebar from '../components/layout/AppSidebar.vue'
import InputIcon from 'primevue/inputicon'
import IconField from 'primevue/iconfield'

const toast = useToast()
const confirm = useConfirm()

const { invoices, loading, getAllInvoice, createInvoice, deleteInvoice } = useInvoice()
const { products, getAllProduk } = useProduk()
const { pembeli, getPembeliByTipe } = usePembeli()

// State
const sidebarVisible = ref(false)
const showDialog = ref(false)
const searchQuery = ref('')
const timeFilter = ref('month')
const customStartDate = ref(null)
const customEndDate = ref(null)
const showCustomDateRange = ref(false)

// Form data
const formData = ref({
  tanggal_dibuat: new Date(),
  produk_id: null,
  quantity: 0,
  satuan: null,
  harga_total: 0,
  pajak: 0,
  jatuh_tempo: null,
  pembeli_id: null,
  keterangan: ''
})

// Time filter options
const timeFilterOptions = [
  { label: 'Hari Ini', value: 'today' },
  { label: 'Minggu Ini', value: 'week' },
  { label: 'Bulan Ini', value: 'month' },
  { label: 'Custom', value: 'custom' }
]

const satuanOptions = [
  { label: 'Liter', value: 'Liter' },
  { label: 'Kg', value: 'Kg' }
]

// Computed
const filteredInvoices = computed(() => {
  return invoices.value
})

const grandTotal = computed(() => {
  return formData.value.harga_total + (formData.value.pajak || 0)
})

const totalAllInvoices = computed(() => {
  return invoices.value.reduce((sum, item) => sum + item.grand_total, 0)
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
    await getAllInvoice({
      startDate,
      endDate,
      search: searchQuery.value
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Gagal memuat data invoice',
      life: 3000
    })
  }
}

async function loadMasterData() {
  try {
    // Load products
    await getAllProduk()
    
    // Load B2B pembeli
    const b2bPembeli = await getPembeliByTipe('B2B')
    
    if (b2bPembeli.length === 0) {
      toast.add({
        severity: 'warn',
        summary: 'Peringatan',
        detail: 'Belum ada data pembeli B2B. Silakan tambahkan di menu User > Pembeli',
        life: 5000
      })
    }
  } catch (error) {
    console.error('Error loading master data:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Gagal memuat data master: ' + error.message,
      life: 3000
    })
  }
}

function openNewDialog() {
  // Set default jatuh tempo 30 hari dari sekarang
  const defaultDueDate = new Date()
  defaultDueDate.setDate(defaultDueDate.getDate() + 30)
  
  formData.value = {
    tanggal_dibuat: new Date(),
    produk_id: null,
    quantity: 0,
    satuan: null,
    harga_total: 0,
    pajak: 0,
    jatuh_tempo: defaultDueDate,
    pembeli_id: null,
    keterangan: ''
  }
  showDialog.value = true
}

async function handleSaveAndPrint() {
  try {
    if (!formData.value.produk_id || !formData.value.pembeli_id) {
      toast.add({
        severity: 'warn',
        summary: 'Peringatan',
        detail: 'Harap lengkapi produk dan pembeli',
        life: 3000
      })
      return
    }

    if (formData.value.quantity <= 0 || formData.value.harga_total <= 0) {
      toast.add({
        severity: 'warn',
        summary: 'Peringatan',
        detail: 'Quantity dan Harga Total harus lebih dari 0',
        life: 3000
      })
      return
    }

    if (!formData.value.jatuh_tempo) {
      toast.add({
        severity: 'warn',
        summary: 'Peringatan',
        detail: 'Tanggal jatuh tempo wajib diisi',
        life: 3000
      })
      return
    }

    // Validate jatuh tempo must be future date
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(formData.value.jatuh_tempo)
    dueDate.setHours(0, 0, 0, 0)
    
    if (dueDate < today) {
      toast.add({
        severity: 'warn',
        summary: 'Peringatan',
        detail: 'Tanggal jatuh tempo harus di masa depan',
        life: 3000
      })
      return
    }

    const payload = {
      tanggal_dibuat: formatDate(formData.value.tanggal_dibuat, 'yyyy-MM-dd'),
      produk_id: formData.value.produk_id,
      quantity: formData.value.quantity,
      satuan: formData.value.satuan,
      harga_total: formData.value.harga_total,
      pajak: formData.value.pajak || 0,
      jatuh_tempo: formatDate(formData.value.jatuh_tempo, 'yyyy-MM-dd'),
      pembeli_id: formData.value.pembeli_id,
      keterangan: formData.value.keterangan
    }

    const savedInvoice = await createInvoice(payload)
    
    toast.add({
      severity: 'success',
      summary: 'Berhasil',
      detail: 'Invoice berhasil dibuat',
      life: 3000
    })

    showDialog.value = false
    
    // Generate PDF
    await generateInvoicePDF(savedInvoice)
    
    await loadData()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Gagal menyimpan invoice',
      life: 3000
    })
  }
}

function confirmDelete(data) {
  confirm.require({
    message: `Apakah Anda yakin ingin menghapus invoice "${data.no_invoice}"?`,
    header: 'Konfirmasi Hapus',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Ya',
    rejectLabel: 'Tidak',
    accept: async () => {
      try {
        await deleteInvoice(data.id)
        toast.add({
          severity: 'success',
          summary: 'Berhasil',
          detail: 'Invoice berhasil dihapus',
          life: 3000
        })
        await loadData()
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Gagal menghapus invoice',
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
    formData.value.satuan = selectedProduct.satuan
  }
}

function isOverdue(jatuhTempo) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(jatuhTempo)
  dueDate.setHours(0, 0, 0, 0)
  return dueDate < today
}

async function printInvoice(invoice) {
  try {
    await generateInvoicePDF(invoice)
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Gagal generate PDF',
      life: 3000
    })
  }
}

// Lifecycle
onMounted(async () => {
  await loadMasterData()
  await loadData()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <AppHeader @toggle-sidebar="toggleSidebar" />
    <AppSidebar v-model:visible="sidebarVisible" />
    
    <div class="flex container-dsk">
      <main class="flex-1 p-6" >
        <div class="page-header pt-8">
          <h1>Invoice</h1>
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
                  label="New Invoice"
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
            :value="filteredInvoices"
            :loading="loading"
            paginator
            :rows="10"
            :rowsPerPageOptions="[10, 20, 50]"
            responsiveLayout="scroll"
            stripedRows
            :emptyMessage="'Tidak ada data invoice'"
          >
            <Column field="no" header="No" style="width: 70px">
              <template #body="slotProps">
                {{ slotProps.index + 1 }}
              </template>
            </Column>
            
            <Column field="no_invoice" header="No Invoice">
              <template #body="slotProps">
                <div class="flex items-center gap-2">
                  <span class="font-semibold">{{ slotProps.data.no_invoice }}</span>
                  <Tag 
                    v-if="isOverdue(slotProps.data.jatuh_tempo)"
                    value="Overdue"
                    severity="danger"
                    class="text-xs"
                  />
                </div>
              </template>
            </Column>
            
            <Column field="tanggal_dibuat" header="Tanggal">
              <template #body="slotProps">
                {{ formatDate(slotProps.data.tanggal_dibuat, 'dd/MM/yyyy') }}
              </template>
            </Column>
            
            <Column field="produk.nama_produk" header="Produk" />
            
            <Column field="harga_total" header="Harga Total">
              <template #body="slotProps">
                {{ formatCurrency(slotProps.data.harga_total) }}
              </template>
            </Column>
            
            <Column field="pajak" header="Pajak">
              <template #body="slotProps">
                {{ formatCurrency(slotProps.data.pajak) }}
              </template>
            </Column>
            
            <Column field="grand_total" header="Grand Total">
              <template #body="slotProps">
                <span class="font-bold">
                  {{ formatCurrency(slotProps.data.grand_total) }}
                </span>
              </template>
            </Column>
            
            <Column field="jatuh_tempo" header="Jatuh Tempo">
              <template #body="slotProps">
                <span :class="{ 'text-red-600 font-semibold': isOverdue(slotProps.data.jatuh_tempo) }">
                  {{ formatDate(slotProps.data.jatuh_tempo, 'dd/MM/yyyy') }}
                </span>
              </template>
            </Column>
            
            <Column field="pembeli.nama_pembeli" header="Pembeli" />
            
            <Column field="keterangan" header="Keterangan" />
            
            <Column header="Aksi" style="width: 120px">
              <template #body="slotProps">
                <div class="flex gap-2">
                  <Button
                    icon="pi pi-print"
                    class="p-button-info p-button-sm"
                    v-tooltip.top="'Print Invoice'"
                    @click="printInvoice(slotProps.data)"
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
                Total: {{ formatCurrency(totalAllInvoices) }}
              </div>
            </template>
          </DataTable>
        </div>
      </main>
    </div>

    <!-- Dialog Form -->
    <Dialog
      v-model:visible="showDialog"
      header="Invoice Baru"
      :modal="true"
      :style="{ width: '600px' }"
    >
      <div class="flex flex-col gap-4">
        <!-- Tanggal Dibuat -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Tanggal Dibuat *</label>
          <Calendar
            v-model="formData.tanggal_dibuat"
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

        <div class="grid grid-cols-2 gap-4">
          <!-- Quantity -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
            <InputNumber
              v-model="formData.quantity"
              :min="0"
              :minFractionDigits="2"
              :maxFractionDigits="2"
              class="w-full"
            />
          </div>

          <!-- Satuan -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Satuan *</label>
            <Dropdown
              v-model="formData.satuan"
              :options="satuanOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Pilih satuan"
              class="w-full"
            />
          </div>
        </div>

        <!-- Harga Total -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Harga Total *</label>
          <InputNumber
            v-model="formData.harga_total"
            mode="currency"
            currency="IDR"
            locale="id-ID"
            class="w-full"
          />
        </div>

        <!-- Pajak -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Pajak</label>
          <InputNumber
            v-model="formData.pajak"
            mode="currency"
            currency="IDR"
            locale="id-ID"
            class="w-full"
          />
        </div>

        <!-- Grand Total (Read-only) -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Grand Total</label>
          <InputText
            :value="formatCurrency(grandTotal)"
            disabled
            class="w-full font-bold text-lg"
          />
        </div>

        <!-- Jatuh Tempo -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Jatuh Tempo *</label>
          <Calendar
            v-model="formData.jatuh_tempo"
            dateFormat="dd/mm/yy"
            :minDate="new Date()"
            class="w-full"
          />
        </div>

        <!-- Pembeli -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Pembeli/Tagihan *</label>
          <Dropdown
            v-model="formData.pembeli_id"
            :options="pembeli"
            optionLabel="nama_pembeli"
            optionValue="id"
            placeholder="Pilih pembeli (B2B)"
            class="w-full"
          />
        </div>

        <!-- Keterangan -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Keterangan</label>
          <Textarea
            v-model="formData.keterangan"
            rows="3"
            class="w-full"
            placeholder="Catatan tambahan untuk invoice..."
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
          label="Save & Print"
          icon="pi pi-file-pdf"
          :loading="loading"
          @click="handleSaveAndPrint"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.ml-64 {
  margin-left: 16rem;
}
</style>
      