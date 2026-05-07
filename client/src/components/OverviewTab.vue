<template>
  <div class="bg-white rounded-2xl shadow p-6">
    <div v-if="!store.currentSubjectId" class="text-center text-gray-400 py-8">請先選擇科目</div>
    <template v-else>
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">📊 成績總表</h2>
        <button @click="exportXlsx" class="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition cursor-pointer">
          📁 匯出試算表
        </button>
      </div>

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
            <tr v-for="(s, idx) in store.students" :key="s.id"
              :class="['border-b border-gray-100', idx % 2 === 0 ? 'bg-white' : 'bg-gray-50', isFullScore(s) ? 'bg-red-50' : '']">
              <td class="px-4 py-3 font-medium">{{ s.year }}-{{ s.number }} {{ s.name }}</td>
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
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app'
import api from '../api'

const store = useAppStore()

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
  const resp = await api.get(`/subjects/${store.currentSubjectId}/export`, { responseType: 'blob' })
  const subjectName = store.currentSubject?.name || '成績'
  const url = URL.createObjectURL(resp.data)
  const a = document.createElement('a'); a.href = url; a.download = `${subjectName}.xlsx`; a.click()
  URL.revokeObjectURL(url)
}
</script>
