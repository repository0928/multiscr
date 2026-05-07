<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
    <!-- 批量匯入 -->
    <div class="bg-white rounded-2xl shadow p-6">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-gray-500 font-medium">批量匯入（年,班,號,姓名）</p>
        <button @click="downloadSample" class="text-xs text-indigo-500 hover:underline cursor-pointer flex items-center gap-1">
          📄 下載範例檔
        </button>
      </div>
      <div class="flex items-center gap-3 mb-3">
        <label class="cursor-pointer bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition">
          選擇檔案
          <input type="file" accept=".csv,.txt" class="hidden" @change="onFileChange" ref="fileInput" />
        </label>
        <span class="text-sm text-gray-400 truncate max-w-[180px]">{{ fileName || '未選擇任何檔案' }}</span>
      </div>
      <p class="text-xs text-gray-400 mb-3">支援 .csv 或 .txt，格式：年,班,號,姓名（可無標題列）</p>
      <button @click="importCSV" class="btn-dark w-full" :disabled="!file || importing">
        {{ importing ? '匯入中...' : '執行匯入' }}
      </button>
      <p v-if="importMsg" :class="['text-xs mt-2', importMsg.startsWith('✅') ? 'text-green-600' : 'text-red-500']">{{ importMsg }}</p>
    </div>

    <!-- 手動新增 -->
    <div class="bg-white rounded-2xl shadow p-6">
      <p class="text-xs text-gray-500 mb-2 font-medium">手動新增</p>
      <div class="flex gap-2">
        <input v-model="form.year" placeholder="年" class="input w-14 text-center" type="number" min="1" />
        <input v-model="form.class" placeholder="班" class="input w-14 text-center" type="number" min="1" />
        <input v-model="form.number" placeholder="號" class="input w-14 text-center" type="number" min="1" />
        <input v-model="form.name" placeholder="姓名" class="input flex-1" @keyup.enter="addStudent" />
        <button @click="addStudent" class="btn-indigo px-4">OK</button>
      </div>
      <p v-if="addError" class="text-red-500 text-xs mt-2">{{ addError }}</p>
    </div>
  </div>

  <!-- 學生清單 -->
  <div class="bg-white rounded-2xl shadow p-6">
    <div class="flex items-center justify-between mb-4">
      <label class="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" v-model="allSelected" class="w-4 h-4" /> 全選
      </label>
      <div class="flex items-center gap-3">
        <input v-model="classFilter" placeholder="篩選班級" class="border border-gray-300 rounded-lg px-3 py-1 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-indigo-300" type="number" />
        <button @click="exportCSV" class="text-sm text-indigo-600 hover:underline cursor-pointer">匯出 CSV</button>
        <button @click="deleteSelected" :disabled="selected.length === 0"
          class="btn-danger-sm" :class="selected.length > 0 ? 'opacity-100' : 'opacity-40'">
          🗑️ 刪除 ({{ selected.length }})
        </button>
      </div>
    </div>

    <div v-if="filtered.length === 0" class="text-center text-gray-400 py-8">
      {{ store.students.length === 0 ? '尚無學生，請匯入或手動新增' : '無符合條件的學生' }}
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      <div v-for="s in filtered" :key="s.id"
        class="flex items-center gap-3 border border-gray-100 rounded-xl p-3 hover:bg-gray-50">
        <input type="checkbox" :value="s.id" v-model="selected" class="w-4 h-4 shrink-0" />
        <span class="text-sm flex-1">{{ s.year }}班{{ s.number }}號 {{ s.name }}</span>
        <button @click="deleteSingle(s)" class="text-gray-300 hover:text-red-400 transition cursor-pointer">🗑️</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAppStore } from '../stores/app'
import api from '../api'

const store = useAppStore()
const file = ref(null)
const fileName = ref('')
const fileInput = ref(null)
const importing = ref(false)
const importMsg = ref('')
const classFilter = ref('')
const selected = ref([])
const form = ref({ year: '', class: '', number: '', name: '' })
const addError = ref('')

const filtered = computed(() => {
  if (!classFilter.value) return store.students
  return store.students.filter(s => s.class == classFilter.value)
})

const allSelected = computed({
  get: () => filtered.value.length > 0 && filtered.value.every(s => selected.value.includes(s.id)),
  set: v => selected.value = v ? filtered.value.map(s => s.id) : []
})

function onFileChange(e) {
  file.value = e.target.files[0]
  fileName.value = file.value?.name || ''
  importMsg.value = ''
}

async function importCSV() {
  if (!file.value) return
  importing.value = true
  importMsg.value = ''
  const fd = new FormData()
  fd.append('file', file.value)
  try {
    const { data } = await api.post('/students/import', fd)
    importMsg.value = `✅ 成功匯入 ${data.imported} 筆`
    await store.loadStudents()
    file.value = null; fileName.value = ''
    if (fileInput.value) fileInput.value.value = ''
  } catch (e) { importMsg.value = e.response?.data?.error || '匯入失敗' }
  finally { importing.value = false }
}

async function addStudent() {
  addError.value = ''
  const { year, class: cls, number, name } = form.value
  if (!year || !cls || !number || !name.trim()) { addError.value = '請填寫所有欄位'; return }
  try {
    const { data } = await api.post('/students', { year, class: cls, number, name: name.trim() })
    store.students.push(data)
    store.students.sort((a, b) => a.year - b.year || a.class - b.class || a.number - b.number)
    form.value = { year: '', class: '', number: '', name: '' }
  } catch (e) { addError.value = e.response?.data?.error || '新增失敗' }
}

async function deleteSingle(s) {
  if (!confirm(`確定刪除「${s.name}」？`)) return
  await api.delete(`/students/${s.id}`)
  store.students = store.students.filter(x => x.id !== s.id)
  selected.value = selected.value.filter(id => id !== s.id)
}

async function deleteSelected() {
  if (!selected.value.length) return
  if (!confirm(`確定刪除選取的 ${selected.value.length} 位學生？`)) return
  await api.delete('/students', { data: { ids: selected.value } })
  store.students = store.students.filter(s => !selected.value.includes(s.id))
  selected.value = []
}

async function exportCSV() {
  const resp = await api.get('/students/export', { responseType: 'blob' })
  const url = URL.createObjectURL(resp.data)
  const a = document.createElement('a'); a.href = url; a.download = 'students.csv'; a.click()
  URL.revokeObjectURL(url)
}

async function downloadSample() {
  const resp = await api.get('/students/sample', { responseType: 'blob' })
  const url = URL.createObjectURL(resp.data)
  const a = document.createElement('a'); a.href = url; a.download = 'students_sample.csv'; a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.input { @apply border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300; }
.btn-indigo { @apply bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 transition cursor-pointer disabled:opacity-40; }
.btn-dark { @apply bg-gray-800 text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-700 transition cursor-pointer disabled:opacity-40; }
.btn-danger-sm { @apply bg-red-50 text-red-500 border border-red-200 rounded-lg px-3 py-1 text-sm hover:bg-red-100 transition cursor-pointer; }
</style>
