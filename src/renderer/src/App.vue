<script setup lang="ts">
import '@renderer/assets/base.css'
import { showToast } from './utils'
import useGeneralStore from './stores/general-store'

const generalStore = useGeneralStore()

window.electron?.ipcRenderer?.on('show-toast', (_, data: string) => {
  showToast(`${data}`)
})

window.electron?.ipcRenderer?.on('change-version', (_, ver: string) => {
  generalStore.changeVersion(ver)
})
</script>

<template>
  <RouterView />
</template>
