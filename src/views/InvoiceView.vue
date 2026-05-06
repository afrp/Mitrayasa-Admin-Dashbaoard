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
import AutoComplete from 'primevue/autocomplete'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Calendar from 'primevue/calendar'
import Tag from 'primevue/tag'
import AppHeader from '../components/layout/AppHeader.vue'
import AppSidebar from '../components/layout/AppSidebar.vue'
import InputIcon from 'primevue/inputicon'
import IconField from 'primevue/iconfield'
import PermissionGuard from '../components/PermissionGuard.vue'

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

// Form data (multi-items)
const formData = ref({
  tanggal_dibuat: new Date(),
  jatuh_tempo: null,
  pembeli_id: null,
  pajak: 0,
  keterangan: '',
  items: []
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
const filteredInvoices = computed(() => invoices.value)

const subtotalItems = computed(() =>
  formData.value.items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.harga_satuan) || 0),
    0
  )
)

const grandTotal = computed(() => subtotalItems.value + (Number(formData.value.pajak) || 0))

const totalAllInvoices = computed(() =>
  invoices.value.reduce((sum, item) => sum + Number(item.grand_total || 0), 0)
)

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
    case 'week': {
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      startDate = formatDate(weekStart, 'yyyy-MM-dd')
      endDate = formatDate(today, 'yyyy-MM-dd')
      break
    }
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
    await getAllProduk()
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

function emptyItem() {
  return {
    produk_input: '',
    produk_suggestions: [],
    quantity: 0,
    satuan: null,
    harga_satuan: 0
  }
}

function searchProduk(item, event) {
  const q = (event.query || '').toLowerCase().trim()
  item.produk_suggestions = q
    ? products.value.filter(p => p.nama_produk.toLowerCase().includes(q))
    : [...products.value]
}

function onProdukSelect(item, event) {
  const selected = event.value
  item.satuan = selected.satuan
  if (!item.harga_satuan && selected.harga_jual_default) {
    item.harga_satuan = selected.harga_jual_default
  }
}

function resolveProdukInput(input) {
  if (input && typeof input === 'object' && input.id) {
    return { produk_id: input.id, nama_produk_custom: null }
  }
  const name = typeof input === 'string' ? input.trim() : ''
  return { produk_id: null, nama_produk_custom: name || null }
}

function openNewDialog() {
  const defaultDueDate = new Date()
  defaultDueDate.setDate(defaultDueDate.getDate() + 30)

  formData.value = {
    tanggal_dibuat: new Date(),
    jatuh_tempo: defaultDueDate,
    pembeli_id: null,
    pajak: 0,
    keterangan: '',
    items: [emptyItem()]
  }
  showDialog.value = true
}

function addItem() {
  formData.value.items.push(emptyItem())
}

function removeItem(idx) {
  formData.value.items.splice(idx, 1)
}

function calcItemSubtotal(item) {
  return (Number(item.quantity) || 0) * (Number(item.harga_satuan) || 0)
}

async function handleSaveAndPrint() {
  try {
    if (!formData.value.pembeli_id) {
      toast.add({ severity: 'warn', summary: 'Peringatan', detail: 'Pilih pembeli terlebih dahulu', life: 3000 })
      return
    }

    if (!formData.value.jatuh_tempo) {
      toast.add({ severity: 'warn', summary: 'Peringatan', detail: 'Tanggal jatuh tempo wajib diisi', life: 3000 })
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(formData.value.jatuh_tempo)
    dueDate.setHours(0, 0, 0, 0)
    if (dueDate < today) {
      toast.add({ severity: 'warn', summary: 'Peringatan', detail: 'Tanggal jatuh tempo harus di masa depan', life: 3000 })
      return
    }

    if (!formData.value.items.length) {
      toast.add({ severity: 'warn', summary: 'Peringatan', detail: 'Minimal 1 produk harus ditambahkan', life: 3000 })
      return
    }

    for (let i = 0; i < formData.value.items.length; i++) {
      const it = formData.value.items[i]
      const resolved = resolveProdukInput(it.produk_input)
      if (!resolved.produk_id && !resolved.nama_produk_custom) {
        toast.add({ severity: 'warn', summary: 'Peringatan', detail: `Baris ${i + 1}: produk belum diisi`, life: 3000 })
        return
      }
      if (!it.quantity || it.quantity <= 0) {
        toast.add({ severity: 'warn', summary: 'Peringatan', detail: `Baris ${i + 1}: quantity harus > 0`, life: 3000 })
        return
      }
      if (!it.harga_satuan || it.harga_satuan <= 0) {
        toast.add({ severity: 'warn', summary: 'Peringatan', detail: `Baris ${i + 1}: harga satuan harus > 0`, life: 3000 })
        return
      }
    }

    const payload = {
      tanggal_dibuat: formatDate(formData.value.tanggal_dibuat, 'yyyy-MM-dd'),
      jatuh_tempo: formatDate(formData.value.jatuh_tempo, 'yyyy-MM-dd'),
      pembeli_id: formData.value.pembeli_id,
      pajak: formData.value.pajak || 0,
      keterangan: formData.value.keterangan,
      items: formData.value.items.map(it => {
        const resolved = resolveProdukInput(it.produk_input)
        return {
          produk_id: resolved.produk_id,
          nama_produk_custom: resolved.nama_produk_custom,
          quantity: it.quantity,
          satuan: it.satuan,
          harga_satuan: it.harga_satuan
        }
      })
    }

    const savedInvoice = await createInvoice(payload)

    toast.add({ severity: 'success', summary: 'Berhasil', detail: 'Invoice berhasil dibuat', life: 3000 })
    showDialog.value = false

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
        toast.add({ severity: 'success', summary: 'Berhasil', detail: 'Invoice berhasil dihapus', life: 3000 })
        await loadData()
      } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Gagal menghapus invoice', life: 3000 })
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

function isOverdue(jatuhTempo) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(jatuhTempo)
  dueDate.setHours(0, 0, 0, 0)
  return dueDate < today
}

function itemsPreview(invoice) {
  const items = invoice.invoice_items || []
  if (!items.length) return '-'
  const first = items[0]?.produk?.nama_produk || items[0]?.nama_produk_custom || '-'
  if (items.length === 1) return first
  return `${first} (+${items.length - 1} lainnya)`
}

async function printInvoice(invoice) {
  try {
    await generateInvoicePDF(invoice)
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Gagal generate PDF', life: 3000 })
  }
}

onMounted(async () => {
  await loadMasterData()
  await loadData()
})
</script>

<template>
  <PermissionGuard permission="invoice" class="min-h-screen bg-gray-50">
    <AppHeader @toggle-sidebar="toggleSidebar" />
    <AppSidebar v-model:visible="sidebarVisible" />

    <div class="flex container-dsk">
      <main class="flex-1 cont-md">
        <div class="page-header pt-8">
          <h1>Invoice</h1>
          <div class="filter-section">
            <!-- Search -->
            <div class="md:col-span-2">
              <IconField>
                <InputIcon class="pi pi-search" />
                <InputText
                  v-model="searchQuery"
                  placeholder="Cari nama pembeli, produk, atau no invoice..."
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
                  <Calendar v-model="customStartDate" dateFormat="dd/mm/yy" class="w-full" @date-select="onCustomDateRangeChange" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Tanggal Akhir</label>
                  <Calendar v-model="customEndDate" dateFormat="dd/mm/yy" class="w-full" :minDate="customStartDate" @date-select="onCustomDateRangeChange" />
                </div>
              </Dialog>
            </div>

            <!-- New Button -->
            <div>
              <Button label="New Invoice" icon="pi pi-plus" class="w-full" @click="openNewDialog" />
            </div>
          </div>
        </div>

        <!-- DataTable List -->
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
            scrollable
            tableStyle="min-width: 375px"
            class="table-mdm"
          >
            <Column field="no" header="No">
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

            <Column header="Items">
              <template #body="slotProps">
                <span class="text-sm">{{ itemsPreview(slotProps.data) }}</span>
                <div class="text-xs text-gray-500">
                  {{ (slotProps.data.invoice_items || []).length }} produk
                </div>
              </template>
            </Column>

            <Column field="subtotal_items" header="Subtotal">
              <template #body="slotProps">
                {{ formatCurrency(slotProps.data.subtotal_items) }}
              </template>
            </Column>

            <Column field="pajak" header="Pajak">
              <template #body="slotProps">
                {{ formatCurrency(slotProps.data.pajak) }}
              </template>
            </Column>

            <Column field="grand_total" header="Grand Total">
              <template #body="slotProps">
                <span class="font-bold">{{ formatCurrency(slotProps.data.grand_total) }}</span>
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

            <Column field="keterangan" header="Keterangan">
              <template #body="slotProps">
                {{ slotProps.data.keterangan || '-' }}
              </template>
            </Column>

            <Column header="Aksi">
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
      :style="{ width: '900px' }"
      :breakpoints="{ '1199px': '90vw', '575px': '95vw' }"
    >
      <div class="flex flex-col gap-4">
        <!-- Header section -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Tanggal Dibuat *</label>
            <Calendar v-model="formData.tanggal_dibuat" dateFormat="dd/mm/yy" class="w-full" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Jatuh Tempo *</label>
            <Calendar
              v-model="formData.jatuh_tempo"
              dateFormat="dd/mm/yy"
              :minDate="new Date()"
              class="w-full"
            />
          </div>

          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-2">Pembeli/Tagihan *</label>
            <Dropdown
              v-model="formData.pembeli_id"
              :options="pembeli"
              optionLabel="nama_pembeli"
              optionValue="id"
              placeholder="Pilih pembeli (B2B)"
              class="w-full"
              filter
            />
          </div>
        </div>

        <!-- Items section -->
        <div class="border rounded-lg p-3">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-semibold text-gray-700">Daftar Produk</h3>
            <Button
              label="Tambah Produk"
              icon="pi pi-plus"
              size="small"
              severity="secondary"
              @click="addItem"
            />
          </div>

          <DataTable
            :value="formData.items"
            responsiveLayout="scroll"
            :emptyMessage="'Belum ada produk. Klik &quot;Tambah Produk&quot; untuk mulai.'"
            class="text-sm"
          >
            <Column header="Produk" style="min-width: 200px">
              <template #body="{ data }">
                <AutoComplete
                  v-model="data.produk_input"
                  :suggestions="data.produk_suggestions"
                  optionLabel="nama_produk"
                  field="nama_produk"
                  placeholder="Ketik atau pilih produk"
                  class="w-full"
                  inputClass="w-full"
                  dropdown
                  :forceSelection="false"
                  @complete="searchProduk(data, $event)"
                  @item-select="onProdukSelect(data, $event)"
                />
              </template>
            </Column>

            <Column header="Qty" style="width: 130px">
              <template #body="{ data }">
                <InputNumber
                  v-model="data.quantity"
                  :min="0"
                  :minFractionDigits="2"
                  :maxFractionDigits="2"
                  class="w-full"
                />
              </template>
            </Column>

            <Column header="Satuan" style="width: 110px">
              <template #body="{ data }">
                <Dropdown
                  v-model="data.satuan"
                  :options="satuanOptions"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Satuan"
                  class="w-full"
                />
              </template>
            </Column>

            <Column header="Harga Satuan" style="width: 180px">
              <template #body="{ data }">
                <InputNumber
                  v-model="data.harga_satuan"
                  mode="currency"
                  currency="IDR"
                  locale="id-ID"
                  :minFractionDigits="0"
                  :maxFractionDigits="0"
                  class="w-full"
                />
              </template>
            </Column>

            <Column header="Subtotal" style="width: 150px">
              <template #body="{ data }">
                <span class="font-medium">{{ formatCurrency(calcItemSubtotal(data)) }}</span>
              </template>
            </Column>

            <Column header="" style="width: 60px">
              <template #body="{ index }">
                <Button
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  size="small"
                  @click="removeItem(index)"
                />
              </template>
            </Column>
          </DataTable>
        </div>

        <!-- Footer section: pajak & total -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Keterangan</label>
            <Textarea
              v-model="formData.keterangan"
              rows="3"
              class="w-full"
              placeholder="Catatan tambahan untuk invoice..."
            />
          </div>

          <div class="flex flex-col gap-2 bg-gray-50 p-3 rounded-lg">
            <div class="flex justify-between text-sm">
              <span>Subtotal Items:</span>
              <span class="font-medium">{{ formatCurrency(subtotalItems) }}</span>
            </div>

            <div class="flex justify-between items-center text-sm">
              <span>Pajak:</span>
              <InputNumber
                v-model="formData.pajak"
                mode="currency"
                currency="IDR"
                locale="id-ID"
                :minFractionDigits="0"
                :maxFractionDigits="0"
                inputClass="text-right"
                style="width: 180px"
              />
            </div>

            <div class="border-t pt-2 flex justify-between font-bold text-lg">
              <span>Grand Total:</span>
              <span>{{ formatCurrency(grandTotal) }}</span>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="Batal" icon="pi pi-times" class="p-button-text" @click="showDialog = false" />
        <Button
          label="Save & Print"
          icon="pi pi-file-pdf"
          :loading="loading"
          @click="handleSaveAndPrint"
        />
      </template>
    </Dialog>
  </PermissionGuard>
</template>

<style scoped>
.ml-64 {
  margin-left: 16rem;
}
</style>
