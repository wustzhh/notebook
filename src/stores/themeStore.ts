import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const savedTheme = localStorage.getItem('theme') || 'light'
  const isDarkMode = ref(savedTheme === 'dark')

  const savedBg = localStorage.getItem('bg_image') || ''
  const backgroundImage = ref(savedBg)

  function toggleDarkMode() {
    isDarkMode.value = !isDarkMode.value
  }

  function setDarkMode(value: boolean) {
    isDarkMode.value = value
  }

  function setBackgroundImage(dataUrl: string) {
    backgroundImage.value = dataUrl
    localStorage.setItem('bg_image', dataUrl)
  }

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
    backgroundImage,
    toggleDarkMode,
    setDarkMode,
    setBackgroundImage
  }
})
