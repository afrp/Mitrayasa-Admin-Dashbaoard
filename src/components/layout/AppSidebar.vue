<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { supabase } from '../../composables/useSupabase'
import Menu from 'primevue/menu'
import Sidebar from 'primevue/sidebar'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['update:visible'])

const router = useRouter()
const authStore = useAuthStore()

// State
const currentAdmin = ref(null)
const adminPermissions = ref([])
const loading = ref(true)

// Load current admin data and permissions
async function loadAdminData() {
  try {
    const userId = authStore.user?.id
    if (!userId) return

    // Get admin data
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('id', userId)
      .single()

    if (adminError) throw adminError

    currentAdmin.value = adminData

    // Get permissions if not master
    if (!adminData.is_master) {
      const { data: permData, error: permError } = await supabase
        .from('admin_permissions')
        .select('menu_name')
        .eq('admin_id', userId)
        .eq('can_access', true)

      if (permError) throw permError

      adminPermissions.value = permData.map(p => p.menu_name)
    }

    console.log('Admin data loaded:', {
      isMaster: adminData.is_master,
      permissions: adminPermissions.value
    })
  } catch (error) {
    console.error('Error loading admin data:', error)
  } finally {
    loading.value = false
  }
}

// Check if user has access to a menu
function hasAccess(menuKey) {
  // Master admin has access to all menus
  if (currentAdmin.value?.is_master) return true

  // Check if menu key exists in permissions
  return adminPermissions.value.includes(menuKey)
}

// Base menu structure with permission keys
const baseMenuItems = ref([
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: 'pi pi-home',
    command: () => {
      router.push('/dashboard')
      emit('update:visible', false)
    }
  },
  {
    key: 'pembelian',
    label: 'Pembelian',
    icon: 'pi pi-shopping-cart',
    command: () => {
      router.push('/pembelian')
      emit('update:visible', false)
    }
  },
  {
    key: 'penjualan',
    label: 'Penjualan',
    icon: 'pi pi-money-bill',
    command: () => {
      router.push('/penjualan')
      emit('update:visible', false)
    }
  },
  {
    key: 'pengeluaran-kas',
    label: 'Pengeluaran Kas',
    icon: 'pi pi-wallet',
    command: () => {
      router.push('/pengeluaran-kas')
      emit('update:visible', false)
    }
  },
  {
    key: 'invoice',
    label: 'Nota',
    icon: 'pi pi-file',
    command: () => {
      router.push('/invoice')
      emit('update:visible', false)
    }
  },
  {
    key: 'produk',
    label: 'Produk',
    icon: 'pi pi-box',
    command: () => {
      router.push('/produk')
      emit('update:visible', false)
    }
  },
  {
    key: 'user',
    label: 'User',
    icon: 'pi pi-users',
    items: [
      {
        key: 'user-suplier',
        label: 'Pelanggan/Suplier',
        command: () => {
          router.push('/user/suplier')
          emit('update:visible', false)
        }
      },
      {
        key: 'user-pembeli',
        label: 'Pembeli',
        command: () => {
          router.push('/user/pembeli')
          emit('update:visible', false)
        }
      },
      {
        key: 'user-admin',
        label: 'Admin',
        command: () => {
          router.push('/user/admin')
          emit('update:visible', false)
        }
      }
    ]
  },
  {
    key: 'laporan',
    label: 'Laporan',
    icon: 'pi pi-chart-bar',
    items: [
      {
        key: 'laporan-suplier',
        label: 'Pelanggan/Suplier',
        command: () => {
          router.push('/laporan/suplier')
          emit('update:visible', false)
        }
      },
      {
        key: 'laporan-pembeli',
        label: 'Pembeli',
        command: () => {
          router.push('/laporan/pembeli')
          emit('update:visible', false)
        }
      },
      {
        key: 'laporan-laba-rugi',
        label: 'Laba Rugi',
        command: () => {
          router.push('/laporan/laba-rugi')
          emit('update:visible', false)
        }
      },
      {
        key: 'laporan-kas',
        label: 'Kas',
        command: () => {
          router.push('/laporan/kas')
          emit('update:visible', false)
        }
      },
      {
        key: 'laporan-penjualan',
        label: 'Penjualan',
        command: () => {
          router.push('/laporan/penjualan')
          emit('update:visible', false)
        }
      },
      {
        key: 'laporan-pembelian',
        label: 'Pembelian',
        command: () => {
          router.push('/laporan/pembelian')
          emit('update:visible', false)
        }
      },
      {
        key: 'laporan-hutang',
        label: 'Hutang/Piutang',
        command: () => {
          router.push('/laporan/hutang')
          emit('update:visible', false)
        }
      }
    ]
  }
])

// Filtered menu items based on permissions
const menuItems = computed(() => {
  if (loading.value) return []

  return baseMenuItems.value
    .filter(item => {
      // For items with subitems (User, Laporan)
      if (item.items) {
        // Filter subitems
        const visibleSubitems = item.items.filter(subitem => hasAccess(subitem.key))
        
        // If no subitems are visible, hide parent
        if (visibleSubitems.length === 0) return false
        
        // Update items with filtered subitems
        item.items = visibleSubitems
        return true
      }
      
      // For regular items
      return hasAccess(item.key)
    })
})

const sidebarVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// Lifecycle
onMounted(async () => {
  await loadAdminData()
})
</script>

<template>
  <Sidebar v-model:visible="sidebarVisible" :style="{ width: '280px' }">
    <template #header>
      <div class="sidebar-header">
        <h3>Menu</h3>
        <!-- Admin Info Badge -->
        <div v-if="currentAdmin" class="admin-badge">
          <i class="pi pi-user text-xs"></i>
          <span class="text-xs">{{ currentAdmin.is_master ? 'Master Admin' : 'User' }}</span>
        </div>
      </div>
    </template>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-8">
      <i class="pi pi-spin pi-spinner text-2xl text-gray-400"></i>
    </div>

    <!-- Menu -->
    <Menu v-else :model="menuItems" class="sidebar-menu" />

    <!-- No Access Message (jika user tidak punya akses sama sekali) -->
    <div v-if="!loading && menuItems.length === 0" class="p-4 text-center text-gray-500">
      <i class="pi pi-lock text-3xl mb-2"></i>
      <p class="text-sm">Tidak ada menu yang dapat diakses.</p>
      <p class="text-xs mt-1">Hubungi administrator untuk mengatur akses Anda.</p>
    </div>
  </Sidebar>
</template>

<style scoped>
.sidebar-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sidebar-header h3 {
  margin: 0;
  color: #1b0065;
  font-size: 1.25rem;
  font-weight: 600;
}

.admin-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background-color: rgba(27, 0, 101, 0.1);
  border-radius: 6px;
  color: #1b0065;
}

.sidebar-menu {
  border: none;
  width: 100%;
}

.sidebar-menu .p-menuitem-link {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.sidebar-menu .p-menuitem-link:hover {
  background-color: rgba(27, 0, 101, 0.1);
}

.sidebar-menu .p-menuitem-link .p-menuitem-icon {
  color: #1b0065;
  font-size: 1.1rem;
}

.sidebar-menu .p-menuitem-link .p-menuitem-text {
  color: #333;
  font-weight: 500;
}

.sidebar-menu .p-menuitem-link:hover .p-menuitem-text {
  color: #1b0065;
}

.sidebar-menu .p-submenu-list {
  padding-left: 1rem;
}

.p-sidebar {
  background-color: white;
}

.p-sidebar .p-sidebar-header {
  padding: 1.5rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
}

.p-sidebar .p-sidebar-content {
  padding: 1rem;
}
</style>