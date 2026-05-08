<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4">
      <h1 class="text-3xl font-bold text-gray-800">多科目雲端評分系統</h1>
      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-500">登入：{{ username }}</span>
        <button @click="showAccount = true"
          class="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition cursor-pointer flex items-center gap-1">
          👤 帳號設定
        </button>
        <button @click="logout"
          class="bg-gray-200 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-300 transition cursor-pointer flex items-center gap-1">
          🚪 登出
        </button>
      </div>
    </div>

    <!-- Subject Bar -->
    <SubjectBar />

    <!-- Tabs -->
    <div class="flex justify-center gap-3 mt-4 mb-6">
      <button v-for="tab in tabs" :key="tab.key"
        @click="activeTab = tab.key"
        :class="['tab-btn', activeTab === tab.key ? 'tab-active' : 'tab-inactive']">
        {{ tab.icon }} {{ tab.label }}
      </button>
    </div>

    <!-- Tab Content -->
    <div class="max-w-6xl mx-auto px-4 pb-10">
      <StudentTab v-if="activeTab === 'students'" />
      <ItemTab v-else-if="activeTab === 'items'" />
      <ScoringTab v-else-if="activeTab === 'scoring'" />
      <OverviewTab v-else-if="activeTab === 'overview'" />
    </div>

    <!-- Account Modal -->
    <AccountModal v-if="showAccount" @close="showAccount = false" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import SubjectBar from '../components/SubjectBar.vue'
import StudentTab from '../components/StudentTab.vue'
import ItemTab from '../components/ItemTab.vue'
import ScoringTab from '../components/ScoringTab.vue'
import OverviewTab from '../components/OverviewTab.vue'
import AccountModal from '../components/AccountModal.vue'

const store = useAppStore()
const router = useRouter()
const activeTab = ref('students')
const showAccount = ref(false)
const username = localStorage.getItem('username') || ''

const tabs = [
  { key: 'students', label: '學生', icon: '👥' },
  { key: 'items', label: '項目', icon: '📋' },
  { key: 'scoring', label: '評分', icon: '⭐' },
  { key: 'overview', label: '總覽', icon: '📊' },
]

onMounted(async () => {
  await Promise.all([store.loadSubjects(), store.loadStudents()])
  if (store.currentSubjectId) await Promise.all([store.loadItems(), store.loadScores()])
})

function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  router.push('/login')
}
</script>

<style scoped>
.tab-btn {
  @apply px-5 py-2 rounded-full font-medium text-sm transition cursor-pointer;
}
.tab-active {
  @apply bg-indigo-600 text-white shadow-md;
}
.tab-inactive {
  @apply bg-white text-gray-600 hover:bg-indigo-50 shadow;
}
</style>
