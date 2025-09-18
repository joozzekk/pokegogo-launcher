<script setup lang="ts">
import '@renderer/assets/base.css'
import { showToast } from './utils'

window.electron?.ipcRenderer?.on('show-toast', (_, data: string) => {
  showToast(`${data}`)
})
</script>

<template>
  <RouterView />
</template>
