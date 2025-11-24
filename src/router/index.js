import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import PembelianView from '../views/PembelianView.vue'
import PenjualanView from '../views/PenjualanView.vue'
import PengeluaranKasView from '../views/PengeluaranKasView.vue'
import ProdukView from '../views/ProdukView.vue'
import SuplierView from '../views/SuplierView.vue'
import PembeliView from '../views/PembeliView.vue'
import AdminView from '../views/AdminView.vue'
import InvoiceView from '../views/InvoiceView.vue'
import LaporanSuplierView from '../views/LaporanSuplierView.vue'
import LaporanPembeliView from '../views/LaporanPembeliView.vue'
import LaporanPenjualanView from '../views/LaporanPenjualanView.vue'
import LaporanPembelianView from '../views/LaporanPembelianView.vue'
import LaporanKasView from '../views/LaporanKasView.vue'
import LaporanLabaRugiView from '../views/LaporanLabaRugiView.vue'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { requiresGuest: true }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardView,
    meta: { requiresAuth: true }
  },
  {
  path: '/pembelian',
  name: 'pembelian',
  component: PembelianView,
  meta: { requiresAuth: true }
  },
  {
    path: '/penjualan',
    name: 'penjualan',
    component: PenjualanView,
    meta: { requiresAuth: true }
  },
  {
    path: '/pengeluaran-kas',
    name: 'pengeluaran-kas',
    component: PengeluaranKasView,
    meta: { requiresAuth: true }
  },
  {
  path: '/produk',
  name: 'produk',
  component: ProdukView,
  meta: { requiresAuth: true }
  },
  {
    path: '/user/suplier',
    name: 'user-suplier',
    component: SuplierView,
    meta: { requiresAuth: true }
  },
  {
    path: '/user/pembeli',
    name: 'user-pembeli',
    component: PembeliView,
    meta: { requiresAuth: true }
  },
  {
    path: '/user/admin',
    name: 'user-admin',
    component: AdminView,
    meta: { requiresAuth: true }
  },
  {
    path: '/invoice',
    name: 'invoice',
    component: InvoiceView,
    meta: { requiresAuth: true }
  },
  {
  path: '/laporan/suplier',
  name: 'laporan-suplier',
  component: LaporanSuplierView,
  meta: { requiresAuth: true }
  },
  {
    path: '/laporan/pembeli',
    name: 'laporan-pembeli',
    component: LaporanPembeliView,
    meta: { requiresAuth: true }
  },
  {
    path: '/laporan/penjualan',
    name: 'laporan-penjualan',
    component: LaporanPenjualanView,
    meta: { requiresAuth: true }
  },
  {
    path: '/laporan/pembelian',
    name: 'laporan-pembelian',
    component: LaporanPembelianView,
    meta: { requiresAuth: true }
  },
  {
    path: '/laporan/kas',
    name: 'laporan-kas',
    component: LaporanKasView,
    meta: { requiresAuth: true }
  },
  {
    path: '/laporan/laba-rugi',
    name: 'laporan-laba-rugi',
    component: LaporanLabaRugiView,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next('/login')
  } else if (to.meta.requiresGuest && authStore.isLoggedIn) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
