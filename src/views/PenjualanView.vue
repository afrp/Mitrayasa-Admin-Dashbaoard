<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { usePenjualan } from '../composables/usePenjualan'
import { useProduk } from '../composables/useProduk'
import { useSupliers } from '../composables/useSupliers'
import { usePembeli } from '../composables/usePembeli'
import { formatCurrency, formatDate } from '../utils/formatters'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Calendar from 'primevue/calendar'
import AppHeader from '../components/layout/AppHeader.vue'
import AppSidebar from '../components/layout/AppSidebar.vue'

const toast = useToast()
const confirm = useConfirm()

const { penjualan, loading, getAllPenjualan, createPenjualan, updatePenjualan, deletePenjualan } = usePenjualan()
const { products, getAllProduk, getProdukById } = useProduk()
const { supliers, getAllSupliers } = useSupliers()
const { pembeli, getAllPembeli } = usePembeli()

// State
const sidebarVisible = ref(false)
const showDialog = ref(false)
const isEditMode = ref(false)
const searchQuery = ref('')
const timeFilter = ref('month')
const customStartDate = ref(null)
const customEndDate = ref(null)
const showCustomDateRange = ref(false)
const selectedProdukKategori = ref(null)
const buyerLabel = ref('Pembeli')

// Form data
const formData = ref({
  id: null,
  tanggal_transaksi: new Date(),
  produk_id: null,
  pembeli_id: null,
  suplier_id: null,
  quantity: 0,
  harga_jual: 0,
  keterangan: ''
})

// Time filter options
const timeFilterOptions = [
  { label: 'Hari Ini', value: 'today' },
  { label: 'Minggu Ini', value: 'week' },
  { label: 'Bulan Ini', value: 'month' },
  { label: 'Custom', value: 'custom' }
]

// Computed
const filteredPenjualan = computed(() => {
  return penjualan.value
})

const totalPenjualan = computed(() => {
  return penjualan.value.reduce((sum, item) => sum + item.total, 0)
})

const computedTotal = computed(() => {
  return formData.value.quantity * formData.value.harga_jual
})

const buyerOptions = computed(() => {
  if (selectedProdukKategori.value === 'Susu') {
    return pembeli.value
  } else if (selectedProdukKategori.value === 'Pakan') {
    return supliers.value
  }
  return []
})

const buyerOptionLabel = computed(() => {
  return selectedProdukKategori.value === 'Pakan' ? 'nama_suplier' : 'nama_pembeli'
})

const satuan = computed(() => {
  if (!formData.value.produk_id) return ''
  const produk = products.value.find(p => p.id === formData.value.produk_id)
  return produk?.satuan || ''
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
    await getAllPenjualan({
      startDate,
      endDate,
      search: searchQuery.value
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Gagal memuat data penjualan',
      life: 3000
    })
  }
}

async function loadMasterData() {
  try {
    await Promise.all([
      getAllProduk(),
      getAllSupliers(),
      getAllPembeli()
    ])
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Gagal memuat data master',
      life: 3000
    })
  }
}

function openNewDialog() {
  isEditMode.value = false
  selectedProdukKategori.value = null
  formData.value = {
    id: null,
    tanggal_transaksi: new Date(),
    produk_id: null,
    pembeli_id: null,
    suplier_id: null,
    quantity: 0,
    harga_jual: 0,
    keterangan: ''
  }
  showDialog.value = true
}

function openEditDialog(data) {
  isEditMode.value = true
  
  // Get product category
  const produk = products.value.find(p => p.id === data.produk_id)
  selectedProdukKategori.value = produk?.kategori || null
  
  formData.value = {
    id: data.id,
    tanggal_transaksi: new Date(data.tanggal_transaksi),
    produk_id: data.produk_id,
    pembeli_id: data.pembeli_id,
    suplier_id: data.suplier_id,
    quantity: data.quantity,
    harga_jual: data.harga_jual,
    keterangan: data.keterangan || ''
  }
  showDialog.value = true
}

async function handleSave() {
  try {
    if (!formData.value.produk_id) {
      toast.add({
        severity: 'warn',
        summary: 'Peringatan',
        detail: 'Harap pilih produk',
        life: 3000
      })
      return
    }

    if (!formData.value.pembeli_id && !formData.value.suplier_id) {
      toast.add({
        severity: 'warn',
        summary: 'Peringatan',
        detail: `Harap pilih ${buyerLabel.value}`,
        life: 3000
      })
      return
    }

    if (formData.value.quantity <= 0 || formData.value.harga_jual <= 0) {
      toast.add({
        severity: 'warn',
        summary: 'Peringatan',
        detail: 'Quantity dan Harga Jual harus lebih dari 0',
        life: 3000
      })
      return
    }

    // Check stock availability
    const produk = await getProdukById(formData.value.produk_id)
    if (!isEditMode.value && produk && produk.stok < formData.value.quantity) {
      toast.add({
        severity: 'error',
        summary: 'Stok Tidak Mencukupi',
        detail: `Stok tersedia: ${produk.stok} ${produk.satuan}`,
        life: 3000
      })
      return
    }

    const payload = {
      tanggal_transaksi: formatDate(formData.value.tanggal_transaksi, 'yyyy-MM-dd'),
      produk_id: formData.value.produk_id,
      pembeli_id: selectedProdukKategori.value === 'Susu' ? formData.value.pembeli_id : null,
      suplier_id: selectedProdukKategori.value === 'Pakan' ? formData.value.suplier_id : null,
      quantity: formData.value.quantity,
      harga_jual: formData.value.harga_jual,
      keterangan: formData.value.keterangan
    }

    if (isEditMode.value) {
      await updatePenjualan(formData.value.id, payload)
      toast.add({
        severity: 'success',
        summary: 'Berhasil',
        detail: 'Data penjualan berhasil diupdate',
        life: 3000
      })
    } else {
      await createPenjualan(payload)
      toast.add({
        severity: 'success',
        summary: 'Berhasil',
        detail: 'Data penjualan berhasil ditambahkan',
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
        await deletePenjualan(data.id)
        toast.add({
          severity: 'success',
          summary: 'Berhasil',
          detail: 'Data penjualan berhasil dihapus',
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
  }
}

async function onProdukChange(produkId) {
  const selectedProduct = products.value.find(p => p.id === produkId)
  if (selectedProduct) {
    formData.value.harga_jual = selectedProduct.harga_jual_default
    selectedProdukKategori.value = selectedProduct.kategori
    
    // Reset buyer selection when product changes
    formData.value.pembeli_id = null
    formData.value.suplier_id = null
    
    // Update label
    buyerLabel.value = selectedProduct.kategori === 'Pakan' ? 'Suplier' : 'Pembeli'
  }
}

function getBuyerName(rowData) {
  if (rowData.pembeli) {
    return rowData.pembeli.nama_pembeli
  } else if (rowData.suplier) {
    return rowData.suplier.nama_suplier
  }
  return '-'
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
    
    <div class="flex container-dsk">
      <AppSidebar v-model:visible="sidebarVisible" />
      
      <main class="flex-1 p-6" :class="{ 'ml-64': sidebarVisible }">
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-gray-800">Penjualan</h1>
          <p class="text-gray-600">Kelola transaksi penjualan produk koperasi</p>
        </div>

        <!-- Filters -->
        <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <!-- Search -->
            <div class="md:col-span-2">
              <span class="p-input-icon-left w-full">
                <i class="pi pi-search" />
                <InputText
                  v-model="searchQuery"
                  placeholder="Cari nama pembeli atau produk..."
                  class="w-full"
                  @input="loadData"
                />
              </span>
            </div>

            <!-- Time Filter -->
            <div>
              <Dropdown
                v-model="timeFilter"
                :options="timeFilterOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Pilih periode"
                class="w-full"
                @change="onTimeFilterChange"
              />
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

          <!-- Custom Date Range -->
          <div v-if="showCustomDateRange" class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
          </div>
        </div>

        <!-- DataTable -->
        <div class="bg-white rounded-lg shadow-sm">
          <DataTable
            :value="filteredPenjualan"
            :loading="loading"
            paginator
            :rows="10"
            :rowsPerPageOptions="[10, 20, 50]"
            responsiveLayout="scroll"
            stripedRows
            :emptyMessage="'Tidak ada data penjualan'"
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
            
            <Column header="Nama Pembeli">
              <template #body="slotProps">
                {{ getBuyerName(slotProps.data) }}
              </template>
            </Column>
            
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
            
            <Column header="Aksi" style="width: 120px">
              <template #body="slotProps">
                <div class="flex gap-2">
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
                Total: {{ formatCurrency(totalPenjualan) }}
              </div>
            </template>
          </DataTable>
        </div>
      </main>
    </div>

    <!-- Dialog Form -->
    <Dialog
      v-model:visible="showDialog"
      :header="isEditMode ? 'Edit Penjualan' : 'Penjualan Baru'"
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

        <!-- Pembeli / Suplier (Conditional) -->
        <div v-if="selectedProdukKategori">
          <label class="block text-sm font-medium text-gray-700 mb-2">{{ buyerLabel }} *</label>
          <Dropdown
            v-if="selectedProdukKategori === 'Susu'"
            v-model="formData.pembeli_id"
            :options="pembeli"
            optionLabel="nama_pembeli"
            optionValue="id"
            placeholder="Pilih pembeli"
            class="w-full"
          />
          <Dropdown
            v-else-if="selectedProdukKategori === 'Pakan'"
            v-model="formData.suplier_id"
            :options="supliers"
            optionLabel="nama_suplier"
            optionValue="id"
            placeholder="Pilih suplier"
            class="w-full"
          />
        </div>

        <!-- Harga Jual -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Harga Jual *</label>
          <InputNumber
            v-model="formData.harga_jual"
            mode="currency"
            currency="IDR"
            locale="id-ID"
            class="w-full"
          />
        </div>

        <!-- Quantity -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Quantity {{ satuan ? `(${satuan})` : '' }} *
          </label>
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

        <!-- Keterangan -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Keterangan</label>
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
  </div>
</template>

<style scoped>
.ml-64 {
  margin-left: 16rem;
}
</style>