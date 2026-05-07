<template>
  <div v-if="!store.currentSubjectId" class="text-center text-gray-400 py-8">請先選擇科目</div>
  <div v-else-if="store.items.length === 0" class="text-center text-gray-400 py-8">請先在「項目」頁新增評分項目</div>
  <div v-else>
    <!-- 篩選列 -->
    <div class="bg-indigo-900 text-white rounded-2xl px-6 py-3 mb-4 flex items-center gap-4">
      <input v-model="classFilter" placeholder="篩選班級" type="number"
        class="bg-indigo-800 text-white placeholder-indigo-300 rounded-lg px-3 py-1 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
      <span class="ml-auto text-sm opacity-70">人數：{{ filtered.length }}</span>
    </div>

    <!-- 學生卡片 -->
    <div v-for="student in filtered" :key="student.id"
      :class="['rounded-2xl p-5 mb-4 shadow', isFullScore(student) ? 'bg-red-50' : 'bg-white']">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <span class="font-bold text-gray-800">
            {{ student.year }}年{{ student.class }}班{{ student.number }}號 {{ student.name }}
          </span>
          <span v-if="isFullScore(student)" class="bg-red-100 text-red-500 text-xs px-2 py-0.5 rounded-full font-medium">
            🏆 滿分
          </span>
        </div>
        <span :class="['font-bold text-lg', isFullScore(student) ? 'text-indigo-600' : 'text-gray-700']">
          {{ getTotal(student) }}/{{ maxTotal }}
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="item in store.items" :key="item.id">
          <div class="flex justify-between text-sm mb-1">
            <span class="text-gray-600">{{ item.name }}</span>
            <span class="text-gray-500">{{ localScore(student, item) }}/{{ item.maxScore }}</span>
          </div>
          <input type="range" :min="0" :max="item.maxScore"
            :value="localScore(student, item)"
            @input="onSlider(student, item, $event)"
            @change="onSliderEnd(student, item, $event)"
            class="slider w-full" />
        </div>
      </div>
    </div>

    <div v-if="filtered.length === 0" class="text-center text-gray-400 py-8">無符合班級的學生</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAppStore } from '../stores/app'

const store = useAppStore()
const classFilter = ref('')

// 本地快取，避免每次 input 直接觸發 store
const localChanges = ref({}) // key: `${studentId}_${itemId}` → value

const filtered = computed(() => {
  if (!classFilter.value) return store.students
  return store.students.filter(s => s.class == classFilter.value)
})

const maxTotal = computed(() => store.items.reduce((s, i) => s + i.maxScore, 0))

function localScore(student, item) {
  const key = `${student.id}_${item.id}`
  return key in localChanges.value ? localChanges.value[key] : store.getScore(student.id, item.id)
}

function getTotal(student) {
  return store.items.reduce((sum, item) => sum + localScore(student, item), 0)
}

function isFullScore(student) {
  return maxTotal.value > 0 && getTotal(student) === maxTotal.value
}

// 移動滑桿：只更新本地
function onSlider(student, item, e) {
  const key = `${student.id}_${item.id}`
  localChanges.value[key] = parseInt(e.target.value)
}

// 放開滑桿：儲存到後端
const saveTimers = {}
function onSliderEnd(student, item, e) {
  const score = parseInt(e.target.value)
  const key = `${student.id}_${item.id}`
  localChanges.value[key] = score
  clearTimeout(saveTimers[key])
  saveTimers[key] = setTimeout(() => {
    store.saveScore(student.id, item.id, score)
  }, 300)
}
</script>
