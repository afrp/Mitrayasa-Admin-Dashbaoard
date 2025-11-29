<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useSupliers } from '../composables/useSupliers'
import { formatCurrency } from '../utils/formatters'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import AppHeader from '../components/layout/AppHeader.vue'
import AppSidebar from '../components/layout/AppSidebar.vue'
import { supabase } from '../composables/useSupabase'
import InputIcon from 'primevue/inputicon'
import IconField from 'primevue/iconfield'
import PermissionGuard from '../components/PermissionGuard.vue'

const toast = useToast()
const confirm = useConfirm()
const { supliers, loading, getAllSupliers } = useSupliers()

// State
const sidebarVisible = ref(false)
const showDialog = ref(false)
const isEditMode = ref(false)
const searchQuery = ref('')
const suplierHutang = ref({}) // Store hutang per suplier_id

// Form data
const formData = ref({
  id: null,
  kode_suplier: '',
  nama_suplier: '',
  kelompok: '',
  alamat: ''
})

// Computed
const filteredSupliers = computed(() => {
  if (!searchQuery.value) return supliers.value
  
  const query = searchQuery.value.toLowerCase()
  return supliers.value.filter(s => 
    s.nama_suplier.toLowerCase().includes(query) ||
    s.kode_suplier.toLowerCase().includes(query) ||
    (s.kelompok && s.kelompok.toLowerCase().includes(query))
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
    kode_suplier: '',
    nama_suplier: '',
    kelompok: '',
    alamat: ''
  }
  showDialog.value = true
}

function openEditDialog(data) {
  isEditMode.value = true
  formData.value = {
    id: data.id,
    kode_suplier: data.kode_suplier,
    nama_suplier: data.nama_suplier,
    kelompok: data.kelompok || '',
    alamat: data.alamat || ''
  }
  showDialog.value = true
}

async function handleSave() {
  try {
    if (!formData.value.nama_suplier || !formData.value.kelompok || !formData.value.alamat) {
      toast.add({
        severity: 'warn',
        summary: 'Peringatan',
        detail: 'Harap lengkapi semua field yang wajib diisi',
        life: 3000
      })
      return
    }

    const payload = {
      nama_suplier: formData.value.nama_suplier,
      kelompok: formData.value.kelompok,
      alamat: formData.value.alamat,
      is_active: true
    }

    if (isEditMode.value) {
      const { error } = await supabase
        .from('supliers')
        .update(payload)
        .eq('id', formData.value.id)

      if (error) throw error

      toast.add({
        severity: 'success',
        summary: 'Berhasil',
        detail: 'Data suplier berhasil diupdate',
        life: 3000
      })
    } else {
      const { error } = await supabase
        .from('supliers')
        .insert([payload])

      if (error) throw error

      toast.add({
        severity: 'success',
        summary: 'Berhasil',
        detail: 'Data suplier berhasil ditambahkan',
        life: 3000
      })
    }

    showDialog.value = false
    await getAllSupliers()
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
    message: `Apakah Anda yakin ingin menghapus suplier "${data.nama_suplier}"?`,
    header: 'Konfirmasi Hapus',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Ya',
    rejectLabel: 'Tidak',
    accept: async () => {
      try {
        const { error } = await supabase
          .from('supliers')
          .delete()
          .eq('id', data.id)

        if (error) throw error

        toast.add({
          severity: 'success',
          summary: 'Berhasil',
          detail: 'Data suplier berhasil dihapus',
          life: 3000
        })
        await getAllSupliers()
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Gagal menghapus data. Mungkin suplier sedang digunakan di transaksi.',
          life: 3000
        })
      }
    }
  })
}

// Lifecycle
onMounted(async () => {
  await getAllSupliers()
  await loadHutangPerSuplier()
})

async function loadHutangPerSuplier() {
  try {
    const { data, error } = await supabase
      .from('pembelian')
      .select('suplier_id, sisa_hutang')
      .eq('status_pembayaran', 'Belum Lunas')

    if (error) throw error

    // Group hutang by suplier_id
    suplierHutang.value = {}
    if (data) {
      data.forEach(item => {
        if (!suplierHutang.value[item.suplier_id]) {
          suplierHutang.value[item.suplier_id] = 0
        }
        suplierHutang.value[item.suplier_id] += item.sisa_hutang || 0
      })
    }
  } catch (error) {
    console.error('Error loading hutang per suplier:', error)
  }
}

function getHutangSuplier(suplier_id) {
  return suplierHutang.value[suplier_id] || 0
}
</script>

<template>
  <PermissionGuard permission="suplier" class="min-h-screen bg-gray-50">
    <AppHeader @toggle-sidebar="toggleSidebar" />
    <AppSidebar v-model:visible="sidebarVisible" />
    <div class="flex container-dsk">    
      <main class="flex-1 cont-md">
        <div class="page-header pt-8">
          <h1>Pelanggan/Suplier (Peternak)</h1>
          <div class="filter-section">                      
            <!-- Search -->
            <div class="md:col-span-2">                  
              <IconField>
                <InputIcon class="pi pi-search" />
                <InputText
                  v-model="searchQuery"
                  placeholder="Cari nama peternak..."
                  class="w-full"
                />
              </IconField>
            </div>
            <!-- New Button -->
            <div class="text-right">
              <Button
                label="New User"
                icon="pi pi-plus"
                @click="openNewDialog"
              />
            </div>
          </div>
        </div>
        
        <!-- DataTable -->
        <div class="bg-white rounded-lg shadow-sm">
          <DataTable
            :value="filteredSupliers"
            :loading="loading"
            paginator
            :rows="10"
            :rowsPerPageOptions="[10, 20, 50]"
            responsiveLayout="scroll"
            stripedRows
            :emptyMessage="'Tidak ada data suplier'"
            scrollable
            tableStyle="min-width: 375px"
            class="table-mdm"
          >
            <Column field="no" header="No">
              <template #body="slotProps">
                {{ slotProps.index + 1 }}
              </template>
            </Column>
            
            <Column field="kode_suplier" header="Kode" />
            
            <Column field="nama_suplier" header="Nama" />
            
            <Column field="kelompok" header="Kelompok" />
            
            <Column field="alamat" header="Alamat" />
            
            <Column field="hutang" header="Hutang Koperasi">
              <template #body="slotProps">
                <span 
                  v-if="getHutangSuplier(slotProps.data.id) > 0"
                  class="font-semibold text-red-600"
                >
                  {{ formatCurrency(getHutangSuplier(slotProps.data.id)) }}
                </span>
                <span v-else class="text-green-600">
                  {{ formatCurrency(0) }}
                </span>
              </template>
            </Column>
            
            <Column header="Aksi" >
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
      :header="isEditMode ? 'Edit Suplier' : 'Suplier Baru'"
      :modal="true"
      :style="{ width: '500px' }"
    >
      <div class="flex flex-col gap-4">
        <!-- Kode Suplier (Read-only saat edit) -->
        <div v-if="isEditMode">
          <label class="block text-sm font-medium text-gray-700 mb-2">Kode Suplier</label>
          <InputText
            v-model="formData.kode_suplier"
            disabled
            class="w-full"
          />
        </div>

        <!-- Nama Peternak -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Nama Peternak *</label>
          <InputText
            v-model="formData.nama_suplier"
            placeholder="Nama peternak"
            class="w-full"
          />
        </div>

        <!-- Kelompok -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Kelompok *</label>
          <InputText
            v-model="formData.kelompok"
            placeholder="Contoh: Kelompok Tani Makmur"
            class="w-full"
          />
        </div>

        <!-- Alamat -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Alamat *</label>
          <Textarea
            v-model="formData.alamat"
            rows="3"
            class="w-full"
            placeholder="Alamat lengkap"
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
  </PermissionGuard>
</template>

<style scoped>
.ml-64 {
  margin-left: 16rem;
}
</style>