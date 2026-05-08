<template>
  <div class="bg-white rounded-2xl shadow p-6">
    <div v-if="!store.currentSubjectId" class="text-center text-gray-400 py-8">請先選擇或新增科目</div>
    <template v-else>
      <!-- 新增項目 -->
      <div class="flex gap-3 mb-6">
        <input v-model="newName" placeholder="項目名稱" class="input flex-1" @keyup.enter="addItem" />
        <input v-model.number="newMax" type="number" min="1" placeholder="滿分" class="input w-24 text-center" @keyup.enter="addItem" />
        <button @click="addItem" class="btn-indigo px-6">新增</button>
      </div>
      <p v-if="addError" class="text-red-500 text-xs mb-4">{{ addError }}</p>

      <!-- 匯入匯出 -->
      <div class="flex flex-wrap gap-3 mb-5 items-center">
        <label class="cursor-pointer text-sm text-indigo-600 hover:underline flex items-center gap-1">
          📂 匯入 CSV / TXT
          <input type="file" accept=".csv,.txt" class="hidden" @change="importItems" />
        </label>
        <button @click="exportItems" class="text-sm text-indigo-600 hover:underline cursor-pointer">💾 匯出 CSV</button>
        <button @click="downloadSample" class="text-sm text-indigo-600 hover:underline cursor-pointer">📄 下載範例檔</button>
        <span v-if="importMsg" :class="['text-xs', importMsg.startsWith('✅') ? 'text-green-600' : 'text-red-500']">{{ importMsg }}</span>
      </div>

      <!-- 項目清單 -->
      <div v-if="store.items.length === 0" class="text-center text-gray-400 py-6">尚無評分項目，請新增</div>
      <div v-for="(item, idx) in store.items" :key="item.id"
        class="flex items-center gap-3 border border-gray-100 rounded-xl px-4 py-3 mb-2 hover:bg-gray-50">
        <span class="flex-1 text-sm font-medium">{{ item.name }} <span class="text-gray-400">({{ item.maxScore }}分)</span></span>
        <button @click="moveUp(idx)" :disabled="idx === 0" class="icon-btn">↑</button>
        <button @click="moveDown(idx)" :disabled="idx === store.items.length - 1" class="icon-btn">↓</button>
        <button @click="deleteItem(item)" class="icon-btn text-red-400 hover:text-red-600">🗑️</button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAppStore } from '../stores/app'
import api from '../api'

const store = useAppStore()
const newName = ref('')
const newMax = ref(10)
const addError = ref('')
const importMsg = ref('')

async function addItem() {
  addError.value = ''
  if (!newName.value.trim()) { addError.value = '請輸入項目名稱'; return }
  if (!newMax.value || newMax.value < 1) { addError.value = '滿分須大於0'; return }
  try {
    const { data } = await api.post(`/subjects/${store.currentSubjectId}/items`, { name: newName.value.trim(), maxScore: newMax.value })
    store.items.push(data)
    newName.value = ''
    newMax.value = 10
  } catch (e) { addError.value = e.response?.data?.error || '新增失敗' }
}

async function moveUp(idx) {
  if (idx === 0) return
  const a = store.items[idx]; const b = store.items[idx - 1]
  await Promise.all([
    api.put(`/subjects/${store.currentSubjectId}/items/${a.id}`, { orderIndex: b.orderIndex }),
    api.put(`/subjects/${store.currentSubjectId}/items/${b.id}`, { orderIndex: a.orderIndex }),
  ])
  store.items.splice(idx - 1, 2, a, b)
  ;[store.items[idx - 1].orderIndex, store.items[idx].orderIndex] = [b.orderIndex, a.orderIndex]
}

async function moveDown(idx) {
  if (idx === store.items.length - 1) return
  const a = store.items[idx]; const b = store.items[idx + 1]
  await Promise.all([
    api.put(`/subjects/${store.currentSubjectId}/items/${a.id}`, { orderIndex: b.orderIndex }),
    api.put(`/subjects/${store.currentSubjectId}/items/${b.id}`, { orderIndex: a.orderIndex }),
  ])
  store.items.splice(idx, 2, b, a)
  ;[store.items[idx].orderIndex, store.items[idx + 1].orderIndex] = [a.orderIndex, b.orderIndex]
}

async function deleteItem(item) {
  if (!confirm(`確定刪除「${item.name}」項目？相關分數也會一併刪除。`)) return
  await api.delete(`/subjects/${store.currentSubjectId}/items/${item.id}`)
  store.items = store.items.filter(i => i.id !== item.id)
  store.scores = store.scores.filter(s => s.itemId !== item.id)
}

async function importItems(e) {
  const file = e.target.files[0]; if (!file) return
  importMsg.value = ''
  const fd = new FormData(); fd.append('file', file)
  try {
    const { data } = await api.post(`/subjects/${store.currentSubjectId}/items/import`, fd)
    importMsg.value = `✅ 匯入 ${data.imported} 項`
    await store.loadItems()
  } catch (err) { importMsg.value = err.response?.data?.error || '匯入失敗' }
  e.target.value = ''
}

async function exportItems() {
  const resp = await api.get(`/subjects/${store.currentSubjectId}/items/export`, { responseType: 'blob' })
  const url = URL.createObjectURL(resp.data)
  const a = document.createElement('a'); a.href = url; a.download = 'items.csv'; a.click()
  URL.revokeObjectURL(url)
}

function downloadSample() {
  const content = '名稱,滿分\n做完,50\n做對,30\n做好,20\n'
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'items_sample.csv'; a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.input { @apply border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300; }
.btn-indigo { @apply bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 transition cursor-pointer; }
.icon-btn { @apply text-gray-400 hover:text-gray-700 transition text-lg leading-none cursor-pointer disabled:opacity-30; }
</style>
