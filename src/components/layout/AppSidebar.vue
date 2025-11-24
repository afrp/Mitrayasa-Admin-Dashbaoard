<script setup>
import { ref, computed, defineProps, defineEmits } from 'vue'
import { useRouter } from 'vue-router'
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

const menuItems = ref([
  {
    label: 'Dashboard',
    icon: 'pi pi-home',
    command: () => {
      router.push('/dashboard')
      emit('update:visible', false)
    }
  },
  {
    label: 'Pembelian',
    icon: 'pi pi-shopping-cart',
    command: () => {
      emit('update:visible', false)
      router.push('/pembelian')
      
    }
  },
  {
    label: 'Penjualan',
    icon: 'pi pi-money-bill',
    command: () => {
      router.push('/penjualan')
      emit('update:visible', false)
    }
  },
  {
    label: 'Pengeluaran Kas',
    icon: 'pi pi-wallet',
    command: () => {
      router.push('/pengeluaran-kas')
      emit('update:visible', false)
    }
  },
  {
    label: 'Invoice',
    icon: 'pi pi-file',
    command: () => {
      router.push('/invoice')
      emit('update:visible', false)
    }
  },
  {
    label: 'Produk',
    icon: 'pi pi-box',
    command: () => {
      router.push('/produk')
      emit('update:visible', false)
    }
  },
  {
    label: 'User',
    icon: 'pi pi-users',
    items: [
      {
        label: 'Pelanggan/Suplier',
        command: () => {
          router.push('/user/suplier')
          emit('update:visible', false)
        }
      },
      {
        label: 'Pembeli',
        command: () => {
          router.push('/user/pembeli')
          emit('update:visible', false)
        }
      },
      {
        label: 'Admin',
        command: () => {
          router.push('/user/admin')
          emit('update:visible', false)
        }
      }
    ]
  },
  {
    label: 'Laporan',
    icon: 'pi pi-chart-bar',
    items: [
      {
        label: 'Pelanggan/Suplier',
        command: () => {
          router.push('/laporan/suplier')
          emit('update:visible', false)
        }
      },
      {
        label: 'Pembeli',
        command: () => {
          router.push('/laporan/pembeli')
          emit('update:visible', false)
        }
      },
      {
        label: 'Laba Rugi',
        command: () => {
          router.push('/laporan/laba-rugi')
          emit('update:visible', false)
        }
      },
      {
        label: 'Kas',
        command: () => {
          router.push('/laporan/kas')
          emit('update:visible', false)
        }
      },
      {
        label: 'Penjualan',
        command: () => {
          router.push('/laporan/penjualan')
          emit('update:visible', false)
        }
      },
      {
        label: 'Pembelian',
        command: () => {
          router.push('/laporan/pembelian')
          emit('update:visible', false)
        }
      }
    ]
  }
])

const sidebarVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})
</script>

<template>
  <Sidebar v-model:visible="sidebarVisible" :style="{ width: '280px' }">
    <template #header>
      <div class="sidebar-header">
        <h3>Menu</h3>
      </div>
    </template>
    <Menu :model="menuItems" class="sidebar-menu" />
  </Sidebar>
</template>

<style>
.sidebar-header h3 {
  margin: 0;
  color: #1b0065;
  font-size: 1.25rem;
  font-weight: 600;
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
