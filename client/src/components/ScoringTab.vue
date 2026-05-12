<template>
  <div v-if="!store.currentSubjectId" class="text-center text-gray-400 py-8">請先選擇科目</div>
  <div v-else-if="store.items.length === 0" class="text-center text-gray-400 py-8">請先在「項目」頁新增評分項目</div>
  <div v-else>
    <!-- 篩選列 -->
    <div class="bg-indigo-900 text-white rounded-2xl px-6 py-3 mb-4 flex items-center gap-4">
      <input v-model="yearFilter" placeholder="篩選年級" type="number"
        class="bg-indigo-800 text-white placeholder-indigo-300 rounded-lg px-3 py-1 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
      <input v-model="classFilter" placeholder="篩選班級" type="number"
        class="bg-indigo-800 text-white placeholder-indigo-300 rounded-lg px-3 py-1 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
      <span class="ml-auto text-sm opacity-70">人數：{{ filtered.length }}</span>
    </div>

    <!-- 學生卡片 -->
    <div v-for="student in filtered" :key="student.id"
      :class="['rounded-2xl p-5 mb-4 shadow', isFullScore(student) ? 'bg-red-50' : 'bg-white']">

      <!-- 學生標題列 -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-bold text-gray-800">
            {{ student.year }}年{{ student.class }}班{{ student.number }}號 {{ student.name }}
          </span>
          <button @click="setFullScore(student)"
            class="text-xs bg-red-500 text-white hover:bg-red-600 px-3 py-1 rounded-full transition cursor-pointer font-medium">
            給滿分
          </button>
          <button @click="clearScore(student)"
            class="text-xs bg-green-500 text-white hover:bg-green-600 px-3 py-1 rounded-full transition cursor-pointer font-medium">
            清零
          </button>
          <span v-if="isFullScore(student)" class="bg-red-100 text-red-500 text-xs px-2 py-0.5 rounded-full font-medium">
            🏆 滿分
          </span>
        </div>
        <span :class="['font-bold text-lg', isFullScore(student) ? 'text-indigo-600' : 'text-gray-700']">
          {{ getTotal(student) }}/{{ maxTotal }}
        </span>
      </div>

      <!-- 評分項目：3欄格局 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="item in store.items" :key="item.id">
          <div class="flex justify-between text-sm mb-1">
            <span class="text-gray-700 font-medium">{{ item.name }}</span>
            <span class="text-gray-500 shrink-0 ml-3 tabular-nums">{{ localScore(student, item) }}/{{ item.maxScore }}</span>
          </div>
          <input
            type="range"
            :min="0"
            :max="item.maxScore"
            :value="localScore(student, item)"
            :style="sliderStyle(localScore(student, item), item.maxScore)"
            @input="onSlider(student, item, $event)"
            @change="onSliderEnd(student, item, $event)"
            class="score-slider w-full"
          />
        </div>
      </div>
    </div>

    <div v-if="filtered.length === 0" class="text-center text-gray-400 py-8">無符合條件的學生</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAppStore } from '../stores/app'

const store = useAppStore()
const yearFilter = ref('')
const classFilter = ref('')

const localChanges = ref({})

const filtered = computed(() => {
  return store.students.filter(s => {
    if (yearFilter.value && s.year != yearFilter.value) return false
    if (classFilter.value && s.class != classFilter.value) return false
    return true
  })
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

function sliderStyle(value, max) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return {
    background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${pct}%, #e2e8f0 ${pct}%, #e2e8f0 100%)`
  }
}

function onSlider(student, item, e) {
  const key = `${student.id}_${item.id}`
  localChanges.value[key] = parseInt(e.target.value)
  e.target.style.background = sliderStyle(localChanges.value[key], item.maxScore).background
}

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

async function setFullScore(student) {
  for (const item of store.items) {
    const key = `${student.id}_${item.id}`
    localChanges.value[key] = item.maxScore
    await store.saveScore(student.id, item.id, item.maxScore)
  }
}

async function clearScore(student) {
  for (const item of store.items) {
    const key = `${student.id}_${item.id}`
    localChanges.value[key] = 0
    await store.saveScore(student.id, item.id, 0)
  }
}
</script>

<style scoped>
.score-slider {
  -webkit-appearance: none;
  appearance: none;
  height: 8px;
  border-radius: 9999px;
  outline: none;
  cursor: pointer;
  transition: background 0.1s;
}

.score-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #4f46e5;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(79, 70, 229, 0.4);
  border: 2px solid #fff;
}

.score-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #4f46e5;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(79, 70, 229, 0.4);
  border: 2px solid #fff;
}
</style>
