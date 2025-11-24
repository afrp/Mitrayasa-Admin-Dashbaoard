<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useAuthStore } from '../stores/auth'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Checkbox from 'primevue/checkbox'
import Tag from 'primevue/tag'
import AppHeader from '../components/layout/AppHeader.vue'
import AppSidebar from '../components/layout/AppSidebar.vue'
import { supabase } from '../composables/useSupabase'

const toast = useToast()
const confirm = useConfirm()
const authStore = useAuthStore()

// State
const sidebarVisible = ref(false)
const showDialog = ref(false)
const isEditMode = ref(false)
const searchQuery = ref('')
const admins = ref([])
const loading = ref(false)

// Form data
const formData = ref({
  id: null,
  kode_admin: '',
  nama_user: '',
  email: '',
  password: '',
  is_master: false,
  permissions: []
})

// Menu list untuk permissions
const menuList = [
  { name: 'Dashboard', value: 'dashboard' },
  { name: 'Pembelian', value: 'pembelian' },
  { name: 'Penjualan', value: 'penjualan' },
  { name: 'Pengeluaran Kas', value: 'pengeluaran-kas' },
  { name: 'Invoice', value: 'invoice' },
  { name: 'Produk', value: 'produk' },
  { name: 'User - Pelanggan/Suplier', value: 'user-suplier' },
  { name: 'User - Pembeli', value: 'user-pembeli' },
  { name: 'User - Admin', value: 'user-admin' },
  { name: 'Laporan - Pelanggan/Suplier', value: 'laporan-suplier' },
  { name: 'Laporan - Pembeli', value: 'laporan-pembeli' },
  { name: 'Laporan - Laba Rugi', value: 'laporan-laba-rugi' },
  { name: 'Laporan - Kas', value: 'laporan-kas' },
  { name: 'Laporan - Penjualan', value: 'laporan-penjualan' },
  { name: 'Laporan - Pembelian', value: 'laporan-pembelian' }
]

// Computed
const filteredAdmins = computed(() => {
  if (!searchQuery.value) return admins.value
  
  const query = searchQuery.value.toLowerCase()
  return admins.value.filter(a => 
    a.nama_user.toLowerCase().includes(query) ||
    a.email.toLowerCase().includes(query) ||
    a.kode_admin.toLowerCase().includes(query)
  )
})

const currentUserId = computed(() => authStore.user?.id)

// Methods
function toggleSidebar() {
  sidebarVisible.value = !sidebarVisible.value
}

async function loadAdmins() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    admins.value = data || []
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Gagal memuat data admin',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

async function loadPermissions(adminId) {
  try {
    const { data, error } = await supabase
      .from('admin_permissions')
      .select('menu_name')
      .eq('admin_id', adminId)
      .eq('can_access', true)

    if (error) throw error
    return data.map(p => p.menu_name)
  } catch (error) {
    return []
  }
}

function openNewDialog() {
  isEditMode.value = false
  formData.value = {
    id: null,
    kode_admin: '',
    nama_user: '',
    email: '',
    password: '',
    is_master: false,
    permissions: []
  }
  showDialog.value = true
}

async function openEditDialog(data) {
  isEditMode.value = true
  
  const permissions = await loadPermissions(data.id)
  
  formData.value = {
    id: data.id,
    kode_admin: data.kode_admin,
    nama_user: data.nama_user,
    email: data.email,
    password: '',
    is_master: data.is_master,
    permissions: permissions
  }
  showDialog.value = true
}

async function handleSave() {
  try {
    if (!formData.value.nama_user || !formData.value.email) {
      toast.add({
        severity: 'warn',
        summary: 'Peringatan',
        detail: 'Harap lengkapi nama user dan email',
        life: 3000
      })
      return
    }

    if (!isEditMode.value && !formData.value.password) {
      toast.add({
        severity: 'warn',
        summary: 'Peringatan',
        detail: 'Password wajib diisi untuk admin baru',
        life: 3000
      })
      return
    }

    if (!formData.value.is_master && formData.value.permissions.length === 0) {
      toast.add({
        severity: 'warn',
        summary: 'Peringatan',
        detail: 'Harap pilih minimal satu menu akses atau centang Master Admin',
        life: 3000
      })
      return
    }

    if (isEditMode.value) {
      // Update admin data
      const updatePayload = {
        nama_user: formData.value.nama_user,
        email: formData.value.email,
        is_master: formData.value.is_master
      }

      const { error: updateError } = await supabase
        .from('admins')
        .update(updatePayload)
        .eq('id', formData.value.id)

      if (updateError) throw updateError

      // Update permissions
      // Delete old permissions
      await supabase
        .from('admin_permissions')
        .delete()
        .eq('admin_id', formData.value.id)

      // Insert new permissions if not master
      if (!formData.value.is_master) {
        const permissionsData = formData.value.permissions.map(menu => ({
          admin_id: formData.value.id,
          menu_name: menu,
          can_access: true
        }))

        await supabase
          .from('admin_permissions')
          .insert(permissionsData)
      }

      toast.add({
        severity: 'success',
        summary: 'Berhasil',
        detail: 'Data admin berhasil diupdate',
        life: 3000
      })
    } else {
      // Create new user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.value.email,
        password: formData.value.password,
        options: {
          data: {
            name: formData.value.nama_user
          }
        }
      })

      if (authError) throw authError

      if (authData.user) {
        // Insert to admins table
        const { error: insertError } = await supabase
          .from('admins')
          .insert([{
            id: authData.user.id,
            nama_user: formData.value.nama_user,
            email: formData.value.email,
            is_master: formData.value.is_master,
            is_active: true
          }])

        if (insertError) throw insertError

        // Insert permissions if not master
        if (!formData.value.is_master) {
          const permissionsData = formData.value.permissions.map(menu => ({
            admin_id: authData.user.id,
            menu_name: menu,
            can_access: true
          }))

          await supabase
            .from('admin_permissions')
            .insert(permissionsData)
        }

        toast.add({
          severity: 'success',
          summary: 'Berhasil',
          detail: 'Admin baru berhasil ditambahkan',
          life: 3000
        })
      }
    }

    showDialog.value = false
    await loadAdmins()
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
  if (data.id === currentUserId.value) {
    toast.add({
      severity: 'warn',
      summary: 'Peringatan',
      detail: 'Anda tidak dapat menghapus akun sendiri',
      life: 3000
    })
    return
  }

  if (data.is_master) {
    toast.add({
      severity: 'warn',
      summary: 'Peringatan',
      detail: 'Tidak dapat menghapus admin master',
      life: 3000
    })
    return
  }

  confirm.require({
    message: `Apakah Anda yakin ingin menghapus admin "${data.nama_user}"?`,
    header: 'Konfirmasi Hapus',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Ya',
    rejectLabel: 'Tidak',
    accept: async () => {
      try {
        const { error } = await supabase
          .from('admins')
          .delete()
          .eq('id', data.id)

        if (error) throw error

        toast.add({
          severity: 'success',
          summary: 'Berhasil',
          detail: 'Admin berhasil dihapus',
          life: 3000
        })
        await loadAdmins()
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Gagal menghapus admin',
          life: 3000
        })
      }
    }
  })
}

function getAccessDisplay(admin) {
  if (admin.is_master) {
    return 'All'
  }
  return 'Limited'
}

function isCurrentUser(adminId) {
  return adminId === currentUserId.value
}

// Lifecycle
onMounted(async () => {
  await loadAdmins()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <AppHeader @toggle-sidebar="toggleSidebar" />
    
    <div class="flex">
      <AppSidebar v-model:visible="sidebarVisible" />
      
      <main class="flex-1 p-6" :class="{ 'ml-64': sidebarVisible }">
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-gray-800">Admin User</h1>
          <p class="text-gray-600">Kelola user admin aplikasi (Hanya Master Admin)</p>
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
                  placeholder="Cari nama user atau email..."
                  class="w-full"
                />
              </span>
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
            :value="filteredAdmins"
            :loading="loading"
            paginator
            :rows="10"
            :rowsPerPageOptions="[10, 20, 50]"
            responsiveLayout="scroll"
            stripedRows
            :emptyMessage="'Tidak ada data admin'"
          >
            <Column field="no" header="No" style="width: 70px">
              <template #body="slotProps">
                {{ slotProps.index + 1 }}
              </template>
            </Column>
            
            <Column field="kode_admin" header="Kode" />
            
            <Column field="nama_user" header="Nama User">
              <template #body="slotProps">
                <div class="flex items-center gap-2">
                  {{ slotProps.data.nama_user }}
                  <Tag 
                    v-if="isCurrentUser(slotProps.data.id)"
                    value="You"
                    severity="info"
                    class="text-xs"
                  />
                </div>
              </template>
            </Column>
            
            <Column field="email" header="Email" />
            
            <Column field="akses" header="Akses">
              <template #body="slotProps">
                <Tag 
                  :value="getAccessDisplay(slotProps.data)"
                  :severity="slotProps.data.is_master ? 'success' : 'warning'"
                />
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
                    :disabled="isCurrentUser(slotProps.data.id) || slotProps.data.is_master"
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
      :header="isEditMode ? 'Edit Admin' : 'Admin Baru'"
      :modal="true"
      :style="{ width: '600px' }"
    >
      <div class="flex flex-col gap-4">
        <!-- Kode Admin (Read-only saat edit) -->
        <div v-if="isEditMode">
          <label class="block text-sm font-medium text-gray-700 mb-2">Kode Admin</label>
          <InputText
            v-model="formData.kode_admin"
            disabled
            class="w-full"
          />
        </div>

        <!-- Nama User -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Nama User *</label>
          <InputText
            v-model="formData.nama_user"
            placeholder="Nama lengkap"
            class="w-full"
          />
        </div>

        <!-- Email -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Email *</label>
          <InputText
            v-model="formData.email"
            type="email"
            placeholder="email@example.com"
            class="w-full"
            :disabled="isEditMode"
          />
        </div>

        <!-- Password -->
        <div v-if="!isEditMode">
          <label class="block text-sm font-medium text-gray-700 mb-2">Password *</label>
          <Password
            v-model="formData.password"
            placeholder="Minimal 6 karakter"
            class="w-full"
            toggleMask
            :feedback="false"
          />
        </div>

        <!-- Master Admin Checkbox -->
        <div class="flex items-center gap-2 p-3 bg-gray-50 rounded">
          <Checkbox
            v-model="formData.is_master"
            inputId="master"
            :binary="true"
          />
          <label for="master" class="font-medium text-gray-700">
            Master Admin (Akses Penuh ke Semua Menu)
          </label>
        </div>

        <!-- Menu Permissions (jika bukan master) -->
        <div v-if="!formData.is_master">
          <label class="block text-sm font-medium text-gray-700 mb-2">Menu Akses *</label>
          <div class="border rounded p-4 max-h-60 overflow-y-auto">
            <div 
              v-for="menu in menuList" 
              :key="menu.value"
              class="flex items-center gap-2 mb-2"
            >
              <Checkbox
                v-model="formData.permissions"
                :inputId="menu.value"
                :value="menu.value"
              />
              <label :for="menu.value" class="text-sm">
                {{ menu.name }}
              </label>
            </div>
          </div>
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