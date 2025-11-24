<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'primevue/usetoast'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Message from 'primevue/message'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

const handleLogin = async () => {
  if (!email.value || !password.value) {
    errorMessage.value = 'Email dan password harus diisi'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  const { success, error } = await authStore.login(email.value, password.value)

  if (success) {
    toast.add({
      severity: 'success',
      summary: 'Login Berhasil',
      detail: 'Selamat datang!',
      life: 3000
    })
    router.push('/dashboard')
  } else {
    errorMessage.value = error || 'Login gagal. Silakan coba lagi.'
  }

  isLoading.value = false
}
</script>

<template>
  <div class="login-container">
    <Card class="login-card">
      <template #header>
        <div class="login-header">
          <h1>Koperasi Susu Mitrajaya</h1>
          <p class="subtitle">Dairy Natural</p>
        </div>
      </template>
      <template #content>
        <form @submit.prevent="handleLogin" class="login-form">
          <Message v-if="errorMessage" severity="error" :closable="false">
            {{ errorMessage }}
          </Message>

          <div class="form-field">
            <label for="email">Email</label>
            <InputText
              id="email"
              v-model="email"
              type="email"
              placeholder="Masukkan email"
              :disabled="isLoading"
              class="w-full"
            />
          </div>

          <div class="form-field">
            <label for="password">Password</label>
            <Password
              id="password"
              v-model="password"
              placeholder="Masukkan password"
              :disabled="isLoading"
              :feedback="false"
              toggleMask
              class="w-full"
              inputClass="w-full"
            />
          </div>

          <Button
            type="submit"
            label="Login"
            :loading="isLoading"
            class="login-btn"
          />
        </form>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1b0065 0%, #000000 100%);
  padding: 1rem;
  width: 100vw;
}

.login-card {
  width: 100%;
  max-width: 450px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  padding: 2rem 1rem 1rem;
  background: linear-gradient(135deg, #1b0065 0%, #2d0090 100%);
  color: white;
  margin: -1.25rem -1.25rem 0;
  border-radius: 6px 6px 0 0;
}

.login-header h1 {
  margin: 0 0 0.5rem;
  font-size: 1.75rem;
  font-weight: 700;
}

.subtitle {
  margin: 0;
  font-size: 1.1rem;
  opacity: 0.95;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field label {
  font-weight: 600;
  color: #333;
  font-size: 0.95rem;
}

.w-full {
  width: 100%;
}

.login-btn {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  font-weight: 600;
  background-color: #1b0065;
  border-color: #1b0065;
  margin-top: 0.5rem;
}

.login-btn:hover {
  background-color: #2d0090;
  border-color: #2d0090;
}
.p-password {
     flex-direction: column;
}

@media (max-width: 768px) {
  .login-header h1 {
    font-size: 1.5rem;
  }
  
  .subtitle {
    font-size: 1rem;
  }
}
</style>
