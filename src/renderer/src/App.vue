<script setup lang="ts">
import { showToast } from './utils'
import useGeneralStore from './stores/general-store'

const generalStore = useGeneralStore()

window.electron?.ipcRenderer?.on('show-toast', (_, data: string) => {
  showToast(`${data}`)
})

window.electron?.ipcRenderer?.on('change-version', (_, ver: string) => {
  generalStore.changeVersion(ver)
})

window.electron?.ipcRenderer?.on('update-available', (_, isUpdate: boolean) => {
  generalStore.setUpdateAvailable(isUpdate)
})
</script>

<template>
  <RouterView />
</template>

<style lang="css">
@import '@renderer/assets/base.css';
</style>
