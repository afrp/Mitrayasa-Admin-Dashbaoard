<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { usePengeluaranKas } from '../composables/usePengeluaranKas'
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

const { pengeluaran, loading, getAllPengeluaranKas, createPengeluaranKas, updatePengeluaranKas, deletePengeluaranKas } = usePengeluaranKas()

// State
const sidebarVisible = ref(false)
const showDialog = ref(false)
const isEditMode = ref(false)
const searchQuery = ref('')
const timeFilter = ref('month')
const categoryFilter = ref('All')
const customStartDate = ref(null)
const customEndDate = ref(null)
const showCustomDateRange = ref(false)

// Form data
const formData = ref({
  id: null,
  tanggal_transaksi: new Date(),
  tipe: null,
  nama_produk: '',
  harga_total: 0,
  keterangan: ''
})

// Options
const timeFilterOptions = [
  { label: 'Hari Ini', value: 'today' },
  { label: 'Minggu Ini', value: 'week' },
  { label: 'Bulan Ini', value: 'month' },
  { label: 'Custom', value: 'custom' }
]

const categoryOptions = [
  { label: 'All', value: 'All' },
  { label: 'Pengeluaran Susu', value: 'Pengeluaran Susu' },
  { label: 'Pengeluaran Pakan', value: 'Pengeluaran Pakan' },
  { label: 'Pengeluaran Produksi', value: 'Pengeluaran Produksi' }
]

const tipeOptions = [
  { label: 'Pengeluaran Susu', value: 'Pengeluaran Susu' },
  { label: 'Pengeluaran Pakan', value: 'Pengeluaran Pakan' },
  { label: 'Pengeluaran Produksi', value: 'Pengeluaran Produksi' }
]

// Computed
const filteredPengeluaran = computed(() => {
  return pengeluaran.value
})

const totalPengeluaran = computed(() => {
  return pengeluaran.value.reduce((sum, item) => sum + item.harga_total, 0)
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
    await getAllPengeluaranKas({
      startDate,
      endDate,
      search: searchQuery.value,
      category: categoryFilter.value
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Gagal memuat data pengeluaran kas',
      life: 3000
    })
  }
}

function openNewDialog() {
  isEditMode.value = false
  formData.value = {
    id: null,
    tanggal_transaksi: new Date(),
    tipe: null,
    nama_produk: '',
    harga_total: 0,
    keterangan: ''
  }
  showDialog.value = true
}

function openEditDialog(data) {
  isEditMode.value = true
  formData.value = {
    id: data.id,
    tanggal_transaksi: new Date(data.tanggal_transaksi),
    tipe: data.tipe,
    nama_produk: data.nama_produk,
    harga_total: data.harga_total,
    keterangan: data.keterangan || ''
  }
  showDialog.value = true
}

async function handleSave() {
  try {
    if (!formData.value.tipe || !formData.value.nama_produk) {
      toast.add({
        severity: 'warn',
        summary: 'Peringatan',
        detail: 'Harap lengkapi semua field yang wajib diisi',
        life: 3000
      })
      return
    }

    if (formData.value.harga_total <= 0) {
      toast.add({
        severity: 'warn',
        summary: 'Peringatan',
        detail: 'Harga Total harus lebih dari 0',
        life: 3000
      })
      return
    }

    const payload = {
      tanggal_transaksi: formatDate(formData.value.tanggal_transaksi, 'yyyy-MM-dd'),
      tipe: formData.value.tipe,
      nama_produk: formData.value.nama_produk,
      harga_total: formData.value.harga_total,
      keterangan: formData.value.keterangan
    }

    if (isEditMode.value) {
      await updatePengeluaranKas(formData.value.id, payload)
      toast.add({
        severity: 'success',
        summary: 'Berhasil',
        detail: 'Data pengeluaran kas berhasil diupdate',
        life: 3000
      })
    } else {
      await createPengeluaranKas(payload)
      toast.add({
        severity: 'success',
        summary: 'Berhasil',
        detail: 'Data pengeluaran kas berhasil ditambahkan',
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
    message: `Apakah Anda yakin ingin menghapus pengeluaran ini?`,
    header: 'Konfirmasi Hapus',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Ya',
    rejectLabel: 'Tidak',
    accept: async () => {
      try {
        await deletePengeluaranKas(data.id)
        toast.add({
          severity: 'success',
          summary: 'Berhasil',
          detail: 'Data pengeluaran kas berhasil dihapus',
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

function onCategoryChange() {
  loadData()
}

// Lifecycle
onMounted(async () => {
  await loadData()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <AppHeader @toggle-sidebar="toggleSidebar" />
    
    <div class="flex">
      <AppSidebar v-model:visible="sidebarVisible" />
      
      <main class="flex-1 p-6" :class="{ 'ml-64': sidebarVisible }">
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-gray-800">Pengeluaran Kas</h1>
          <p class="text-gray-600">Kelola pengeluaran kas untuk biaya operasional</p>
        </div>

        <!-- Filters -->
        <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
            <!-- Search -->
            <div class="md:col-span-2">
              <span class="p-input-icon-left w-full">
                <i class="pi pi-search" />
                <InputText
                  v-model="searchQuery"
                  placeholder="Cari nama produk..."
                  class="w-full"
                  @input="loadData"
                />
              </span>
            </div>

            <!-- Category Filter -->
            <div>
              <Dropdown
                v-model="categoryFilter"
                :options="categoryOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Kategori"
                class="w-full"
                @change="onCategoryChange"
              />
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
            :value="filteredPengeluaran"
            :loading="loading"
            paginator
            :rows="10"
            :rowsPerPageOptions="[10, 20, 50]"
            responsiveLayout="scroll"
            stripedRows
            :emptyMessage="'Tidak ada data pengeluaran kas'"
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
            
            <Column field="tipe" header="Tipe">
              <template #body="slotProps">
                <span 
                  class="px-2 py-1 rounded text-xs font-semibold"
                  :class="{
                    'bg-blue-100 text-blue-800': slotProps.data.tipe === 'Pengeluaran Susu',
                    'bg-green-100 text-green-800': slotProps.data.tipe === 'Pengeluaran Pakan',
                    'bg-purple-100 text-purple-800': slotProps.data.tipe === 'Pengeluaran Produksi'
                  }"
                >
                  {{ slotProps.data.tipe }}
                </span>
              </template>
            </Column>
            
            <Column field="nama_produk" header="Produk" />
            
            <Column field="harga_total" header="Harga Total">
              <template #body="slotProps">
                {{ formatCurrency(slotProps.data.harga_total) }}
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
                Total: {{ formatCurrency(totalPengeluaran) }}
              </div>
            </template>
          </DataTable>
        </div>
      </main>
    </div>

    <!-- Dialog Form -->
    <Dialog
      v-model:visible="showDialog"
      :header="isEditMode ? 'Edit Pengeluaran' : 'Pengeluaran Baru'"
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

        <!-- Tipe -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Tipe *</label>
          <Dropdown
            v-model="formData.tipe"
            :options="tipeOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Pilih tipe"
            class="w-full"
          />
        </div>

        <!-- Nama Produk -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Produk *</label>
          <InputText
            v-model="formData.nama_produk"
            placeholder="Contoh: Gas, Gula, Kemasan..."
            class="w-full"
          />
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

        <!-- Keterangan -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Keterangan</label>
          <Textarea
            v-model="formData.keterangan"
            rows="3"
            class="w-full"
            placeholder="Keterangan tambahan..."
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