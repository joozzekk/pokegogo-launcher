<script setup lang="ts">
import { showToast } from './utils'
import useGeneralStore from './stores/general-store'
import { onMounted } from 'vue'
import { applyTheme, halloween } from './assets/theme/official'

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

onMounted(() => {
  applyTheme(
    localStorage.getItem('selectedTheme')
      ? JSON.parse(localStorage.getItem('selectedTheme')!)
      : halloween
  )
})
</script>

<template>
  <RouterView />
</template>

<style lang="css">
@import '@renderer/assets/base.css';
</style>
