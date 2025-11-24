<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useProduk } from '../composables/useProduk'
import { formatCurrency } from '../utils/formatters'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import InputNumber from 'primevue/inputnumber'
import Tag from 'primevue/tag'
import AppHeader from '../components/layout/AppHeader.vue'
import AppSidebar from '../components/layout/AppSidebar.vue'
import { supabase } from '../composables/useSupabase'

const toast = useToast()
const confirm = useConfirm()
const { products, loading, getAllProduk } = useProduk()

// State
const sidebarVisible = ref(false)
const showDialog = ref(false)
const isEditMode = ref(false)
const searchQuery = ref('')

// Form data
const formData = ref({
  id: null,
  kode_produk: '',
  nama_produk: '',
  kategori: null,
  satuan: null,
  stok: 0,
  harga_beli_default: 0,
  harga_jual_default: 0
})

// Options
const kategoriOptions = [
  { label: 'Susu', value: 'Susu' },
  { label: 'Pakan', value: 'Pakan' }
]

const satuanOptions = [
  { label: 'Liter', value: 'Liter' },
  { label: 'Kg', value: 'Kg' }
]

// Computed
const filteredProducts = computed(() => {
  if (!searchQuery.value) return products.value
  
  const query = searchQuery.value.toLowerCase()
  return products.value.filter(p => 
    p.nama_produk.toLowerCase().includes(query) ||
    p.kode_produk.toLowerCase().includes(query)
  )
})

// Methods
function toggleSidebar() {
  sidebarVisible.value = !sidebarVisible.value
}

function openNewDialog() {
  isEditMode.value = false
  formData.value = {
    id: null,
    kode_produk: '',
    nama_produk: '',
    kategori: null,
    satuan: null,
    stok: 0,
    harga_beli_default: 0,
    harga_jual_default: 0
  }
  showDialog.value = true
}

function openEditDialog(data) {
  isEditMode.value = true
  formData.value = {
    id: data.id,
    kode_produk: data.kode_produk,
    nama_produk: data.nama_produk,
    kategori: data.kategori,
    satuan: data.satuan,
    stok: data.stok,
    harga_beli_default: data.harga_beli_default,
    harga_jual_default: data.harga_jual_default
  }
  showDialog.value = true
}

async function handleSave() {
  try {
    if (!formData.value.nama_produk || !formData.value.kategori || !formData.value.satuan) {
      toast.add({
        severity: 'warn',
        summary: 'Peringatan',
        detail: 'Harap lengkapi semua field yang wajib diisi',
        life: 3000
      })
      return
    }

    const payload = {
      nama_produk: formData.value.nama_produk,
      kategori: formData.value.kategori,
      satuan: formData.value.satuan,
      stok: formData.value.stok || 0,
      harga_beli_default: formData.value.harga_beli_default || 0,
      harga_jual_default: formData.value.harga_jual_default || 0,
      is_active: true
    }

    if (isEditMode.value) {
      const { error } = await supabase
        .from('produk')
        .update(payload)
        .eq('id', formData.value.id)

      if (error) throw error

      toast.add({
        severity: 'success',
        summary: 'Berhasil',
        detail: 'Data produk berhasil diupdate',
        life: 3000
      })
    } else {
      const { error } = await supabase
        .from('produk')
        .insert([payload])

      if (error) throw error

      toast.add({
        severity: 'success',
        summary: 'Berhasil',
        detail: 'Data produk berhasil ditambahkan',
        life: 3000
      })
    }

    showDialog.value = false
    await getAllProduk()
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
    message: `Apakah Anda yakin ingin menghapus produk "${data.nama_produk}"?`,
    header: 'Konfirmasi Hapus',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Ya',
    rejectLabel: 'Tidak',
    accept: async () => {
      try {
        const { error } = await supabase
          .from('produk')
          .delete()
          .eq('id', data.id)

        if (error) throw error

        toast.add({
          severity: 'success',
          summary: 'Berhasil',
          detail: 'Data produk berhasil dihapus',
          life: 3000
        })
        await getAllProduk()
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Gagal menghapus data. Mungkin produk sedang digunakan di transaksi.',
          life: 3000
        })
      }
    }
  })
}

function onKategoriChange(kategori) {
  // Auto-set satuan based on kategori
  if (kategori === 'Susu') {
    formData.value.satuan = 'Liter'
  } else if (kategori === 'Pakan') {
    formData.value.satuan = 'Kg'
  }
}

// Lifecycle
onMounted(async () => {
  await getAllProduk()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <AppHeader @toggle-sidebar="toggleSidebar" />
    
    <div class="flex">
      <AppSidebar v-model:visible="sidebarVisible" />
      
      <main class="flex-1 p-6" :class="{ 'ml-64': sidebarVisible }">
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-gray-800">Produk</h1>
          <p class="text-gray-600">Kelola data produk koperasi</p>
        </div>

        <!-- Filters -->
        <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Search -->
            <div>
              <span class="p-input-icon-left w-full">
                <i class="pi pi-search" />
                <InputText
                  v-model="searchQuery"
                  placeholder="Cari nama atau kode produk..."
                  class="w-full"
                />
              </span>
            </div>

            <!-- New Button -->
            <div class="text-right">
              <Button
                label="New Produk"
                icon="pi pi-plus"
                @click="openNewDialog"
              />
            </div>
          </div>
        </div>

        <!-- DataTable -->
        <div class="bg-white rounded-lg shadow-sm">
          <DataTable
            :value="filteredProducts"
            :loading="loading"
            paginator
            :rows="10"
            :rowsPerPageOptions="[10, 20, 50]"
            responsiveLayout="scroll"
            stripedRows
            :emptyMessage="'Tidak ada data produk'"
          >
            <Column field="no" header="No" style="width: 70px">
              <template #body="slotProps">
                {{ slotProps.index + 1 }}
              </template>
            </Column>
            
            <Column field="kode_produk" header="Kode Produk" />
            
            <Column field="nama_produk" header="Nama Produk" />
            
            <Column field="kategori" header="Kategori">
              <template #body="slotProps">
                <Tag 
                  :value="slotProps.data.kategori"
                  :severity="slotProps.data.kategori === 'Susu' ? 'info' : 'success'"
                />
              </template>
            </Column>
            
            <Column field="satuan" header="Satuan" />
            
            <Column field="stok" header="Stok">
              <template #body="slotProps">
                {{ slotProps.data.stok }} {{ slotProps.data.satuan }}
              </template>
            </Column>
            
            <Column field="harga_beli_default" header="Harga Beli">
              <template #body="slotProps">
                {{ formatCurrency(slotProps.data.harga_beli_default) }}
              </template>
            </Column>
            
            <Column field="harga_jual_default" header="Harga Jual">
              <template #body="slotProps">
                {{ formatCurrency(slotProps.data.harga_jual_default) }}
              </template>
            </Column>
            
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
          </DataTable>
        </div>
      </main>
    </div>

    <!-- Dialog Form -->
    <Dialog
      v-model:visible="showDialog"
      :header="isEditMode ? 'Edit Produk' : 'Produk Baru'"
      :modal="true"
      :style="{ width: '500px' }"
    >
      <div class="flex flex-col gap-4">
        <!-- Kode Produk (Read-only saat edit) -->
        <div v-if="isEditMode">
          <label class="block text-sm font-medium text-gray-700 mb-2">Kode Produk</label>
          <InputText
            v-model="formData.kode_produk"
            disabled
            class="w-full"
          />
        </div>

        <!-- Nama Produk -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Nama Produk *</label>
          <InputText
            v-model="formData.nama_produk"
            placeholder="Contoh: Susu Segar"
            class="w-full"
          />
        </div>

        <!-- Kategori -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Kategori *</label>
          <Dropdown
            v-model="formData.kategori"
            :options="kategoriOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Pilih kategori"
            class="w-full"
            @change="onKategoriChange(formData.kategori)"
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

        <!-- Stok -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Stok Awal</label>
          <InputNumber
            v-model="formData.stok"
            :min="0"
            :minFractionDigits="2"
            :maxFractionDigits="2"
            class="w-full"
          />
        </div>

        <!-- Harga Beli Default -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Harga Beli Default</label>
          <InputNumber
            v-model="formData.harga_beli_default"
            mode="currency"
            currency="IDR"
            locale="id-ID"
            class="w-full"
          />
        </div>

        <!-- Harga Jual Default -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Harga Jual Default</label>
          <InputNumber
            v-model="formData.harga_jual_default"
            mode="currency"
            currency="IDR"
            locale="id-ID"
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