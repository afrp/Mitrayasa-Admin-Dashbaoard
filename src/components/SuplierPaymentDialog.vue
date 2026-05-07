<script setup>
import { ref, computed, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { usePembayaran } from '../composables/usePembayaran'
import { formatCurrency, formatDate } from '../utils/formatters'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import Calendar from 'primevue/calendar'
import Dropdown from 'primevue/dropdown'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  suplier: {
    type: Object,
    required: true
  },
  totalHutang: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:visible', 'payment-success'])

const toast = useToast()
const {
  loading,
  getOutstandingPembelianBySuplier,
  getPembayaranPembelianBySuplier,
  createPembayaranPembelianBulkFIFO
} = usePembayaran()

const outstanding = ref([])
const paymentHistory = ref([])
const showHistoryLoading = ref(false)

const formData = ref({
  tanggal_bayar: new Date(),
  jumlah_bayar: 0,
  metode_pembayaran: 'Tunai',
  keterangan: ''
})

const metodePembayaranOptions = [
  { label: 'Tunai', value: 'Tunai' },
  { label: 'Transfer', value: 'Transfer' },
  { label: 'Giro', value: 'Giro' },
  { label: 'Lainnya', value: 'Lainnya' }
]

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const totalSisaHutang = computed(() =>
  outstanding.value.reduce((sum, p) => sum + parseFloat(p.sisa_hutang || 0), 0)
)

const allocationPreview = computed(() => {
  const result = []
  let remaining = parseFloat(formData.value.jumlah_bayar || 0)
  for (const p of outstanding.value) {
    if (remaining <= 0) break
    const sisa = parseFloat(p.sisa_hutang || 0)
    if (sisa <= 0) continue
    const alokasi = Math.min(remaining, sisa)
    result.push({
      ...p,
      alokasi,
      lunas: alokasi >= sisa
    })
    remaining -= alokasi
  }
  return result
})

watch(() => props.visible, async (newVal) => {
  if (newVal) {
    await loadOutstanding()
    resetForm()
    await loadPaymentHistory()
  }
})

function resetForm() {
  formData.value = {
    tanggal_bayar: new Date(),
    jumlah_bayar: totalSisaHutang.value,
    metode_pembayaran: 'Tunai',
    keterangan: ''
  }
}

async function loadOutstanding() {
  if (!props.suplier?.id) return
  try {
    outstanding.value = await getOutstandingPembelianBySuplier(props.suplier.id)
  } catch (e) {
    console.error('Error loading outstanding:', e)
    outstanding.value = []
  }
}

async function loadPaymentHistory() {
  if (!props.suplier?.id) return
  showHistoryLoading.value = true
  try {
    paymentHistory.value = await getPembayaranPembelianBySuplier(props.suplier.id)
  } catch (e) {
    console.error('Error loading payment history:', e)
  } finally {
    showHistoryLoading.value = false
  }
}

function setPayFullAmount() {
  formData.value.jumlah_bayar = totalSisaHutang.value
}

async function handleSave() {
  try {
    if (formData.value.jumlah_bayar <= 0) {
      toast.add({
        severity: 'warn',
        summary: 'Peringatan',
        detail: 'Jumlah bayar harus lebih dari 0',
        life: 3000
      })
      return
    }

    if (formData.value.jumlah_bayar > totalSisaHutang.value) {
      toast.add({
        severity: 'warn',
        summary: 'Peringatan',
        detail: `Jumlah bayar tidak boleh lebih dari total hutang: ${formatCurrency(totalSisaHutang.value)}`,
        life: 3000
      })
      return
    }

    await createPembayaranPembelianBulkFIFO(props.suplier.id, {
      tanggal_bayar: formatDate(formData.value.tanggal_bayar, 'yyyy-MM-dd'),
      jumlah_bayar: formData.value.jumlah_bayar,
      metode_pembayaran: formData.value.metode_pembayaran,
      keterangan: formData.value.keterangan
    })

    toast.add({
      severity: 'success',
      summary: 'Berhasil',
      detail: 'Pembayaran hutang berhasil dicatat',
      life: 3000
    })

    emit('payment-success')
    dialogVisible.value = false
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Gagal menyimpan pembayaran',
      life: 3000
    })
  }
}
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    :header="`Bayar Hutang - ${suplier?.nama_suplier || ''}`"
    :modal="true"
    :style="{ width: '750px' }"
    :closable="!loading"
  >
    <div class="flex flex-col gap-6">
      <!-- Info Suplier -->
      <div class="p-4 bg-gray-50 rounded-lg">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-600">Peternak</p>
            <p class="text-lg font-bold">{{ suplier?.nama_suplier }}</p>
            <p class="text-xs text-gray-500">{{ suplier?.kode_suplier }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Total Hutang</p>
            <p class="text-2xl font-bold text-red-600">
              {{ formatCurrency(totalSisaHutang) }}
            </p>
            <p class="text-xs text-gray-500">{{ outstanding.length }} transaksi belum lunas</p>
          </div>
        </div>
      </div>

      <!-- Outstanding List -->
      <div v-if="outstanding.length > 0">
        <h4 class="font-semibold mb-2">Daftar Hutang (urut terlama)</h4>
        <DataTable
          :value="outstanding"
          class="text-sm"
          scrollable
          scrollHeight="200px"
        >
          <Column field="tanggal_transaksi" header="Tanggal">
            <template #body="slotProps">
              {{ formatDate(slotProps.data.tanggal_transaksi, 'dd/MM/yyyy') }}
            </template>
          </Column>
          <Column field="no_transaksi" header="No. Transaksi" />
          <Column field="total" header="Total">
            <template #body="slotProps">
              {{ formatCurrency(slotProps.data.total) }}
            </template>
          </Column>
          <Column field="sisa_hutang" header="Sisa Hutang">
            <template #body="slotProps">
              <span class="font-semibold text-red-600">
                {{ formatCurrency(slotProps.data.sisa_hutang) }}
              </span>
            </template>
          </Column>
        </DataTable>
      </div>

      <!-- Payment Form -->
      <div class="flex flex-col gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Tanggal Bayar *</label>
          <Calendar
            v-model="formData.tanggal_bayar"
            dateFormat="dd/mm/yy"
            class="w-full"
            :maxDate="new Date()"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Jumlah Bayar *</label>
          <div class="flex gap-2">
            <InputNumber
              v-model="formData.jumlah_bayar"
              mode="currency"
              currency="IDR"
              locale="id-ID"
              :minFractionDigits="0"
              :maxFractionDigits="0"
              class="flex-1"
              :max="totalSisaHutang"
            />
            <Button
              label="Lunas Semua"
              severity="success"
              @click="setPayFullAmount"
            />
          </div>
          <small class="text-gray-500">
            Maksimal: {{ formatCurrency(totalSisaHutang) }}
          </small>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Metode Pembayaran</label>
          <Dropdown
            v-model="formData.metode_pembayaran"
            :options="metodePembayaranOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Keterangan</label>
          <Textarea
            v-model="formData.keterangan"
            rows="2"
            class="w-full"
            placeholder="Catatan pembayaran..."
          />
        </div>
      </div>

      <!-- Allocation Preview -->
      <div v-if="allocationPreview.length > 0">
        <h4 class="font-semibold mb-2">Preview Alokasi (FIFO - tagihan terlama dulu)</h4>
        <DataTable :value="allocationPreview" class="text-sm">
          <Column field="tanggal_transaksi" header="Tanggal">
            <template #body="slotProps">
              {{ formatDate(slotProps.data.tanggal_transaksi, 'dd/MM/yyyy') }}
            </template>
          </Column>
          <Column field="no_transaksi" header="No. Transaksi" />
          <Column field="alokasi" header="Dialokasikan">
            <template #body="slotProps">
              <span class="font-semibold text-green-700">
                {{ formatCurrency(slotProps.data.alokasi) }}
              </span>
            </template>
          </Column>
          <Column header="Status">
            <template #body="slotProps">
              <span
                :class="slotProps.data.lunas ? 'text-green-600 font-semibold' : 'text-orange-600'"
              >
                {{ slotProps.data.lunas ? 'Lunas' : 'Sebagian' }}
              </span>
            </template>
          </Column>
        </DataTable>
      </div>

      <!-- Payment History -->
      <div v-if="paymentHistory.length > 0">
        <h4 class="font-semibold mb-2">Riwayat Pembayaran</h4>
        <DataTable
          :value="paymentHistory"
          :loading="showHistoryLoading"
          class="text-sm"
          scrollable
          scrollHeight="200px"
        >
          <Column field="tanggal_bayar" header="Tanggal">
            <template #body="slotProps">
              {{ formatDate(slotProps.data.tanggal_bayar, 'dd/MM/yyyy') }}
            </template>
          </Column>
          <Column header="No. Transaksi">
            <template #body="slotProps">
              {{ slotProps.data.pembelian?.no_transaksi || '-' }}
            </template>
          </Column>
          <Column field="jumlah_bayar" header="Jumlah">
            <template #body="slotProps">
              {{ formatCurrency(slotProps.data.jumlah_bayar) }}
            </template>
          </Column>
          <Column field="metode_pembayaran" header="Metode" />
          <Column field="keterangan" header="Keterangan" />
        </DataTable>
      </div>
    </div>

    <template #footer>
      <Button
        label="Batal"
        icon="pi pi-times"
        class="p-button-text"
        @click="dialogVisible = false"
        :disabled="loading"
      />
      <Button
        label="Simpan Pembayaran"
        icon="pi pi-check"
        @click="handleSave"
        :loading="loading"
      />
    </template>
  </Dialog>
</template>
