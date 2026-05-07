<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
    <div class="bg-white rounded-2xl shadow-xl p-10 w-96">
      <h1 class="text-2xl font-bold text-center text-indigo-700 mb-2">多科目雲端評分系統</h1>
      <p class="text-center text-gray-400 text-sm mb-8">教師登入</p>

      <!-- 建立第一個帳號 -->
      <template v-if="!hasTeacher">
        <p class="text-center text-amber-600 text-sm mb-4 bg-amber-50 rounded-lg p-3">
          系統尚無帳號，請建立第一個教師帳號
        </p>
        <input v-model="username" maxlength="1" placeholder="帳號（中文一個字）"
          class="input mb-3" @input="validateUsername" />
        <p v-if="usernameError" class="text-red-500 text-xs mb-2">{{ usernameError }}</p>
        <input v-model="password" maxlength="4" type="password" placeholder="密碼（4個字元）"
          class="input mb-6" />
        <button @click="register" class="btn-primary w-full" :disabled="loading">
          {{ loading ? '建立中...' : '建立帳號' }}
        </button>
      </template>

      <!-- 登入 -->
      <template v-else>
        <input v-model="username" maxlength="1" placeholder="帳號（中文一個字）"
          class="input mb-3" @keyup.enter="login" />
        <input v-model="password" maxlength="4" type="password" placeholder="密碼（4個字元）"
          class="input mb-6" @keyup.enter="login" />
        <button @click="login" class="btn-primary w-full" :disabled="loading">
          {{ loading ? '登入中...' : '登入' }}
        </button>
      </template>

      <p v-if="error" class="text-red-500 text-sm text-center mt-4">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'

const router = useRouter()
const hasTeacher = ref(true)
const username = ref('')
const password = ref('')
const error = ref('')
const usernameError = ref('')
const loading = ref(false)

onMounted(async () => {
  const { data } = await api.get('/auth/status')
  hasTeacher.value = data.hasTeacher
})

function validateUsername() {
  const ch = username.value
  usernameError.value = ch && !/^[一-鿿]$/.test(ch) ? '帳號須為中文一個字' : ''
}

async function login() {
  error.value = ''
  loading.value = true
  try {
    const { data } = await api.post('/auth/login', { username: username.value, password: password.value })
    localStorage.setItem('token', data.token)
    localStorage.setItem('username', data.username)
    router.push('/')
  } catch (e) {
    error.value = e.response?.data?.error || '登入失敗'
  } finally { loading.value = false }
}

async function register() {
  error.value = ''
  if (usernameError.value) return
  loading.value = true
  try {
    const { data } = await api.post('/auth/register', { username: username.value, password: password.value })
    localStorage.setItem('token', data.token)
    localStorage.setItem('username', data.username)
    router.push('/')
  } catch (e) {
    error.value = e.response?.data?.error || '建立失敗'
  } finally { loading.value = false }
}
</script>

<style scoped>
.input {
  @apply w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 block;
}
.btn-primary {
  @apply bg-indigo-600 text-white rounded-lg py-2 font-medium hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer;
}
</style>
