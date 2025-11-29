<!-- components/PaymentDialog.vue -->
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
import InputText from 'primevue/inputtext'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  transactionData: {
    type: Object,
    required: true
  },
  transactionType: {
    type: String,
    required: true,
    validator: (value) => ['pembelian', 'penjualan'].includes(value)
  }
})

const emit = defineEmits(['update:visible', 'payment-success'])

const toast = useToast()
const { 
  loading,
  createPembayaranPembelian,
  createPembayaranPenjualan,
  getPembayaranPembelian,
  getPembayaranPenjualan,
  deletePembayaranPembelian,
  deletePembayaranPenjualan
} = usePembayaran()

// State
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

// Computed
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const sisaBelumLunas = computed(() => {
  if (props.transactionType === 'pembelian') {
    return props.transactionData?.sisa_hutang || 0
  } else {
    return props.transactionData?.sisa_piutang || 0
  }
})

const maxPaymentAmount = computed(() => sisaBelumLunas.value)

const dialogTitle = computed(() => {
  const type = props.transactionType === 'pembelian' ? 'Hutang' : 'Piutang'
  return `Bayar ${type} - ${props.transactionData?.no_transaksi || ''}`
})

const labelSisa = computed(() => {
  return props.transactionType === 'pembelian' ? 'Sisa Hutang' : 'Sisa Piutang'
})

// Watch for dialog visibility
watch(() => props.visible, async (newVal) => {
  if (newVal) {
    resetForm()
    await loadPaymentHistory()
  }
})

// Methods
function resetForm() {
  formData.value = {
    tanggal_bayar: new Date(),
    jumlah_bayar: sisaBelumLunas.value,
    metode_pembayaran: 'Tunai',
    keterangan: ''
  }
}

async function loadPaymentHistory() {
  if (!props.transactionData?.id) return
  
  showHistoryLoading.value = true
  try {
    if (props.transactionType === 'pembelian') {
      paymentHistory.value = await getPembayaranPembelian(props.transactionData.id)
    } else {
      paymentHistory.value = await getPembayaranPenjualan(props.transactionData.id)
    }
  } catch (error) {
    console.error('Error loading payment history:', error)
  } finally {
    showHistoryLoading.value = false
  }
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

    if (formData.value.jumlah_bayar > sisaBelumLunas.value) {
      toast.add({
        severity: 'warn',
        summary: 'Peringatan',
        detail: `Jumlah bayar tidak boleh lebih dari ${labelSisa.value}: ${formatCurrency(sisaBelumLunas.value)}`,
        life: 3000
      })
      return
    }

    const payload = {
      [props.transactionType === 'pembelian' ? 'pembelian_id' : 'penjualan_id']: props.transactionData.id,
      tanggal_bayar: formatDate(formData.value.tanggal_bayar, 'yyyy-MM-dd'),
      jumlah_bayar: formData.value.jumlah_bayar,
      metode_pembayaran: formData.value.metode_pembayaran,
      keterangan: formData.value.keterangan
    }

    if (props.transactionType === 'pembelian') {
      await createPembayaranPembelian(payload)
    } else {
      await createPembayaranPenjualan(payload)
    }

    toast.add({
      severity: 'success',
      summary: 'Berhasil',
      detail: 'Pembayaran berhasil dicatat',
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

async function handleDeletePayment(paymentId) {
  try {
    if (props.transactionType === 'pembelian') {
      await deletePembayaranPembelian(paymentId)
    } else {
      await deletePembayaranPenjualan(paymentId)
    }

    toast.add({
      severity: 'success',
      summary: 'Berhasil',
      detail: 'History pembayaran berhasil dihapus',
      life: 3000
    })

    await loadPaymentHistory()
    emit('payment-success')
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Gagal menghapus history pembayaran',
      life: 3000
    })
  }
}

function setPayFullAmount() {
  formData.value.jumlah_bayar = sisaBelumLunas.value
}
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    :header="dialogTitle"
    :modal="true"
    :style="{ width: '700px' }"
    :closable="!loading"
  >
    <div class="flex flex-col gap-6">
      <!-- Transaction Info -->
      <div class="p-4 bg-gray-50 rounded-lg">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-600">Total Transaksi</p>
            <p class="text-lg font-bold">{{ formatCurrency(transactionData?.total || 0) }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Sudah Dibayar</p>
            <p class="text-lg font-semibold text-green-600">
              {{ formatCurrency(transactionData?.jumlah_dibayar || 0) }}
            </p>
          </div>
          <div class="col-span-2">
            <p class="text-sm text-gray-600">{{ labelSisa }}</p>
            <p class="text-2xl font-bold text-red-600">
              {{ formatCurrency(sisaBelumLunas) }}
            </p>
          </div>
        </div>
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
              class="flex-1"
              :max="maxPaymentAmount"
            />
            <Button
              label="Lunas"
              severity="success"
              @click="setPayFullAmount"
            />
          </div>
          <small class="text-gray-500">
            Maksimal: {{ formatCurrency(maxPaymentAmount) }}
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
            rows="3"
            class="w-full"
            placeholder="Catatan pembayaran..."
          />
        </div>
      </div>

      <!-- Payment History -->
      <div v-if="paymentHistory.length > 0">
        <h4 class="font-semibold mb-2">Riwayat Pembayaran</h4>
        <DataTable
          :value="paymentHistory"
          :loading="showHistoryLoading"
          class="text-sm"
        >
          <Column field="tanggal_bayar" header="Tanggal">
            <template #body="slotProps">
              {{ formatDate(slotProps.data.tanggal_bayar, 'dd/MM/yyyy') }}
            </template>
          </Column>
          <Column field="jumlah_bayar" header="Jumlah">
            <template #body="slotProps">
              {{ formatCurrency(slotProps.data.jumlah_bayar) }}
            </template>
          </Column>
          <Column field="metode_pembayaran" header="Metode" />
          <Column field="keterangan" header="Keterangan" />
          <Column header="Aksi">
            <template #body="slotProps">
              <Button
                icon="pi pi-trash"
                class="p-button-danger p-button-sm p-button-text"
                @click="handleDeletePayment(slotProps.data.id)"
              />
            </template>
          </Column>
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