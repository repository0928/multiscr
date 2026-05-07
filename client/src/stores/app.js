import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api'

export const useAppStore = defineStore('app', () => {
  const subjects = ref([])
  const currentSubjectId = ref(null)
  const students = ref([])
  const items = ref([])
  const scores = ref([])

  const currentSubject = computed(() => subjects.value.find(s => s.id === currentSubjectId.value))

  async function loadSubjects() {
    const { data } = await api.get('/subjects')
    subjects.value = data
    if (!currentSubjectId.value && data.length > 0) {
      currentSubjectId.value = data[0].id
    }
  }

  async function loadStudents() {
    const { data } = await api.get('/students')
    students.value = data
  }

  async function loadItems() {
    if (!currentSubjectId.value) { items.value = []; return }
    const { data } = await api.get(`/subjects/${currentSubjectId.value}/items`)
    items.value = data
  }

  async function loadScores() {
    if (!currentSubjectId.value) { scores.value = []; return }
    const { data } = await api.get(`/subjects/${currentSubjectId.value}/scores`)
    scores.value = data
  }

  function getScore(studentId, itemId) {
    const s = scores.value.find(s => s.studentId === studentId && s.itemId === itemId)
    return s ? s.score : 0
  }

  async function saveScore(studentId, itemId, score) {
    await api.put(`/subjects/${currentSubjectId.value}/scores`, [{ studentId, itemId, score }])
    const idx = scores.value.findIndex(s => s.studentId === studentId && s.itemId === itemId)
    if (idx >= 0) scores.value[idx].score = score
    else scores.value.push({ subjectId: currentSubjectId.value, studentId, itemId, score })
  }

  async function selectSubject(id) {
    currentSubjectId.value = id
    await Promise.all([loadItems(), loadScores()])
  }

  return { subjects, currentSubjectId, currentSubject, students, items, scores,
    loadSubjects, loadStudents, loadItems, loadScores, getScore, saveScore, selectSubject }
})
