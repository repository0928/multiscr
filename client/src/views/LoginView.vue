<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
    <div class="bg-white rounded-2xl shadow-xl p-10 w-96">
      <h1 class="text-2xl font-bold text-center text-indigo-700 mb-2">多科目雲端評分系統</h1>
      <p class="text-center text-gray-400 text-sm mb-8">{{ isRegister ? '教師註冊' : '教師登入' }}</p>

      <div v-if="checking" class="text-center text-gray-400 py-4">載入中...</div>

      <template v-else>
        <input v-model="username" maxlength="20" :placeholder="isRegister ? '帳號（可使用中文）' : '帳號'"
          class="input mb-3" @keyup.enter="isRegister ? register() : login()" />
        <input v-model="password" maxlength="4" type="password" placeholder="密碼（4個字元）"
          class="input mb-6" @keyup.enter="isRegister ? register() : login()" />

        <button @click="isRegister ? register() : login()" class="btn-primary w-full" :disabled="loading">
          {{ loading ? (isRegister ? '建立中...' : '登入中...') : (isRegister ? '建立帳號' : '登入') }}
        </button>

        <p class="text-center text-sm mt-5">
          <span class="text-gray-400">{{ isRegister ? '已有帳號？' : '還沒有帳號？' }}</span>
          <button @click="switchMode" class="text-indigo-600 hover:underline ml-1 cursor-pointer">
            {{ isRegister ? '前往登入' : '立即註冊' }}
          </button>
        </p>
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
const checking = ref(true)
const isRegister = ref(false)
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

onMounted(async () => {
  try {
    const { data } = await api.get('/auth/status')
    // 若系統尚無帳號，直接進入註冊模式
    isRegister.value = !data.hasTeacher
  } catch (e) {
    isRegister.value = true
  } finally {
    checking.value = false
  }
})

function switchMode() {
  isRegister.value = !isRegister.value
  error.value = ''
  username.value = ''
  password.value = ''
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
    error.value = e.response?.data?.error || '登入失敗，請確認帳號密碼'
  } finally { loading.value = false }
}

async function register() {
  error.value = ''
  if (!username.value.trim()) { error.value = '請輸入帳號'; return }
  if (password.value.length !== 4) { error.value = '密碼須為4個字元'; return }
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
