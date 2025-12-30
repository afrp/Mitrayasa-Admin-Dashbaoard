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
import InputIcon from 'primevue/inputicon'
import IconField from 'primevue/iconfield'
import PermissionGuard from '../components/PermissionGuard.vue'

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
const currentAdmin = ref(null) // Data admin yang sedang login

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
const currentUserId = computed(() => authStore.user?.id)

const isMasterAdmin = computed(() => currentAdmin.value?.is_master === true)

const filteredAdmins = computed(() => {
  if (!searchQuery.value) return admins.value
  
  const query = searchQuery.value.toLowerCase()
  return admins.value.filter(a => 
    a.nama_user.toLowerCase().includes(query) ||
    a.email.toLowerCase().includes(query) ||
    a.kode_admin.toLowerCase().includes(query)
  )
})

// Methods
function toggleSidebar() {
  sidebarVisible.value = !sidebarVisible.value
}

// Load current admin data
async function loadCurrentAdmin() {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('id', currentUserId.value)
      .single()

    if (error) throw error
    
    currentAdmin.value = data    
    
    // Extra: Simpan ke localStorage untuk quick check
    localStorage.setItem('admin_role', data.is_master ? 'master' : 'user')
    
  } catch (error) {
    console.error('❌ Error loading current admin:', error)
    
    // Redirect ke login jika data admin tidak ditemukan
    if (error.code === 'PGRST116') { // Not found
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Data admin tidak ditemukan. Silakan hubungi administrator.',
        life: 5000
      })
      // Optional: Redirect to login
      // await authStore.logout()
      // router.push('/login')
    } else {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Gagal memuat data admin saat ini',
        life: 3000
      })
    }
  }
}

async function loadAdmins() {
  loading.value = true
  try {
    // console.log('🔍 Loading admins...')
    // console.log('Current User ID:', currentUserId.value)
    // console.log('Current Admin:', currentAdmin.value)
    // console.log('Is Master Admin:', isMasterAdmin.value)

    let query = supabase
      .from('admins')
      .select('*')
      .order('created_at', { ascending: false })

    // Jika bukan master admin, hanya tampilkan data sendiri
    if (!isMasterAdmin.value) {
      // console.log('⚠️ Not master admin, filtering to own data only')
      query = query.eq('id', currentUserId.value)
    } else {
      console.log('✅ Master admin, loading all data')
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ Error loading admins:', error)
      throw error
    }

    // console.log('📊 Loaded admins data:', data)
    // console.log('📊 Total admins:', data?.length)
    
    admins.value = data || []
  } catch (error) {
    console.error('Error loading admins:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Gagal memuat data admin: ' + error.message,
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
  // Cek apakah master admin
  if (!isMasterAdmin.value) {
    toast.add({
      severity: 'warn',
      summary: 'Akses Ditolak',
      detail: 'Hanya Master Admin yang dapat menambah user baru',
      life: 3000
    })
    return
  }

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
  // Cek apakah user ini boleh edit
  if (!isMasterAdmin.value && data.id !== currentUserId.value) {
    toast.add({
      severity: 'warn',
      summary: 'Akses Ditolak',
      detail: 'Anda hanya dapat mengubah data Anda sendiri',
      life: 3000
    })
    return
  }

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

    // Validasi: User biasa tidak boleh mengubah is_master
    if (!isMasterAdmin.value && isEditMode.value && formData.value.id === currentUserId.value) {
      // Pastikan is_master tidak berubah
      formData.value.is_master = currentAdmin.value.is_master
    }

    if (isEditMode.value) {
      // Validasi: User biasa hanya boleh edit data sendiri
      if (!isMasterAdmin.value && formData.value.id !== currentUserId.value) {
        toast.add({
          severity: 'warn',
          summary: 'Akses Ditolak',
          detail: 'Anda hanya dapat mengubah data Anda sendiri',
          life: 3000
        })
        return
      }

      // Update admin data
      const updatePayload = {
        nama_user: formData.value.nama_user,
        email: formData.value.email
      }

      // Hanya master admin yang bisa ubah is_master
      if (isMasterAdmin.value) {
        updatePayload.is_master = formData.value.is_master
      }

      const { error: updateError } = await supabase
        .from('admins')
        .update(updatePayload)
        .eq('id', formData.value.id)

      if (updateError) throw updateError

      // Update permissions (hanya jika master admin atau mengubah data sendiri)
      if (isMasterAdmin.value || formData.value.id === currentUserId.value) {
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

          if (permissionsData.length > 0) {
            await supabase
              .from('admin_permissions')
              .insert(permissionsData)
          }
        }
      }

      toast.add({
        severity: 'success',
        summary: 'Berhasil',
        detail: 'Data admin berhasil diupdate',
        life: 3000
      })

      // Reload current admin jika mengubah data sendiri
      if (formData.value.id === currentUserId.value) {
        await loadCurrentAdmin()
      }
    } else {
      // Validasi: Hanya master admin yang bisa tambah user baru
      if (!isMasterAdmin.value) {
        toast.add({
          severity: 'warn',
          summary: 'Akses Ditolak',
          detail: 'Hanya Master Admin yang dapat menambah user baru',
          life: 3000
        })
        return
      }

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
        // Auto-confirm user (skip email verification)
        // Note: Pastikan email confirmation sudah disabled di Supabase settings
        
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
        if (!formData.value.is_master && formData.value.permissions.length > 0) {
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
    console.error('Error saving admin:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Gagal menyimpan data',
      life: 3000
    })
  }
}

function confirmDelete(data) {
  // Validasi: Hanya master admin yang bisa delete
  if (!isMasterAdmin.value) {
    toast.add({
      severity: 'warn',
      summary: 'Akses Ditolak',
      detail: 'Hanya Master Admin yang dapat menghapus user',
      life: 3000
    })
    return
  }

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
        // Delete dari table admins (cascade akan hapus permissions juga)
        const { error } = await supabase
          .from('admins')
          .delete()
          .eq('id', data.id)

        if (error) throw error

        // TODO: Delete user dari auth.users juga (perlu service role)
        // Untuk sekarang, user masih bisa login tapi tidak ada di table admins

        toast.add({
          severity: 'success',
          summary: 'Berhasil',
          detail: 'Admin berhasil dihapus',
          life: 3000
        })
        await loadAdmins()
      } catch (error) {
        console.error('Error deleting admin:', error)
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
    return 'All Access'
  }
  return 'Limited'
}

function isCurrentUser(adminId) {
  return adminId === currentUserId.value
}

function canEditAdmin(admin) {
  // Master admin bisa edit semua
  if (isMasterAdmin.value) return true
  
  // User biasa hanya bisa edit data sendiri
  return admin.id === currentUserId.value
}

function canDeleteAdmin(admin) {
  // Hanya master admin yang bisa delete
  if (!isMasterAdmin.value) return false
  
  // Tidak bisa delete diri sendiri
  if (admin.id === currentUserId.value) return false
  
  // Tidak bisa delete master admin lain
  if (admin.is_master) return false
  
  return true
}

// Lifecycle
onMounted(async () => {
  await loadCurrentAdmin()
  await loadAdmins()
})
</script>

<template>
  <PermissionGuard permission="admin" class="min-h-screen bg-gray-50">
    <AppHeader @toggle-sidebar="toggleSidebar" />
    <AppSidebar v-model:visible="sidebarVisible" />
    <div class="flex container-dsk">
      <main class="flex-1 cont-md">
        <div class="page-header pt-8">
          <h1>Admin User</h1>
          
          <!-- Info Badge untuk Non-Master Admin -->
          <div v-if="!isMasterAdmin" class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div class="flex items-center gap-2">
              <i class="pi pi-info-circle text-blue-600"></i>
              <span class="text-blue-800">
                Anda login sebagai <strong>User Biasa</strong>. Anda hanya dapat melihat dan mengubah data Anda sendiri.
              </span>
            </div>
          </div>

          <div class="filter-section">                      
            <!-- Search (hanya untuk master admin) -->
            <div v-if="isMasterAdmin" class="md:col-span-2">                  
              <IconField>
                <InputIcon class="pi pi-search" />
                <InputText
                  v-model="searchQuery"
                  placeholder="Cari nama, email, atau kode admin..."
                  class="w-full"
                />
              </IconField>
            </div>
            
            <!-- New Button (hanya untuk master admin) -->
            <div v-if="isMasterAdmin" class="text-right">
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
            scrollable
            tableStyle="min-width: 375px"
            class="table-mdm"
          >
            <Column field="no" header="No">
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
            
            <Column field="akses" header="Role">
              <template #body="slotProps">
                <Tag 
                  :value="slotProps.data.is_master ? 'Master Admin' : 'User'"
                  :severity="slotProps.data.is_master ? 'success' : 'warning'"
                />
              </template>
            </Column>
            
            <Column field="akses_menu" header="Menu Access">
              <template #body="slotProps">
                <span class="text-sm text-gray-600">
                  {{ getAccessDisplay(slotProps.data) }}
                </span>
              </template>
            </Column>
            
            <Column header="Aksi">
              <template #body="slotProps">
                <div class="flex gap-2">
                  <Button
                    icon="pi pi-pencil"
                    class="p-button-warning p-button-sm"
                    v-tooltip.top="canEditAdmin(slotProps.data) ? 'Edit' : 'Anda tidak memiliki akses'"
                    :disabled="!canEditAdmin(slotProps.data)"
                    @click="openEditDialog(slotProps.data)"
                  />
                  <Button
                    v-if="isMasterAdmin"
                    icon="pi pi-trash"
                    class="p-button-danger p-button-sm"
                    v-tooltip.top="canDeleteAdmin(slotProps.data) ? 'Hapus' : 'Tidak dapat dihapus'"
                    :disabled="!canDeleteAdmin(slotProps.data)"
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
          <small v-if="isEditMode" class="text-gray-500">
            Email tidak dapat diubah setelah dibuat
          </small>
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

        <!-- Master Admin Checkbox (hanya untuk master admin) -->
        <div v-if="isMasterAdmin" class="flex items-center gap-2 p-3 bg-gray-50 rounded">
          <Checkbox
            v-model="formData.is_master"
            inputId="master"
            :binary="true"
          />
          <label for="master" class="font-medium text-gray-700">
            Master Admin (Akses Penuh ke Semua Menu)
          </label>
        </div>

        <!-- Info jika user biasa edit data sendiri -->
        <div v-if="!isMasterAdmin && isEditMode" class="p-3 bg-blue-50 border border-blue-200 rounded">
          <div class="flex items-start gap-2">
            <i class="pi pi-info-circle text-blue-600 mt-0.5"></i>
            <div class="text-sm text-blue-800">
              <p class="font-medium mb-1">Catatan:</p>
              <ul class="list-disc list-inside space-y-1">
                <li>Anda hanya dapat mengubah nama dan email Anda</li>
                <li>Role dan menu akses hanya dapat diubah oleh Master Admin</li>
              </ul>
            </div>
          </div>
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
                :disabled="!isMasterAdmin && isEditMode"
              />
              <label 
                :for="menu.value" 
                class="text-sm"
                :class="{ 'text-gray-400': !isMasterAdmin && isEditMode }"
              >
                {{ menu.name }}
              </label>
            </div>
          </div>
          <small v-if="!isMasterAdmin && isEditMode" class="text-gray-500">
            Menu akses hanya dapat diubah oleh Master Admin
          </small>
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