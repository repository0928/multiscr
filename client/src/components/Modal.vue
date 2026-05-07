<template>
  <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="$emit('close')">
    <div class="bg-white rounded-2xl shadow-2xl p-6 w-96 max-w-full mx-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-bold text-gray-800 text-lg">{{ title }}</h3>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 text-xl cursor-pointer">✕</button>
      </div>
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({ title: String })
defineEmits(['close'])
</script>
