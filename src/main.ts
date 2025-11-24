import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import router from './router'
import { useAuthStore } from './stores/auth'

import './assets/primevue-theme.css'
import 'primeicons/primeicons.css'
import './style.css'

import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      prefix: 'p',
      darkModeSelector: false,
      cssLayer: false
    }
  }
})
app.use(ToastService)
app.use(ConfirmationService)

const authStore = useAuthStore()
authStore.initialize().then(() => {
  app.mount('#app')
})