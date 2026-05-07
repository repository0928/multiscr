<template>
  <Modal title="帳號設定" @close="$emit('close')">
    <p class="text-sm text-gray-500 mb-4">目前帳號：<strong>{{ currentUsername }}</strong></p>

    <label class="text-xs text-gray-600 mb-1 block">新帳號（留空不更改）</label>
    <input v-model="newUsername" maxlength="20" placeholder="新帳號" class="input mb-3" />

    <label class="text-xs text-gray-600 mb-1 block">新密碼（4個字元，留空不更改）</label>
    <input v-model="newPassword" maxlength="4" type="password" placeholder="新密碼" class="input mb-5" />

    <button @click="save" class="btn-indigo w-full" :disabled="loading">
      {{ loading ? '儲存中...' : '儲存' }}
    </button>
    <p v-if="error" class="text-red-500 text-xs mt-2">{{ error }}</p>
    <p v-if="success" class="text-green-600 text-xs mt-2">✅ 更新成功</p>
  </Modal>
</template>

<script setup>
import { ref } from 'vue'
import api from '../api'
import Modal from './Modal.vue'

const emit = defineEmits(['close'])
const currentUsername = ref(localStorage.getItem('username') || '')
const newUsername = ref('')
const newPassword = ref('')
const error = ref('')
const success = ref(false)
const loading = ref(false)

async function save() {
  error.value = ''
  success.value = false
  const body = {}
  if (newUsername.value) body.username = newUsername.value
  if (newPassword.value) body.password = newPassword.value
  if (!Object.keys(body).length) { error.value = '請至少填寫一個欄位'; return }
  loading.value = true
  try {
    const { data } = await api.put('/auth/profile', body)
    if (data.username) {
      localStorage.setItem('username', data.username)
      currentUsername.value = data.username
    }
    success.value = true
    newUsername.value = ''
    newPassword.value = ''
  } catch (e) { error.value = e.response?.data?.error || '更新失敗' }
  finally { loading.value = false }
}
</script>

<style scoped>
.input { @apply w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 block; }
.btn-indigo { @apply bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition cursor-pointer disabled:opacity-40; }
</style>
