import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  // 从 localStorage 读取保存的主题，默认为 light
  const savedTheme = localStorage.getItem('theme') || 'light'
  const isDarkMode = ref(savedTheme === 'dark')

  // 切换暗色模式
  function toggleDarkMode() {
    isDarkMode.value = !isDarkMode.value
  }

  // 设置暗色模式
  function setDarkMode(value: boolean) {
    isDarkMode.value = value
  }

  // 监听变化并保存到 localStorage，同时更新 document 的 class
  watch(isDarkMode, (newValue) => {
    localStorage.setItem('theme', newValue ? 'dark' : 'light')
    if (newValue) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, { immediate: true })

  return {
    isDarkMode,
    toggleDarkMode,
    setDarkMode
  }
})
