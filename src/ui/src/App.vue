<script setup lang="ts">
import { showToast } from './utils'
import useGeneralStore from './stores/general-store'
import { onMounted } from 'vue'
import { applyTheme } from './assets/theme/themes'
import { useRouter } from 'vue-router'

const generalStore = useGeneralStore()

window.electron?.ipcRenderer?.on('toast:show', (_, data: string) => {
  showToast(`${data}`)
})

window.electron?.ipcRenderer?.on('change:version', (_, ver: string) => {
  generalStore.changeVersion(ver)
})

window.electron?.ipcRenderer?.on('change:max-ram', (_, ram: string) => {
  generalStore.changeMaxRAM(parseInt(ram))
})

const router = useRouter()

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'R') {
    e.preventDefault()
    router.go(0)
  }
})

onMounted(() => {
  generalStore.loadSettings()

  applyTheme(generalStore.getTheme())
})
</script>

<template>
  <RouterView />
</template>

<style lang="css">
@import '@ui/assets/base.css';
</style>
