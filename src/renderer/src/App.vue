<script setup lang="ts">
import { showToast } from './utils'
import useGeneralStore from './stores/general-store'
import { onMounted } from 'vue'
import { applyTheme } from './assets/theme/themes'

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
  generalStore.loadSettings()

  applyTheme(generalStore.getTheme())
})
</script>

<template>
  <RouterView />
</template>

<style lang="css">
@import '@renderer/assets/base.css';
</style>
