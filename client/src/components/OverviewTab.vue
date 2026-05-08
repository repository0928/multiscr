<template>
  <div class="bg-white rounded-2xl shadow p-6">
    <div v-if="!store.currentSubjectId" class="text-center text-gray-400 py-8">請先選擇科目</div>
    <template v-else>
      <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">📊 成績總表</h2>
        <div class="flex items-center gap-2 flex-wrap">
          <button @click="downloadSample" class="bg-gray-100 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition cursor-pointer">
            📄 下載範例 xlsx
          </button>
          <label class="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition cursor-pointer">
            📂 匯入評分表
            <input type="file" accept=".xlsx" class="hidden" @change="importXlsx" />
          </label>
          <button @click="exportXlsx" class="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition cursor-pointer">
            📁 匯出試算表
          </button>
        </div>
      </div>

      <!-- 篩選列 -->
      <div class="flex items-center gap-3 mb-4 flex-wrap">
        <input v-model="yearFilter" placeholder="篩選年級" type="number"
          class="border border-gray-300 rounded-lg px-3 py-1 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        <input v-model="classFilter" placeholder="篩選班級" type="number"
          class="border border-gray-300 rounded-lg px-3 py-1 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        <span class="text-sm text-gray-400">共 {{ filtered.length }} 人</span>
      </div>

      <p v-if="importMsg" :class="['text-sm mb-3', importMsg.startsWith('✅') ? 'text-green-600' : 'text-red-500']">{{ importMsg }}</p>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-800 text-white">
              <th class="text-left px-4 py-3 rounded-tl-xl">學生</th>
              <th v-for="item in store.items" :key="item.id" class="px-4 py-3 text-center">
                {{ item.name }}
              </th>
              <th class="px-4 py-3 text-center">總分</th>
              <th class="px-4 py-3 text-center rounded-tr-xl">等第</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, idx) in filtered" :key="s.id"
              :class="['border-b border-gray-100', idx % 2 === 0 ? 'bg-white' : 'bg-gray-50', isFullScore(s) ? 'bg-red-50' : '']">
              <td class="px-4 py-3 font-medium">{{ s.year }}年{{ s.class }}班{{ s.number }}號 {{ s.name }}</td>
              <td v-for="item in store.items" :key="item.id" class="px-4 py-3 text-center text-gray-700">
                {{ store.getScore(s.id, item.id) }}
              </td>
              <td class="px-4 py-3 text-center font-bold" :class="isFullScore(s) ? 'text-indigo-600' : 'text-gray-800'">
                {{ getTotal(s) }}
              </td>
              <td class="px-4 py-3 text-center font-medium" :class="gradeColor(s)">
                {{ getGrade(s) }}
              </td>
            </tr>
            <tr v-if="filtered.length === 0">
              <td :colspan="store.items.length + 3" class="text-center text-gray-400 py-8">無符合條件的學生</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAppStore } from '../stores/app'
import api from '../api'

const store = useAppStore()
const importMsg = ref('')
const yearFilter = ref('')
const classFilter = ref('')

const filtered = computed(() => {
  return store.students.filter(s => {
    if (yearFilter.value && s.year != yearFilter.value) return false
    if (classFilter.value && s.class != classFilter.value) return false
    return true
  })
})

const maxTotal = computed(() => store.items.reduce((s, i) => s + i.maxScore, 0))

function getTotal(student) {
  return store.items.reduce((sum, item) => sum + store.getScore(student.id, item.id), 0)
}

function isFullScore(student) {
  return maxTotal.value > 0 && getTotal(student) === maxTotal.value
}

function getGrade(student) {
  if (maxTotal.value === 0) return '-'
  const pct = (getTotal(student) / maxTotal.value) * 100
  if (pct >= 90) return '優'
  if (pct >= 80) return '甲'
  if (pct >= 70) return '乙'
  if (pct >= 60) return '丙'
  return '丁'
}

function gradeColor(student) {
  const g = getGrade(student)
  return {
    '優': 'text-green-600',
    '甲': 'text-indigo-600',
    '乙': 'text-blue-500',
    '丙': 'text-amber-500',
    '丁': 'text-red-500',
  }[g] || ''
}

async function exportXlsx() {
  const params = {}
  if (yearFilter.value) params.year = yearFilter.value
  if (classFilter.value) params.class = classFilter.value
  const resp = await api.get(`/subjects/${store.currentSubjectId}/export`, { responseType: 'blob', params })
  const subjectName = store.currentSubject?.name || '成績'
  const suffix = [yearFilter.value ? `${yearFilter.value}年` : '', classFilter.value ? `${classFilter.value}班` : ''].filter(Boolean).join('')
  const url = URL.createObjectURL(resp.data)
  const a = document.createElement('a'); a.href = url; a.download = `${subjectName}${suffix ? '_' + suffix : ''}.xlsx`; a.click()
  URL.revokeObjectURL(url)
}

async function downloadSample() {
  const resp = await api.get(`/subjects/${store.currentSubjectId}/scores/sample`, { responseType: 'blob' })
  const url = URL.createObjectURL(resp.data)
  const a = document.createElement('a'); a.href = url; a.download = 'scores_sample.xlsx'; a.click()
  URL.revokeObjectURL(url)
}

async function importXlsx(e) {
  const file = e.target.files[0]; if (!file) return
  importMsg.value = ''
  const fd = new FormData(); fd.append('file', file)
  try {
    const { data } = await api.post(`/subjects/${store.currentSubjectId}/scores/import`, fd)
    importMsg.value = `✅ 成功匯入 ${data.imported} 筆分數`
    await store.loadScores()
  } catch (err) {
    importMsg.value = '❌ ' + (err.response?.data?.error || '匯入失敗')
  }
  e.target.value = ''
}
</script>
