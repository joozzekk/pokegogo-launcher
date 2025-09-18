<script setup lang="ts">
import '@renderer/assets/base.css'
import { showToast } from './utils'
import { onMounted } from 'vue'
import { initNavigation } from '@renderer/assets/scripts/navigation'
import { initSettings, loadSettings } from '@renderer/assets/scripts/settings'
import { initAnimations } from '@renderer/assets/scripts/animations'
import { initShop } from '@renderer/assets/scripts/shop'
import { updateServerStatus } from '@renderer/assets/scripts//server-status'

window.electron?.ipcRenderer?.on('show-toast', (_, data: string) => {
  showToast(`${data}`)
})

onMounted(() => {
  initNavigation()
  initSettings()
  updateServerStatus()
  setInterval(updateServerStatus, 30000)
  loadSettings()
  initAnimations()
  initShop()
})
</script>

<template>
  <RouterView />
</template>
