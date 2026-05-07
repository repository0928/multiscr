<template>
  <div class="max-w-6xl mx-auto px-4">
    <div class="bg-white rounded-2xl shadow p-4 flex items-center gap-3 flex-wrap">
      <!-- Dropdown -->
      <select v-model="selectedId" @change="onSelect"
        class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-[120px]">
        <option v-if="store.subjects.length === 0" value="">（尚無科目）</option>
        <option v-for="s in store.subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>

      <!-- 新增 -->
      <button @click="showAdd = true" class="btn-indigo">➕ 新增</button>

      <!-- 改名 -->
      <button @click="showRename = true" :disabled="!store.currentSubjectId" class="btn-amber">
        ✏️ 改名
      </button>

      <!-- 刪除 -->
      <button @click="confirmDelete" :disabled="!store.currentSubjectId" class="btn-danger">
        🗑️ 刪除
      </button>

      <span class="ml-auto text-sm text-gray-500">
        登入：{{ username }}
      </span>
    </div>
  </div>

  <!-- 新增科目 Modal -->
  <Modal v-if="showAdd" title="新增科目" @close="showAdd = false">
    <input v-model="newName" placeholder="科目名稱" class="input mb-4" @keyup.enter="addSubject" />
    <button @click="addSubject" class="btn-indigo w-full">新增</button>
    <p v-if="addError" class="text-red-500 text-xs mt-2">{{ addError }}</p>
  </Modal>

  <!-- 改名 Modal -->
  <Modal v-if="showRename" title="科目改名" @close="showRename = false">
    <input v-model="renameName" placeholder="新名稱" class="input mb-4" @keyup.enter="renameSubject" />
    <button @click="renameSubject" class="btn-amber w-full">確認改名</button>
    <p v-if="renameError" class="text-red-500 text-xs mt-2">{{ renameError }}</p>
  </Modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useAppStore } from '../stores/app'
import api from '../api'
import Modal from './Modal.vue'

const store = useAppStore()
const username = localStorage.getItem('username') || ''
const selectedId = ref(store.currentSubjectId)
const showAdd = ref(false)
const showRename = ref(false)
const newName = ref('')
const renameName = ref('')
const addError = ref('')
const renameError = ref('')

watch(() => store.currentSubjectId, v => selectedId.value = v)

async function onSelect() {
  await store.selectSubject(selectedId.value)
}

async function addSubject() {
  addError.value = ''
  if (!newName.value.trim()) { addError.value = '請輸入科目名稱'; return }
  try {
    const { data } = await api.post('/subjects', { name: newName.value.trim() })
    store.subjects.push(data)
    await store.selectSubject(data.id)
    showAdd.value = false
    newName.value = ''
  } catch (e) { addError.value = e.response?.data?.error || '新增失敗' }
}

async function renameSubject() {
  renameError.value = ''
  if (!renameName.value.trim()) { renameError.value = '請輸入新名稱'; return }
  try {
    const { data } = await api.put(`/subjects/${store.currentSubjectId}`, { name: renameName.value.trim() })
    const idx = store.subjects.findIndex(s => s.id === data.id)
    if (idx >= 0) store.subjects[idx].name = data.name
    showRename.value = false
    renameName.value = ''
  } catch (e) { renameError.value = e.response?.data?.error || '改名失敗' }
}

async function confirmDelete() {
  if (!store.currentSubject) return
  if (!confirm(`確定刪除「${store.currentSubject.name}」科目？此操作無法復原。`)) return
  try {
    await api.delete(`/subjects/${store.currentSubjectId}`)
    store.subjects = store.subjects.filter(s => s.id !== store.currentSubjectId)
    store.currentSubjectId = store.subjects[0]?.id || null
    selectedId.value = store.currentSubjectId
    if (store.currentSubjectId) await Promise.all([store.loadItems(), store.loadScores()])
    else { store.items = []; store.scores = [] }
  } catch (e) { alert(e.response?.data?.error || '刪除失敗') }
}
</script>

<style scoped>
.input { @apply w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 block; }
.btn-indigo { @apply bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition cursor-pointer disabled:opacity-40; }
.btn-amber { @apply bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition cursor-pointer disabled:opacity-40; }
.btn-danger { @apply text-red-500 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition cursor-pointer disabled:opacity-40; }
</style>
